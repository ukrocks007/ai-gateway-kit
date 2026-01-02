/**
 * Agent Tracking Example
 * 
 * This example demonstrates how to track which agents are using which models,
 * useful for monitoring and attribution in multi-agent systems.
 */

import { createAIGateway, createGitHubModelsProvider } from "../src/index";

const gateway = createAIGateway({
  models: [
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
    }
  ],
  providers: {
    github: createGitHubModelsProvider({
      token: process.env.GITHUB_TOKEN!
    })
  }
});

async function simulateAgent(agentName: string, capability: "fast_text" | "deep_reasoning", tasks: string[]) {
  console.log(`\n🤖 ${agentName} starting ${tasks.length} tasks...`);
  
  for (const task of tasks) {
    const result = await gateway.execute({
      capability,
      input: {
        kind: "chat",
        messages: [{ role: "user", content: task }]
      },
      metadata: {
        agentName  // Track which agent made the request
      }
    });
    
    console.log(`  ✓ ${agentName}: ${result.modelUsed} - ${result.output.substring(0, 40)}...`);
  }
}

async function main() {
  // Simulate multiple agents working concurrently
  await Promise.all([
    simulateAgent("research-agent", "fast_text", [
      "What is TypeScript?",
      "What is Node.js?"
    ]),
    simulateAgent("reasoning-agent", "deep_reasoning", [
      "Solve: If a train travels at 60 mph for 2.5 hours, how far does it go?"
    ]),
    simulateAgent("chat-agent", "fast_text", [
      "Say hello",
      "What's the weather like?"
    ])
  ]);

  // Get gateway state to see agent mappings
  const state = gateway.getGatewayState();
  
  console.log("\n\n=== Agent Mappings ===");
  state.agentMappings.forEach((mapping: import('ai-gateway-kit').GatewayAgentMapping) => {
    console.log(`\n${mapping.agentName}:`);
    console.log(`  Capabilities: ${mapping.capabilities.join(", ")}`);
    console.log(`  Primary models: ${mapping.primaryModels.join(", ")}`);
    console.log(`  Last used: ${mapping.lastUsedModel}`);
    if (mapping.lastUsedTimestamp) {
      const ago = Date.now() - mapping.lastUsedTimestamp;
      console.log(`  Last active: ${Math.round(ago / 1000)}s ago`);
    }
  });

  console.log("\n\n=== Recent Requests by Agent ===");
  const requestsByAgent = new Map<string, number>();
  state.recentRequests.forEach((req: typeof state.recentRequests[0]) => {
    requestsByAgent.set(req.agentName, (requestsByAgent.get(req.agentName) || 0) + 1);
  });
  
  requestsByAgent.forEach((count, agentName) => {
    console.log(`  ${agentName}: ${count} requests`);
  });
}

main().catch(console.error);
