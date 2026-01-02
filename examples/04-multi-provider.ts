/**
 * Multi-Provider Example
 * 
 * This example shows how to configure multiple providers (GitHub Models and Gemini)
 * and use them together with automatic fallback across providers.
 */

import { createAIGateway, createGitHubModelsProvider, createGeminiProvider } from "../src";

const gateway = createAIGateway({
  models: [
    // GitHub Models
    {
      id: "gpt-4o-mini",
      provider: "github",
      capabilities: ["fast_text"],
      limits: { rpm: 15, rpd: 150, tpmInput: 150000, tpmOutput: 20000, concurrency: 3 }
    },
    {
      id: "o3-mini",
      provider: "github",
      isReasoning: true,
      capabilities: ["deep_reasoning"],
      limits: { rpm: 5, rpd: 20, tpmInput: 150000, tpmOutput: 30000, concurrency: 1 }
    },
    // Gemini Models
    {
      id: "gemini-2.0-flash-lite",
      provider: "gemini",
      capabilities: ["fast_text", "cheap_background"],
      limits: { rpm: 50, rpd: 1000, tpmInput: 1000000, tpmOutput: 200000, concurrency: 10 }
    },
    {
      id: "gemini-2.5-flash",
      provider: "gemini",
      capabilities: ["fast_text", "search", "long_context"],
      limits: { rpm: 5, rpd: 20, tpmInput: 250000, tpmOutput: 250000, concurrency: 5 }
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
  // Request will try GitHub first, then fall back to Gemini if needed
  const result1 = await gateway.execute({
    capability: "fast_text",
    input: {
      kind: "chat",
      messages: [{ role: "user", content: "Explain quantum entanglement in one sentence." }]
    }
  });
  console.log(`Provider: ${result1.provider}, Model: ${result1.modelUsed}`);
  console.log(`Response: ${result1.output}\n`);

  // Use Gemini's search capability
  const result2 = await gateway.execute({
    capability: "search",
    input: {
      kind: "prompt",
      systemPrompt: "You are a helpful assistant with web search access.",
      userPrompt: "What are the latest developments in AI in 2026?"
    },
    options: {
      useSearch: true
    }
  });
  console.log(`Provider: ${result2.provider}, Model: ${result2.modelUsed}`);
  console.log(`Response: ${result2.output}\n`);
}

main().catch(console.error);
