import { createModelRegistry } from "../registry/modelRegistry.js";
import { createInMemoryRateLimitManager } from "../rate-limiter/rateLimitManager.js";
import { normalizeToProviderError, parseRetryAfterMsFromText } from "../utils/errors.js";
import type {
  Capability,
  CapabilityRouter,
  Gateway,
  GatewayExecuteRequest,
  GatewayExecuteResult,
  GatewayHooks,
  GatewayStateSnapshot,
  GatewayAgentMapping,
  GatewayModelRegistryEntry,
  ModelDefinition,
  ProviderAdapter,
  ProviderExecuteRequest,
  ProviderId
} from "../types/public.js";

interface RecentRequest {
  requestId: string;
  agentName: string;
  capability: string;
  modelUsed: string;
  provider: ProviderId;
  status: "success" | "fallback" | "blocked" | "error";
  latencyMs: number;
}

export interface CreateAIGatewayConfig<C extends string = Capability> {
  models?: readonly ModelDefinition<C>[];
  providers: Record<string, ProviderAdapter<C>>;
  router?: CapabilityRouter<C>;
  hooks?: GatewayHooks<C>;
  now?: () => number;
  maxRecentRequests?: number;
}

export function createAIGateway<C extends string = Capability>(
  config: CreateAIGatewayConfig<C>
): Gateway<C> {
  const now = config.now ?? (() => Date.now());
  const hooks = config.hooks;
  const maxRecent = config.maxRecentRequests ?? 100;

  const registry = createModelRegistry<C>();
  const initialModels = config.models ?? [];
  registry.register(initialModels);

  const rateLimiter = createInMemoryRateLimitManager<C>(initialModels, { now });

  const recentRequests: RecentRequest[] = [];
  const agentLastUse = new Map<
    string,
    { capability: C; modelId: string; timestamp: number }
  >();

  const defaultRouter: CapabilityRouter<C> = {
    getModelOrderForCapability(capability: C) {
      const all = registry.getAllModels();
      return all.filter((m) => m.capabilities.includes(capability)).map((m) => m.id);
    }
  };

  const router = config.router ?? defaultRouter;

  function pushRecent(entry: RecentRequest): void {
    recentRequests.push(entry);
    if (recentRequests.length > maxRecent) recentRequests.shift();
  }

  function snapshot(): GatewayStateSnapshot {
    const models = registry.getAllModels();
    const rateLimits = rateLimiter.getAllSnapshots();

    const availabilityByModel = new Map<string, "available" | "limited" | "exhausted">(
      rateLimits.map((s) => [
        s.modelId,
        s.availability === "throttled" ? "limited" : s.availability
      ])
    );

    const modelRegistry: GatewayModelRegistryEntry[] = models.map((m) => ({
      id: m.id,
      provider: m.provider,
      tier: m.tier ?? "",
      capabilities: m.capabilities as readonly string[],
      limits: m.limits,
      isReasoning: m.isReasoning === true,
      availability: availabilityByModel.get(m.id) ?? "available"
    }));

    const agentMappings: GatewayAgentMapping[] = Array.from(agentLastUse.entries())
      .map(([agentName, usage]) => {
        const queue = router.getModelOrderForCapability(usage.capability);
        return {
          agentName,
          capabilities: [usage.capability as string],
          primaryModels: queue.slice(0, 2),
          fallbackModels: queue.slice(2),
          lastUsedModel: usage.modelId,
          lastUsedTimestamp: usage.timestamp
        };
      })
      .sort((a, b) => (b.lastUsedTimestamp ?? 0) - (a.lastUsedTimestamp ?? 0));

    return {
      timestamp: now(),
      recentRequests: [...recentRequests].slice(-50).reverse(),
      rateLimits,
      models: models as readonly ModelDefinition[],
      modelRegistry,
      agentMappings
    };
  }

  return {
    registerModels(models) {
      registry.register(models);
      for (const model of models) {
        rateLimiter.getSnapshot(model);
      }
    },

    async execute(request: GatewayExecuteRequest<C>): Promise<GatewayExecuteResult> {
      const requestId = `${now()}-${Math.random().toString(36).slice(2, 10)}`;
      const startedAt = now();
      const agentName = request.metadata?.agentName ?? "unknown";

      const modelQueue = router.getModelOrderForCapability(request.capability);
      if (modelQueue.length === 0) {
        const latencyMs = now() - startedAt;
        pushRecent({
          requestId,
          agentName,
          capability: String(request.capability),
          modelUsed: "none",
          provider: "none",
          status: "blocked",
          latencyMs
        });
        throw new Error(`No models available for capability: ${String(request.capability)}`);
      }

      const attempts: {
        modelId: string;
        provider: ProviderId;
        ok: boolean;
        errorMessage?: string;
        startedAt: number;
        endedAt: number;
      }[] = [];

      const rateLimitBlocks: { modelId: string; reason: string }[] = [];

      for (let attempt = 0; attempt < modelQueue.length; attempt += 1) {
        const modelId = modelQueue[attempt];
        if (modelId === undefined) continue;

        const model = registry.getModel(modelId);
        if (!model) {
          rateLimitBlocks.push({ modelId, reason: "Unknown model" });
          continue;
        }

        const provider = config.providers[model.provider];
        if (!provider) {
          rateLimitBlocks.push({ modelId, reason: `No provider adapter registered for: ${model.provider}` });
          continue;
        }

        const decision = rateLimiter.check(model);
        if (!decision.allowed) {
          rateLimitBlocks.push({ modelId, reason: decision.reason ?? "Rate limited" });
          hooks?.onRateLimit?.({
            requestId,
            capability: request.capability,
            modelId,
            provider: model.provider,
            decision
          });

          if (decision.hardStop) {
            const latencyMs = now() - startedAt;
            pushRecent({
              requestId,
              agentName,
              capability: String(request.capability),
              modelUsed: modelId,
              provider: model.provider,
              status: "blocked",
              latencyMs
            });
            throw new Error(decision.reason ?? "Hard stop due to rate limit");
          }

          continue;
        }

        if (!rateLimiter.acquire(model)) {
          rateLimitBlocks.push({ modelId, reason: "Concurrency limit reached" });
          continue;
        }

        const attemptStartedAt = now();
        hooks?.onRequestStart?.({
          requestId,
          capability: request.capability,
          modelId,
          provider: model.provider,
          attempt,
          startedAt: attemptStartedAt
        });

        try {
          // Build options without undefined values for exactOptionalPropertyTypes
          const execOptions: ProviderExecuteRequest<C>["options"] = {};
          if (request.options?.temperature !== undefined) {
            execOptions.temperature = request.options.temperature;
          }
          if (request.options?.maxOutputTokens !== undefined) {
            execOptions.maxOutputTokens = request.options.maxOutputTokens;
          }
          if (request.options?.responseFormat !== undefined) {
            execOptions.responseFormat = request.options.responseFormat;
          }
          if (request.options?.useSearch !== undefined) {
            execOptions.useSearch = request.options.useSearch;
          }
          if (request.options?.signal !== undefined) {
            execOptions.signal = request.options.signal;
          }

          const executeRequest: ProviderExecuteRequest<C> = {
            model,
            input: request.input
          };
          if (Object.keys(execOptions).length > 0) {
            executeRequest.options = execOptions;
          }

          const result = await provider.execute(executeRequest);

          rateLimiter.incrementDaily(model);

          const attemptEndedAt = now();
          attempts.push({
            modelId,
            provider: model.provider,
            ok: true,
            startedAt: attemptStartedAt,
            endedAt: attemptEndedAt
          });

          hooks?.onRequestEnd?.({
            requestId,
            capability: request.capability,
            modelId,
            provider: model.provider,
            attempt,
            startedAt: attemptStartedAt,
            endedAt: attemptEndedAt,
            ok: true
          });

          const latencyMs = now() - startedAt;
          const status: RecentRequest["status"] = attempt === 0 ? "success" : "fallback";

          agentLastUse.set(agentName, {
            capability: request.capability,
            modelId,
            timestamp: now()
          });

          pushRecent({
            requestId,
            agentName,
            capability: String(request.capability),
            modelUsed: modelId,
            provider: model.provider,
            status,
            latencyMs
          });

          return {
            output: result.output,
            modelUsed: modelId,
            provider: model.provider,
            attempts,
            rateLimitBlocks,
            executionTimeMs: latencyMs
          };
        } catch (unknownError) {
          const errMsg = String((unknownError as { message?: unknown })?.message ?? "");
          const retryHint = parseRetryAfterMsFromText(errMsg);

          const providerError = normalizeToProviderError(
            unknownError,
            model.provider,
            retryHint !== undefined ? { retryAfterMsHint: retryHint } : undefined
          );

          const errorInfo: { isRateLimit: boolean; message: string; retryAfterMs?: number } = {
            isRateLimit: providerError.isRateLimit === true,
            message: providerError.message
          };
          if (providerError.retryAfterMs !== undefined) {
            errorInfo.retryAfterMs = providerError.retryAfterMs;
          }
          rateLimiter.registerProviderError(model, errorInfo);

          const attemptEndedAt = now();
          attempts.push({
            modelId,
            provider: model.provider,
            ok: false,
            errorMessage: providerError.message,
            startedAt: attemptStartedAt,
            endedAt: attemptEndedAt
          });

          hooks?.onError?.({
            requestId,
            capability: request.capability,
            modelId,
            provider: model.provider,
            error: providerError
          });

          hooks?.onRequestEnd?.({
            requestId,
            capability: request.capability,
            modelId,
            provider: model.provider,
            attempt,
            startedAt: attemptStartedAt,
            endedAt: attemptEndedAt,
            ok: false
          });

          // If there is a next model, emit fallback.
          const next = modelQueue[attempt + 1];
          if (next !== undefined) {
            hooks?.onFallback?.({
              requestId,
              capability: request.capability,
              fromModelId: modelId,
              toModelId: next,
              reason: providerError.message
            });
            continue;
          }

          const latencyMs = now() - startedAt;
          pushRecent({
            requestId,
            agentName,
            capability: String(request.capability),
            modelUsed: modelId,
            provider: model.provider,
            status: "error",
            latencyMs
          });

          throw new Error(
            `All models failed for capability ${String(request.capability)}. Last error: ${providerError.message}`
          );
        } finally {
          rateLimiter.release(model);
        }
      }

      const latencyMs = now() - startedAt;
      pushRecent({
        requestId,
        agentName,
        capability: String(request.capability),
        modelUsed: "none",
        provider: "none",
        status: "blocked",
        latencyMs
      });

      throw new Error(`All models exhausted for capability: ${String(request.capability)}`);
    },

    getGatewayState(): GatewayStateSnapshot {
      return snapshot();
    }
  };
}
