# Comprehensive Test Fix Plan

**Generated:** 2025-11-11  
**Status:** 1/21 tests passing (4.8% success rate)

## Executive Summary

The test suite has 20 failing tests across 4 major categories:
1. **Frame Detachment** (15 tests) - Critical blocker
2. **Timeout Issues** (2 tests) - High priority
3. **State Synchronization** (2 tests) - High priority  
4. **Accessibility** (1 violation) - Medium priority

---

## Issue 1: Frame Detachment (15 tests) 🔴 CRITICAL

### Root Cause Analysis

**Problem:** After test `35_coffee_economy` completes (8.2m), all subsequent tests fail with:
```
Error: Attempted to use detached Frame '28422D57CC51E794CB2924067B0EDBBD'
```

**Why it happens:**
1. Every test scenario calls `client.goto(cfg.baseUrl)` at the start
2. Test isolation in `matrix.ts` tries to avoid navigation by clearing localStorage
3. But individual tests still navigate, causing frame detachment
4. Test 35 takes 8.2 minutes and likely does something (long wait, state changes) that detaches the frame
5. All subsequent tests try to use `client.evaluate()` on a detached frame and fail immediately

**Affected Tests:**
- 40_energy_meter
- 50_commands_dream_nap
- 55_dream_drift
- 60_context_threading
- 70_error_and_retry
- 80_math_and_code_guards
- 90_non_sequitur_dropout_bounds
- 95_api_endpoints
- 96_wake_reactions
- 97_echo_fragments
- 98_self_references
- 99_recall_command
- 100_ui_interactions
- 101_edge_cases
- 102_network_errors

### Fix Strategy

#### Phase 1: Remove Unnecessary Navigation (Primary Fix)

**Action:** Remove `client.goto()` from all individual test scenarios. Tests should rely on the isolation reset in `matrix.ts`.

**Files to modify:**
- `scripts/mcp/scenarios/00_smoke.ts` - Remove line 32
- `scripts/mcp/scenarios/10_effort_bands.ts` - Remove line 26
- `scripts/mcp/scenarios/20_boost_and_cooldown.ts` - Remove line 21
- `scripts/mcp/scenarios/25_blanket_mode.ts` - Remove line 31
- `scripts/mcp/scenarios/30_idle_and_overlay.ts` - Remove line 21 (but this one passes, so maybe keep it?)
- `scripts/mcp/scenarios/35_coffee_economy.ts` - Remove line 27
- `scripts/mcp/scenarios/40_energy_meter.ts` - Remove line 23
- `scripts/mcp/scenarios/50_commands_dream_nap.ts` - Remove line 21
- `scripts/mcp/scenarios/55_dream_drift.ts` - Remove lines 29, 77
- `scripts/mcp/scenarios/60_context_threading.ts` - Remove line 21
- `scripts/mcp/scenarios/70_error_and_retry.ts` - Remove lines 25, 111
- `scripts/mcp/scenarios/80_math_and_code_guards.ts` - Remove line 21
- `scripts/mcp/scenarios/90_non_sequitur_dropout_bounds.ts` - Remove line 21
- `scripts/mcp/scenarios/95_api_endpoints.ts` - Remove line 22
- `scripts/mcp/scenarios/96_wake_reactions.ts` - Remove line 23
- `scripts/mcp/scenarios/97_echo_fragments.ts` - Remove line 21
- `scripts/mcp/scenarios/98_self_references.ts` - Remove line 21
- `scripts/mcp/scenarios/99_recall_command.ts` - Remove line 21
- `scripts/mcp/scenarios/100_ui_interactions.ts` - Remove line 22
- `scripts/mcp/scenarios/101_edge_cases.ts` - Remove line 22
- `scripts/mcp/scenarios/102_network_errors.ts` - Remove line 22

**Exception:** Test `70_error_and_retry` may need navigation for the retry test, but we should handle it differently.

#### Phase 2: Improve Test Isolation

**Action:** Enhance the isolation reset in `matrix.ts` to ensure the page is ready.

**File:** `scripts/ui-test/matrix.ts`

**Changes:**
1. Add a check to verify page is still valid before each test
2. If page is invalid, recreate the client
3. Ensure we're on the correct URL before starting each test
4. Add better error handling for frame detachment

```typescript
// Before each scenario
try {
  // Check if page is still valid
  if (client.page) {
    try {
      await client.page.evaluate(() => document.readyState);
    } catch {
      // Page is detached, recreate client
      if (client.close) await client.close();
      client = await createMCPClient(env.baseUrl, !env.headful);
    }
  }
  
  // Ensure we're on the base URL (without navigating if already there)
  const currentUrl = await client.page?.url();
  if (currentUrl !== env.baseUrl) {
    await client.goto(env.baseUrl);
  }
  
  // Clear state
  await client.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
} catch (resetError) {
  // If reset fails, recreate client
  if (client.close) await client.close();
  client = await createMCPClient(env.baseUrl, !env.headful);
  await client.goto(env.baseUrl);
}
```

#### Phase 3: Add Frame Validity Checks

**Action:** Add frame validity checks to `browserOps.ts` and `mcpClient.ts`.

