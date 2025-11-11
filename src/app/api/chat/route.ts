import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { respond } from "@/lib/nap/engine";
import { preprocessCommands } from "@/lib/nap/utils";
import type { LLMMessage } from "@/lib/llm/adapter";
import { getLLMConfig } from "@/lib/llm/adapter";

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
  sessionId: z.string().min(6).max(64).optional(),
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
    })
    .optional(),
});

// Simple in-memory rate limit (for MVP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const isTestMode = process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST === "true";
const RATE_LIMIT = isTestMode ? 100 : 10; // Much higher for tests
const RATE_LIMIT_WINDOW = 60000; // 1 minute

function getRateLimitKey(request: NextRequest): string {
  // Try to get IP from headers
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : "unknown";
  return ip;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
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
    const roll = Math.random() * 100;
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

  // Merge request testConfig with env-based determinism controls
  const testConfig: any = {
    ...requestTestConfig,
    ...(process.env.NAPGPT_DISABLE_DREAM_DRIFT === '1' && { dreamDriftProb: 0 }),
  };

  // Set seeded RNG if test seed provided
  if (process.env.NAPGPT_TEST_SEED) {
    const seed = parseInt(process.env.NAPGPT_TEST_SEED, 10);
    // Simple seeded RNG (LCG) - same algorithm as tests/utils/rng.ts
    let rngState = seed % 2147483647;
    if (rngState <= 0) rngState += 2147483646;
    testConfig.testRandomFn = () => {
      rngState = (rngState * 16807) % 2147483647;
      return (rngState - 1) / 2147483646;
    };
  }

  // Convert messages to LLMMessage format (preprocessing happens in engine.ts)
  const messages: LLMMessage[] = rawMessages.map((m) => ({
    role: m.role as "system" | "user" | "assistant",
    content: m.content,
  }));

  // Rate limiting
  const rateLimitKey = getRateLimitKey(request);
  if (!checkRateLimit(rateLimitKey)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down." },
      { status: 429 }
    );
  }

  // Get boost from cookie (but don't use it - effort comes from request)
  const wakeBoost = getBoostFromCookie(request);

  // Retry logic with backoff
  const maxAttempts = 3;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await respond({
        messages,
        effort, // Use effort from request, not cookie
        wakeBoost,
        flags: flags || {},
        testConfig: testConfig,
      });

      // Hard fallback for empty responses
      if (!response?.text || response.text.trim().length === 0) {
        return NextResponse.json(
          { reply: "idk, maybe just google it?", meta: { fallback: true, ...response.meta } },
          { status: 200 }
        );
      }

      // Clear boost cookie after use (one-time use)
      const llmConfig = getLLMConfig();
      const usage = response.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      
      const responseObj = NextResponse.json({
        reply: response.text,
        meta: {
          ...response.meta,
          model: llmConfig.model,
          provider: llmConfig.provider,
          usage,
        },
      });

      // Add provider/model/token headers for test verification
      responseObj.headers.set('x-provider', llmConfig.provider);
      responseObj.headers.set('x-model', llmConfig.model);
      responseObj.headers.set('x-total-tokens', String(usage.totalTokens));

      responseObj.cookies.delete("napgpt_boost");

      return responseObj;
    } catch (err: any) {
      const status = err?.status ?? 500;

      // Retry on 429 or 5xx errors
      if ((status === 429 || status >= 500) && i < maxAttempts - 1) {
        const backoff = 200 + Math.random() * 400;
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      // Non-retryable error
      if (status === 429) {
        return NextResponse.json(
          { reply: "… zzz (rate limited, try again)", meta: { rateLimited: true } },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: "llm_error" },
        { status: 502 }
      );
    }
  }

  // All retries exhausted
  return NextResponse.json(
    { reply: "… zzz (rate limited, try again)", meta: { rateLimited: true } },
    { status: 200 }
  );
}

// Helper endpoint to set boost cookie
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
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

// Helper endpoint to clear rate limit (test mode only)
export async function DELETE(request: NextRequest) {
  if (!isTestMode) {
    return NextResponse.json(
      { error: "Not allowed" },
      { status: 403 }
    );
  }

  try {
    // Clear all rate limits (for test isolation)
    rateLimitMap.clear();
    return NextResponse.json({ success: true, cleared: "all" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to clear rate limit" },
      { status: 500 }
    );
  }
}

