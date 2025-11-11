# Make the Suite Run - Implementation Summary

## ✅ Completed Changes

### 1. Console Error Gating ✅
- **File**: `tests/utils/consoleGate.ts`
- **Features**:
  - Hooks `page.on('console')` and `page.on('pageerror')`
  - Fails test on any `console.error` or `pageerror`
  - Saves logs to `artifacts/ui-test/logs/`
  - Integrated into all chat tests via `withConsoleGate()`

### 2. Network Proof Enhanced ✅
- **File**: `tests/ui/chat.e2e.spec.ts`
- **Features**:
  - POST body capture with field validation
  - Streaming detection with `data-streaming` attribute
  - UI state binding (send disabled → typing → done)
  - HAR generation per test
  - Console gate integration

### 3. App-Side Hooks ✅
- **File**: `src/components/MessageBubble.tsx`
- **Change**: Added `data-streaming="true|false"` attribute
- **Usage**: Tests can detect streaming state

### 4. Before/During/After Screenshots ✅
- **File**: `tests/utils/screen.ts` (already exists)
- **Usage**: All interactive tests use `withScreenshots()`
- **Crops**: `snapChatExchange()` captures input and assistant reply

### 5. Fail Pack Suite ✅
- **Files**:
  - `tests/ui/failpack/error-handling.spec.ts` - 429/500/timeout scenarios
  - `tests/ui/failpack/schema-mismatch.spec.ts` - Missing/invalid response fields
  - `tests/ui/failpack/a11y-violation.spec.ts` - Unlabeled controls
  - `tests/ui/failpack/visual-drift.spec.ts` - 2px CSS shift
- **Run**: `npm run test:ui-failpack` (separate from normal tests)

### 6. Jest Setup Enhanced ✅
- **File**: `jest.setup.ts`
- **Features**:
  - Fake timers auto-install
  - Seeded RNG initialization
  - Artifact directories creation
  - Console gate ready

### 7. Lighthouse CI Enhanced ✅
- **File**: `.lighthouserc.js`
- **Features**:
  - CPU throttling in CI (simulates perf drop)
  - Documented thresholds: Performance ≥ 70, Accessibility ≥ 90, Best Practices ≥ 90
  - Fails PR if below thresholds

### 8. CI Workflow Enhanced ✅
- **File**: `.github/workflows/ui-tests.yml`
- **Features**:
  - Uploads screens, HAR, logs, Lighthouse reports
  - Separate failpack job (optional)

## 🎯 Acceptance Criteria Status

| Criteria | Status | Implementation |
|----------|--------|----------------|
| Network proof (POST capture) | ✅ | `captureChatPost()` validates body |
| Streaming detection (>2 chunks) | ✅ | `countSseChunks()` + `data-streaming` attribute |
| UI state binding | ✅ | Send disabled → typing → done verified |
| HAR per spec | ✅ | `saveHar()` called in chat tests |
| Before/during/after screenshots | ✅ | `withScreenshots()` pattern |
| Chat input/reply crops | ✅ | `snapChatExchange()` |
| Console error gate | ✅ | `withConsoleGate()` fails on errors |
| A11y gate (0 violations) | ✅ | `assertNoP0Violations()` |
| Visual regression (10 states) | ✅ | `visual.spec.ts` |
| Perf smoke (LHCI) | ✅ | Thresholds documented and enforced |
| Fail Pack suite | ✅ | 4 failpack test files |
| Traceability (capabilities.yml) | ✅ | Already exists |
| Artifact uploads | ✅ | CI uploads all artifacts |

## 🚀 Running the Suite

```bash
# Normal tests (should pass)
npm run test:ui-all

# Fail Pack (intentionally fails to prove detection)
npm run test:ui-failpack

# With fake LLM server
npm run test:serve-llm &
npm run test:ui-all

# Full CI verification
npm run ci:verify
```

## 📝 Test Flags

- `NEXT_PUBLIC_NAPGPT_TEST_A11Y_VIOLATION=1` - Inject a11y violation
- `NEXT_PUBLIC_NAPGPT_TEST_VISUAL_DRIFT=1` - Inject visual drift
- `JEST_FAILPACK=1` - Run failpack suite only

## 🔍 What Gets Tested

### Happy Path
- Network round-trip with POST validation
- Streaming detection
- UI state transitions
- Console error detection
- Accessibility compliance
- Visual regression

### Unhappy Path (Fail Pack)
- 429 rate limit → error UX
- 500 server error → error UX
- Timeout → error UX
- Schema mismatch → graceful handling
- A11y violations → test fails
- Visual drift → snapshot fails
- Perf drop → Lighthouse fails

## 🎉 Result

The suite now:
- ✅ **Runs end-to-end** with real network verification
- ✅ **Surfaces problems** via console gate, a11y, visual, perf checks
- ✅ **Proves detection** via Fail Pack suite
- ✅ **Produces artifacts** (screens, HAR, logs, LHCI)
- ✅ **Fails on regressions** (errors, violations, drift, perf drops)

All requirements met! 🚀

