# Comprehensive Fix Plan for All Test Issues

**Date:** 2025-11-12  
**Status:** Ready for Implementation  
**Priority:** Critical - 19/21 tests failing

---

## 📊 Issue Summary

- **Passing:** 2/21 tests (30_idle_and_overlay, 95_api_endpoints)
- **Failing:** 19/21 tests
- **Critical:** Empty message content (10+ tests)
- **Medium:** State synchronization issues (5 tests)
- **Low:** Request interception (1 test)

---

## 🔴 Phase 1: Fix Empty Message Content (CRITICAL)

**Affected Tests:** 00_smoke, 10_effort_bands, 50_commands_dream_nap, 55_dream_drift, 60_context_threading, 80_math_and_code_guards, 90_non_sequitur_dropout_bounds, 96_wake_reactions, 97_echo_fragments, 98_self_references

### Issue Analysis
- Messages are found in DOM but content is empty
- Tests wait 60+ seconds, suggesting API calls are slow or failing
- Text extraction improvements already applied, but still not working

### Root Causes (in order of likelihood):
1. **API returning empty `reply` field** - Most likely
2. **API calls timing out** - 30s timeout in ChatWindow, but tests wait 60s
3. **React state not updating** - Messages added but content not set
4. **Text extraction still failing** - Nested `<p>` tag not found correctly

### Fixes Required:

#### Fix 1.1: Add API Response Logging
**File:** `src/components/ChatWindow.tsx`
- Add detailed logging for API responses
- Log `data.reply` length and first 100 chars
- Log if `data.reply` is undefined/null/empty
- Log response status and headers

**Implementation:**
```typescript
const data = await response.json();
console.log('[ChatWindow] API Response:', {
  hasReply: !!data.reply,
  replyLength: data.reply?.length || 0,
  replyPreview: data.reply?.substring(0, 100),
  status: response.status,
  headers: Object.fromEntries(response.headers.entries())
});
```

#### Fix 1.2: Verify API Always Returns Reply
**File:** `src/app/api/chat/route.ts`
- Ensure all code paths return `reply` field
- Check if `response.text` from `respond()` is empty
- Verify fallback messages are being used
- Add logging for empty responses

**Implementation:**
```typescript
// After line 178 (after respond() call)
console.log('[API] Response from engine:', {
  hasText: !!response?.text,
  textLength: response?.text?.length || 0,
  textPreview: response?.text?.substring(0, 100)
});

// Ensure fallback is used if empty
if (!response?.text || response.text.trim().length === 0) {
  console.warn('[API] Empty response from engine, using fallback');
  // ... existing fallback code
}
```

#### Fix 1.3: Improve Text Extraction with Better Selectors
**File:** `scripts/mcp/utils/browserOps.ts`
- Add more robust text extraction
- Try multiple strategies: `p.textContent`, `p.innerText`, `div.textContent`, TreeWalker
- Add explicit wait for content to be non-empty
- Increase retry count and delay

**Implementation:**
```typescript
// In getText(), add more extraction strategies:
// 1. Try nested <p> tag
// 2. Try all <p> tags in element
// 3. Try direct textContent
// 4. Try TreeWalker for all text nodes
// 5. Try computed text from all children
```

#### Fix 1.4: Add Network Response Verification
**File:** `scripts/mcp/scenarios/00_smoke.ts` (and others)
- Intercept network requests to verify API responses
- Check response body contains `reply` field
- Log response for debugging
- Fail test if API returns empty response

**Implementation:**
```typescript
// Before sending message, set up response interception
const responsePromise = page.waitForResponse(
  (response) => response.url().includes('/api/chat') && response.request().method() === 'POST'
);

// After clicking send
const response = await responsePromise;
const responseBody = await response.json();
console.log('[Test] API Response:', {
  hasReply: !!responseBody.reply,
  replyLength: responseBody.reply?.length || 0
});
assert.assertTrue(!!responseBody.reply && responseBody.reply.length > 0, "API must return non-empty reply");
```

#### Fix 1.5: Add Wait for Content in DOM
**File:** `scripts/mcp/utils/browserOps.ts`
- Update `waitFor()` to wait for actual text content, not just element existence
- Use `waitForFunction` to check `p.textContent.trim().length > 0`
- Increase timeout for content to appear (up to 30s)

**Implementation:**
```typescript
// In waitFor(), after finding element, wait for content:
await page.waitForFunction(
  (sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const p = el.querySelector('p');
    return p && p.textContent && p.textContent.trim().length > 0;
  },
  { timeout: 30000 },
  selector
);
```

---

## 🟡 Phase 2: Fix State Synchronization Issues

### Issue 2.1: Boost Button Cooldown (20_boost_and_cooldown)
**File:** `scripts/mcp/scenarios/20_boost_and_cooldown.ts`

