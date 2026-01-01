import type {
  ModelDefinition,
  RateLimitDecision,
  RateLimitManagerOptions,
  RateLimitSnapshot
} from "../types/public.js";

interface ConcurrencyState {
  active: number;
  max: number;
}

interface DailyUsageState {
  count: number;
  resetAt: number;
}

export interface InMemoryRateLimitManager<C extends string> {
  check(model: ModelDefinition<C>): RateLimitDecision;
  acquire(model: ModelDefinition<C>): boolean;
  release(model: ModelDefinition<C>): void;
  incrementDaily(model: ModelDefinition<C>): void;
  registerProviderError(model: ModelDefinition<C>, error: { isRateLimit: boolean; retryAfterMs?: number; message: string }): void;
  getSnapshot(model: ModelDefinition<C>): RateLimitSnapshot;
  getAllSnapshots(): readonly RateLimitSnapshot[];
}

export function createInMemoryRateLimitManager<C extends string>(
  initialModels: readonly ModelDefinition<C>[],
  options: RateLimitManagerOptions = {}
): InMemoryRateLimitManager<C> {
  const now = options.now ?? (() => Date.now());
  const dailyWindowMs = options.dailyWindowMs ?? 24 * 60 * 60 * 1000;
  const defaultCooldownMs = options.defaultCooldownMs ?? 60_000;

  const cooldownUntil = new Map<string, number>();
  const concurrency = new Map<string, ConcurrencyState>();
  const dailyUsage = new Map<string, DailyUsageState>();

  const modelIndex = new Map<string, ModelDefinition<C>>(
    initialModels.map((m) => [m.id, m])
  );

  function getConcurrency(model: ModelDefinition<C>): ConcurrencyState {
    const existing = concurrency.get(model.id);
    if (existing) return existing;
    const created: ConcurrencyState = { active: 0, max: model.limits.concurrency };
    concurrency.set(model.id, created);
    return created;
  }

  function getDaily(model: ModelDefinition<C>): DailyUsageState {
    const existing = dailyUsage.get(model.id);
    if (existing) return existing;
    const created: DailyUsageState = { count: 0, resetAt: now() + dailyWindowMs };
    dailyUsage.set(model.id, created);
    return created;
  }

  function maybeResetDaily(state: DailyUsageState): void {
    if (now() >= state.resetAt) {
      state.count = 0;
      state.resetAt = now() + dailyWindowMs;
    }
  }

  function remainingCooldownMs(modelId: string): number {
    const until = cooldownUntil.get(modelId);
    if (!until) return 0;
    const remaining = until - now();
    if (remaining <= 0) {
      cooldownUntil.delete(modelId);
      return 0;
    }
    return remaining;
  }

  function computeAvailability(model: ModelDefinition<C>): "available" | "throttled" | "exhausted" {
    const daily = getDaily(model);
    maybeResetDaily(daily);

    if (daily.count >= model.limits.rpd) return "exhausted";

    const c = getConcurrency(model);
    if (c.active >= c.max) return "throttled";

    if (remainingCooldownMs(model.id) > 0) return "throttled";

    return "available";
  }

  function snapshotFor(model: ModelDefinition<C>): RateLimitSnapshot {
    const daily = getDaily(model);
    maybeResetDaily(daily);

    const cooldownMs = remainingCooldownMs(model.id);
    const c = getConcurrency(model);
    const availability = computeAvailability(model);

    return {
      modelId: model.id,
      provider: model.provider,
      rpmUsed: 0,
      rpmLimit: model.limits.rpm,
      rpdUsed: daily.count,
      rpdLimit: model.limits.rpd,
      tpmInUsed: 0,
      tpmInLimit: model.limits.tpmInput,
      tpmOutUsed: 0,
      tpmOutLimit: model.limits.tpmOutput,
      concurrentUsed: c.active,
      concurrentLimit: c.max,
      availability,
      nextAvailableAt: cooldownMs > 0 ? new Date(now() + cooldownMs) : null,
      updatedAt: new Date(now())
    };
  }

  return {
    check(model) {
      modelIndex.set(model.id, model);

      // Priority 1: concurrency
      const c = getConcurrency(model);
      if (c.active >= c.max) {
        return { allowed: false, reason: `Concurrency exhausted (${c.active}/${c.max})` };
      }

      // Priority 2: daily (hard)
      const daily = getDaily(model);
      maybeResetDaily(daily);
      if (daily.count >= model.limits.rpd) {
        const hardStop = model.isReasoning === true;
        return {
          allowed: false,
          reason: hardStop
            ? "RPD exhausted for scarce reasoning model (hard stop)"
            : "Daily quota exhausted (RPD: 0)",
          hardStop
        };
      }

      // Priority 3: cooldown
      const cooldownMs = remainingCooldownMs(model.id);
      if (cooldownMs > 0) {
        return {
          allowed: false,
          reason: `RPM cooldown active (${Math.ceil(cooldownMs / 1000)}s remaining)`,
          retryAfterMs: cooldownMs
        };
      }

      return { allowed: true };
    },

    acquire(model) {
      modelIndex.set(model.id, model);
      const c = getConcurrency(model);
      if (c.active >= c.max) return false;
      c.active += 1;
      return true;
    },

    release(model) {
      modelIndex.set(model.id, model);
      const c = getConcurrency(model);
      c.active = Math.max(0, c.active - 1);
    },

    incrementDaily(model) {
      modelIndex.set(model.id, model);
      const daily = getDaily(model);
      maybeResetDaily(daily);
      daily.count += 1;
    },

    registerProviderError(model, error) {
      modelIndex.set(model.id, model);
      if (!error.isRateLimit) return;

      const retryAfterMs = (error.retryAfterMs ?? defaultCooldownMs) + 2_000;
      cooldownUntil.set(model.id, now() + retryAfterMs);
    },

    getSnapshot(model) {
      modelIndex.set(model.id, model);
      return snapshotFor(model);
    },

    getAllSnapshots() {
      const all = Array.from(modelIndex.values());
      return all.map((m) => snapshotFor(m));
    }
  };
}
