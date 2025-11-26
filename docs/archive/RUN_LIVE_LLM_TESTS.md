# Running All Tests with Live LLM

## Quick Start

To run **all tests** (MCP scenarios + Jest tests) with live LLM:

```bash
# Set your credentials
export LLM_API_KEY=sk-your-key-here
export LLM_PROVIDER=openai  # or anthropic

# Run all tests with live LLM
npm run test:ui:live:all
```

Or use the helper script:

```bash
export LLM_API_KEY=sk-your-key-here
export LLM_PROVIDER=openai
./scripts/run-all-tests-live-llm.sh
```

---

## What Gets Tested

When `LIVE_LLM=1` is set:

### 1. MCP Scenarios (21 scenarios)
All MCP/Puppeteer scenarios will use the **real LLM provider** instead of the mock server:
- ✅ `00_smoke` - Basic messaging
- ✅ `10_effort_bands` - Effort routing
- ✅ `20_boost_and_cooldown` - Boost button
- ✅ `25_blanket_mode` - Blanket overlay
- ✅ `30_idle_and_overlay` - Idle overlay
- ✅ `35_coffee_economy` - Coffee beans
- ✅ `40_energy_meter` - Energy meter
- ✅ `50_commands_dream_nap` - Commands
- ✅ `55_dream_drift` - Dream drift
- ✅ `60_context_threading` - Context
- ✅ `70_error_and_retry` - Error handling
- ✅ `80_math_and_code_guards` - Math/code guards
- ✅ `90_non_sequitur_dropout_bounds` - Dropout bounds
- ✅ `95_api_endpoints` - API endpoints
- ✅ `96_wake_reactions` - Wake reactions
- ✅ `97_echo_fragments` - Echo fragments
- ✅ `98_self_references` - Self-references
- ✅ `99_recall_command` - Recall command
- ✅ `100_ui_interactions` - UI interactions
- ✅ `101_edge_cases` - Edge cases
- ✅ `102_network_errors` - Network errors

### 2. Jest Tests (Live LLM spec)
- ✅ `tests/ui/chat.live.spec.ts` - Real round-trip with provider
- ✅ Network verification (POST body, headers)
- ✅ Streaming detection
- ✅ Performance budgets (first-token ≤ 5s, total ≤ 20s)
- ✅ Cost guardrails

---

## Environment Variables

### Required
- `LIVE_LLM=1` - Enable live LLM (automatically set by script)
- `LLM_API_KEY` - Your provider API key
- `LLM_PROVIDER` - `openai` or `anthropic`

### Optional
- `LLM_MODEL` - Model name (default: `gpt-4o-mini` for OpenAI)
- `LLM_MAX_TOKENS` - Max tokens per request (default: `128`)
- `LLM_MAX_REQUESTS` - Max requests per run (default: `10`)
- `MODEL_MATRIX` - Multiple provider:model pairs (e.g., `"openai:gpt-4o-mini,anthropic:claude-3-haiku"`)
- `NAPGPT_TEST_SEED` - Seed for deterministic randomness (default: `1337`)
- `NAPGPT_DISABLE_DREAM_DRIFT` - Disable dream drift (default: `1` in tests)
- `NAPGPT_DISABLE_SHEEP` - Disable sheep feature (default: `1` in tests)

---

## Cost Control

Tests are designed to minimize costs:

- ✅ **Small token cap**: `LLM_MAX_TOKENS=128` (default)
- ✅ **Limited requests**: `LLM_MAX_REQUESTS=10` (default)
- ✅ **Deterministic**: Seeded RNG reduces variability
- ✅ **Fast models**: Uses `gpt-4o-mini` by default (cheaper)

**Estimated cost per full run**: ~$0.01-0.05 (depending on provider/model)

---

## Example Commands

### Basic Live LLM Run
```bash
export LLM_API_KEY=sk-...
export LLM_PROVIDER=openai
npm run test:ui:live:all
```

### With Model Matrix
```bash
export LLM_API_KEY=sk-...
export LLM_PROVIDER=openai
export MODEL_MATRIX="openai:gpt-4o-mini,anthropic:claude-3-haiku"
npm run test:ui:live:all
```

### Headful Mode (with video)
```bash
export LLM_API_KEY=sk-...
export LLM_PROVIDER=openai
HEADFUL=1 npm run test:ui:live:all
```

### With Chaos Testing
```bash
export LLM_API_KEY=sk-...
export LLM_PROVIDER=openai
export CHAOS_LATENCY_MS=1200
export CHAOS_FAIL_PCT=10
export CHAOS_429_PCT=10
npm run test:ui:live:all
```

---

## Output

Tests generate comprehensive artifacts:

- **Screenshots**: `artifacts/ui-test/screens/`
- **HAR files**: `artifacts/ui-test/har/`
- **Console logs**: `artifacts/ui-test/logs/`
- **Metrics**: `artifacts/ui-test/metrics.json`
- **Reports**: `artifacts/ui-test/report.md` and `index.html`
- **Videos** (headful): `artifacts/ui-test/video/`
- **Traces** (headful): `artifacts/ui-test/trace/`

---

## Troubleshooting

### "LLM_API_KEY not set"
Set your API key:
```bash
export LLM_API_KEY=sk-your-key-here
```

### "App is not running"
Start the dev server:
```bash
npm run dev
```

### Tests timing out
- Check network connectivity
- Verify API key is valid
- Check provider rate limits
- Increase timeouts if needed

### Budget failures
- Review `artifacts/ui-test/metrics.json`
- Check network latency
- Verify provider response times

---

## Security

✅ **API keys are automatically redacted** from:
- Console logs
- HAR files
- Screenshots
- Test output
- Artifact files

Never commit API keys to the repository!

