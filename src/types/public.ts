export type Capability =
  | "fast_text"
  | "cheap_background"
  | "deep_reasoning"
  | "long_context"
  | "vision"
  | "search"
  | "speech_to_text"
  | "creative_writing";

export type ProviderId = string;

export type GatewayMessageRole = "system" | "user" | "assistant";

export interface GatewayMessage {
  role: GatewayMessageRole;
  content: string;
}

export type GatewayInput =
  | {
      kind: "chat";
      messages: GatewayMessage[];
    }
  | {
      kind: "prompt";
      systemPrompt?: string;
      userPrompt: string;
    };

export interface ModelLimits {
  rpm: number;
  rpd: number;
  tpmInput: number;
  tpmOutput: number;
  concurrency: number;
}

export interface ModelDefinition<C extends string = Capability> {
  id: string;
  provider: ProviderId;
  capabilities: readonly C[];
  limits: ModelLimits;
  tier?: string;
  isReasoning?: boolean;
  metadata?: Record<string, string>;
}

export interface RateLimitDecision {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
  hardStop?: boolean;
}

export type RateLimitAvailability = "available" | "throttled" | "exhausted";

export interface RateLimitSnapshot {
  modelId: string;
  provider: ProviderId;

  rpmUsed: number;
  rpmLimit: number;

  rpdUsed: number;
  rpdLimit: number;

  tpmInUsed: number;
  tpmInLimit: number;
  tpmOutUsed: number;
  tpmOutLimit: number;

  concurrentUsed: number;
  concurrentLimit: number;

  availability: RateLimitAvailability;
  nextAvailableAt: Date | null;

  updatedAt: Date;
}

export interface RateLimitManagerOptions {
  now?: () => number;
  dailyWindowMs?: number;
  defaultCooldownMs?: number;
}

export interface ProviderError extends Error {
  name: "ProviderError";
  provider: ProviderId;
  statusCode?: number;
  isRateLimit?: boolean;
  isTransient?: boolean;
  retryAfterMs?: number;
  raw?: unknown;
}

export interface ProviderExecuteRequest<C extends string = Capability> {
  model: ModelDefinition<C>;
  input: GatewayInput;
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseFormat?: "json" | "text";
    useSearch?: boolean;
    signal?: AbortSignal;
  };
}

export interface ProviderExecuteResult {
  output: string;
}

export interface ProviderAdapter<C extends string = Capability> {
  id: ProviderId;
  execute(request: ProviderExecuteRequest<C>): Promise<ProviderExecuteResult>;
}

export interface CapabilityRouter<C extends string = Capability> {
  getModelOrderForCapability(capability: C): readonly string[];
}

export interface GatewayHooks<C extends string = Capability> {
  onRequestStart?: (event: {
    requestId: string;
    capability: C;
    modelId: string;
    provider: ProviderId;
    attempt: number;
    startedAt: number;
  }) => void;

  onRequestEnd?: (event: {
    requestId: string;
    capability: C;
    modelId: string;
    provider: ProviderId;
    attempt: number;
    startedAt: number;
    endedAt: number;
    ok: boolean;
  }) => void;

  onRateLimit?: (event: {
    requestId: string;
    capability: C;
    modelId: string;
    provider: ProviderId;
    decision: RateLimitDecision;
  }) => void;

  onFallback?: (event: {
    requestId: string;
    capability: C;
    fromModelId: string;
    toModelId: string;
    reason: string;
  }) => void;

  onError?: (event: {
    requestId: string;
    capability: C;
    modelId: string;
    provider: ProviderId;
    error: ProviderError;
  }) => void;
}

export interface GatewayExecuteRequest<C extends string = Capability> {
  capability: C;
  input: GatewayInput;
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseFormat?: "json" | "text";
    useSearch?: boolean;
    signal?: AbortSignal;
  };
  metadata?: {
    agentName?: string;
  };
}

export interface GatewayAttempt {
  modelId: string;
  provider: ProviderId;
  ok: boolean;
  errorMessage?: string;
  startedAt: number;
  endedAt: number;
}

export interface GatewayExecuteResult {
  output: string;
  modelUsed: string;
  provider: ProviderId;
  attempts: readonly GatewayAttempt[];
  rateLimitBlocks: readonly { modelId: string; reason: string }[];
  executionTimeMs: number;
}

export interface GatewayModelRegistryEntry {
  id: string;
  provider: ProviderId;
  tier: string;
  capabilities: readonly string[];
  limits: ModelLimits;
  isReasoning: boolean;
  availability: "available" | "limited" | "exhausted";
}

export interface GatewayAgentMapping {
  agentName: string;
  capabilities: readonly string[];
  primaryModels: readonly string[];
  fallbackModels: readonly string[];
  lastUsedModel?: string;
  lastUsedTimestamp?: number;
}

export interface GatewayStateSnapshot {
  timestamp: number;
  recentRequests: readonly {
    requestId: string;
    agentName: string;
    capability: string;
    modelUsed: string;
    provider: ProviderId;
    status: "success" | "fallback" | "blocked" | "error";
    latencyMs: number;
  }[];
  rateLimits: readonly RateLimitSnapshot[];
  models: readonly ModelDefinition[];
  modelRegistry: readonly GatewayModelRegistryEntry[];
  agentMappings: readonly GatewayAgentMapping[];
}

export interface Gateway<C extends string = Capability> {
  registerModels(models: readonly ModelDefinition<C>[]): void;
  execute(request: GatewayExecuteRequest<C>): Promise<GatewayExecuteResult>;
  getGatewayState(): GatewayStateSnapshot;
}
