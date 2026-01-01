export { createAIGateway } from "./gateway/createAIGateway.js";
export type {
  Gateway,
  GatewayExecuteRequest,
  GatewayExecuteResult,
  GatewayInput,
  GatewayMessage,
  GatewayHooks,
  GatewayStateSnapshot,
  CapabilityRouter,
  Capability,
  ModelDefinition,
  ProviderAdapter,
  ProviderExecuteRequest,
  ProviderExecuteResult,
  ProviderError,
  RateLimitDecision,
  RateLimitSnapshot,
  RateLimitManagerOptions
} from "./types/public.js";

export { createInMemoryRateLimitManager } from "./rate-limiter/rateLimitManager.js";
export { createModelRegistry, registerModels } from "./registry/modelRegistry.js";

export {
  DEFAULT_CAPABILITY_ROUTING,
  DEFAULT_GEMINI_MODELS,
  DEFAULT_GITHUB_MODELS,
  getDefaultModels,
  createStaticCapabilityRouter
} from "./registry/presets.js";

// Provider adapters
export { createGitHubModelsProvider } from "./providers/github-models.js";
export { createGeminiProvider } from "./providers/gemini.js";
