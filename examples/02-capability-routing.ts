/**
 * Capability-Based Routing Example
 * 
 * This example demonstrates how to configure multiple models with different capabilities
 * and let the gateway automatically route requests to the appropriate model.
 */

import { createAIGateway, createGitHubModelsProvider } from "../src";

const gateway = createAIGateway({
  models: [
    // Fast, low-tier models for quick tasks
    {
      id: "gpt-4o-mini",
      provider: "github",
      tier: "low",
      capabilities: ["fast_text", "cheap_background"],
      limits: { rpm: 15, rpd: 150, tpmInput: 150000, tpmOutput: 20000, concurrency: 3 }
    },
    // High-tier model with vision capabilities
    {
      id: "gpt-4o",
      provider: "github",
      tier: "high",
      capabilities: ["fast_text", "vision", "long_context"],
      limits: { rpm: 10, rpd: 50, tpmInput: 450000, tpmOutput: 60000, concurrency: 2 }
    },
    // Reasoning model for complex tasks
    {
      id: "o3-mini",
      provider: "github",
      tier: "reasoning",
      isReasoning: true,
      capabilities: ["deep_reasoning"],
      limits: { rpm: 5, rpd: 20, tpmInput: 150000, tpmOutput: 30000, concurrency: 1 }
    }
  ],
  providers: {
    github: createGitHubModelsProvider({
      token: process.env.GITHUB_TOKEN!
    })
  }
});

async function main() {
  // The gateway will automatically route to gpt-4o-mini for fast text
  const fastResult = await gateway.execute({
    capability: "fast_text",
    input: {
      kind: "chat",
      messages: [{ role: "user", content: "What is 2+2?" }]
    }
  });
  console.log("[fast_text]", fastResult.modelUsed, "->", fastResult.output);

  // The gateway will route to o3-mini for deep reasoning
  const reasoningResult = await gateway.execute({
    capability: "deep_reasoning",
    input: {
      kind: "chat",
      messages: [{ 
        role: "user", 
        content: "Solve this logic puzzle: If all bloops are razzles and all razzles are lazzles, are all bloops lazzles?"
      }]
    }
  });
  console.log("[deep_reasoning]", reasoningResult.modelUsed, "->", reasoningResult.output);

  // The gateway will route to gpt-4o for vision
  const visionResult = await gateway.execute({
    capability: "vision",
    input: {
      kind: "chat",
      messages: [{ 
        role: "user", 
        content: "Describe what makes a good user interface." 
      }]
    }
  });
  console.log("[vision]", visionResult.modelUsed, "->", visionResult.output);
}

main().catch(console.error);
