/**
 * Retry fetch helper with exponential backoff and jitter
 * Used for API calls that may fail transiently (429, 5xx)
 */

import { getTestRandom } from "./testRandom";
import { isTestMode } from "./env";

interface RetryOptions {
  attempts?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

interface TraceLog {
  start: number;
  attempt: number;
  status?: number;
  ms: number;
  replyLen?: number;
  error?: string;
}

export async function retryFetch<T = unknown>(
  url: string,
  body: T,
  options: RetryOptions = {}
): Promise<Response> {
  const {
    attempts = 3,
    timeoutMs = 8000,
    baseDelayMs = 200,
    maxDelayMs = 400,
  } = options;

  const startTime = Date.now();
  const trace: TraceLog[] = [];

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const attemptStart = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - attemptStart;

      // Log trace (test mode only)
      if (isTestMode()) {
        const log: TraceLog = {
          start: startTime,
          attempt,
          status: response.status,
          ms: elapsed,
        };
        trace.push(log);
        console.log('[retryFetch]', log);
      }

      // Retry on 429 or 5xx
      if ((response.status === 429 || response.status >= 500) && attempt < attempts) {
        const jitter = baseDelayMs + getTestRandom() * (maxDelayMs - baseDelayMs);
        await new Promise((resolve) => setTimeout(resolve, jitter));
        continue;
      }

      // Success or non-retryable error
      if (isTestMode() && trace.length > 0) {
        (window as any).__nap_trace = trace;
      }
      return response;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - attemptStart;

      // Log trace (test mode only)
      if (isTestMode()) {
        const log: TraceLog = {
          start: startTime,
          attempt,
          ms: elapsed,
          error: error instanceof Error ? error.message : String(error),
        };
        trace.push(log);
        console.log('[retryFetch]', log);
      }

      // Retry on network errors or abort (unless last attempt)
      if (attempt < attempts && (error instanceof Error && (error.name === 'AbortError' || error.message.includes('fetch')))) {
        const jitter = baseDelayMs + getTestRandom() * (maxDelayMs - baseDelayMs);
        await new Promise((resolve) => setTimeout(resolve, jitter));
        continue;
      }

      // Last attempt failed
      if (isTestMode() && trace.length > 0) {
        (window as any).__nap_trace = trace;
      }
      throw error;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error('All retry attempts exhausted');
}

