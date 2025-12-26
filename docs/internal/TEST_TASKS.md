# Test Execution Tasks

**Date:** 2025-11-13  
**Purpose:** Complete test execution for code review fixes (F001-F012)

---

## Task List

### ✅ Completed
- [x] TypeScript compilation check
- [x] ESLint check
- [x] UI test suite (headless) - partial run

### ⏳ Pending Tasks

#### Task 1: Run MCP Scenarios
**Command:**
```bash
HEADFUL=1 npm run test:mcp --scenario 00,10,20,25,36,40
```

**Purpose:**
- Verify core smoke test (00)
- Test effort bands (10)
- Test boost and cooldown (20)
- Test blanket mode (25)
- **NEW:** Test toast boost refused (36) - F007
- Test energy meter (40)

**Expected Duration:** ~10-15 minutes

**Success Criteria:**
- All scenarios pass
- Toast test (36) verifies toast appears and disappears correctly
- No regressions in existing scenarios

---

#### Task 2: Run Jest Unit Tests
**Command:**
```bash
npm run test:ui-all
```

**Purpose:**
- Run all Jest-based unit tests
- Verify testRandom utility tests pass
- Check component unit tests

**Expected Duration:** ~5-10 minutes

**Success Criteria:**
- All unit tests pass
- testRandom.test.ts passes all cases
- No test failures

**Note:** Requires separate server instance to avoid port conflicts

---

#### Task 3: Run Chaos Engineering Tests
**Command:**
```bash
CHAOS_LATENCY_MS=1000 CHAOS_FAIL_PCT=5 CHAOS_429_PCT=5 npm run test:ui:headless
```

**Purpose:**
- Verify chaos engineering flags work with new `getTestRandom()` implementation
- Test error handling under simulated failures
- Verify retry logic with jitter
- Ensure deterministic behavior when seed is provided

**Expected Duration:** ~20-30 minutes

**Success Criteria:**
- Tests handle chaos flags correctly
- Retry logic works with seeded RNG
- No empty replies (0 failures)
- Graceful error handling

---

#### Task 4: Review Test Results
**Actions:**
- [ ] Review all test output
- [ ] Document any failures
- [ ] Identify root causes for any issues
- [ ] Create follow-up tasks if needed
- [ ] Update TEST_STATUS.md with final results

**Success Criteria:**
- All test results documented
- Any failures have root cause analysis
- Clear next steps identified

---

#### Task 5: Verify Toast Boost Refused Test
**Specific Check:**
- [ ] Scenario 36 runs successfully
- [ ] Toast appears when boost clicked with 0 beans
- [ ] Toast message is correct
- [ ] Toast disappears within 3-4 seconds
- [ ] Test uses state-based waits (not setTimeout)

**Success Criteria:**
- Toast test passes
- All assertions verified
- No flaky behavior

---

## Execution Order

1. **Task 1** (MCP Scenarios) - Run first to verify new test
2. **Task 2** (Jest Unit Tests) - Can run in parallel or after Task 1
3. **Task 3** (Chaos Tests) - Run last (longest duration)
4. **Task 4** (Review Results) - After all tests complete
5. **Task 5** (Verify Toast Test) - Part of Task 1 review

---

## Notes

- All tests should be run from project root: `/Users/rob/Development/napGPT`
- Ensure dev server is running for integration tests: `npm run dev`
- Check artifacts directory for detailed reports after each test run
- Update TEST_STATUS.md after completing each task

---

## Quick Reference Commands

```bash
# Start dev server (if not running)
npm run dev

# Task 1: MCP Scenarios
HEADFUL=1 npm run test:mcp --scenario 00,10,20,25,36,40

# Task 2: Jest Unit Tests
npm run test:ui-all

# Task 3: Chaos Tests
CHAOS_LATENCY_MS=1000 CHAOS_FAIL_PCT=5 CHAOS_429_PCT=5 npm run test:ui:headless

# View test artifacts
open artifacts/latest/index.html
```

---

## Success Metrics

- ✅ All MCP scenarios pass (including new toast test)
- ✅ All Jest unit tests pass
- ✅ Chaos tests complete with 0 empty replies
- ✅ No regressions introduced
- ✅ All fixes (F001-F012) verified working