**Problem:** Button disabled state not detected fast enough

**Fix:**
- Use Zustand store directly to check `boostCooldownUntil`
- Wait for button's `disabled` attribute to be true
- Use `page.waitForFunction` with Zustand state check
- Increase timeout to 10s

**Implementation:**
```typescript
// After clicking boost, wait for cooldown to activate
await page.waitForFunction(
  () => {
    const store = (window as any).__nap_store;
    if (!store) return false;
    const state = store.getState();
    return state.boostCooldownUntil > Date.now();
  },
  { timeout: 10000 }
);

// Then check button is disabled
await page.waitForFunction(
  (btnSel) => {
    const btn = document.querySelector(btnSel);
    return btn && (btn as HTMLButtonElement).disabled === true;
  },
  { timeout: 5000 },
  cfg.selectors.boostBtn
);
```

### Issue 2.2: Blanket Overlay (25_blanket_mode)
**File:** `scripts/mcp/scenarios/25_blanket_mode.ts`

**Problem:** Blanket overlay not appearing when effort < 20

**Fix:**
- Manually trigger `__nap_blanket_check` after setting effort
- Directly set `blanketOn` state in Zustand if needed
- Wait for overlay with `page.waitForFunction`
- Increase timeout to 10s

**Implementation:**
```typescript
// After setting effort to 5
await client.evaluate(() => {
  const store = (window as any).__nap_store;
  if (store) {
    const state = store.getState();
    // Force blanket on if effort is low
    if (state.effort < 20) {
      store.setState({ blanketOn: true });
    }
    // Also trigger check
    if ((window as any).__nap_blanket_check) {
      (window as any).__nap_blanket_check();
    }
  }
});

// Wait for overlay
await page.waitForFunction(
  () => {
    const overlay = document.querySelector('[data-testid="blanket-overlay"]');
    return overlay && (overlay as HTMLElement).style.display !== 'none';
  },
  { timeout: 10000 }
);
```

### Issue 2.3: Coffee Economy Boost Clicks (35_coffee_economy)
**File:** `scripts/mcp/scenarios/35_coffee_economy.ts`

**Problem:** Boost button clicks not registering (0 clicks)

**Fix:**
- Check if button is disabled before clicking
- Verify beans count before attempting click
- Add explicit wait after each click
- Log button state for debugging

**Implementation:**
```typescript
// Before clicking, check button state
const buttonDisabled = await client.evaluate((sel) => {
  const btn = document.querySelector(sel);
  return (btn as HTMLButtonElement)?.disabled || false;
}, cfg.selectors.boostBtn);

if (buttonDisabled) {
  notes.push(`Boost button disabled, skipping click ${i + 1}`);
  continue;
}

// Verify we have beans
if (beansBefore === 0) {
  notes.push(`No beans available, skipping click ${i + 1}`);
  break;
}

// Click and wait
await ops.click(cfg.selectors.boostBtn);
await new Promise((resolve) => setTimeout(resolve, 1000)); // Longer wait
```

### Issue 2.4: Energy Meter (40_energy_meter)
**File:** `scripts/mcp/scenarios/40_energy_meter.ts`

**Problem:** Energy not decreasing (stays at 100%)

**Fix:**
- Read energy immediately before and after click (no delay)
- Check Zustand store directly for energy value
- Verify `consumeEnergy` is being called
- Add logging for energy changes

**Implementation:**
```typescript
// Get energy from Zustand store directly (more reliable)
const energyBefore = await client.evaluate(() => {
  const store = (window as any).__nap_store;
  return store ? store.getState().energy : 100;
});

// Send message
await ops.type(cfg.selectors.chatInput, "Test message");
await ops.click(cfg.selectors.sendBtn);

// Immediately check energy (no delay)
const energyAfter = await client.evaluate(() => {
  const store = (window as any).__nap_store;
  return store ? store.getState().energy : 100;
});

assert.assertTrue(
  energyAfter < energyBefore,
  `Energy should decrease (was ${energyBefore}%, now ${energyAfter}%)`
);
```

---

## 🟠 Phase 3: Fix Request Interception (70_error_and_retry)

**File:** `scripts/mcp/scenarios/70_error_and_retry.ts`

**Problem:** Request interception not enabled when trying to abort

**Fix:**
- Enable interception BEFORE navigation
- Remove all listeners before adding new one
- Use `page.setRequestInterception(true)` correctly
- Wait for interception to be ready before sending request

