import type { Capability, CapabilityRouter, ModelDefinition } from "../types/public.js";

export const DEFAULT_GITHUB_MODELS: readonly ModelDefinition<Capability>[] = [
  {
    id: "gpt-4o-mini",
    provider: "github",
    tier: "low",
    limits: { rpm: 15, rpd: 150, tpmInput: 150000, tpmOutput: 20000, concurrency: 3 },
    capabilities: ["fast_text"]
  },
  {
    id: "gpt-3.5-turbo",
    provider: "github",
    tier: "low",
    limits: { rpm: 15, rpd: 150, tpmInput: 150000, tpmOutput: 20000, concurrency: 3 },
    capabilities: ["fast_text", "cheap_background"]
  },
  {
    id: "Llama-3.2-11B-Vision-Instruct",
    provider: "github",
    tier: "low",
    limits: { rpm: 15, rpd: 150, tpmInput: 150000, tpmOutput: 20000, concurrency: 3 },
    capabilities: ["fast_text", "vision"]
  },
  {
    id: "Mistral-Nemo",
    provider: "github",
    tier: "low",
    limits: { rpm: 15, rpd: 150, tpmInput: 150000, tpmOutput: 20000, concurrency: 3 },
    capabilities: ["fast_text"]
  },
  {
    id: "gpt-4o",
    provider: "github",
    tier: "high",
    limits: { rpm: 10, rpd: 50, tpmInput: 450000, tpmOutput: 60000, concurrency: 2 },
    capabilities: ["fast_text", "long_context", "vision"]
  },
  {
    id: "Meta-Llama-3.1-405B-Instruct",
    provider: "github",
    tier: "high",
    limits: { rpm: 10, rpd: 50, tpmInput: 450000, tpmOutput: 60000, concurrency: 2 },
    capabilities: ["fast_text", "long_context"]
  },
  {
    id: "o1-preview",
    provider: "github",
    tier: "azure_reasoning",
    isReasoning: true,
    limits: { rpm: 3, rpd: 10, tpmInput: 100000, tpmOutput: 20000, concurrency: 1 },
    capabilities: ["deep_reasoning"]
  },
  {
    id: "o1",
    provider: "github",
    tier: "azure_reasoning",
    isReasoning: true,
    limits: { rpm: 3, rpd: 10, tpmInput: 100000, tpmOutput: 20000, concurrency: 1 },
    capabilities: ["deep_reasoning"]
  },
  {
    id: "o3-mini",
    provider: "github",
    tier: "azure_reasoning",
    isReasoning: true,
    limits: { rpm: 5, rpd: 20, tpmInput: 150000, tpmOutput: 30000, concurrency: 1 },
    capabilities: ["deep_reasoning"]
  }
];

export const DEFAULT_GEMINI_MODELS: readonly ModelDefinition<Capability>[] = [
  {
    id: "gemini-2.5-flash",
    provider: "gemini",
    tier: "high",
    limits: { rpm: 5, rpd: 20, tpmInput: 250000, tpmOutput: 250000, concurrency: 5 },
    capabilities: ["fast_text", "long_context", "search"]
  },
  {
    id: "gemini-2.5-flash-lite",
    provider: "gemini",
    tier: "low",
    limits: { rpm: 10, rpd: 20, tpmInput: 250000, tpmOutput: 250000, concurrency: 10 },
    capabilities: ["fast_text", "cheap_background"]
  },
  {
    id: "gemini-2.0-flash-exp",
    provider: "gemini",
    tier: "high",
    limits: { rpm: 30, rpd: 500, tpmInput: 500000, tpmOutput: 100000, concurrency: 5 },
    capabilities: ["fast_text", "long_context"]
  },
  {
    id: "gemini-2.0-flash-lite",
    provider: "gemini",
    tier: "low",
    limits: { rpm: 50, rpd: 1000, tpmInput: 1000000, tpmOutput: 200000, concurrency: 10 },
    capabilities: ["fast_text", "cheap_background"]
  }
];

export const DEFAULT_CAPABILITY_ROUTING: Record<Capability, readonly string[]> = {
  fast_text: [
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gpt-4o-mini",
    "Mistral-Nemo"
  ],
  cheap_background: ["gemini-2.0-flash-lite", "gpt-3.5-turbo"],
  deep_reasoning: ["o3-mini", "o1", "o1-preview", "gemini-2.5-flash"],
  long_context: [
    "gemini-2.5-flash",
    "gemini-2.0-flash-exp",
    "gpt-4o",
    "Meta-Llama-3.1-405B-Instruct"
  ],
  vision: ["gpt-4o", "Llama-3.2-11B-Vision-Instruct"],
  search: [
    "gemini-2.5-flash",
    "gpt-4o",
    "gpt-4o-mini",
    "Meta-Llama-3.1-405B-Instruct"
  ],
  creative_writing: ["gpt-4o", "gemini-2.0-flash-exp", "gemini-2.5-flash", "gpt-4o-mini"],
  speech_to_text: []
};

export function createStaticCapabilityRouter<C extends string>(
  routing: Record<C, readonly string[]>
): CapabilityRouter<C> {
  return {
    getModelOrderForCapability(capability: C) {
      return routing[capability] ?? [];
    }
  };
}

export function getDefaultModels(): readonly ModelDefinition<Capability>[] {
  return [...DEFAULT_GITHUB_MODELS, ...DEFAULT_GEMINI_MODELS];
}