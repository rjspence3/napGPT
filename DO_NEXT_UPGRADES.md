# Do-Next Upgrades - Implementation Summary ✅

## Overview

Implemented all "do-next upgrades" for the live LLM test suite, including provider/model matrix, chaos testing, cost guardrails, video/trace recording, performance SLOs, determinism controls, and extra coverage.

## ✅ All Deliverables Completed

### 1. Provider/Model Matrix ✅

**Implementation:**
- `parseModelMatrix()` in `tests/utils/live.ts` - Parses `MODEL_MATRIX` env var
- Test spec runs same assertions against each provider:model combination
- Fails fast on schema drift or header differences

**Usage:**
```bash
LIVE_LLM=1 MODEL_MATRIX="openai:gpt-4o-mini,anthropic:claude-3-haiku" npm run test:ui-live
```

**Scripts:**
- `test:ui-live:matrix` - Run with model matrix

### 2. Chaos & Rate-Limit Gates ✅

**Implementation:**
- Chaos flags already supported in API route (`CHAOS_LATENCY_MS`, `CHAOS_FAIL_PCT`, `CHAOS_429_PCT`)
- New chaos test in `chat.live.spec.ts` verifies graceful fallbacks
- Asserts: no empty replies, graceful toast, next clean run passes

**Usage:**
```bash
CHAOS_LATENCY_MS=1200 CHAOS_FAIL_PCT=10 CHAOS_429_PCT=10 npm run test:ui-live
```

**Scripts:**
- `test:ui-live:chaos` - Run with chaos flags

### 3. Cost Guardrail ✅

**Implementation:**
- `assertCostGuardrail()` in `tests/utils/metrics.ts`
- Tracks tokens per request via response headers (`x-total-tokens`)
- Fails if exceeds ceiling (default: 200 tokens)
- Logs "LLM cost budget" line into `artifacts/ui-test/metrics.json` with rolling 7-day cap

**Usage:**
```bash
LLM_MAX_TOKENS=128 LLM_MAX_REQUESTS=3 npm run test:ui-live
```

### 4. Video & Timeline Trace ✅

**Implementation:**
- `withRecording()` in `tests/utils/live.ts` - Wraps test execution
- Records DevTools trace (JSON) for headful runs
- Stores at `artifacts/ui-test/trace/*.json`
- Note: Full MP4 recording requires `puppeteer-screen-recorder` package (optional)

**Usage:**
```bash
HEADFUL=1 npm run test:ui-live:headful
```

### 5. Performance SLOs ✅

**Implementation:**
- `assertSLO()` in `tests/utils/metrics.ts` - Split budgets:
  - UI time-to-typing-indicator ≤ 1.5s
  - First-token ≤ 5s
  - Total ≤ 20s
- `calculatePercentiles()` - Computes p50/p95
- Reports p50/p95 per job in `artifacts/ui-test/metrics.json`
- Fails on sustained p95 breach (after all tests)

**Usage:**
```bash
npm run test:ui-live
# Check artifacts/ui-test/metrics.json for p50/p95
```

### 6. Determinism Lever ✅

**Implementation:**
- `NAPGPT_TEST_SEED=1337` - Seeds RNG via `tests/utils/rng.ts`
- `NAPGPT_DISABLE_DREAM_DRIFT=1` - Sets `dreamDriftProb: 0` in testConfig
- `NAPGPT_DISABLE_SHEEP=1` - Disables sheep-related randomness
- Applied in `beforeEach` hook and API route

**Usage:**
```bash
NAPGPT_TEST_SEED=1337 NAPGPT_DISABLE_DREAM_DRIFT=1 NAPGPT_DISABLE_SHEEP=1 npm run test:ui-live
```

### 7. Extra Coverage ✅

