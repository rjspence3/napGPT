# Major Issues Identified

**Date:** 2025-11-13  
**Status:** 🔴 CRITICAL

---

## Issue Summary

All 14 MCP test scenarios are failing because **the page is never navigated to**. The test runner creates a browser and page, but scenarios never call `client.goto(config.baseUrl)`.

---

## Root Cause

### Problem 1: Missing Navigation
- **Location:** All test scenarios
- **Issue:** Scenarios assume the page is already loaded, but `createMCPClient()` only creates a browser/page - it doesn't navigate
- **Impact:** All selectors fail because there's no page content

### Problem 2: Test Isolation
- **Location:** `scripts/mcp/run-mcp-tests.ts`
- **Issue:** No test isolation - each scenario should navigate to a fresh page
- **Impact:** Tests may interfere with each other

### Problem 3: Toast Test Compilation Error
- **Location:** `scripts/mcp/scenarios/36_toast_boost_refused.ts`
- **Issue:** Variable `page` declared twice (FIXED)
- **Impact:** Test couldn't run

---

## Evidence

### Test Output
```
❌ FAILED: Waiting for selector `[data-testid="chat-input"]` failed
❌ FAILED: Waiting for selector `[data-testid="effort-slider"]` failed
❌ FAILED: Waiting for selector `[data-testid="beans-count"]` failed
```

All failures are "selector not found" - classic symptom of page not loaded.

### Code Analysis
- `createMCPClient()` creates browser/page but doesn't navigate
- Scenarios have comments like "Page should already be loaded by test isolation" but no navigation happens
- No `client.goto()` calls in any scenario

---

## Required Fixes

### Fix 1: Add Navigation to Test Runner
**File:** `scripts/mcp/run-mcp-tests.ts`

Add navigation before each scenario:
```typescript
// Before running scenario
await client.goto(config.baseUrl);
await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for React hydration
```

### Fix 2: Add Navigation to Each Scenario (Alternative)
**Files:** All scenario files

Add at the start of each scenario:
```typescript
await client.goto(config.baseUrl);
```

### Fix 3: Verify Dev Server
**Check:** Ensure dev server is running and accessible
- Port 3000 is in use (PID 30959) ✅
- Need to verify app is actually serving content

---

## Immediate Actions

1. ✅ Fix toast test compilation error (DONE)
2. ⏳ Add navigation to test runner or scenarios
3. ⏳ Verify dev server is serving the app correctly
4. ⏳ Re-run tests

---

## Test Status

- **TypeScript:** ✅ PASSING
- **ESLint:** ✅ PASSING  
- **MCP Scenarios:** ❌ ALL FAILING (14/14)
- **Root Cause:** Page not navigated

---

## Next Steps

1. Add `client.goto(config.baseUrl)` to test runner before each scenario
2. Add small delay for React hydration
3. Re-run test suite
4. Verify all scenarios can find selectors

