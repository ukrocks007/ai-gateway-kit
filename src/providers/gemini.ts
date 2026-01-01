import type {
  GatewayInput,
  ProviderAdapter,
  ProviderExecuteRequest,
  ProviderExecuteResult,
  ProviderId
} from "../types/public.js";

export interface GeminiProviderConfig {
  id?: ProviderId;
  apiKey: string;
}

export function createGeminiProvider<C extends string>(
  _config: GeminiProviderConfig
): ProviderAdapter<C> {
  const id = _config.id ?? "gemini";

  function toPrompts(input: GatewayInput): { systemPrompt: string | null; userPrompt: string } {
    if (input.kind === "prompt") {
      return { systemPrompt: input.systemPrompt ?? null, userPrompt: input.userPrompt };
    }

    const systemPrompt = input.messages.find((m) => m.role === "system")?.content ?? null;
    const userPrompt = input.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    return { systemPrompt, userPrompt };
  }

  async function execute(request: ProviderExecuteRequest<C>): Promise<ProviderExecuteResult> {
    // Lazy import so core users don't need the dependency.
    // @ts-expect-error -- peer dependency may not be installed at typecheck time
    const mod = await import("@google/generative-ai");
    const genAI = new mod.GoogleGenerativeAI(_config.apiKey);

    const { systemPrompt, userPrompt } = toPrompts(request.input);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelConfig: any = {
      model: request.model.id
    };
    if (systemPrompt !== null) {
      modelConfig.systemInstruction = systemPrompt;
    }
    if (request.options?.useSearch) {
      modelConfig.tools = [{ googleSearch: {} }];
    }
    const model = genAI.getGenerativeModel(modelConfig);

    const responseMimeType =
      request.options?.responseFormat === "json" && !request.options?.useSearch
        ? "application/json"
        : "text/plain";

    const generationConfig: { temperature?: number; responseMimeType: string } = {
      responseMimeType
    };
    if (request.options?.temperature !== undefined) {
      generationConfig.temperature = request.options.temperature;
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig
    });

    const text = result.response.text();
    if (!text) {
      throw new Error(`Gemini model [${request.model.id}] returned empty content.`);
    }

    return { output: text };
  }

  return { id, execute };
}