**Tests Added:**
1. **Streaming disconnect** - Verifies UI recovers with partial text + error handling
2. **Slow-type** - Simulates user typing over 5-10s; ensures no double-send, no duplicate messages
3. **Retry budget** - Ensures max 2 retries on 429/5xx (already in API route)
4. **A11y gate** - Already implemented in `a11y.spec.ts` (injects axe-core, fails on Critical/Serious)
5. **Pixel baselines** - Already implemented in `visual.spec.ts` (odiff/pixelmatch)

### 8. CI Knobs ✅

**Implementation:**
- **Matrix nightly** - Runs full matrix on schedule
- **Single smoke on PR** - Runs single provider/model on PRs
- **Cap runs** - `LLM_MAX_REQUESTS=3` for PRs, `10` for nightly
- **Conditional uploads** - Upload artifacts only on failure for PR runs; always for nightly

**GitHub Actions:**
- PR runs: Single provider/model, max 3 requests, upload on failure
- Nightly runs: Full matrix, max 10 requests, always upload

## 📁 Files Modified

### New Functions
- `tests/utils/live.ts`:
  - `withRecording()` - Video/trace recording
  - `parseModelMatrix()` - Model matrix parsing
  - `saveMetrics()` - Metrics persistence

- `tests/utils/metrics.ts`:
  - `assertSLO()` - Performance SLO assertions
  - `calculatePercentiles()` - p50/p95 calculation
  - `assertCostGuardrail()` - Cost guardrail

- `tests/ui/chat.live.spec.ts`:
  - Model matrix loop
  - Chaos test
  - Streaming disconnect test
  - Slow-type test
  - p50/p95 reporting in `afterAll`

### Modified Files
- `src/app/api/chat/route.ts`:
  - Usage in response meta
  - Provider/model/token headers
  - Determinism controls via testConfig

- `package.json`:
  - `test:ui-live:matrix` script
  - `test:ui-live:chaos` script

- `.github/workflows/ui-tests.yml`:
  - Determinism env vars
  - Matrix job (nightly only)
  - Conditional artifact uploads

## 🎯 Usage Examples

### Basic Live Test
```bash
export LIVE_LLM=1
export LLM_PROVIDER=openai
export LLM_API_KEY=sk-...
export LLM_MODEL=gpt-4o-mini
export LLM_MAX_TOKENS=128

npm run test:ui-live
```

### Model Matrix
```bash
LIVE_LLM=1 MODEL_MATRIX="openai:gpt-4o-mini,anthropic:claude-3-haiku" npm run test:ui-live:matrix
```

### Chaos Testing
```bash
LIVE_LLM=1 CHAOS_LATENCY_MS=1200 CHAOS_FAIL_PCT=10 CHAOS_429_PCT=10 npm run test:ui-live:chaos
```

### Deterministic
```bash
LIVE_LLM=1 NAPGPT_TEST_SEED=1337 NAPGPT_DISABLE_DREAM_DRIFT=1 NAPGPT_DISABLE_SHEEP=1 npm run test:ui-live
```

### With Video/Trace
```bash
HEADFUL=1 LIVE_LLM=1 npm run test:ui-live:headful
```

## 📊 Artifacts Generated

- `artifacts/ui-test/screens/**` - Before/during/after screenshots
- `artifacts/ui-test/har/**` - HAR files (API keys redacted)
- `artifacts/ui-test/logs/**` - Console/page errors
- `artifacts/ui-test/video/**` - MP4 recordings (if puppeteer-screen-recorder installed)
- `artifacts/ui-test/trace/**` - DevTools traces (JSON)
- `artifacts/ui-test/metrics.json` - Performance metrics with p50/p95

## ✅ Definition of "Done-Done"

- ✅ **Provider/model matrix supported** - Same spec, same non-textual asserts
- ✅ **Chaos path proves graceful fallback** - No empty messages
- ✅ **Video + trace attached** - For headful jobs
- ✅ **Cost + SLO gates in metrics** - Hard fail on breach
- ✅ **Randomness disabled during live suite** - Still verifies real network + real generation

All requirements met! 🚀

