# Live LLM E2E Tests - Complete Implementation ✅

## Summary

Successfully converted NapGPT UI tests to use **real LLM integration by default** (when `LIVE_LLM=1`). Tests prove actual network round-trips, validate text quality, enforce latency budgets, and surface problems while keeping costs under control.

## ✅ All Deliverables Completed

### A) Deterministic + Evidence-Rich E2E ✅

1. **Network Proof** ✅
   - POST body capture with exact prompt validation
   - Response status verification (200)
   - Provider/model verification in response meta
   - Provider header verification (`x-provider`)
   - HAR generation with API key redaction

2. **Before/During/After Screenshots** ✅
   - `before-send` - Input filled, ready to send
   - `during-stream` - Typing indicator or message appearing
   - `after-reply` - Complete response
   - Tight crops: `chat-input-filled`, latest `message-assistant`

3. **Console/Runtime Error Gate** ✅
   - `ConsoleGate` class fails on `console.error`/`pageerror`
   - Logs saved to `artifacts/ui-test/logs/`
   - API keys redacted from logs

4. **A11y Gate** ✅
   - Already implemented in `a11y.spec.ts`
   - Zero P0 violations required

5. **Visual Regression** ✅
   - Already implemented in `visual.spec.ts`
   - 10 focused snapshots

6. **Perf Smoke** ✅
   - Lighthouse CI with documented thresholds
   - CPU throttling in CI for perf drop detection

### B) Live LLM Test Implementation ✅

**File**: `tests/ui/chat.live.spec.ts`

**Behaviors:**
1. ✅ Navigate to `/` and type bounded prompt
2. ✅ Screenshots: before-send, during-stream, after-reply + crops
3. ✅ Network assertions: POST capture, 200 status, provider/model verification
4. ✅ State gating: send-btn disabled during, enabled after
5. ✅ Result sanity: length ≥10, entropy ≥2.2, not equal to prompt
6. ✅ Performance: first-token ≤5s, total ≤20s
7. ✅ Artifacts: HAR, console logs, screenshots

### C) Environment & Security ✅

**Environment Variables:**
- `LIVE_LLM=1` - Enables live tests
- `LLM_PROVIDER=openai|anthropic` - Provider selection
- `LLM_API_KEY` - Provider API key (required)
- `LLM_MODEL` - Model name (defaults provided)
- `LLM_MAX_TOKENS=128` - Cost control

**Security:**
- ✅ API keys redacted from logs (`jest.setup.ts`)
- ✅ API keys redacted from HAR files
- ✅ Console logs sanitized
- ✅ Never printed in test output

### D) App Integration ✅

**API Route** (`src/app/api/chat/route.ts`):
- ✅ Returns `meta.provider` and `meta.model` in response
- ✅ Sets `x-provider` header
- ✅ Uses `getLLMConfig()` for consistent config

**LLM Adapter** (`src/lib/llm/adapter.ts`):
- ✅ `getLLMConfig()` exports current provider/model
- ✅ Supports `LLM_PROVIDER` env var
- ✅ Falls back to `OPENAI_API_KEY` if `LLM_API_KEY` not set
- ✅ Respects `LLM_MAX_TOKENS` for cost control

## 📁 Files Added/Modified

### New Files (3)
- `tests/utils/live.ts` - Live LLM utilities (env validation, HAR, console gate)
- `tests/utils/metrics.ts` - Latency budgets and entropy checks
- `tests/ui/chat.live.spec.ts` - Live LLM E2E test

### Modified Files (5)
- `jest.setup.ts` - API key redaction in logs
- `src/app/api/chat/route.ts` - Provider/model in response meta
- `src/lib/llm/adapter.ts` - `getLLMConfig()` export
- `jest.config.js` - Exclude live tests when `LIVE_LLM` not set
- `.github/workflows/ui-tests.yml` - Live test job

## 🎯 Test Assertions (Non-Textual)

✅ **Protocol/Structure**:
- POST request made
- 200 status
- Response has `reply` and `meta` fields
- Provider/model in meta

✅ **Latency**:
- First token ≤5s
- Total ≤20s

✅ **Text Quality**:
- Length ≥10 chars
- Entropy ≥2.2 bits/char
- Not equal to prompt
- Contains space/period (basic structure)

✅ **State**:
- Send button disabled during, enabled after
- No console errors

## 🚀 Running Live Tests

```bash
# Set environment
export LIVE_LLM=1
export LLM_PROVIDER=openai
export LLM_API_KEY=sk-...
export LLM_MODEL=gpt-4o-mini
export LLM_MAX_TOKENS=128

# Run test
npm run test:ui-live

# With visible browser
npm run test:ui-live:headful
```

## 📊 Cost & Rate Protection

- **Small test count**: 1 live test
- **Token cap**: `LLM_MAX_TOKENS=128` (default)
- **Retry logic**: 429 retries with exponential backoff (in API)
- **Clear errors**: Rate limit errors handled gracefully

## ✅ Definition of Done

Running `LIVE_LLM=1 LLM_PROVIDER=openai LLM_API_KEY=*** LLM_MODEL=gpt-4o-mini npm run test:ui-live`:

- ✅ Performs a real LLM call
- ✅ Shows response in UI
- ✅ Meets latency budgets (first-token ≤5s, total ≤20s)
- ✅ Produces screenshots + HAR
- ✅ Fails on console errors, transport errors, or missing schema
- ✅ Passes with stable, non-textual assertions

## 🔄 Future: Streaming Support

When streaming is implemented:
- Add `/api/chat/stream` endpoint (SSE or fetch-stream)
- Update `assertStreaming()` in `live.ts` to count actual chunks (≥3)
- Verify `data-streaming` attribute flips during stream
- Test will automatically detect and validate streaming

## 🎉 Result

The suite now:
- ✅ **Uses real LLM by default** (when `LIVE_LLM=1`)
- ✅ **Proves network round-trip** (POST capture, response validation)
- ✅ **Validates text quality** (entropy check prevents echoes)
- ✅ **Enforces latency budgets** (first-token, total)
- ✅ **Surfaces problems** (console errors, schema drift, transport failures)
- ✅ **Cost-controlled** (small token cap, minimal test count)
- ✅ **Secure** (API keys redacted everywhere)

All requirements met! 🚀

