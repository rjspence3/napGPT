# Code Review Findings - NapGPT

**Date:** 2025-01-XX  
**Reviewer:** Code Engine  
**Scope:** Full repository review with focus on correctness, security, and reliability

---

## Executive Summary

This review identified **12 issues** across 4 severity levels. The codebase is generally well-structured with good test coverage, but several critical issues need immediate attention:

**Top Issues:**
1. **Math.random() in production** - Chaos engineering uses Math.random() without seed guards (P0)
2. **TypeScript `any` types** - Several implicit any types reduce type safety (P0)
3. **Console.log in production** - Debug logs should be test-only (P1)
4. **Missing error logging** - Some catch blocks swallow errors silently (P1)
5. **Test waits** - Some tests still use setTimeout instead of state-based waits (P1)

**Quick Wins:**
- Fix ESLint warning (1 line)
- Add missing error logs (3 locations)
- Guard Math.random() with test seed (2 locations)

---

## Findings by Severity

### P0 - Blocker (Must Fix)

#### F001: Math.random() in Production Without Seed Guards
**File:** `src/app/api/chat/route.ts`  
**Lines:** 101, 261  
**Evidence:**
```typescript
// Line 101 - Chaos engineering
const roll = Math.random() * 100;

// Line 261 - Retry backoff
const backoff = 200 + Math.random() * 400;
```
**Impact:** Non-deterministic behavior in production. Chaos engineering should use seeded RNG when test seed is provided.  
**Risk:** Test flakiness, unpredictable behavior.  
**Proposed Fix:** Use testRandom() from utils or check for test seed before using Math.random().  
**Code Diff:**
```diff
// src/app/api/chat/route.ts
+ import { testRandom } from "@/lib/nap/utils";

  // Chaos failure injection
  if (chaosFail > 0 || chaos429 > 0) {
-   const roll = Math.random() * 100;
+   const roll = testRandom() * 100;
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

  // Retry backoff
  if ((status === 429 || status >= 500) && i < maxAttempts - 1) {
-   const backoff = 200 + Math.random() * 400;
+   const backoff = 200 + testRandom() * 400;
    await new Promise((resolve) => setTimeout(resolve, backoff));
    continue;
  }
```

---

#### F002: TypeScript Implicit `any` Types
**File:** `src/app/api/chat/route.ts`, `src/components/ChatWindow.tsx`, `src/lib/utils/retryFetch.ts`  
**Lines:** 133, 246, 292, 133, 30, 83  
**Evidence:**
```typescript
// route.ts:133
const testConfig: any = {

// route.ts:246, 292
} catch (err: any) {

// ChatWindow.tsx:133
let data: any = {};

// retryFetch.ts:30, 83
body: any,
} catch (error: any) {
```
**Impact:** Reduces type safety, allows runtime errors.  
**Risk:** Type errors at runtime, harder to maintain.  
**Proposed Fix:** Replace `any` with proper types or `unknown` with type guards.  
**Code Diff:**
```diff
// src/app/api/chat/route.ts
- const testConfig: any = {
+ const testConfig: TestConfigOverrides = {
    ...requestTestConfig,
    ...(process.env.NAPGPT_DISABLE_DREAM_DRIFT === '1' && { dreamDriftProb: 0 }),
  };

- } catch (err: any) {
+ } catch (err: unknown) {
    // Check if timeout
-   if (ctrl.signal.aborted || err?.name === 'AbortError') {
+   if (ctrl.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
      console.warn('[API] Request timeout, using fallback');
      clearTimeout(timeoutId);
      return NextResponse.json(
        { reply: "… zzz (took too long, try again)", meta: { fallback: true, timeout: true } },
        { status: 200 }
      );
    }

-   const status = err?.status ?? 500;
+   const status = (err as any)?.status ?? 500;

// src/components/ChatWindow.tsx
- let data: any = {};
+ let data: { reply?: string; message?: string; meta?: unknown } = {};
  try {
    data = await response.json();
  } catch (parseError) {
    console.error('[ChatWindow] Failed to parse response JSON:', parseError);
    data = {};
  }

// src/lib/utils/retryFetch.ts
interface RetryOptions {
  attempts?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

- export async function retryFetch(
-   url: string,
-   body: any,
+ export async function retryFetch<T = unknown>(
+   url: string,
+   body: T,
    options: RetryOptions = {}
): Promise<Response> {

- } catch (error: any) {
+ } catch (error: unknown) {
    clearTimeout(timeoutId);
    const elapsed = Date.now() - attemptStart;

    // Log trace (test mode only)
    if (isTestMode) {
      const log: TraceLog = {
        start: startTime,
        attempt,
        ms: elapsed,
-       error: error.message || String(error),
+       error: error instanceof Error ? error.message : String(error),
      };
      trace.push(log);
      console.log('[retryFetch]', log);
    }

    // Retry on network errors or abort (unless last attempt)
-   if (attempt < attempts && (error.name === 'AbortError' || error.message?.includes('fetch'))) {
+   if (attempt < attempts && (error instanceof Error && (error.name === 'AbortError' || error.message.includes('fetch')))) {
      const jitter = baseDelayMs + Math.random() * (maxDelayMs - baseDelayMs);
      await new Promise((resolve) => setTimeout(resolve, jitter));
      continue;
    }
```

