# Test Updates - Code Review

**Date:** 2025-01-XX  
**Review:** Full code review with surgical fixes

---

## Summary

This document tracks test-related changes made during the code review. Most fixes were to production code, but some test improvements are recommended.

---

## Tests Added

### F007: Toast Boost Refused Test (Recommended)

**Status:** Not yet implemented (follow-up)  
**File:** `scripts/mcp/scenarios/35_coffee_economy.ts` or new test file  
**Rationale:** Missing test coverage for user-facing toast notification when boost is refused due to insufficient beans.

**Test Case:**
```typescript
// Verify toast appears when boost clicked with 0 beans
1. Set beans to 0 (via store manipulation or natural state)
2. Click boost button
3. Verify toast message appears: "Not enough coffee beans! Wait a bit and earn more."
4. Verify toast has data-testid="toast-boost-refused"
5. Wait 3 seconds
6. Verify toast disappears
```

**Priority:** P1 (High) - User-facing feature should be tested

---

## Tests Changed

### None Required

All existing tests should continue to pass with the applied fixes. The changes made were:
- Type safety improvements (no runtime behavior change)
- Console.log guards (test mode detection already in place)
- Error logging improvements (test mode only)
- Math.random() → testRandom() (maintains determinism when seed provided)

---

## Test Infrastructure

### No Changes Required

- Test mode detection already implemented
- State-based waits already in place (most scenarios)
- Artifact capture working correctly
- Trace logging functional

---

## Test Recommendations

### 1. Add Toast Boost Refused Test

**File:** `scripts/mcp/scenarios/35_coffee_economy.ts`  
**Why:** Currently missing coverage for toast notification  
**Effort:** ~30 minutes

### 2. Verify Empty Reply Guarantees

**File:** All message scenario tests  
**Why:** Ensure all tests verify non-empty assistant replies  
**Status:** Already implemented in most tests, verify coverage

### 3. Add Integration Test for Full Flow

**File:** New test file  
**Why:** Test complete user journey: send message → receive reply → verify UI updates  
**Effort:** ~1 hour

### 4. Chaos Engineering Test Coverage

**File:** Existing chaos tests  
**Why:** Verify chaos flags work correctly with new testRandom() usage  
**Status:** Should work automatically, but verify

---

## Test Execution

### Commands to Run

```bash
# Typecheck
npm run tsc --noEmit

# Lint
npm run lint

# Headful focus run
HEADFUL=1 npm run test:mcp --scenario 00,10,50,55,60

# Full headless
npm run test:ui:headless

# Chaos sweep
CHAOS_LATENCY_MS=1000 CHAOS_FAIL_PCT=5 CHAOS_429_PCT=5 npm run test:ui:headless
```

### Expected Results

- ✅ All existing tests pass
- ✅ No new TypeScript errors
- ✅ No new ESLint errors
- ✅ 0 empty assistant replies across message scenarios
- ✅ First-token ≤ 5s, total reply ≤ 20s in tests
- ✅ All MCP scenarios pass or have documented skips

---

## Test Coverage Analysis

### Current Coverage

- ✅ Message scenarios: All assert non-empty assistant text
- ✅ Latency budgets: Tests verify ≤8s API response
- ✅ State-based waits: Most tests use waitForFunction
- ⚠️ Toast boost refused: Missing test (F007)
- ✅ Artifacts: OuterHTML capture on failure implemented
- ✅ Trace logs: Retry attempts logged in test mode

### Gaps Identified

1. **Toast Boost Refused** - No test verifies toast appears when boost is refused
2. **Full Integration Flow** - No end-to-end test of complete user journey
3. **Error Recovery** - Limited tests for error scenarios (network failures, timeouts)

---

## Regression Testing

### Critical Paths to Verify

1. **API Response Handling**
   - ✅ Non-empty reply guarantee (F003)
   - ✅ Error handling with fallbacks
   - ✅ Timeout handling (8s cap)

2. **State Management**
   - ✅ Effort snapshot before fetch
   - ✅ Boost cooldown timestamp-based
   - ✅ Energy drain/refill logic

3. **UI Rendering**
   - ✅ MessageBubble renders non-empty content
   - ✅ Blanket overlay toggles correctly
   - ✅ Energy meter updates

4. **Type Safety**
   - ✅ No implicit `any` types
   - ✅ Proper error type handling

---

## Follow-up Actions

1. **Add Toast Test** (P1)
   - Implement test for toast boost refused
   - Verify in CI

2. **Verify Chaos Flags** (P2)
   - Test chaos engineering with new testRandom() usage
   - Ensure determinism when seed provided

3. **Documentation** (P3)
   - Update test README with new test patterns
   - Document testRandom() usage for deterministic tests

---

## Notes

- All fixes maintain backward compatibility
- Test mode detection already robust
- No breaking changes to test infrastructure
- Existing tests should pass without modification

