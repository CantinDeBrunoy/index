export interface RetryOptions {
  /** Attempts after the first one. */
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, detail: string) {
    super(detail ? `HTTP ${status} : ${detail}` : `HTTP ${status}`);
    this.name = "HttpError";
    this.status = status;
  }
}

/**
 * fetch with a timeout, retried with exponential backoff (1 s, 2 s, 4 s…) on network errors,
 * 429 and 5xx. On 429 the wait follows the server's hint when there is one. Once retries are
 * exhausted the last response is returned as is: callers check `response.ok`.
 */
export async function fetchWithRetry(
  url: string | URL,
  init: RequestInit = {},
  options: RetryOptions = {},
): Promise<Response> {
  const {
    retries = 3,
    baseDelayMs = 1_000,
    maxDelayMs = 60_000,
    timeoutMs = 20_000,
    fetch: fetchImpl = fetch,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  } = options;

  for (let attempt = 0; ; attempt++) {
    const backoff = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      if (attempt >= retries) throw error;
      await sleep(backoff);
      continue;
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= retries) return response;

    await response.body?.cancel().catch(() => {});
    const hint = response.status === 429 ? rateLimitResetMs(response) : undefined;
    await sleep(Math.min(hint ?? backoff, maxDelayMs));
  }
}

/**
 * Travelpayouts sends X-Rate-Limit-Reset (seconds until the per-minute quota resets),
 * other servers the standard Retry-After (seconds).
 */
function rateLimitResetMs(response: Response): number | undefined {
  for (const header of ["x-rate-limit-reset", "retry-after"]) {
    const value = response.headers.get(header);
    if (value === null || value.trim() === "") continue;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000 + 500;
  }
  return undefined;
}