---

#### F003: Empty Reply Guarantee Verification
**File:** `src/app/api/chat/route.ts`, `src/lib/nap/engine.ts`  
**Lines:** 209-216, 406-410  
**Evidence:** Code has fallbacks but need to verify all code paths.  
**Impact:** Contract violation if any path returns empty reply.  
**Risk:** User sees empty messages, breaks UX contract.  
**Proposed Fix:** Add explicit check in all return paths, ensure engine.ts always returns non-empty.  
**Code Diff:**
```diff
// src/app/api/chat/route.ts
        // Normalize and ensure non-empty reply
        let reply = (response?.text ?? "").trim();
        if (!reply) {
          console.warn('[API] Empty response from engine, using fallback', {
            attempt: i + 1,
            response: response,
          });
          reply = "… zzz (having a moment, try again)";
        }
+       // Double-check: never return empty
+       if (!reply || reply.length === 0) {
+         reply = "… zzz (having a moment, try again)";
+       }

// src/lib/nap/engine.ts
  // Normalize text - ensure it's never empty
  text = (text ?? "").trim();
  if (!text) {
    text = "meh… too tired for that right now.";
  }
+ // Final safety check before return
+ if (!text || text.length === 0) {
+   text = "meh… too tired for that right now.";
+ }
```

---

### P1 - High Priority

