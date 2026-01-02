/**
 * Temperature Control Example
 * 
 * This example demonstrates how to control model creativity using temperature.
 * Lower temperature = more focused/deterministic, higher = more creative/random.
 */

import { createAIGateway, createGitHubModelsProvider } from "../src";

const gateway = createAIGateway({
  models: [
    {
      id: "gpt-4o-mini",
      provider: "github",
      capabilities: ["fast_text", "creative_writing"],
      limits: { rpm: 15, rpd: 150, tpmInput: 150000, tpmOutput: 20000, concurrency: 3 }
    }
  ],
  providers: {
    github: createGitHubModelsProvider({
      token: process.env.GITHUB_TOKEN!
    })
  }
});

async function main() {
  const prompt = "Write a one-sentence description of a sunset.";

  // Low temperature (0.0-0.3): More deterministic and focused
  console.log("=== Low Temperature (0.1) ===");
  const lowTemp = await gateway.execute({
    capability: "fast_text",
    input: {
      kind: "chat",
      messages: [{ role: "user", content: prompt }]
    },
    options: {
      temperature: 0.1
    }
  });
  console.log(lowTemp.output, "\n");

  // Medium temperature (0.5-0.7): Balanced
  console.log("=== Medium Temperature (0.7) ===");
  const medTemp = await gateway.execute({
    capability: "fast_text",
    input: {
      kind: "chat",
      messages: [{ role: "user", content: prompt }]
    },
    options: {
      temperature: 0.7
    }
  });
  console.log(medTemp.output, "\n");

  // High temperature (0.9-1.0): More creative and varied
  console.log("=== High Temperature (1.0) ===");
  const highTemp = await gateway.execute({
    capability: "creative_writing",
    input: {
      kind: "chat",
      messages: [{ role: "user", content: prompt }]
    },
    options: {
      temperature: 1.0
    }
  });
  console.log(highTemp.output, "\n");

  // Note: Temperature is ignored for reasoning models (o1, o3-mini)
  // They use fixed sampling parameters
}

main().catch(console.error);
