# Live LLM E2E Tests - Final Implementation ✅

## Summary

Successfully implemented live LLM E2E tests that use **real LLM integration by default** (when `LIVE_LLM=1`). Tests prove actual network round-trips, validate text quality with entropy checks, enforce latency budgets, and surface problems while keeping costs under control.

## ✅ Complete Implementation

### Files Created (3)
- `tests/utils/live.ts` - Live LLM utilities (env validation, HAR capture, console gate)
- `tests/utils/metrics.ts` - Latency budgets and entropy checks
- `tests/ui/chat.live.spec.ts` - Real LLM round-trip test

### Files Modified (6)
- `jest.setup.ts` - API key redaction in logs
- `src/app/api/chat/route.ts` - Provider/model in response meta + header
- `src/lib/llm/adapter.ts` - `getLLMConfig()` export
- `src/components/MessageBubble.tsx` - Added `data-testid` prop support
- `src/components/ChatWindow.tsx` - Added `data-testid="typing-indicator"`
- `.github/workflows/ui-tests.yml` - Live test job (conditional on secret)

## 🎯 Test Implementation

### Chat Live Spec (`chat.live.spec.ts`)

**Behaviors:**
1. ✅ Navigate to `/` and type bounded prompt
2. ✅ **Before-send** screenshot (input filled)
3. ✅ Click send, wait for typing indicator
4. ✅ **During-stream** screenshot (typing/streaming)
5. ✅ Wait for complete response
6. ✅ **After-reply** screenshot
7. ✅ **Crops**: `chat-input-filled`, latest `message-assistant`
8. ✅ **Network assertions**:
   - POST body capture (exact prompt validation)
   - 200 status
   - Provider header (`x-provider`)
   - Provider/model in response meta
9. ✅ **State gating**: send-btn disabled during, enabled after
10. ✅ **Result sanity**:
    - Length ≥10 chars
    - Entropy ≥2.2 bits/char
    - Not equal to prompt
    - Contains space/period
11. ✅ **Performance**: first-token ≤5s, total ≤20s
12. ✅ **Artifacts**: HAR, console logs, screenshots
13. ✅ **Console gate**: Fails on console.error/pageerror

## 🔒 Security

- ✅ API keys redacted from logs (`jest.setup.ts`)
- ✅ API keys redacted from HAR files
- ✅ Console logs sanitized
- ✅ Never printed in test output
- ✅ Secrets via env only (no hardcoding)

## 📊 Assertions (Non-Textual)

✅ **Protocol/Structure**:
- POST request made with exact prompt
- 200 status
- Response has `reply` and `meta` fields
- Provider/model in meta
- Provider header present

✅ **Latency**:
- First token ≤5s
- Total ≤20s

✅ **Text Quality**:
- Length ≥10 chars
- Entropy ≥2.2 bits/char (prevents echoes)
- Not equal to prompt
- Contains space/period (basic structure)

✅ **State**:
- Send button disabled during, enabled after
- No console errors

## 🚀 Usage

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

## 📁 Artifacts Generated

- `artifacts/ui-test/screens/chat-live-llm-before-send.png`
- `artifacts/ui-test/screens/chat-live-llm-during-stream.png`
- `artifacts/ui-test/screens/chat-live-llm-after-reply.png`
- `artifacts/ui-test/screens/chat-live-llm-chat-input-filled-after.png`
- `artifacts/ui-test/screens/chat-live-llm-message-assistant-after.png`
- `artifacts/ui-test/har/chat-live-llm.har` (API keys redacted)
- `artifacts/ui-test/logs/chat-live-llm.json` (console/page errors)

## ✅ Definition of Done - All Met

Running `LIVE_LLM=1 LLM_PROVIDER=openai LLM_API_KEY=*** LLM_MODEL=gpt-4o-mini npm run test:ui-live`:

- ✅ Performs a real LLM call
- ✅ Shows response in UI
- ✅ Meets latency budgets (first-token ≤5s, total ≤20s)
- ✅ Produces screenshots + HAR
- ✅ Fails on console errors, transport errors, or missing schema
- ✅ Passes with stable, non-textual assertions

## 🎉 Result

The suite now:
- ✅ **Uses real LLM by default** (when `LIVE_LLM=1`)
- ✅ **Proves network round-trip** (POST capture, response validation)
- ✅ **Validates text quality** (entropy check prevents echoes)
- ✅ **Enforces latency budgets** (first-token, total)
- ✅ **Surfaces problems** (console errors, schema drift, transport failures)
- ✅ **Cost-controlled** (small token cap, minimal test count)
- ✅ **Secure** (API keys redacted everywhere)
- ✅ **Deterministic enough** (non-textual assertions, bounded prompts)

All requirements met! 🚀