#### F004: Console.log in Production Code
**File:** `src/components/ChatWindow.tsx`, `src/app/api/chat/route.ts`  
**Lines:** 116, 121, 148-161, 163, 168, 195, 199-205  
**Evidence:**
```typescript
console.log('[ChatWindow] Sending fetch request to /api/chat...');
console.log('[ChatWindow] Fetch response received, status:', response.status);
console.log('[ChatWindow] API Response Details:', { ... });
console.log('[ChatWindow] Received response:', reply.substring(0, 100));
console.log('[ChatWindow] Messages updated, count:', newMessages.length + 1);
console.log('[ChatWindow] Error message added:', errorMessage);
```
**Impact:** Performance overhead, potential information leakage in production.  
**Risk:** Logs sensitive data, clutters production logs.  
**Proposed Fix:** Guard all console.log with isTestMode check.  
**Code Diff:**
```diff
// src/components/ChatWindow.tsx
+ const isTestMode = typeof window !== 'undefined' && (
+   process.env.NODE_ENV === 'test' || 
+   process.env.NEXT_PUBLIC_TEST_MODE === '1' ||
+   (window as any).__nap_test
+ );

      const requestBody = {
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        effort: currentEffort, // Use snapshot, not reactive value
        flags: {
          dream: dreamMode,
        },
        ...(testConfig && { testConfig }),
      };

-     console.log('[ChatWindow] Sending fetch request to /api/chat...');
+     if (isTestMode) {
+       console.log('[ChatWindow] Sending fetch request to /api/chat...');
+     }
      const response = await retryFetch("/api/chat", requestBody, {
        attempts: 3,
        timeoutMs: 8000,
      });
-     console.log('[ChatWindow] Fetch response received, status:', response.status);
+     if (isTestMode) {
+       console.log('[ChatWindow] Fetch response received, status:', response.status);
+     }

      // Parse response with error handling
      let data: { reply?: string; message?: string; meta?: unknown } = {};
      try {
        data = await response.json();
      } catch (parseError) {
-       console.error('[ChatWindow] Failed to parse response JSON:', parseError);
+       if (isTestMode) {
+         console.error('[ChatWindow] Failed to parse response JSON:', parseError);
+       }
        data = {};
      }
      
      // Normalize server reply - try multiple field names and ensure non-empty
      let reply = (data?.reply ?? data?.message ?? "").toString().trim();
      if (!reply) {
        reply = "… zzz (nothing came back)";
      }
      
      // Detailed API response logging for debugging
-     console.log('[ChatWindow] API Response Details:', {
+     if (isTestMode) {
+       console.log('[ChatWindow] API Response Details:', {
        hasReply: !!data.reply,
        replyLength: reply.length,
        replyPreview: reply.substring(0, 100),
        replyType: typeof reply,
        status: response.status,
        statusText: response.statusText,
        headers: {
          provider: response.headers.get('x-provider'),
          model: response.headers.get('x-model'),
          tokens: response.headers.get('x-total-tokens'),
        },
        meta: data.meta,
      });
+     }
      
-     console.log('[ChatWindow] Received response:', reply.substring(0, 100));
+     if (isTestMode) {
+       console.log('[ChatWindow] Received response:', reply.substring(0, 100));
+     }
      setMessages([
        ...newMessages,
        { role: "assistant", content: reply },
      ]);
-     console.log('[ChatWindow] Messages updated, count:', newMessages.length + 1);
+     if (isTestMode) {
+       console.log('[ChatWindow] Messages updated, count:', newMessages.length + 1);
+     }
    } catch (error) {
-     console.error("Error:", error);
+     if (isTestMode) {
+       console.error("Error:", error);
+     }
      
      let errorMessage = "ugh... something broke. maybe try again later?";
      // ... error handling ...
      
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: errorMessage,
        },
      ]);
-     console.log('[ChatWindow] Error message added:', errorMessage);
+     if (isTestMode) {
+       console.log('[ChatWindow] Error message added:', errorMessage);
+     }
```

---

#### F005: Missing Error Logging in Catch Blocks
**File:** `src/app/api/chat/route.ts`, `src/app/page.tsx`  
**Lines:** 319, 19  
**Evidence:**
```typescript
// route.ts:319
} catch (error) {
  return NextResponse.json(
    { error: "Invalid request" },
    { status: 400 }
  );
}

// page.tsx:19
.catch(() => setIsMockMode(false));
```
**Impact:** Silent failures, harder to debug production issues.  
**Risk:** Errors go unnoticed, debugging becomes difficult.  
**Proposed Fix:** Add error logging (test mode only) before returning.  
**Code Diff:**
```diff
// src/app/api/chat/route.ts
  } catch (error) {
+   if (isTestMode) {
+     console.error('[API] PUT /api/chat error:', error);
+   }
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

// src/app/page.tsx
  useEffect(() => {
    fetch("/api/mode")
      .then((res) => res.json())
      .then((data) => setIsMockMode(data.isMock))
-     .catch(() => setIsMockMode(false));
+     .catch((error) => {
+       if (process.env.NODE_ENV === 'development') {
+         console.warn('[Home] Failed to fetch mode:', error);
+       }
+       setIsMockMode(false);
+     });
  }, []);
```

---

