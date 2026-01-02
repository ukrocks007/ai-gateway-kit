/**
 * Dynamic Model Registration Example
 * 
 * This example demonstrates how to dynamically register new models
 * at runtime without recreating the gateway.
 */

import { createAIGateway, createGitHubModelsProvider, createGeminiProvider } from "../src";

const gateway = createAIGateway({
  models: [
    {
      id: "gpt-4o-mini",
      provider: "github",
      capabilities: ["fast_text"],
      limits: { rpm: 15, rpd: 150, tpmInput: 150000, tpmOutput: 20000, concurrency: 3 }
    }
  ],
  providers: {
    github: createGitHubModelsProvider({
      token: process.env.GITHUB_TOKEN!
    }),
    gemini: createGeminiProvider({
      apiKey: process.env.GEMINI_API_KEY!
    })
  }
});

async function main() {
  console.log("=== Initial Gateway State ===");
  let state = gateway.getGatewayState();
  console.log("Available models:", state.models.map((m: import('ai-gateway-kit').ModelDefinition) => m.id).join(", "));

  // Make a request with initial models
  const result1 = await gateway.execute({
    capability: "fast_text",
    input: {
      kind: "chat",
      messages: [{ role: "user", content: "Say hello" }]
    }
  });
  console.log(`\nInitial request used: ${result1.modelUsed}\n`);

  // Dynamically register new models
  console.log("=== Registering Additional Models ===");
  gateway.registerModels([
    {
      id: "gemini-2.0-flash-lite",
      provider: "gemini",
      capabilities: ["fast_text", "cheap_background"],
      limits: { rpm: 50, rpd: 1000, tpmInput: 1000000, tpmOutput: 200000, concurrency: 10 }
    },
    {
      id: "o3-mini",
      provider: "github",
      isReasoning: true,
      capabilities: ["deep_reasoning"],
      limits: { rpm: 5, rpd: 20, tpmInput: 150000, tpmOutput: 30000, concurrency: 1 }
    }
  ]);

  state = gateway.getGatewayState();
  console.log("Available models:", state.models.map((m: import('ai-gateway-kit').ModelDefinition) => m.id).join(", "));

  // Now we can use the newly registered models
  const result2 = await gateway.execute({
    capability: "cheap_background",
    input: {
      kind: "chat",
      messages: [{ role: "user", content: "What is 2+2?" }]
    }
  });
  console.log(`\nCheap background task used: ${result2.modelUsed}`);

  const result3 = await gateway.execute({
    capability: "deep_reasoning",
    input: {
      kind: "chat",
      messages: [{ 
        role: "user", 
        content: "If I have 5 apples and give away 2, then buy 3 more, how many do I have?" 
      }]
    }
  });
  console.log(`Reasoning task used: ${result3.modelUsed}`);

  // View updated rate limits
  console.log("\n=== Rate Limit Status ===");
  state.rateLimits.forEach((limit: import('ai-gateway-kit').RateLimitSnapshot) => {
    console.log(`${limit.modelId}: ${limit.rpmUsed}/${limit.rpmLimit} rpm (${limit.availability})`);
  });
}

main().catch(console.error);