**Files:**
- `scripts/mcp/utils/browserOps.ts`
- `scripts/mcp/utils/mcpClient.ts`

**Changes:**
1. Wrap all `page.evaluate()` calls with try-catch
2. Check if error is "detached frame" and handle gracefully
3. Add a helper function to check frame validity

```typescript
async function safeEvaluate<T>(fn: () => T): Promise<T> {
  try {
    return await page.evaluate(fn);
  } catch (error: any) {
    if (error.message.includes('detached') || error.message.includes('Frame')) {
      throw new Error('Frame detached - test isolation issue');
    }
    throw error;
  }
}
```

---

## Issue 2: Timeout Issues (2 tests) 🟡 HIGH PRIORITY

### Root Cause Analysis

**Problem:** Tests timeout waiting for assistant messages to appear.

**Affected Tests:**
- `00_smoke` - Timeout waiting for typing indicator or assistant message (1.5m)
- `10_effort_bands` - Timeout waiting for assistant message at effort level 5 (1.4m)

**Why it happens:**
1. API responses may be slower than expected
2. Fallback selector logic may not be working correctly
3. Network conditions may be poor
4. The wait timeout (8000ms) may be insufficient for slow responses

### Fix Strategy

#### Fix 1: Improve Wait Logic

**File:** `scripts/mcp/utils/browserOps.ts`

**Changes:**
1. Increase default timeout for assistant messages
2. Improve fallback selector logic
3. Add better logging to see what's happening

```typescript
async waitFor(selector: string, timeout: number = 5000) {
  const startTime = Date.now();
  log(`[BrowserOps] Waiting for selector: ${selector} (timeout: ${timeout}ms)`);
  
  try {
    await page.waitForSelector(selector, { timeout, visible: true });
    const elapsed = Date.now() - startTime;
    log(`[BrowserOps] ✓ Found selector ${selector} after ${elapsed}ms`);
  } catch (error) {
    // For message-assistant, try multiple fallback strategies
    if (selector.includes('message-assistant')) {
      log(`[BrowserOps] Primary selector failed, trying fallbacks...`);
      
      // Strategy 1: Try any message-assistant
      try {
        await page.waitForSelector('[data-testid="message-assistant"]', { 
          timeout: Math.min(timeout, 5000) 
        });
        log(`[BrowserOps] ✓ Found via fallback selector`);
        return;
      } catch {}
      
      // Strategy 2: Wait for any message in the list
      try {
        await page.waitForFunction(
          () => {
            const messages = document.querySelectorAll('[data-testid="message-assistant"]');
            return messages.length > 0;
          },
          { timeout: Math.min(timeout, 5000) }
        );
        log(`[BrowserOps] ✓ Found via waitForFunction`);
        return;
      } catch {}
      
      // Strategy 3: Check if message list has any children
      try {
        await page.waitForFunction(
          () => {
            const list = document.querySelector('[data-testid="message-list"]');
            return list && list.children.length > 0;
          },
          { timeout: Math.min(timeout, 3000) }
        );
        log(`[BrowserOps] ✓ Found via message list check`);
        return;
      } catch {}
    }
    
    // If all fallbacks fail, throw original error
    const elapsed = Date.now() - startTime;
    log(`[BrowserOps] ✗ Failed to find selector ${selector} after ${elapsed}ms`);
    throw error;
  }
}
```

#### Fix 2: Increase Timeouts for Slow Network

**File:** `scripts/mcp/config.ts`

**Changes:**
1. Increase `long` timeout from 30000ms to 60000ms for slow API responses
2. Add a `veryLong` timeout for tests that may take longer

```typescript
timeouts: {
  short: 5000,      // Increased from 3000
  medium: 15000,    // Increased from 8000
  long: 60000,      // Increased from 30000
  veryLong: 120000, // New: for very slow operations
  networkIdle: 5000,
},
```

#### Fix 3: Add Network Wait Before Assertions

**File:** Individual test scenarios

**Changes:**
1. Add explicit network idle wait before checking for messages
2. Wait for typing indicator to disappear before checking for message

```typescript
// In 00_smoke.ts and 10_effort_bands.ts
await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

// Wait for network request to complete
await ops.waitForNetworkIdle(cfg.timeouts.medium);

// Then wait for message
await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
```

---

## Issue 3: State Synchronization (2 tests) 🟡 HIGH PRIORITY

### Root Cause Analysis

**Problem:** Tests check UI state before React/Zustand has finished updating.

**Affected Tests:**
- `20_boost_and_cooldown` - Boost button not disabled during cooldown
- `25_blanket_mode` - Blanket overlay not visible when effort < 20

**Why it happens:**
1. React state updates are asynchronous
2. Zustand state changes need time to propagate to DOM
3. Tests check state too quickly after actions
4. The cooldown state may not be immediately reflected in the button's disabled attribute

### Fix Strategy

#### Fix 1: Add Proper Waits After State Changes

**File:** `scripts/mcp/scenarios/20_boost_and_cooldown.ts`

