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
import { createAIGateway } from "@ukrocks007/ai-gateway-kit";

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

## Providers

- GitHub Models: see `ai-gateway-kit/providers/github-models`
- Gemini: see `ai-gateway-kit/providers/gemini`
- Custom provider: implement `ProviderAdapter`

## Observability hooks

You can subscribe to lifecycle events without taking a dependency on any logging stack:

- `onRequestStart`
- `onRequestEnd`
- `onRateLimit`
- `onFallback`
- `onError`

## License

MIT
