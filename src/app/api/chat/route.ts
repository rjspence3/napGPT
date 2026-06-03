import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { respond } from "@/lib/nap/engine";
import { preprocessCommands } from "@/lib/nap/utils";
import { getTestRandom } from "@/lib/utils/testRandom";
import { isTestMode } from "@/lib/utils/env";
import type { LLMMessage } from "@/lib/llm/adapter";
import { getLLMConfig } from "@/lib/llm/adapter";
import type { TestConfigOverrides } from "@/lib/nap/config";
import { getRateLimiter } from "@/lib/rate-limit";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string().min(1),
    })
  ).min(1),
  effort: z.number().int().min(0).max(100),
  flags: z
    .object({
      dream: z.boolean().optional(),
    })
    .optional(),
  testConfig: z
    .object({
      dreamDriftProb: z.number().min(0).max(1).optional(),
      selfRefProb: z.number().min(0).max(1).optional(),
      echoFragmentProb: z.number().min(0).max(1).optional(),
      driftBlendRatio: z.number().min(0).max(1).optional(),
      ENABLE_MICRO_MODES: z.boolean().optional(),
      ALLOW_SELF_REFERENCES: z.boolean().optional(),
      ENABLE_LAZINESS_CURVE: z.boolean().optional(),
      ENABLE_ECHO_FRAGMENTS: z.boolean().optional(),
      ENABLE_RICH_REFUSALS: z.boolean().optional(),
      ENABLE_DRIFT_BLEND: z.boolean().optional(),
      ENABLE_WAKE_REACTIONS: z.boolean().optional(),
      ENABLE_DYNAMIC_STOPS: z.boolean().optional(),
      ENABLE_RECALL_COMMAND: z.boolean().optional(),
      ENABLE_LUCID_MOMENTS: z.boolean().optional(),
    })
    .optional(),
});

// Initialize rate limiter
const RATE_LIMIT = isTestMode() ? 1000 : 10; // Much higher for tests
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const rateLimiter = getRateLimiter(RATE_LIMIT, RATE_LIMIT_WINDOW);

