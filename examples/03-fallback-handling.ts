/**
 * Fallback Handling Example
 * 
 * This example demonstrates automatic fallback when the primary model fails
 * or is rate-limited. The gateway will try models in order until one succeeds.
 */

import { createAIGateway, createGitHubModelsProvider } from "../src";

const gateway = createAIGateway({
  models: [
    // Primary model (might get rate limited)
    {
      id: "gpt-4o-mini",
      provider: "github",
      capabilities: ["fast_text"],
      limits: { rpm: 2, rpd: 10, tpmInput: 10000, tpmOutput: 2000, concurrency: 1 }
    },
    // Fallback model 1
    {
      id: "Mistral-Nemo",
      provider: "github",
      capabilities: ["fast_text"],
      limits: { rpm: 15, rpd: 150, tpmInput: 150000, tpmOutput: 20000, concurrency: 3 }
    },
    // Fallback model 2
    {
      id: "gpt-3.5-turbo",
      provider: "github",
      capabilities: ["fast_text"],
      limits: { rpm: 15, rpd: 150, tpmInput: 150000, tpmOutput: 20000, concurrency: 3 }
    }
  ],
  providers: {
    github: createGitHubModelsProvider({
      token: process.env.GITHUB_TOKEN!
    })
  },
  hooks: {
    onFallback: (event: Parameters<NonNullable<import('ai-gateway-kit').GatewayHooks['onFallback']>>[0]) => {
      console.log(`⚠️  Falling back from ${event.fromModelId} to ${event.toModelId}`);
      console.log(`   Reason: ${event.reason}`);
    },
    onRateLimit: (event: Parameters<NonNullable<import('ai-gateway-kit').GatewayHooks['onRateLimit']>>[0]) => {
      console.log(`🚫 Rate limit hit for ${event.modelId}`);
      console.log(`   Reason: ${event.decision.reason}`);
    }
  }
});

async function main() {
  console.log("Making multiple requests to trigger rate limits...\n");
  
  // Make several requests - after hitting the primary model's limit,
  // the gateway will automatically fall back to other models
  for (let i = 1; i <= 5; i++) {
    try {
      const result = await gateway.execute({
        capability: "fast_text",
        input: {
          kind: "chat",
          messages: [{ role: "user", content: `Request #${i}: What is ${i} + ${i}?` }]
        }
      });
      
      console.log(`✅ Request ${i}: ${result.modelUsed} -> ${result.output}`);
      console.log(`   Attempts: ${result.attempts.length}, Execution time: ${result.executionTimeMs}ms\n`);
    } catch (error) {
      console.error(`❌ Request ${i} failed:`, (error as Error).message);
    }
  }

  // Check gateway state
  const state = gateway.getGatewayState();
  console.log("\n📊 Gateway State:");
  state.rateLimits.forEach((limit: import('ai-gateway-kit').RateLimitSnapshot) => {
    console.log(`  ${limit.modelId}: ${limit.rpmUsed}/${limit.rpmLimit} rpm, availability: ${limit.availability}`);
  });
}

main().catch(console.error);