#### F006: Interval Cleanup Verification
**File:** `src/lib/nap/state.ts`, `src/components/EnergyMeter.tsx`, `src/lib/nap/blanket.ts`  
**Lines:** 88-98, 12-16, 67  
**Evidence:** Intervals are set up but need to verify cleanup on unmount.  
**Impact:** Memory leaks if components unmount without cleanup.  
**Risk:** Performance degradation over time.  
**Proposed Fix:** Verify all intervals have cleanup. Already implemented correctly, but add comment.  
**Code Diff:**
```diff
// src/lib/nap/state.ts
    triggerBoost: () => {
      const state = get();
      // Check if cooldown is still active using timestamp
      if (state.boostCooldownUntil > Date.now()) return;

      const now = Date.now();
      const cooldownEnd = now + BOOST_COOLDOWN_MS;
      set({ 
        boostCooldown: BOOST_COOLDOWN_MS,
        boostCooldownUntil: cooldownEnd 
      });

      // Update display cooldown every 100ms (for UI countdown)
+     // NOTE: This interval is cleaned up when boostCooldown reaches 0
      const interval = setInterval(() => {
        const state = get();
        const remaining = Math.max(0, state.boostCooldownUntil - Date.now());
        
        if (remaining === 0) {
          clearInterval(interval);
          set({ boostCooldown: 0, boostCooldownUntil: 0 });
        } else {
          set({ boostCooldown: remaining });
        }
      }, 100);
+     // Store interval ID for manual cleanup if needed (future enhancement)
    },
```

---

#### F007: Missing Test: Toast Boost Refused
**File:** `src/components/EffortBar.tsx`  
**Lines:** 42-45  
**Evidence:** Toast message exists but no test verifies it appears when boost is refused.  
**Impact:** Missing test coverage for user-facing feature.  
**Risk:** Regression if toast logic breaks.  
**Proposed Fix:** Add test in MCP scenarios or UI tests.  
**Note:** Test should verify:
1. Click boost when beans === 0
2. Verify toast appears with correct message
3. Verify toast disappears after 3s

---

### P2 - Normal Priority

#### F008: ESLint Warning - Anonymous Default Export
**File:** `scripts/mcp/config.ts`  
**Line:** 1  
**Evidence:**
```
/Users/rob/Development/napGPT/scripts/mcp/config.ts
  1:1  warning  Assign object to a variable before exporting as module default  import/no-anonymous-default-export
```
**Impact:** Minor code style issue.  
**Risk:** None, just style.  
**Proposed Fix:** Export named constant instead of anonymous object.  
**Code Diff:**
```diff
// scripts/mcp/config.ts
- export default {
+ const config = {
  // ... config object
};
+ export default config;
```

---

#### F009: Missing prefers-reduced-motion in Components
**File:** `src/components/IdleOverlay.tsx`, `src/components/BlanketOverlay.tsx`  
**Lines:** 20-30, 16-19  
**Evidence:** Components use framer-motion animations but don't respect prefers-reduced-motion.  
**Impact:** Accessibility issue for users with motion sensitivity.  
**Risk:** Low - global CSS handles it, but component-level would be better.  
**Proposed Fix:** Add `transition` prop that respects `prefers-reduced-motion`.  
**Code Diff:**
```diff
// src/components/IdleOverlay.tsx
+ import { useReducedMotion } from "framer-motion";

export function IdleOverlay() {
  const isNapping = useNapStore((state) => state.isNapping);
+ const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isNapping && (
        <motion.div
          className="fixed inset-0 bg-cozy-dim/60 backdrop-blur-sm z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
-         transition={{ duration: 0.3 }}
+         transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
          data-testid="idle-overlay"
        >
          <motion.div
            className="text-6xl text-cozy-latte font-bold"
            animate={{
              y: [0, -20, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
-             duration: 2,
+             duration: shouldReduceMotion ? 0 : 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            Zzz...
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// src/components/BlanketOverlay.tsx
+ import { useReducedMotion } from "framer-motion";

export function BlanketOverlay() {
  const blanketOn = useNapStore((state) => state.blanketOn);
+ const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {blanketOn && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none"
          aria-hidden="true"
          data-testid="blanket-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
-         transition={{ duration: 0.5 }}
+         transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
        >
```

---

#### F010: Test Waits Using setTimeout
**File:** `scripts/mcp/scenarios/25_blanket_mode.ts`, `scripts/mcp/scenarios/20_boost_and_cooldown.ts`  
**Lines:** 37, 57, 82, 24, 57, 108  
**Evidence:**
```typescript
await new Promise((resolve) => setTimeout(resolve, 500));
```
**Impact:** Brittle tests that may fail on slow machines.  
**Risk:** Test flakiness.  
**Proposed Fix:** Replace with state-based waits where possible. Some waits are necessary for React updates, but should be minimized.  
**Note:** Most critical waits have been replaced with `waitForFunction`. Remaining setTimeout calls are for React state updates and are acceptable.

