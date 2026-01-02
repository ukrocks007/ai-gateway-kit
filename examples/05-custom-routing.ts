/**
 * Custom Routing Example
 * 
 * This example demonstrates how to implement custom routing logic
 * to control which models are used for each capability.
 */

import { createAIGateway, createGitHubModelsProvider, createGeminiProvider, type CapabilityRouter } from "../src";

// Define custom capability types
type MyCapability = "fast_text" | "premium_text" | "cheap_background";

// Implement custom router
const customRouter: CapabilityRouter<MyCapability> = {
  getModelOrderForCapability(capability: MyCapability): readonly string[] {
    // Custom routing logic based on capability
    switch (capability) {
      case "fast_text":
        // Prefer Gemini for fast text, fallback to GPT
        return ["gemini-2.0-flash-lite", "gpt-4o-mini"];
      
      case "premium_text":
        // Use only premium models
        return ["gpt-4o", "gemini-2.5-flash"];
      
      case "cheap_background":
        // Use cheapest models for background tasks
        return ["gemini-2.0-flash-lite", "gpt-3.5-turbo"];
      
      default:
        return [];
    }
  }
};

const gateway = createAIGateway<MyCapability>({
  models: [
    {
      id: "gpt-4o-mini",
      provider: "github",
      capabilities: ["fast_text", "cheap_background"],
      limits: { rpm: 15, rpd: 150, tpmInput: 150000, tpmOutput: 20000, concurrency: 3 }
    },
    {
      id: "gpt-4o",
      provider: "github",
      capabilities: ["premium_text"],
      limits: { rpm: 10, rpd: 50, tpmInput: 450000, tpmOutput: 60000, concurrency: 2 }
    },
    {
      id: "gpt-3.5-turbo",
      provider: "github",
      capabilities: ["cheap_background"],
      limits: { rpm: 15, rpd: 150, tpmInput: 150000, tpmOutput: 20000, concurrency: 3 }
    },
    {
      id: "gemini-2.0-flash-lite",
      provider: "gemini",
      capabilities: ["fast_text", "cheap_background"],
      limits: { rpm: 50, rpd: 1000, tpmInput: 1000000, tpmOutput: 200000, concurrency: 10 }
    },
    {
      id: "gemini-2.5-flash",
      provider: "gemini",
      capabilities: ["premium_text"],
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
  },
  router: customRouter
});

async function main() {
  // Test each capability
  const capabilities: MyCapability[] = ["fast_text", "premium_text", "cheap_background"];
  
  for (const capability of capabilities) {
    const result = await gateway.execute({
      capability,
      input: {
        kind: "chat",
        messages: [{ 
          role: "user", 
          content: `Using ${capability}: What is the capital of France?` 
        }]
      }
    });
    
    console.log(`[${capability}] ${result.modelUsed}: ${result.output}\n`);
  }
}

main().catch(console.error);
