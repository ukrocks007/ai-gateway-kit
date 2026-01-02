/**
 * Observability Hooks Example
 * 
 * This example demonstrates how to use lifecycle hooks for logging,
 * monitoring, and debugging your gateway usage.
 */

import { createAIGateway, createGitHubModelsProvider, type GatewayHooks } from "../src";

// Define comprehensive hooks for observability
const hooks: GatewayHooks = {
  onRequestStart: (event: Parameters<NonNullable<GatewayHooks['onRequestStart']>>[0]) => {
    console.log(`🚀 [${event.requestId}] Starting request`);
    console.log(`   Capability: ${event.capability}`);
    console.log(`   Model: ${event.modelId} (${event.provider})`);
    console.log(`   Attempt: ${event.attempt + 1}`);
  },

  onRequestEnd: (event: Parameters<NonNullable<GatewayHooks['onRequestEnd']>>[0]) => {
    const duration = event.endedAt - event.startedAt;
    const status = event.ok ? "✅ SUCCESS" : "❌ FAILED";
    console.log(`${status} [${event.requestId}]`);
    console.log(`   Model: ${event.modelId}`);
    console.log(`   Duration: ${duration}ms`);
  },

  onRateLimit: (event: Parameters<NonNullable<GatewayHooks['onRateLimit']>>[0]) => {
    console.log(`⏸️  [${event.requestId}] Rate limit encountered`);
    console.log(`   Model: ${event.modelId}`);
    console.log(`   Reason: ${event.decision.reason}`);
    if (event.decision.retryAfterMs) {
      console.log(`   Retry after: ${event.decision.retryAfterMs}ms`);
    }
  },

  onFallback: (event: Parameters<NonNullable<GatewayHooks['onFallback']>>[0]) => {
    console.log(`🔄 [${event.requestId}] Fallback triggered`);
    console.log(`   From: ${event.fromModelId}`);
    console.log(`   To: ${event.toModelId}`);
    console.log(`   Reason: ${event.reason}`);
  },

  onError: (event: Parameters<NonNullable<GatewayHooks['onError']>>[0]) => {
    console.error(`💥 [${event.requestId}] Error occurred`);
    console.error(`   Model: ${event.modelId} (${event.provider})`);
    console.error(`   Error: ${event.error.message}`);
    if (event.error.statusCode) {
      console.error(`   Status: ${event.error.statusCode}`);
    }
  }
};

const gateway = createAIGateway({
  models: [
    {
      id: "gpt-4o-mini",
      provider: "github",
      capabilities: ["fast_text"],
      limits: { rpm: 2, rpd: 10, tpmInput: 10000, tpmOutput: 2000, concurrency: 1 }
    },
    {
      id: "Mistral-Nemo",
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
  hooks
});

async function main() {
  console.log("=== Making multiple requests to observe lifecycle ===\n");

  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- Request ${i} ---`);
    try {
      const result = await gateway.execute({
        capability: "fast_text",
        input: {
          kind: "chat",
          messages: [{ role: "user", content: `Request ${i}: Count to ${i}` }]
        },
        metadata: {
          agentName: `test-agent-${i}`
        }
      });
      
      console.log(`\n📤 Final result: ${result.output.substring(0, 50)}...`);
    } catch (error) {
      console.error("Request failed:", (error as Error).message);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Get gateway state snapshot
  console.log("\n\n=== Gateway State Snapshot ===");
  const state = gateway.getGatewayState();
  
  console.log("\nRecent Requests:");
  state.recentRequests.slice(0, 5).forEach((req: typeof state.recentRequests[0]) => {
    console.log(`  ${req.requestId}: ${req.status} - ${req.modelUsed} (${req.latencyMs}ms)`);
  });

  console.log("\nRate Limit Status:");
  state.rateLimits.forEach((limit: import('ai-gateway-kit').RateLimitSnapshot) => {
    console.log(`  ${limit.modelId}:`);
    console.log(`    RPM: ${limit.rpmUsed}/${limit.rpmLimit}`);
    console.log(`    Concurrency: ${limit.concurrentUsed}/${limit.concurrentLimit}`);
    console.log(`    Availability: ${limit.availability}`);
  });
}

main().catch(console.error);
