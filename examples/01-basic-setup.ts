/**
 * Basic Setup Example
 * 
 * This example demonstrates the minimal setup required to get started with ai-gateway-kit.
 * It creates a gateway with a single model and executes a simple chat request.
 */

/// <reference types="node" />

import { createAIGateway, createGitHubModelsProvider } from "../src";

// Create a gateway with a single model
const gateway = createAIGateway({
  models: [
    {
      id: "gpt-4o-mini",
      provider: "github",
      capabilities: ["fast_text"],
      limits: { 
        rpm: 15,        // Requests per minute
        rpd: 150,       // Requests per day
        tpmInput: 150000,   // Tokens per minute (input)
        tpmOutput: 20000,   // Tokens per minute (output)
        concurrency: 3      // Max concurrent requests
      }
    }
  ],
  providers: {
    github: createGitHubModelsProvider({
      token: process.env.GITHUB_TOKEN!
    })
  }
});

// Execute a simple request
async function main() {
  const result = await gateway.execute({
    capability: "fast_text",
    input: {
      kind: "chat",
      messages: [
        { role: "user", content: "Say hello in 5 words or less." }
      ]
    }
  });

  console.log("Response:", result.output);
  console.log("Model used:", result.modelUsed);
  console.log("Execution time:", result.executionTimeMs, "ms");
}

main().catch(console.error);
