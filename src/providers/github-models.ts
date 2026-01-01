import type {
  GatewayInput,
  ModelDefinition,
  ProviderAdapter,
  ProviderExecuteRequest,
  ProviderExecuteResult,
  ProviderId
} from "../types/public.js";

export interface GitHubModelsProviderConfig {
  id?: ProviderId;
  token: string;
  endpoint?: string;
  modelNameMap?: Record<string, string>;
}

export function createGitHubModelsProvider<C extends string>(
  config: GitHubModelsProviderConfig
): ProviderAdapter<C> {
  const id = config.id ?? "github";
  const endpoint = config.endpoint ?? "https://models.github.ai/inference/chat/completions";
  const modelNameMap: Record<string, string> = {
    "Meta-Llama-3.1-405B-Instruct": "meta/Meta-Llama-3.1-405B-Instruct",
    "Llama-3.2-11B-Vision-Instruct": "meta/Llama-3.2-11B-Vision-Instruct",
    "Mistral-Nemo": "mistral-ai/Mistral-Nemo-Instruct-2407",
    ...(config.modelNameMap ?? {})
  };

  function toMessages(input: GatewayInput): { role: "system" | "user" | "assistant"; content: string }[] {
    if (input.kind === "chat") return input.messages;
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];
    if (input.systemPrompt) messages.push({ role: "system", content: input.systemPrompt });
    messages.push({ role: "user", content: input.userPrompt });
    return messages;
  }

  function requiresJsonInstruction(modelId: string, responseFormat: string | undefined): boolean {
    return modelId === "gpt-4o-mini" && responseFormat === "json";
  }

  function ensureJsonInstruction(
    messages: { role: "system" | "user" | "assistant"; content: string }[]
  ): { role: "system" | "user" | "assistant"; content: string }[] {
    const hasJson = messages.some((m) => m.content.toLowerCase().includes("json"));
    if (hasJson) return messages;

    const systemIndex = messages.findIndex((m) => m.role === "system");
    if (systemIndex >= 0) {
      const existing = messages[systemIndex];
      if (existing) {
        const updated = [...messages];
        updated[systemIndex] = {
          role: existing.role,
          content: `${existing.content}\n\nIMPORTANT: You must output valid JSON.`
        };
        return updated;
      }
    }

    return [{ role: "system", content: "You must output valid JSON." }, ...messages];
  }

  async function execute(request: ProviderExecuteRequest<C>): Promise<ProviderExecuteResult> {
    const model = request.model as ModelDefinition<C>;
    const apiModelName = modelNameMap[model.id] ?? model.id;

    let messages = toMessages(request.input);
    if (requiresJsonInstruction(model.id, request.options?.responseFormat)) {
      messages = ensureJsonInstruction(messages);
    }

    const payload: {
      model: string;
      messages: typeof messages;
      stream: false;
      temperature?: number;
      max_tokens?: number;
      response_format?: { type: "json_object" | "text" };
    } = {
      model: apiModelName,
      messages,
      stream: false
    };

    // GitHub reasoning models ignore temperature (keep parity with existing behavior)
    const isReasoning = model.id.startsWith("o1") || model.id.startsWith("o3");
    if (!isReasoning && typeof request.options?.temperature === "number") {
      payload.temperature = request.options.temperature;
    }

    if (typeof request.options?.maxOutputTokens === "number") {
      payload.max_tokens = request.options.maxOutputTokens;
    }

    if (request.options?.responseFormat === "json") {
      payload.response_format = { type: "json_object" };
    } else if (request.options?.responseFormat === "text") {
      payload.response_format = { type: "text" };
    }

    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`
      },
      body: JSON.stringify(payload)
    };
    if (request.options?.signal) {
      fetchOptions.signal = request.options.signal;
    }
    const response = await fetch(endpoint, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`GitHub Models API Error (${model.id}): ${response.status} ${response.statusText} - ${errorText}`) as Error & {
        status?: number;
      };
      (err as { status?: number }).status = response.status;
      throw err;
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };

    const content = data.choices?.[0]?.message?.content ?? null;
    if (!content) {
      throw new Error(`GitHub Model [${model.id}] returned empty content.`);
    }

    return { output: content };
  }

  return { id, execute };
}