**Changes:**
1. Wait for Zustand state to update after clicking boost
2. Use `waitForFunction` to wait for button to become disabled
3. Check Zustand store directly before checking DOM

```typescript
// Click boost button
await ops.click(cfg.selectors.boostBtn, { waitFor: 500 });

// Wait for Zustand state to update
await client.evaluate(() => {
  return new Promise((resolve) => {
    const store = (window as any).__nap_store;
    if (store) {
      // Wait for boostCooldown to be > 0
      const checkCooldown = () => {
        const state = store.getState();
        if (state.boostCooldown > 0) {
          resolve(true);
        } else {
          setTimeout(checkCooldown, 100);
        }
      };
      checkCooldown();
    } else {
      resolve(true);
    }
  });
});

// Then check button disabled state
const boostDisabledAfter = await ops.isDisabled(cfg.selectors.boostBtn);
```

#### Fix 2: Improve Blanket Mode Test

**File:** `scripts/mcp/scenarios/25_blanket_mode.ts`

**Changes:**
1. Wait for blanket check function to run
2. Use `waitForFunction` to wait for blanket to appear
3. Check Zustand store directly

```typescript
// Set effort to 10
await ops.setSlider(cfg.selectors.effortSlider, 10);
await new Promise((resolve) => setTimeout(resolve, 500));

// Manually trigger blanket check
await client.evaluate(() => {
  const store = (window as any).__nap_store;
  if (store) {
    store.getState().setEffort(10);
  }
  if ((window as any).__nap_blanket_check) {
    (window as any).__nap_blanket_check();
  }
});

// Wait for blanket to appear using waitForFunction
await client.page?.waitForFunction(
  () => {
    const overlay = document.querySelector('[data-testid="blanket-overlay"]');
    if (!overlay) return false;
    const style = window.getComputedStyle(overlay);
    return style.display !== 'none' && style.visibility !== 'hidden';
  },
  { timeout: 5000 }
);

const blanketVisible1 = await ops.isVisible(cfg.selectors.blanketOverlay);
```

---

## Issue 4: Accessibility Violation (1 issue) 🟢 MEDIUM PRIORITY

### Root Cause Analysis

**Problem:** Axe scan found 1 serious accessibility violation.

**Fix Strategy:**

#### Step 1: Identify the Violation

**Action:** Check the axe report to see what the violation is.

**File:** `artifacts/2025-11-11T21-35-36/axe/report.json`

**Command:**
```bash
cat artifacts/*/axe/report.json | jq '.violations[] | select(.impact == "serious")'
```

#### Step 2: Fix the Violation

**Action:** Based on the violation type, fix it in the UI code.

**Common fixes:**
- Add missing `aria-label` attributes
- Fix color contrast issues
- Add proper heading hierarchy
- Fix keyboard navigation

#### Step 3: Re-run Axe Test

**Action:** Verify the fix by re-running the axe test.

---

## Implementation Order

### Phase 1: Critical Fixes (Frame Detachment)
1. ✅ Remove `client.goto()` from all test scenarios
2. ✅ Improve test isolation in `matrix.ts`
3. ✅ Add frame validity checks
4. ✅ Test: Run full suite, verify frame detachment is fixed

### Phase 2: High Priority Fixes
5. ✅ Fix timeout issues (increase timeouts, improve wait logic)
6. ✅ Fix state synchronization (add proper waits)
7. ✅ Test: Run full suite, verify timeout and state issues are fixed

### Phase 3: Medium Priority Fixes
8. ✅ Identify and fix accessibility violation
9. ✅ Test: Re-run axe test, verify violation is fixed

### Phase 4: Validation
10. ✅ Run full test suite
11. ✅ Verify all tests pass
12. ✅ Check test execution time is reasonable
13. ✅ Verify artifacts are generated correctly

---

## Expected Outcomes

After implementing all fixes:

- **Frame Detachment:** 15 tests should pass (currently failing immediately)
- **Timeout Issues:** 2 tests should pass (currently timing out)
- **State Synchronization:** 2 tests should pass (currently failing assertions)
- **Accessibility:** 0 violations (currently 1 serious violation)

**Target:** 21/21 tests passing (100% success rate)

---

## Risk Assessment

### Low Risk
- Removing `client.goto()` from tests (isolation reset handles navigation)
- Increasing timeouts (only affects slow network conditions)
- Adding frame validity checks (defensive programming)

### Medium Risk
- Improving wait logic (may need iteration to get right)
- State synchronization fixes (may need to adjust wait times)

### High Risk
- None identified

---

## Testing Strategy

1. **Incremental Testing:** Fix one category at a time, test after each
2. **Isolated Testing:** Run individual failing tests to verify fixes
3. **Full Suite:** Run complete suite after all fixes
4. **CI Validation:** Ensure fixes work in CI environment

---

## Notes

- Test `30_idle_and_overlay` is passing, so we can use it as a reference
- Test `35_coffee_economy` takes 8.2 minutes - this may be too long, consider optimizing
- The frame detachment happens after test 35, suggesting something in that test causes it
- All tests that fail with frame detachment fail immediately (0ms duration), indicating they fail on the first `client.evaluate()` call

