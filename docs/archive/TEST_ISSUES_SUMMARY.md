# Test Issues Summary

**Generated:** 2025-11-11

## Critical Issues

### 1. Detached Frame Errors (15+ tests failing)
**Status:** 🔴 Critical  
**Affected Tests:** 40, 50, 55, 60, 70, 80, 90, 95, 96, 97, 98, 99, 100, 101, 102

**Error:** `Attempted to use detached Frame '28422D57CC51E794CB2924067B0EDBBD'`

**Root Cause:**
- Test `35_coffee_economy` calls `client.goto(cfg.baseUrl)` which causes navigation
- After navigation, the Puppeteer frame becomes detached
- All subsequent tests fail immediately because they try to use `client.evaluate()` on a detached frame
- The test isolation logic in `matrix.ts` tries to avoid navigation, but individual tests are still navigating

**Fix Required:**
1. Add frame validity check before each test operation
2. Recreate client/page if frame is detached
3. Remove unnecessary `client.goto()` calls from individual tests (they should rely on the isolation reset)
4. Add try-catch around `client.evaluate()` calls with frame recreation fallback

---

### 2. Timeout Issues
**Status:** 🟡 High Priority  
**Affected Tests:** 00_smoke, 10_effort_bands

**Error:** `Waiting failed: 8000ms exceeded`

**Root Cause:**
- Tests are waiting for typing indicators or assistant messages that may not appear
- The fallback selector logic exists but may not be working correctly
- Network requests may be slower than expected

**Fix Required:**
1. Increase timeout values for slow network conditions
2. Improve fallback selector logic
3. Add better logging to see what's actually happening during waits

---

### 3. State Synchronization Issues
**Status:** 🟡 High Priority  
**Affected Tests:** 20_boost_and_cooldown, 25_blanket_mode

**Error:** 
- `Boost button should be disabled during cooldown`
- `Blanket should be visible when effort < 20`

**Root Cause:**
- React state updates may not be immediately reflected in the DOM
- Zustand state changes may need time to propagate
- Tests are checking state too quickly after actions

**Fix Required:**
1. Add proper waits after state-changing actions
2. Use `waitForFunction` to wait for state to update
3. Check Zustand store directly before checking DOM

---

### 4. Accessibility Violation
**Status:** 🟡 Medium Priority  
**Error:** `Found 1 serious violations`

**Fix Required:**
1. Run axe report to identify the specific violation
2. Fix the accessibility issue in the UI
3. Re-run tests to verify fix

---

## Test Results Summary

- **Total Tests:** 21
- **Passed:** 1 (30_idle_and_overlay)
- **Failed:** 20
- **Success Rate:** 4.8%

### Passing Tests
- ✅ `30_idle_and_overlay` (3.5s)

### Failing Tests by Category

**Detached Frame (15 tests):**
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

**Timeout (2 tests):**
- 00_smoke (1.5m)
- 10_effort_bands (1.4m)

**State Issues (2 tests):**
- 20_boost_and_cooldown (3.3s)
- 25_blanket_mode (2.9s)

**Other (1 test):**
- 35_coffee_economy (8.2m) - Detached frame error after long wait

---

## Recommended Fix Priority

1. **Fix detached frame handling** - This will fix 15+ tests immediately
2. **Fix timeout issues** - Will fix 2 critical smoke tests
3. **Fix state synchronization** - Will fix 2 important feature tests
4. **Fix accessibility** - Will improve overall quality

---

## Next Steps

1. Add frame validity check and recreation logic to `mcpClient.ts`
2. Remove `client.goto()` from individual test scenarios
3. Improve test isolation to prevent frame detachment
4. Add better error handling and logging
5. Re-run full test suite to verify fixes

