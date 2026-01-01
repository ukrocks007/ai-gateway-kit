import type { ProviderError, ProviderId } from "../types/public.js";

export function parseRetryAfterMsFromText(text: string): number | undefined {
  // Supports formats seen in GitHub Models + Gemini error messages.
  // - "Please retry in 57.82s"
  // - "retryDelay":"57s"
  // - "wait 12 seconds" / "try again in 12 seconds"
  const geminiFloat = text.match(/Please retry in ([\d.]+)s/);
  if (geminiFloat?.[1]) {
    const seconds = Math.ceil(Number.parseFloat(geminiFloat[1]));
    if (Number.isFinite(seconds)) return seconds * 1000;
  }

  const retryDelay = text.match(/"retryDelay":"(\d+)s"/);
  if (retryDelay?.[1]) {
    const seconds = Number.parseInt(retryDelay[1], 10);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }

  const secondsMatch =
    text.match(/wait (\d+) seconds?/i) ?? text.match(/in (\d+) seconds?/i);
  if (secondsMatch?.[1]) {
    const seconds = Number.parseInt(secondsMatch[1], 10);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }

  if (text.toLowerCase().includes("per 60s")) return 60_000;

  return undefined;
}

export function normalizeToProviderError(
  error: unknown,
  provider: ProviderId,
  hints?: { retryAfterMsHint: number }
): ProviderError {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);

  const rawStatusCode =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status: unknown }).status)
      : NaN;

  const statusCode = Number.isFinite(rawStatusCode) ? rawStatusCode : undefined;

  const isRateLimit =
    statusCode === 429 || message.toLowerCase().includes("rate limit") || message.includes(" 429");

  const isTransient =
    typeof statusCode === "number" ? statusCode >= 500 : message.toLowerCase().includes("fetch") || false;

  const retryAfterMs = hints?.retryAfterMsHint;

  const providerError = new Error(message) as ProviderError;
  providerError.name = "ProviderError";
  providerError.provider = provider;
  if (statusCode !== undefined) {
    providerError.statusCode = statusCode;
  }
  providerError.isRateLimit = isRateLimit;
  providerError.isTransient = isTransient;
  if (retryAfterMs !== undefined) {
    providerError.retryAfterMs = retryAfterMs;
  }
  providerError.raw = error;

  return providerError;
}
