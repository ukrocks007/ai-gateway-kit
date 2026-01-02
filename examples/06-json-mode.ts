/**
 * JSON Mode Example
 * 
 * This example demonstrates how to request structured JSON output
 * from the models using the responseFormat option.
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
  // Request structured JSON output
  const result = await gateway.execute({
    capability: "fast_text",
    input: {
      kind: "chat",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that outputs JSON." 
        },
        { 
          role: "user", 
          content: "Create a user profile with name, age, and hobbies for a fictional character." 
        }
      ]
    },
    options: {
      responseFormat: "json"
    }
  });

  console.log("Raw response:", result.output);
  
  // Parse the JSON response
  const parsed = JSON.parse(result.output);
  console.log("\nParsed JSON:");
  console.log(JSON.stringify(parsed, null, 2));

  // Another example: structured data extraction
  const extractResult = await gateway.execute({
    capability: "fast_text",
    input: {
      kind: "prompt",
      systemPrompt: "Extract structured information and return as JSON with keys: city, country, population, continent.",
      userPrompt: "Paris is the capital of France, with approximately 2.2 million people living in the city proper."
    },
    options: {
      responseFormat: "json"
    }
  });

  console.log("\nExtracted data:");
  console.log(JSON.parse(extractResult.output));
}

main().catch(console.error);
