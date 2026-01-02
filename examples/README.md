# ai-gateway-kit Examples

This directory contains comprehensive examples demonstrating all features of ai-gateway-kit.

## Getting Started

Before running the examples, make sure you have:

1. Installed dependencies:
   ```bash
   npm install
   ```

2. Set up your environment variables:
   ```bash
   export GITHUB_TOKEN="your_github_token"
   export GEMINI_API_KEY="your_gemini_api_key"  # Optional, for Gemini examples
   ```

3. If using TypeScript directly:
   ```bash
   npx tsx examples/01-basic-setup.ts
   ```

## Examples Overview

### Core Features

- **[01-basic-setup.ts](./01-basic-setup.ts)** - Minimal setup to get started
  - Single model configuration
  - Simple request execution
  - Basic response handling

- **[02-capability-routing.ts](./02-capability-routing.ts)** - Route requests by capability
  - Multiple models with different capabilities
  - Automatic model selection
  - Capability-based architecture

- **[03-fallback-handling.ts](./03-fallback-handling.ts)** - Graceful degradation
  - Automatic fallback when rate limits hit
  - Primary + fallback model chains
  - Rate limit observability

- **[04-multi-provider.ts](./04-multi-provider.ts)** - Use multiple providers
  - GitHub Models + Gemini together
  - Cross-provider fallback
  - Provider-specific features

### Routing & Control

- **[05-custom-routing.ts](./05-custom-routing.ts)** - Implement custom routing logic
  - Custom capability router
  - Type-safe capability definitions
  - Preference-based model selection

- **[06-json-mode.ts](./06-json-mode.ts)** - Request structured JSON output
  - JSON response format
  - Structured data extraction
  - Parsing and validation

### Advanced Capabilities

- **[07-search-capability.ts](./07-search-capability.ts)** - Web search integration
  - Gemini's web search feature
  - Real-time information queries
  - Search vs. non-search comparison

- **[08-temperature-control.ts](./08-temperature-control.ts)** - Control creativity
  - Temperature parameter
  - Deterministic vs. creative outputs
  - Use case examples

### Observability & Monitoring

- **[09-observability-hooks.ts](./09-observability-hooks.ts)** - Lifecycle hooks
  - Request start/end hooks
  - Rate limit monitoring
  - Error tracking
  - Fallback events
  - Gateway state snapshots

- **[10-agent-tracking.ts](./10-agent-tracking.ts)** - Track multi-agent usage
  - Agent name metadata
  - Agent-to-model mappings
  - Usage attribution
  - Multi-agent systems

### Operational Features

- **[11-abort-requests.ts](./11-abort-requests.ts)** - Cancel in-flight requests
  - AbortSignal integration
  - Timeout implementation
  - User cancellation
  - Concurrent request abortion

- **[12-dynamic-registration.ts](./12-dynamic-registration.ts)** - Runtime model registration
  - Add models dynamically
  - No gateway recreation needed
  - Hot-swapping models

## Common Patterns

### Pattern 1: Simple Agent
```typescript
const gateway = createAIGateway({
  models: [{ id: "gpt-4o-mini", provider: "github", capabilities: ["fast_text"], limits: {...} }],
  providers: { github: { type: "github-models", token: process.env.GITHUB_TOKEN! } }
});

const result = await gateway.execute({
  capability: "fast_text",
  input: { kind: "chat", messages: [{ role: "user", content: "Hello" }] }
});
```

### Pattern 2: Multi-Provider with Fallback
```typescript
const gateway = createAIGateway({
  models: [
    { id: "primary-model", provider: "github", capabilities: ["fast_text"], limits: {...} },
    { id: "fallback-model", provider: "gemini", capabilities: ["fast_text"], limits: {...} }
  ],
  providers: {
    github: createGitHubModelsProvider({ token: process.env.GITHUB_TOKEN! }),
    gemini: createGeminiProvider({ apiKey: process.env.GEMINI_API_KEY! })
  }
});
```

### Pattern 3: Production Monitoring
```typescript
const gateway = createAIGateway({
  models: [...],
  providers: {...},
  hooks: {
    onRequestEnd: (event) => {
      logger.info({ modelId: event.modelId, duration: event.endedAt - event.startedAt });
    },
    onError: (event) => {
      errorTracker.captureException(event.error);
    }
  }
});
```

## Capabilities Reference

| Capability | Description | Example Models |
|------------|-------------|----------------|
| `fast_text` | Quick text generation | gpt-4o-mini, gemini-2.0-flash-lite |
| `cheap_background` | Cost-effective background tasks | gpt-3.5-turbo, gemini-2.0-flash-lite |
| `deep_reasoning` | Complex reasoning tasks | o3-mini, o1, gemini-2.5-flash |
| `long_context` | Long document processing | gpt-4o, gemini-2.5-flash |
| `vision` | Image understanding | gpt-4o, Llama-3.2-11B-Vision |
| `search` | Web search integration | gemini-2.5-flash |
| `creative_writing` | Creative content generation | gpt-4o, gemini-2.0-flash-exp |

## Environment Setup

### GitHub Models
Get a GitHub token from [GitHub Settings](https://github.com/settings/tokens) with access to GitHub Models.

```bash
export GITHUB_TOKEN="github_pat_..."
```

### Gemini
Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

```bash
export GEMINI_API_KEY="AIza..."
```

## Troubleshooting

### Rate Limits
If you hit rate limits frequently, consider:
- Adjusting the `limits` configuration
- Adding more fallback models
- Using the `onRateLimit` hook to monitor

### Provider Errors
Check:
- Environment variables are set correctly
- API keys have the necessary permissions
- Network connectivity to provider endpoints

### Type Errors
Ensure you're using the correct types:
```typescript
import type { Capability, Gateway } from "../src";

// For custom capabilities
type MyCapability = "custom_capability";
const gateway: Gateway<MyCapability> = createAIGateway<MyCapability>({...});
```

## Next Steps

1. Start with [01-basic-setup.ts](./01-basic-setup.ts)
2. Explore capability routing with [02-capability-routing.ts](./02-capability-routing.ts)
3. Add production monitoring with [09-observability-hooks.ts](./09-observability-hooks.ts)
4. Implement multi-provider failover with [04-multi-provider.ts](./04-multi-provider.ts)

For more information, see the [main README](../README.md).
