# Safety Rails - Pre-Merge Requirements

## Overview

Two safety rails are enforced before merging to ensure test stability and performance:

1. **Budget Gate** - Enforces performance and behavior budgets
2. **Flake Guard** - Detects non-deterministic test failures

---

## 1. Budget Gate

**Command**: `npm run test:ui:budget-gate`

**Enforces**:
- ✅ **first-token ≤ 5s** - First token latency must be ≤ 5000ms
- ✅ **total ≤ 20s** - Total response time must be ≤ 20000ms
- ✅ **empty replies = 0** - Zero tolerance for empty responses

**How it works**:
- Reads metrics from `artifacts/ui-test/metrics.json`
- Compares actual values against budgets
- Fails CI if any budget is breached
- Prints detailed failure messages

**Usage**:
```bash
# Run after test suite
npm run test:ui:headless
npm run test:ui:budget-gate
```

**CI Integration**:
- Runs automatically after test suite in `.github/workflows/ui-tests.yml`
- Fails the build if budgets are breached
- Provides clear error messages for debugging

---

## 2. Flake Guard

**Command**: `npm run test:ui:flake-guard`

**Enforces**:
- ✅ **Deterministic tests** - Each of the 6 fixed scenarios must pass twice in a row
- ✅ **No flakiness** - Results must be identical across retries

**Scenarios tested**:
1. `10_effort_bands` - Effort band routing
2. `20_boost_and_cooldown` - Boost button cooldown
3. `25_blanket_mode` - Blanket overlay
4. `40_energy_meter` - Energy draining/refilling
5. `95_api_endpoints` - API endpoints
6. `100_ui_interactions` - Keyboard/focus/scroll

**How it works**:
- Runs each scenario twice sequentially
- Compares results between runs
- Fails if:
  - Any scenario fails on either run
  - Results differ between runs (flaky)

**Usage**:
```bash
# Run after test suite
npm run test:ui:headless
npm run test:ui:flake-guard
```

**CI Integration**:
- Runs automatically after test suite in `.github/workflows/ui-tests.yml`
- Fails the build if flakiness detected
- Reports which scenarios are flaky

---

## CI Workflow

Both safety rails run automatically in CI:

```yaml
- name: Budget Gate
  run: npm run test:ui:budget-gate
  continue-on-error: false

- name: Flake Guard
  run: npm run test:ui:flake-guard
  continue-on-error: false
```

**Failure behavior**:
- Both gates must pass for CI to succeed
- Failures block PR merges
- Artifacts uploaded on failure for debugging

---

## Nightly Regression Watch

**Job**: `regression-watch`

**Purpose**: Ensures fallbacks stay healthy under chaos conditions

**Runs**: Nightly at 2 AM UTC (via `schedule` trigger)

**Chaos flags**:
- `CHAOS_LATENCY_MS=1200` - 1.2s latency injection
- `CHAOS_FAIL_PCT=10` - 10% failure rate
- `CHAOS_429_PCT=10` - 10% rate limit errors

**Verifies**:
- ✅ Graceful error handling
- ✅ No empty replies
- ✅ Budgets still met under chaos
- ✅ Fallback messages work correctly

**Artifacts**: Uploaded on every run (30-day retention)

---

## Local Testing

Test safety rails locally before pushing:

```bash
# Full test suite
npm run test:ui:headless

# Budget gate
npm run test:ui:budget-gate

# Flake guard
npm run test:ui:flake-guard
```

---

## Troubleshooting

### Budget Gate Failures

**Symptom**: `first-token` or `total` exceeds budget

**Debug**:
1. Check `artifacts/ui-test/metrics.json` for actual values
2. Review network logs in `artifacts/ui-test/har/`
3. Check for slow API responses or network issues
4. Verify LLM provider latency

**Fix**:
- Optimize API response times
- Reduce `LLM_MAX_TOKENS` if needed
- Check for network throttling in CI

### Flake Guard Failures

**Symptom**: Scenario passes on run 1 but fails on run 2 (or vice versa)

**Debug**:
1. Review test logs for timing issues
2. Check for race conditions in state management
3. Verify deterministic RNG seeding
4. Look for async timing dependencies

**Fix**:
- Add proper waits for state updates
- Ensure seeded RNG is used consistently
- Fix race conditions in component state
- Use timestamp-based cooldowns (not intervals)

---

## Best Practices

1. **Run locally first** - Don't wait for CI to catch issues
2. **Check metrics** - Review `artifacts/ui-test/metrics.json` regularly
3. **Monitor trends** - Watch for gradual budget degradation
4. **Fix flakiness immediately** - Don't let flaky tests accumulate
5. **Document exceptions** - If budgets need adjustment, document why

---

## Configuration

Budgets can be adjusted in `scripts/ui-test/budgets.ts`:

```typescript
export const DEFAULT_BUDGETS: BudgetConfig = {
  latency: {
    uiToTypingMs: 1500,
    firstTokenMs: 5000,  // ← Adjust here
    totalMs: 20000,      // ← Adjust here
  },
  behavior: {
    emptyReplies: 0,     // ← Zero tolerance
    // ...
  },
};
```

**Note**: Budget changes should be discussed and documented.

