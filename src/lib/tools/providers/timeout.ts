export class ProviderTimeoutError extends Error {
  constructor(message = "Provider request timed out") {
    super(message);
    this.name = "ProviderTimeoutError";
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 8000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal, cache: "no-store" });
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.message.includes("aborted"))) {
      throw new ProviderTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function roundMoney(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}
