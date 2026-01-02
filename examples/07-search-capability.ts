/**
 * Search Capability Example
 * 
 * This example demonstrates how to use models with web search capabilities
 * (currently available with Gemini models).
 */

import { createAIGateway, createGeminiProvider } from "../src";

const gateway = createAIGateway({
  models: [
    {
      id: "gemini-2.5-flash",
      provider: "gemini",
      capabilities: ["search", "fast_text"],
      limits: { rpm: 5, rpd: 20, tpmInput: 250000, tpmOutput: 250000, concurrency: 5 }
    }
  ],
  providers: {
    gemini: createGeminiProvider({
      apiKey: process.env.GEMINI_API_KEY!
    })
  }
});

async function main() {
  // Query that benefits from web search
  const result = await gateway.execute({
    capability: "search",
    input: {
      kind: "prompt",
      systemPrompt: "You are a helpful assistant with access to web search. Use it to provide accurate, up-to-date information.",
      userPrompt: "What are the current weather conditions in Tokyo, and what major events are happening there this week?"
    },
    options: {
      useSearch: true  // Enable web search
    }
  });

  console.log("Model used:", result.modelUsed);
  console.log("Response with search:");
  console.log(result.output);
  console.log("\nExecution time:", result.executionTimeMs, "ms");

  // Compare without search
  const resultWithoutSearch = await gateway.execute({
    capability: "fast_text",
    input: {
      kind: "prompt",
      userPrompt: "What are the current weather conditions in Tokyo?"
    },
    options: {
      useSearch: false  // Disable web search
    }
  });

  console.log("\n\nResponse without search:");
  console.log(resultWithoutSearch.output);
}

main().catch(console.error);
