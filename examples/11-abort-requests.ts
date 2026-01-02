/**
 * Abort Requests Example
 * 
 * This example demonstrates how to cancel in-flight requests using AbortSignal,
 * useful for implementing timeouts or user cancellations.
 */

import { createAIGateway, createGitHubModelsProvider } from "../src";

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
    })
  }
});

async function main() {
  // Example 1: Request with timeout
  console.log("=== Example 1: Request with timeout ===");
  const controller1 = new AbortController();
  const timeout1 = setTimeout(() => {
    console.log("⏱️  Timeout reached, aborting request...");
    controller1.abort();
  }, 5000); // 5 second timeout

  try {
    const result = await gateway.execute({
      capability: "fast_text",
      input: {
        kind: "chat",
        messages: [{ role: "user", content: "Write a short poem about clouds." }]
      },
      options: {
        signal: controller1.signal
      }
    });
    clearTimeout(timeout1);
    console.log("✅ Request completed:", result.output);
  } catch (error) {
    clearTimeout(timeout1);
    if ((error as Error).name === "AbortError") {
      console.log("❌ Request was aborted");
    } else {
      console.error("❌ Request failed:", (error as Error).message);
    }
  }

  // Example 2: User-initiated cancellation
  console.log("\n=== Example 2: User-initiated cancellation ===");
  const controller2 = new AbortController();
  
  // Simulate user clicking "cancel" after 1 second
  setTimeout(() => {
    console.log("🚫 User cancelled the request");
    controller2.abort();
  }, 1000);

  try {
    const result = await gateway.execute({
      capability: "fast_text",
      input: {
        kind: "chat",
        messages: [{ 
          role: "user", 
          content: "Write a very long story about a dragon." 
        }]
      },
      options: {
        signal: controller2.signal
      }
    });
    console.log("✅ Request completed:", result.output.substring(0, 100) + "...");
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.log("❌ Request was cancelled by user");
    } else {
      console.error("❌ Request failed:", (error as Error).message);
    }
  }

  // Example 3: Concurrent requests with shared abort controller
  console.log("\n=== Example 3: Abort multiple concurrent requests ===");
  const controller3 = new AbortController();
  
  // Start multiple requests
  const requests = [
    gateway.execute({
      capability: "fast_text",
      input: { kind: "chat", messages: [{ role: "user", content: "Request 1" }] },
      options: { signal: controller3.signal }
    }),
    gateway.execute({
      capability: "fast_text",
      input: { kind: "chat", messages: [{ role: "user", content: "Request 2" }] },
      options: { signal: controller3.signal }
    }),
    gateway.execute({
      capability: "fast_text",
      input: { kind: "chat", messages: [{ role: "user", content: "Request 3" }] },
      options: { signal: controller3.signal }
    })
  ];

  // Abort all after 500ms
  setTimeout(() => {
    console.log("🚫 Aborting all concurrent requests...");
    controller3.abort();
  }, 500);

  const results = await Promise.allSettled(requests);
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      console.log(`  Request ${index + 1}: ✅ Completed`);
    } else {
      console.log(`  Request ${index + 1}: ❌ ${result.reason.message}`);
    }
  });
}

main().catch(console.error);