function getRateLimitKey(request: NextRequest): string {
  // Prefer x-real-ip (set by Vercel/Caddy); fall back to first x-forwarded-for entry.
  // Both are proxy-controlled headers — trust depends on the deployment proxy being authoritative.
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

// Simple cookie-based boost tracking (for MVP)
function getBoostFromCookie(request: NextRequest): number {
  const boostCookie = request.cookies.get("napgpt_boost");
  if (!boostCookie) return 0;

  try {
    const data = JSON.parse(boostCookie.value);
    if (data.expiresAt && Date.now() < data.expiresAt) {
      return data.boost || 0;
    }
  } catch {
    // Invalid cookie
  }

  return 0;
}

/**
 * POST /api/chat
 * Handles chat generation requests.
 * Features:
 * - Rate limiting
 * - Effort/Laziness logic via engine
 * - Chaos testing flags
 * - Mock mode support
 */
export async function POST(request: NextRequest) {
  // Chaos engineering flags (for testing)
  const chaosLatency = Number(process.env.CHAOS_LATENCY_MS || 0);
  const chaosFail = Number(process.env.CHAOS_FAIL_PCT || 0);
  const chaos429 = Number(process.env.CHAOS_429_PCT || 0);

  // Apply chaos latency
  if (chaosLatency > 0) {
    await new Promise((resolve) => setTimeout(resolve, chaosLatency));
  }

  // Chaos failure injection
  if (chaosFail > 0 || chaos429 > 0) {
    const roll = getTestRandom() * 100;
    if (roll < chaosFail) {
      return NextResponse.json({ error: "llm_error" }, { status: 502 });
    }
    if (roll < chaosFail + chaos429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please slow down." },
        { status: 429 }
      );
    }
  }

  // Parse and validate request
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "bad_request", details: "Invalid JSON" },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { messages: rawMessages, effort, flags, testConfig: requestTestConfig } = parsed.data;

  // Only accept testConfig overrides in test mode; ignore in production
  const testConfig: TestConfigOverrides = {
    ...(isTestMode() ? requestTestConfig : {}),
    ...(process.env.NAPGPT_DISABLE_DREAM_DRIFT === '1' && { dreamDriftProb: 0 }),
  };

  // Convert messages to LLMMessage format (preprocessing happens in engine.ts)
  const messages: LLMMessage[] = rawMessages.map((m) => ({
    role: m.role as "system" | "user" | "assistant",
    content: m.content,
  }));

  // Rate limiting
  const rateLimitKey = getRateLimitKey(request);
  const limitResult = await rateLimiter.check(rateLimitKey);

  if (!limitResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down." },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limitResult.limit),
          'X-RateLimit-Remaining': String(limitResult.remaining),
          'X-RateLimit-Reset': String(limitResult.reset),
        }
      }
    );
  }

  // Get boost from cookie (but don't use it - effort comes from request)
  const wakeBoost = getBoostFromCookie(request);

  // Hard timeout controller (8s cap)
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), 8000);

  try {
    // Retry logic with backoff
    const maxAttempts = 3;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Check if aborted
        if (ctrl.signal.aborted) {
          throw new Error('Request timeout');
        }

        const response = await respond({
          messages,
          effort, // Use effort from request, not cookie
          wakeBoost,
          flags: flags || {},
          testConfig: testConfig,
        });

        // Log response from engine for debugging (test mode only)
        if (isTestMode()) {
          const trace = {
            start: Date.now(),
            attempt: i + 1,
            status: 200,
            ms: Date.now(),
            replyLen: response?.text?.length || 0,
          };
          console.log('[API] Response from engine:', {
            ...trace,
            hasText: !!response?.text,
            textPreview: response?.text?.substring(0, 100) || '(empty)',
            hasMeta: !!response?.meta,
            meta: response?.meta,
          });
        }

        // Normalize and ensure non-empty reply
        let reply = (response?.text ?? "").trim();
        if (!reply) {
          console.warn('[API] Empty response from engine, using fallback', {
            attempt: i + 1,
            response: response,
          });
          reply = "… zzz (having a moment, try again)";
        }

        // Clear boost cookie after use (one-time use)
        const llmConfig = getLLMConfig();
        const usage = response?.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

        const responseObj = NextResponse.json({
          reply,
          meta: {
            ...response?.meta,
            model: llmConfig.model,
            provider: llmConfig.provider,
            usage,
          },
        }, {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'X-RateLimit-Limit': String(limitResult.limit),
            'X-RateLimit-Remaining': String(limitResult.remaining),
            'X-RateLimit-Reset': String(limitResult.reset),
          },
        });

        // Add provider/model/token headers for test verification
        responseObj.headers.set('x-provider', llmConfig.provider);
        responseObj.headers.set('x-model', llmConfig.model);
        responseObj.headers.set('x-total-tokens', String(usage.totalTokens));

        responseObj.cookies.delete("napgpt_boost");

        clearTimeout(timeoutId);
        return responseObj;
      } catch (err: unknown) {
        // Check if timeout
        if (ctrl.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
          console.warn('[API] Request timeout, using fallback');
          clearTimeout(timeoutId);
          return NextResponse.json(
            { reply: "… zzz (took too long, try again)", meta: { fallback: true, timeout: true } },
            { status: 200 }
          );
        }

        const status = (err as { status?: number })?.status ?? 500;

        // Retry on 429 or 5xx errors
        if ((status === 429 || status >= 500) && i < maxAttempts - 1) {
          const backoff = 200 + getTestRandom() * 400;
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        // Non-retryable error
        if (status === 429) {
          clearTimeout(timeoutId);
          return NextResponse.json(
            { reply: "… zzz (rate limited, try again)", meta: { rateLimited: true } },
            { status: 200 }
          );
        }

        // Last attempt failed, use fallback
        if (i === maxAttempts - 1) {
          clearTimeout(timeoutId);
          return NextResponse.json(
            { reply: "… zzz (having a moment, try again)", meta: { fallback: true, error: true } },
            { status: 200 }
          );
        }
      }
    }

    // All retries exhausted (shouldn't reach here, but safety)
    clearTimeout(timeoutId);
    return NextResponse.json(
      { reply: "… zzz (rate limited, try again)", meta: { rateLimited: true } },
      { status: 200 }
    );
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (isTestMode()) {
      console.error('[API] Unhandled error in POST handler:', error);
    }
    // Final safety net - never return empty
    return NextResponse.json(
      { reply: "… zzz (having a moment, try again)", meta: { fallback: true } },
      { status: 200 }
    );
  }
}

/**
 * PUT /api/chat
 * Sets a temporary "boost" cookie to increase effort for next request.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { boost } = z.object({ boost: z.number() }).parse(body);

    const response = NextResponse.json({ success: true });
    response.cookies.set("napgpt_boost", JSON.stringify({
      boost,
      expiresAt: Date.now() + 60000, // 1 minute expiry
    }), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60,
    });

    return response;
  } catch (error) {
    if (isTestMode()) {
      console.error('[API] PUT /api/chat error:', error);
    }
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/chat
 * Clears rate limits (Test environment only).
 */
export async function DELETE(request: NextRequest) {
  if (!isTestMode()) {
    return NextResponse.json(
      { error: "Not allowed" },
      { status: 403 }
    );
  }

  try {
    // Clear all rate limits (for test isolation)
    await rateLimiter.clear();
    return NextResponse.json({ success: true, cleared: "all" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to clear rate limit" },
      { status: 500 }
    );
  }
}

