# Test Fix Status Report

**Date**: 2025-11-10  
**Status**: 🔴 **IN PROGRESS** - Multiple issues identified and being fixed

## Test Results Summary

### Current Pass Rate: 1/13 (7.7%)

**Passing Tests:**
- ✅ `30_idle_and_overlay` (3733ms)

**Failing Tests:**
- ❌ `00_smoke` - Timeout waiting for message-assistant
- ❌ `10_effort_bands` - Timeout waiting for message-assistant  
- ❌ `20_boost_and_cooldown` - Timeout waiting for message-assistant
- ❌ `25_blanket_mode` - Blanket not visible when effort < 20
- ❌ `35_coffee_economy` - Beans not regenerating after idle
- ❌ `40_energy_meter` - Timeout waiting for message-assistant
- ❌ `50_commands_dream_nap` - Timeout waiting for message-assistant
- ❌ `55_dream_drift` - Timeout waiting for message-assistant
- ❌ `60_context_threading` - Timeout waiting for message-assistant
- ❌ `70_error_and_retry` - Request interception error (crashes)
- ❌ `80_math_and_code_guards` - Timeout waiting for message-assistant
- ❌ `90_non_sequitur_dropout_bounds` - Timeout waiting for message-assistant

## Issues Identified

### 🔴 Critical Issues

#### 1. **Message Assistant Not Appearing** (11 tests failing)
**Symptom**: Tests timeout waiting for `[data-testid="message-assistant"]:last-of-type`

**Possible Causes:**
- API calls not completing (MockLLM delay: 300-800ms, but tests timeout at 30s)
- Messages not being rendered in DOM
- Selector issue - element exists but selector doesn't match
- React state not updating properly

**Investigation Needed:**
- Check if API calls are actually completing
- Verify messages are being added to state
- Check if MessageBubble component is rendering
- Verify data-testid attribute is present

**Files to Check:**
- `src/components/ChatWindow.tsx` - Message rendering
- `src/components/MessageBubble.tsx` - data-testid attribute
- `src/app/api/chat/route.ts` - API response handling
- `scripts/mcp/scenarios/00_smoke.ts` - Test logic

#### 2. **Request Interception Error** (1 test crashing)
**Symptom**: `Error: Request Interception is not enabled!`

**Location**: `scripts/mcp/scenarios/70_error_and_retry.ts:32`

**Issue**: Request interception is being used but not properly enabled before use.

**Fix Needed**: Enable request interception before setting up handlers.

### 🟡 Medium Priority Issues

#### 3. **Blanket Overlay Not Showing**
**Symptom**: Blanket not visible when effort < 20

**Possible Causes:**
- `initBlanketAuto()` not running or not checking frequently enough
- Blanket state not updating when effort changes
- Timing issue - test checks before blanket auto-check runs

**Current Fix Attempted**: Increased wait time to 2.5s (blanket checks every 1s)

**Files to Check:**
- `src/lib/nap/blanket.ts` - Blanket auto logic
- `src/lib/nap/state.ts` - Blanket state management
- `scripts/mcp/scenarios/25_blanket_mode.ts` - Test timing

#### 4. **Bean Regeneration Not Working**
**Symptom**: Beans don't increase after idle wait

**Possible Causes:**
- `initBeanTicker()` not running
- Bean ticker interval not firing
- State not updating

**Files to Check:**
- `src/lib/nap/coffee.ts` - Bean ticker logic
- `src/lib/nap/state.ts` - Bean state management
- `scripts/mcp/scenarios/35_coffee_economy.ts` - Test logic

## Fixes Applied

### ✅ Completed
1. **Increased timeouts** - Changed `long` timeout from 9s to 30s
2. **Fixed coffee economy waitFor bug** - Changed `ops.waitFor(ms)` to `setTimeout`
3. **Improved test isolation** - Removed page reloads to prevent frame detachment
4. **Fixed boost cooldown test** - Added wait for React state update
5. **Fixed error reporting** - Added detailed error logging and failure screenshots

### 🔄 In Progress
1. **Message rendering investigation** - Need to verify why messages aren't appearing
2. **Request interception fix** - Need to properly enable before use
3. **Blanket timing** - May need to trigger blanket check manually or wait longer

## Next Steps

### Immediate Actions
1. **Debug message rendering**:
   ```bash
   # Check if API is responding
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"test"}],"effort":50}'
   
   # Check browser console for errors
   # Check if messages state is updating
   ```

2. **Fix request interception**:
   - Enable interception before setting handlers
   - Use proper Puppeteer API

3. **Investigate blanket/bean issues**:
   - Check if init functions are running
   - Verify state updates are happening
   - May need to manually trigger checks in tests

### Testing Strategy
1. Fix one test at a time, starting with `00_smoke` (simplest)
2. Once smoke test passes, fix others based on same pattern
3. Run tests after each fix to verify

## Test Execution Commands

```bash
# Run all tests (headless)
npm run test:ui:headless

# Run with live LLM (requires API key)
LIVE_LLM=1 npm run test:ui:live

# Run specific scenario
tsx scripts/mcp/scenarios/00_smoke.ts
```

## Artifacts

- **Reports**: `artifacts/<timestamp>/index.html`
- **Screenshots**: `artifacts/<timestamp>/failures/`
- **Logs**: `artifacts/<timestamp>/logs/`

## Estimated Time to Fix

- **Message rendering issue**: 2-4 hours (critical blocker)
- **Request interception**: 30 minutes
- **Blanket/Bean issues**: 1-2 hours each
- **Total**: 4-8 hours to reach 100% pass rate

## Notes

- Frame detachment issues appear to be resolved (no more errors in latest run)
- Tests are running but most are timing out waiting for UI updates
- Need to verify if issue is in app code or test code
- May need to add more debugging/logging to understand what's happening

