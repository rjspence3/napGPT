# Test Fix Action Plan

**Status:** 1/21 passing (4.8%) → Target: 21/21 (100%)  
**Priority Order:** Critical → High → Medium

---

## 🔴 CRITICAL: Frame Detachment (15 tests)

### Problem
All tests after `35_coffee_economy` fail with "Attempted to use detached Frame" because:
- Every test calls `client.goto()` which navigates and detaches frames
- Test isolation tries to avoid navigation, but tests still navigate

### Fix (3 steps)

**Step 1: Remove navigation from all test scenarios**
- Remove `await client.goto(cfg.baseUrl);` from 20 test files
- Tests should rely on isolation reset in `matrix.ts`
- **Files:** All files in `scripts/mcp/scenarios/*.ts` except `30_idle_and_overlay.ts` (it passes)

**Step 2: Improve test isolation**
- File: `scripts/ui-test/matrix.ts` (lines 75-94)
- Add frame validity check before each test
- Recreate client if frame is detached
- Ensure URL is correct without unnecessary navigation

**Step 3: Add frame safety checks**
- File: `scripts/mcp/utils/browserOps.ts`
- Wrap `page.evaluate()` calls with try-catch
- Detect "detached frame" errors and handle gracefully

**Expected Result:** 15 tests should pass immediately

---

## 🟡 HIGH: Timeout Issues (2 tests)

### Problem
- `00_smoke`: Timeout waiting for assistant message (1.5m)
- `10_effort_bands`: Timeout at effort level 5 (1.4m)

### Fix (3 steps)

**Step 1: Increase timeouts**
- File: `scripts/mcp/config.ts`
- Change `long: 30000` → `long: 60000`
- Change `medium: 8000` → `medium: 15000`
- Change `short: 3000` → `short: 5000`

**Step 2: Improve wait logic**
- File: `scripts/mcp/utils/browserOps.ts` (waitFor function)
- Add multiple fallback strategies for message-assistant
- Try: primary selector → any message-assistant → waitForFunction → message list check

**Step 3: Add network wait**
- Files: `00_smoke.ts`, `10_effort_bands.ts`
- Add `await ops.waitForNetworkIdle()` before waiting for messages
- Wait for typing indicator to disappear before checking message

**Expected Result:** 2 tests should pass

---

## 🟡 HIGH: State Synchronization (2 tests)

### Problem
- `20_boost_and_cooldown`: Boost button not disabled during cooldown
- `25_blanket_mode`: Blanket not visible when effort < 20

### Fix (2 steps)

**Step 1: Fix boost cooldown test**
- File: `scripts/mcp/scenarios/20_boost_and_cooldown.ts`
- After clicking boost, wait for Zustand state to update
- Use `waitForFunction` to wait for button to become disabled
- Check Zustand store directly: `store.getState().boostCooldown > 0`

**Step 2: Fix blanket mode test**
- File: `scripts/mcp/scenarios/25_blanket_mode.ts`
- After setting effort, wait for blanket check to run
- Use `waitForFunction` to wait for overlay to appear
- Check Zustand store: `store.getState().blanketOn === true`

**Expected Result:** 2 tests should pass

---

## 🟢 MEDIUM: Accessibility (1 violation)

### Problem
- Axe scan found 1 serious violation

### Fix (2 steps)

**Step 1: Identify violation**
```bash
cat artifacts/*/axe/report.json | jq '.violations[] | select(.impact == "serious")'
```

**Step 2: Fix in UI code**
- Based on violation type, fix in appropriate component
- Common fixes: add `aria-label`, fix contrast, fix keyboard nav
- Re-run axe test to verify

**Expected Result:** 0 violations

---

## Implementation Checklist

### Phase 1: Frame Detachment (Critical)
- [ ] Remove `client.goto()` from 00_smoke.ts
- [ ] Remove `client.goto()` from 10_effort_bands.ts
- [ ] Remove `client.goto()` from 20_boost_and_cooldown.ts
- [ ] Remove `client.goto()` from 25_blanket_mode.ts
- [ ] Remove `client.goto()` from 35_coffee_economy.ts
- [ ] Remove `client.goto()` from 40_energy_meter.ts
- [ ] Remove `client.goto()` from 50_commands_dream_nap.ts
- [ ] Remove `client.goto()` from 55_dream_drift.ts (2 instances)
- [ ] Remove `client.goto()` from 60_context_threading.ts
- [ ] Remove `client.goto()` from 70_error_and_retry.ts (2 instances)
- [ ] Remove `client.goto()` from 80_math_and_code_guards.ts
- [ ] Remove `client.goto()` from 90_non_sequitur_dropout_bounds.ts
- [ ] Remove `client.goto()` from 95_api_endpoints.ts
- [ ] Remove `client.goto()` from 96_wake_reactions.ts
- [ ] Remove `client.goto()` from 97_echo_fragments.ts
- [ ] Remove `client.goto()` from 98_self_references.ts
- [ ] Remove `client.goto()` from 99_recall_command.ts
- [ ] Remove `client.goto()` from 100_ui_interactions.ts
- [ ] Remove `client.goto()` from 101_edge_cases.ts
- [ ] Remove `client.goto()` from 102_network_errors.ts
- [ ] Improve test isolation in matrix.ts
- [ ] Add frame validity checks to browserOps.ts
- [ ] Test: Run full suite, verify 15+ tests pass

### Phase 2: Timeouts (High)
- [ ] Increase timeouts in config.ts
- [ ] Improve waitFor logic in browserOps.ts
- [ ] Add network wait in 00_smoke.ts
- [ ] Add network wait in 10_effort_bands.ts
- [ ] Test: Run full suite, verify 2 tests pass

### Phase 3: State Sync (High)
- [ ] Fix boost cooldown test (20_boost_and_cooldown.ts)
- [ ] Fix blanket mode test (25_blanket_mode.ts)
- [ ] Test: Run full suite, verify 2 tests pass

### Phase 4: Accessibility (Medium)
- [ ] Identify violation in axe report
- [ ] Fix violation in UI code
- [ ] Re-run axe test
- [ ] Test: Verify 0 violations

### Phase 5: Validation
- [ ] Run full test suite
- [ ] Verify 21/21 tests pass
- [ ] Check execution time is reasonable
- [ ] Verify artifacts are generated

---

## Quick Reference

**Files to modify:**
- `scripts/mcp/scenarios/*.ts` - Remove `client.goto()` (20 files)
- `scripts/ui-test/matrix.ts` - Improve isolation
- `scripts/mcp/utils/browserOps.ts` - Add frame checks, improve waits
- `scripts/mcp/config.ts` - Increase timeouts
- `scripts/mcp/scenarios/20_boost_and_cooldown.ts` - Fix state sync
- `scripts/mcp/scenarios/25_blanket_mode.ts` - Fix state sync

**Estimated time:** 2-3 hours for all fixes

**Expected outcome:** 21/21 tests passing (100%)

