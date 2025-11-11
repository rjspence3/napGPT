# Live LLM E2E Tests - PR Description

## Summary

Converted NapGPT UI tests to use **real LLM integration by default** (LIVE_LLM=1) with deterministic, non-textual assertions. Tests now prove actual network round-trips, detect streaming, and surface problems while keeping costs and flakes under control.

## What Changed

### Core Implementation

1. **Environment & Wiring** ✅
   - Added `LIVE_LLM=1` flag (default mode)
   - `LLM_PROVIDER` support (openai/anthropic, extensible)
   - `LLM_API_KEY`, `LLM_MODEL`, `LLM_MAX_TOKENS` env vars
   - App updated to support provider selection
   - Provider header (`x-provider`) in API response

2. **Test Utilities** ✅
   - `tests/utils/live.ts` - Env validation, streaming detection, HAR capture, console gate
   - `tests/utils/metrics.ts` - Latency budgets, entropy checks, echo detection
   - Enhanced `tests/utils/screen.ts` - before-send/during-stream/after-reply steps

3. **Live LLM Test** ✅
   - `tests/ui/chat.live.spec.ts` - Real round-trip with actual provider
   - Bounded, instructive prompt to reduce stochasticity
   - Before/during/after screenshots + crops
   - Network assertions (POST body, provider header)
   - Streaming detection (≥3 chunks if implemented)
   - State gating (send button disabled/enabled)
   - Result sanity (length, entropy, not echo)
   - Performance budgets (first token ≤ 5s, final ≤ 20s)

4. **Security & Privacy** ✅
   - Secrets redacted in HAR files
   - Secrets redacted in console logs
   - Environment proxy redacts API keys
   - No hardcoded credentials

5. **Cost Controls** ✅
   - Small `max_tokens` cap (128 default)
   - Limited test count (1-2 live tests)
   - Lower temperature (0.2) for stability
   - Retry logic with backoff

## Files Added

- `tests/utils/live.ts` - Live LLM utilities
- `tests/utils/metrics.ts` - Metrics and entropy checks
- `tests/ui/chat.live.spec.ts` - Live LLM E2E test
- `LIVE_LLM_TESTS.md` - Documentation

## Files Modified

- `src/lib/llm/adapter.ts` - Provider selection support
- `src/lib/llm/openai.ts` - Lower temperature (0.2)
- `src/app/api/chat/route.ts` - Provider header in response
- `src/components/MessageBubble.tsx` - Added `data-testid` prop support
- `src/components/ChatWindow.tsx` - Added `data-testid` to typing indicator
- `jest.setup.ts` - Secret redaction
- `jest.config.js` - Live test filtering
- `package.json` - New test scripts
- `.github/workflows/ui-tests.yml` - Live LLM test job

## Non-Negotiables Met

✅ **Default mode = LIVE_LLM=1** - Tests use real provider by default  
✅ **Secrets via env only** - No hardcoding, all redacted in logs  
✅ **Non-textual assertions** - Only structure/protocol/latency/length/entropy  
✅ **No waitForTimeout** - All waits on network or DOM state  
✅ **Console error gate** - Fails on console.error/pageerror  
✅ **Schema validation** - POST body and response structure checked  

## Test Assertions (All Non-Textual)

1. **Network**: POST body contains exact prompt, effort field, 200 status
2. **Provider**: `x-provider` header or meta contains provider name
3. **Streaming**: ≥3 chunks detected (if streaming implemented)
4. **Latency**: First token ≤ 5s, final ≤ 20s
5. **Length**: Response ≥ 10 characters
6. **Entropy**: ≥ 2.2 bits/char (guards against echoes)
7. **Not Echo**: Response ≠ prompt (similarity < 90%)
8. **Structure**: Contains spaces, punctuation
9. **State**: Send button disabled during, enabled after

## Usage

```bash
# Run live LLM test
LIVE_LLM=1 \
LLM_PROVIDER=openai \
LLM_API_KEY=sk-... \
LLM_MODEL=gpt-4o-mini \
LLM_MAX_TOKENS=128 \
npm run test:ui-live

# With visible browser
HEADFUL=1 LIVE_LLM=1 LLM_PROVIDER=openai LLM_API_KEY=sk-... npm run test:ui-live
```

## Artifacts Generated

- Screenshots: `before-send`, `during-stream`, `after-reply`
- Crops: `chat-input-filled`, `message-assistant`
- HAR: `chat-live-llm.har` (secrets redacted)
- Logs: `chat-live-llm.json` (console/page errors)

## Cost Controls

- `LLM_MAX_TOKENS=128` (small cap)
- Only 1-2 live tests per run
- Temperature 0.2 for stability
- Clear rate limit handling

## Definition of Done ✅

Running `LIVE_LLM=1 LLM_PROVIDER=openai LLM_API_KEY=*** LLM_MODEL=gpt-4o-mini npm run test:ui-live`:

✅ Performs a real call  
✅ Shows ≥3 stream chunks (if streaming implemented)  
✅ Meets latency budgets  
✅ Produces screenshots + HAR  
✅ Fails on console errors, transport errors, or missing schema  
✅ Passes with stable, non-textual assertions  

All requirements met! 🚀