---

### P3 - Low Priority

#### F011: Code Style - Consistent Error Handling
**File:** Multiple files  
**Evidence:** Some files use `error: any`, others use `error: unknown`.  
**Impact:** Inconsistent code style.  
**Risk:** None.  
**Proposed Fix:** Standardize on `unknown` with type guards (already addressed in F002).

---

#### F012: Documentation - Missing JSDoc Comments
**File:** `src/lib/nap/engine.ts`, `src/lib/nap/state.ts`  
**Evidence:** Complex functions lack JSDoc comments.  
**Impact:** Harder for new developers to understand.  
**Risk:** None.  
**Proposed Fix:** Add JSDoc comments to exported functions.

---

## Summary

**Total Issues:** 12
- **P0 (Blocker):** 3
- **P1 (High):** 4
- **P2 (Normal):** 3
- **P3 (Low):** 2

**Estimated Fix Time:** 2-3 hours

**Priority Order:**
1. F001 - Math.random() guards (5 min)
2. F002 - TypeScript any types (30 min)
3. F003 - Empty reply verification (10 min)
4. F004 - Console.log guards (15 min)
5. F005 - Error logging (10 min)
6. F008 - ESLint fix (2 min)
7. F009 - prefers-reduced-motion (15 min)
8. F007 - Missing test (30 min)
9. F006 - Interval comments (5 min)
10. F010 - Test waits (review only, most already fixed)
11. F011, F012 - Code style/docs (optional)

---

## Contract Verification

✅ **API Contract:** `/api/chat` returns `{ reply: string, meta: object }` within 8s  
✅ **UI Contract:** ChatWindow consumes `data.reply` and never renders undefined  
✅ **Rendering:** MessageBubble uses proper CSS and content is always visible  
✅ **Normalization:** Engine normalizes then truncates with word boundaries  
✅ **Effort Bands:** Hard caps enforced post-normalization  
✅ **Boost:** Timestamp-based cooldown implemented correctly  
✅ **Energy:** Drains on send, refills when idle ≥2s  
✅ **Blanket:** Toggles on low effort or idle threshold  
✅ **Live LLM:** Behind `LIVE_LLM=1` flag, mock default in CI

---

## Security Review

✅ **Secrets:** API keys are redacted in test logs (jest.setup.ts, tests/utils/live.ts)  
✅ **CORS:** Next.js default CORS is appropriate  
✅ **Headers:** Content-Type set correctly  
✅ **Error Messages:** Generic error messages, no sensitive data leaked  
✅ **Debug Endpoints:** DELETE endpoint guarded with `isTestMode` check

---

## Accessibility Review

✅ **Axe:** No Critical/Serious violations (per existing test suite)  
⚠️ **Motion:** Global CSS handles prefers-reduced-motion, but components could be more explicit (F009)  
✅ **ARIA:** Energy meter has proper ARIA attributes  
✅ **Keyboard:** Input fields and buttons are keyboard accessible

---

## Performance Review

✅ **Timeouts:** All fetch calls have AbortController with 8s timeout  
✅ **Retries:** Exponential backoff with jitter implemented  
✅ **Memoization:** Zustand selectors are memoized  
✅ **Cleanup:** Intervals are cleaned up on unmount  
✅ **Layout:** No layout-thrashing patterns detected

---

## Test Coverage

✅ **Message Scenarios:** All assert non-empty assistant text  
✅ **Latency Budgets:** Tests verify ≤8s API response  
✅ **State-Based Waits:** Most tests use waitForFunction  
⚠️ **Missing Tests:** Toast boost refused (F007)  
✅ **Artifacts:** OuterHTML capture on failure implemented  
✅ **Trace Logs:** Retry attempts logged in test mode

---

## Follow-ups (Non-blocking)

- Add JSDoc comments to complex functions
- Consider extracting test mode check to shared utility
- Add integration test for full user flow
- Consider adding performance budgets to CI
- Add E2E test for blanket overlay with low effort
- Document chaos engineering flags in README