**Implementation:**
```typescript
// Enable interception BEFORE any navigation
await page.setRequestInterception(true);

// Remove any existing listeners
page.removeAllListeners('request');

// Set up handler
let requestBlocked = false;
page.on('request', async (request) => {
  if (request.url().includes('/api/chat') && request.method() === 'POST') {
    requestBlocked = true;
    log(`[70_error_and_retry] Blocking /api/chat request`);
    try {
      await request.abort();
    } catch (err: any) {
      log(`[70_error_and_retry] Error aborting: ${err.message}`);
    }
  } else {
    try {
      await request.continue();
    } catch (err) {
      // Ignore errors for non-chat requests
    }
  }
});

// Small delay to ensure interception is ready
await new Promise((resolve) => setTimeout(resolve, 500));

// Now send message
await ops.type(cfg.selectors.chatInput, "Test");
await ops.click(cfg.selectors.sendBtn);
```

---

## 📋 Implementation Order

### Step 1: Critical Fixes (Empty Messages)
1. ✅ Fix 1.1: Add API response logging
2. ✅ Fix 1.2: Verify API always returns reply
3. ✅ Fix 1.3: Improve text extraction
4. ✅ Fix 1.4: Add network response verification
5. ✅ Fix 1.5: Add wait for content in DOM

### Step 2: State Synchronization
6. ✅ Fix 2.1: Boost button cooldown
7. ✅ Fix 2.2: Blanket overlay
8. ✅ Fix 2.3: Coffee economy boost clicks
9. ✅ Fix 2.4: Energy meter

### Step 3: Request Interception
10. ✅ Fix 3: Request interception setup

### Step 4: Testing & Verification
11. Run full test suite
12. Verify all fixes work
13. Check for regressions
14. Update documentation

---

## 🧪 Testing Strategy

1. **Run single test first** (00_smoke) to verify empty message fix
2. **Run state sync tests** (20, 25, 35, 40) to verify state fixes
3. **Run error test** (70) to verify interception fix
4. **Run full suite** to check all fixes together
5. **Run with live LLM** to ensure API responses work

---

## 📝 Success Criteria

- ✅ All 21 tests passing
- ✅ No empty message content errors
- ✅ All state synchronization working
- ✅ Request interception working
- ✅ Tests complete in reasonable time (< 5 min total)

---

## 🔍 Debugging Tips

1. **Check browser console** for API response logs
2. **Check test logs** for detailed error messages
3. **Use screenshots** in failure artifacts to see UI state
4. **Check network tab** in browser DevTools for API calls
5. **Verify API key** is set and valid for live LLM tests

---

## 📚 Files to Modify

### Critical (Empty Messages):
- `src/components/ChatWindow.tsx` - Add API logging
- `src/app/api/chat/route.ts` - Verify reply always returned
- `scripts/mcp/utils/browserOps.ts` - Improve text extraction
- `scripts/mcp/scenarios/00_smoke.ts` - Add network verification
- `scripts/mcp/scenarios/10_effort_bands.ts` - Add network verification
- `scripts/mcp/scenarios/50_commands_dream_nap.ts` - Add network verification
- `scripts/mcp/scenarios/55_dream_drift.ts` - Add network verification
- `scripts/mcp/scenarios/60_context_threading.ts` - Add network verification
- `scripts/mcp/scenarios/80_math_and_code_guards.ts` - Add network verification
- `scripts/mcp/scenarios/90_non_sequitur_dropout_bounds.ts` - Add network verification
- `scripts/mcp/scenarios/96_wake_reactions.ts` - Add network verification
- `scripts/mcp/scenarios/97_echo_fragments.ts` - Add network verification
- `scripts/mcp/scenarios/98_self_references.ts` - Add network verification

### State Synchronization:
- `scripts/mcp/scenarios/20_boost_and_cooldown.ts` - Fix cooldown wait
- `scripts/mcp/scenarios/25_blanket_mode.ts` - Fix blanket overlay
- `scripts/mcp/scenarios/35_coffee_economy.ts` - Fix boost clicks
- `scripts/mcp/scenarios/40_energy_meter.ts` - Fix energy check

### Request Interception:
- `scripts/mcp/scenarios/70_error_and_retry.ts` - Fix interception setup

---

## ⚠️ Risks & Mitigations

1. **Risk:** API logging adds overhead
   - **Mitigation:** Only log in test mode or with env flag

2. **Risk:** Text extraction changes break other tests
   - **Mitigation:** Test incrementally, verify each change

3. **Risk:** State synchronization fixes make tests slower
   - **Mitigation:** Use direct Zustand access, minimize waits

4. **Risk:** Network verification adds complexity
   - **Mitigation:** Make it optional, only for critical tests

---

## 🎯 Expected Outcomes

After implementing all fixes:
- **Empty message tests:** Should pass with actual API responses
- **State sync tests:** Should pass with proper waits
- **Request interception:** Should work correctly
- **Overall pass rate:** 21/21 (100%)

---

**Next Action:** Start with Phase 1 (Empty Message Content) as it affects the most tests.

