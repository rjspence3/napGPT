# Test Failures Report

## Summary
- **Total Tests**: 77
- **Passed**: 64 (83.1%)
- **Failed**: 13 (16.9%)

## Critical Issues

### 1. Boost Button Cooldown Not Working Immediately ⚠️ **HIGH PRIORITY**
**Affected Tests**: 5 tests
- `api-button-tests.spec.ts:220` - should disable boost button after click (cooldown)
- `api-button-tests.spec.ts:231` - should not call API if boost is on cooldown
- `api-button-tests.spec.ts:467` - complete flow: boost -> send message -> receive response
- `ui-elements.spec.ts:234` - Boost button should show cooldown after click
- `ui-elements.spec.ts:245` - Boost button should re-enable after cooldown
- `smoke.spec.ts:58` - boost button has cooldown

**Problem**: 
The boost button doesn't get disabled immediately after clicking. The `displayCooldown` state in `EffortBar.tsx` is updated via `useEffect`, which causes a delay. The button's `disabled` attribute uses `boostDisabled` which depends on `displayCooldown`, but this state update is asynchronous.

**Root Cause**:
```typescript
// EffortBar.tsx line 34-37
const handleBoost = async () => {
  if (boostCooldown > 0) return;
  triggerBoost(); // Sets boostCooldown in store
  // ... API call
};

// Line 56
const boostDisabled = displayCooldown > 0; // Uses displayCooldown, not boostCooldown directly
```

The `displayCooldown` is synced via `useEffect` (line 24-32), so there's a render cycle delay before the button becomes disabled.

**Fix Required**:
- Use `boostCooldown` directly from store instead of `displayCooldown` for the `disabled` check
- Or ensure `displayCooldown` is updated synchronously before the button renders

---

### 2. Rate Limiting Test Not Detecting Errors ⚠️ **MEDIUM PRIORITY**
**Affected Test**: `api-button-tests.spec.ts:130` - should handle rate limiting

**Problem**: 
Test sends 11 requests quickly but doesn't detect rate limit errors. The test checks for "Rate limit" text or "ugh... something broke" but neither appears.

**Root Cause**:
- Rate limit error might not be displayed in UI
- Error handling in `ChatWindow.tsx` might not show rate limit messages
- Rate limit response (429) might be handled differently

**Fix Required**:
- Check if rate limit errors are properly displayed in the UI
- Update error handling to show rate limit messages
- Or update test to check for 429 status code in network response

---

### 3. Rate Limiting Affecting Other Tests ⚠️ **MEDIUM PRIORITY**
**Affected Test**: `api-button-tests.spec.ts:416` - should receive valid response format

**Problem**: 
Test receives 429 (rate limit) instead of 200 because previous tests exhausted the rate limit (10 requests/minute).

**Root Cause**:
- Rate limit is per IP address
- Multiple tests running in sequence hit the same rate limit
- No rate limit reset between tests

**Fix Required**:
- Add test isolation (clear rate limit between tests)
- Or increase rate limit for tests
- Or add delays between test suites
- Or mock rate limiting in tests

---

### 4. Smoke Test Selector Ambiguity ⚠️ **LOW PRIORITY**
**Affected Test**: `smoke.spec.ts:4` - loads the page and shows empty state

**Problem**: 
`locator('text=NapGPT')` matches 2 elements (h1 in header and h2 in empty state), causing strict mode violation.

**Root Cause**:
- Both header and empty state contain "NapGPT" text
- Playwright's strict mode requires unique selectors

**Fix Required**:
- Use more specific selector: `locator('h1:has-text("NapGPT")')` or `locator('header h1')`
- Or use `first()` to get the first match

---

### 5. Message Alignment Test Wrong Element ⚠️ **LOW PRIORITY**
**Affected Test**: `ui-elements.spec.ts:157` - user messages should be right-aligned

**Problem**: 
Test checks `page.locator("text=Right aligned").locator("..")` which gets the message bubble div, not the container with `justify-end`.

**Root Cause**:
- The `justify-end` class is on the parent container, not the message bubble itself
- Need to go up one more level or use a different selector

**Fix Required**:
- Use `locator("text=Right aligned").locator("../..")` or better selector
- Or check the parent container directly

---

### 6. API Response Timeouts ⚠️ **MEDIUM PRIORITY**
**Affected Tests**: 3 tests timing out
- `api-button-tests.spec.ts:313` - low effort should produce different responses than high effort
- `smoke.spec.ts:10` - effort slider changes behavior
- `smoke.spec.ts:34` - high effort produces helpful response

**Problem**: 
Tests wait for message bubbles that never appear, timing out after 30 seconds.

**Root Cause**:
- API calls might be failing silently
- Messages might not be rendering
- Selector `[class*="MessageBubble"]` might not be matching
- API might be returning errors that aren't displayed

**Fix Required**:
- Check if API calls are actually succeeding
- Verify message rendering logic
- Add better error handling/display
- Increase timeout or add retry logic
- Check if rate limiting is causing failures

---

## Detailed Breakdown by Category

### Boost Button Issues (5 failures)
All related to cooldown not working immediately:
1. Button doesn't disable right after click
2. Button state not syncing properly with store
3. Cooldown display not updating synchronously

### Rate Limiting Issues (2 failures)
1. Rate limit errors not detected in UI
2. Rate limits affecting subsequent tests

### Selector Issues (2 failures)
1. Ambiguous "NapGPT" selector
2. Wrong element selected for alignment check

### Timeout Issues (3 failures)
1. API responses not appearing in UI
2. Message bubbles not rendering
3. Possible API failures not being caught

### Test Structure Issues (1 failure)
1. Tests not isolated (rate limits carry over)

---

## Recommended Fix Priority

### 🔴 **Priority 1 - Critical (Fix First)**
1. **Boost Button Cooldown** - Fix the immediate disable issue
   - Use `boostCooldown` directly instead of `displayCooldown` for disabled check
   - Or update state synchronously

### 🟡 **Priority 2 - Important (Fix Next)**
2. **Rate Limiting** - Add test isolation
   - Clear rate limit between tests
   - Or mock rate limiting for tests
   - Fix rate limit error display

3. **API Timeouts** - Debug why messages aren't appearing
   - Check API responses
   - Verify message rendering
   - Add better error handling

### 🟢 **Priority 3 - Nice to Have**
4. **Selector Fixes** - Make selectors more specific
5. **Test Improvements** - Add better error messages

---

## Code Locations to Fix

1. **`src/components/EffortBar.tsx`** (Line 56, 78)
   - Change `boostDisabled` to use `boostCooldown` directly
   - Or ensure synchronous state update

2. **`src/components/ChatWindow.tsx`** (Line 100-117)
   - Add rate limit error handling
   - Display rate limit messages

3. **`tests/e2e/smoke.spec.ts`** (Line 6)
   - Use `locator('h1:has-text("NapGPT")')` instead

4. **`tests/e2e/ui-elements.spec.ts`** (Line 165)
   - Fix message alignment selector

5. **`tests/e2e/api-button-tests.spec.ts`** (Line 130, 416)
   - Add rate limit test isolation
   - Check network responses for rate limits

---

## Test Environment Notes

- Rate limit: 10 requests per minute per IP
- Tests run in sequence, sharing the same IP
- No rate limit reset between tests
- API key is configured (production mode)


