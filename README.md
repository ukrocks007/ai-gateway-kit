# ai-gateway-kit

A boring, provider-agnostic AI Gateway for Node.js.

This library exists to solve the “production gateway” problems around LLM usage:

- **Capability-based routing** (agents request *capabilities*, not models)
- **Ordered fallback** (graceful degradation, never silent failure)
- **In-memory rate limiting** (instance-scoped by design)
- **Observability hooks** (you choose logging/metrics/tracing)

## Why capability-based routing?

Model names change, providers change, and quotas fluctuate.
A gateway that routes by *capability* lets your agents stay stable while the model fleet evolves.

Example capabilities:
- `fast_text`
- `deep_reasoning`
- `search`
- `speech_to_text`

## Why in-memory state?

This kit intentionally uses **in-memory** rate limit state.

- Works in serverless environments (Vercel-compatible)
- No shared storage dependency
- Predictable failure modes

Trade-off: **multi-instance deployments do not share quotas**. Each instance enforces limits based on its own in-memory view.

If you need cross-instance coordination, you can replace the in-memory `RateLimitManager` with your own implementation.

## This is not a chat wrapper

This library is infrastructure:
- routing
- backoff
- fallbacks
- hooks

It does **not** provide prompt templates, product policies, UI, or agent logic.

## Install

```bash
npm install ai-gateway-kit
```

## Quick start

```ts
import { createAIGateway } from "ai-gateway-kit";

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
    github: {
      type: "github-models",
      token: process.env.GITHUB_TOKEN!
    }
  }
});

const result = await gateway.execute({
  capability: "fast_text",
  input: {
    kind: "chat",
    messages: [{ role: "user", content: "Say hi." }]
  }
});

console.log(result.output);
```

**📚 [See more examples →](./examples/)**

## Core Features

### Capability-based routing
Route requests by capability, not model names. See [examples/02-capability-routing.ts](./examples/02-capability-routing.ts).

### Automatic fallback
Graceful degradation across models. See [examples/03-fallback-handling.ts](./examples/03-fallback-handling.ts).

### Rate limiting
In-memory rate limits (rpm, rpd, tpm, concurrency). See [examples/03-fallback-handling.ts](./examples/03-fallback-handling.ts).

### Multiple providers
GitHub Models, Gemini, or custom providers. See [examples/04-multi-provider.ts](./examples/04-multi-provider.ts).

### Advanced features
- JSON mode: [examples/06-json-mode.ts](./examples/06-json-mode.ts)
- Web search: [examples/07-search-capability.ts](./examples/07-search-capability.ts)
- Temperature control: [examples/08-temperature-control.ts](./examples/08-temperature-control.ts)
- Request cancellation: [examples/11-abort-requests.ts](./examples/11-abort-requests.ts)
- Dynamic registration: [examples/12-dynamic-registration.ts](./examples/12-dynamic-registration.ts)

## Providers

- **GitHub Models**: OpenAI models via GitHub ([docs](./examples/04-multi-provider.ts))
- **Gemini**: Google Gemini models with search ([docs](./examples/07-search-capability.ts))
- **Custom provider**: Implement `ProviderAdapter` interface

## Observability hooks

You can subscribe to lifecycle events without taking a dependency on any logging stack:

- `onRequestStart` - When a request begins
- `onRequestEnd` - When a request completes (success or failure)
- `onRateLimit` - When rate limits are encountered
- `onFallback` - When falling back to another model
- `onError` - When errors occur

**EExamples

The [examples](./examples/) directory contains comprehensive examples for all features:

| Example | Description |
|---------|-------------|
| [01-basic-setup.ts](./examples/01-basic-setup.ts) | Minimal setup to get started |
| [02-capability-routing.ts](./examples/02-capability-routing.ts) | Route by capability, not model name |
| [03-fallback-handling.ts](./examples/03-fallback-handling.ts) | Automatic fallback when rate limited |
| [04-multi-provider.ts](./examples/04-multi-provider.ts) | Use GitHub + Gemini together |
| [05-custom-routing.ts](./examples/05-custom-routing.ts) | Implement custom routing logic |
| [06-json-mode.ts](./examples/06-json-mode.ts) | Request structured JSON output |
| [07-search-capability.ts](./examples/07-search-capability.ts) | Web search with Gemini |
| [08-temperature-control.ts](./examples/08-temperature-control.ts) | Control creativity with temperature |
| [09-observability-hooks.ts](./examples/09-observability-hooks.ts) | Monitor with lifecycle hooks |
| [10-agent-tracking.ts](./examples/10-agent-tracking.ts) | Track multi-agent systems |
| [11-abort-requests.ts](./examples/11-abort-requests.ts) | Cancel in-flight requests |
| [12-dynamic-registration.ts](./examples/12-dynamic-registration.ts) | Add models at runtime |

**[View all examples →](./examples/)**

## xample:** [examples/09-observability-hooks.ts](./examples/09-observability-hooks.ts)

```ts
const gateway = createAIGateway({
  models: [...],
  providers: {...},
  hooks: {
    onRequestStart: (event) => {
      logger.info({ requestId: event.requestId, model: event.modelId });
    },
    onRateLimit: (event) => {
      metrics.increment("rate_limit", { model: event.modelId });
    },
    onError: (event) => {
      errorTracker.capture(event.error);
    }
  }
});
```

## License

MIT
