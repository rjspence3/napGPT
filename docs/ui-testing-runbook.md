# NapGPT UI Testing Runbook

## Overview

This runbook describes how to run, interpret, and debug the NapGPT UI test suite. The suite executes MCP/Puppeteer scenarios, Jest tests, live LLM tests (optional), Lighthouse audits, Axe accessibility scans, and generates comprehensive reports.

## Quick Start

### Headless (Default)

```bash
npm run test:ui:headless
```

Runs all UI tests in headless mode, collects artifacts, enforces budgets, and generates reports.

### Headful (With Browser Visible)

```bash
npm run test:ui:headful
```

Same as headless, but with visible browser and MP4 video recording (if `puppeteer-screen-recorder` is installed).

### Live LLM Tests

```bash
LIVE_LLM=1 LLM_PROVIDER=openai LLM_API_KEY=sk-... npm run test:ui:live
```

Runs all tests including live LLM integration tests. Requires:
- `LIVE_LLM=1`
- `LLM_PROVIDER` (openai|anthropic)
- `LLM_API_KEY` (provider API key)
- Optional: `MODEL_MATRIX` for multiple provider/model combinations

### MCP Driver (Remote Chrome DevTools)

```bash
MCP_DRIVER=server MCP_WS=ws://localhost:9222/devtools/browser npm run test:ui:mcp
```

Runs tests using `chrome-devtools-mcp` server instead of local Puppeteer.

## Environment Variables

### Core Settings

- `BASE_URL` - App URL (default: `http://localhost:3000`)
- `HEADFUL` - Run with visible browser (`1` or `0`, default: `0`)
- `LIVE_LLM` - Enable live LLM tests (`1` or `0`, default: `0`)
- `MCP_DRIVER` - Driver type (`puppeteer` or `server`, default: `puppeteer`)

### Live LLM Settings

- `LLM_PROVIDER` - Provider (`openai` or `anthropic`)
- `LLM_API_KEY` - Provider API key (required when `LIVE_LLM=1`)
- `LLM_MODEL` - Model name (default: `gpt-4o-mini` for OpenAI, `claude-3-5-sonnet` for Anthropic)
- `MODEL_MATRIX` - Comma-separated provider:model pairs (e.g., `"openai:gpt-4o-mini,anthropic:claude-3-haiku"`)
- `LLM_MAX_TOKENS` - Max tokens per request (default: `128`)
- `LLM_MAX_REQUESTS` - Max requests per run (default: `10`)

### Chaos Testing

- `CHAOS_LATENCY_MS` - Inject latency in milliseconds (default: `0`)
- `CHAOS_FAIL_PCT` - Percentage of requests to fail (default: `0`)
- `CHAOS_429_PCT` - Percentage of requests to return 429 (default: `0`)

### Determinism Controls

- `NAPGPT_TEST_SEED` - Seed for RNG (default: `1337`)
- `NAPGPT_DISABLE_DREAM_DRIFT` - Disable dream drift (`1` or `0`, default: `0`)
- `NAPGPT_DISABLE_SHEEP` - Disable sheep randomness (`1` or `0`, default: `0`)

## Test Execution Flow

1. **Environment Setup** - Loads env vars, validates live LLM config if needed
2. **App Health Check** - Waits for app to be ready at `BASE_URL`
3. **MCP Scenarios** - Runs all scenarios from `scripts/mcp/scenarios/*.ts`
4. **Jest Tests** - Runs Jest tests from `tests/ui/*.spec.ts` (excluding live tests)
5. **Live LLM Tests** - If `--live` flag and `LIVE_LLM=1`, runs `tests/ui/chat.live.spec.ts`
6. **Lighthouse** - Runs Lighthouse audit (headful only)
7. **Axe** - Runs accessibility scan
8. **Artifact Collection** - Collects screenshots, HAR, logs, videos, traces
9. **Budget Enforcement** - Checks latency, behavior, a11y, perf, cost budgets
10. **Report Generation** - Creates `report.md` and `index.html`
11. **Symlink Creation** - Creates `artifacts/latest` symlink

## Artifacts

All artifacts are saved to `artifacts/<timestamp>/`:

- **Screenshots** - `screens/` - Before/during/after screenshots from tests
- **HAR Files** - `har/` - Network traffic (API keys redacted)
- **Console Logs** - `logs/` - Console errors and page errors (secrets redacted)
- **Videos** - `video/` - MP4 recordings (headful only, if `puppeteer-screen-recorder` installed)
- **Traces** - `trace/` - DevTools traces (headful only)
- **Lighthouse** - `lighthouse/` - Lighthouse JSON and HTML reports
- **Axe** - `axe/` - Accessibility scan results
- **Metrics** - `metrics.json` - Performance metrics with p50/p95
- **Pixel Diffs** - `pixel-diff/` - Visual regression diffs (if baselines exist)
- **Reports** - `report.md` and `index.html` - Test summaries

## Budgets

The suite enforces several budgets:

### Latency SLOs

- **UI to typing indicator** ≤ 1500ms
- **First token** ≤ 5000ms
- **Total reply** ≤ 20000ms

### Behavior Budgets

- **Empty replies** = 0 (zero tolerance)
- **Dropout rate** ≤ 15% (where allowed)
- **Non-sequitur rate** ≤ 12% (general prompts only)
- **Boost single-use guarantee** = 100%

### Accessibility

- **Critical violations** = 0 (zero tolerance)
- **Serious violations** = 0 (zero tolerance)

### Performance

- **Lighthouse Performance** ≥ 70 (headful run)

### Cost

- **Total tokens per run** ≤ `LLM_MAX_TOKENS * LLM_MAX_REQUESTS` (default: 128 * 10 = 1280)

## Reading Reports

### Markdown Report (`report.md`)

Contains:
- Overview table (pass/fail, durations, budgets)
- Per-scenario results
- Budget violations
- Artifact links

### HTML Report (`index.html`)

Interactive report with:
- Overview dashboard
- Test results table (sortable, filterable)
- Budget status
- Artifact gallery (screenshots, HAR, videos)
- Live LLM matrix table (if run)
- Pixel diff thumbnails

## Debugging Failed Tests

1. **Check Console Logs** - `artifacts/latest/logs/` for errors
2. **Review Screenshots** - `artifacts/latest/screens/` for visual state
3. **Inspect HAR Files** - `artifacts/latest/har/` for network issues
4. **Watch Videos** - `artifacts/latest/video/` (if headful) for step-by-step replay
5. **Check Traces** - `artifacts/latest/trace/` for performance issues
6. **Review Budget Violations** - Check `report.md` for specific budget breaches

## Common Issues

### App Not Ready

**Symptom**: `Could not reach http://localhost:3000`

**Solution**: 
- Ensure app is running: `npm run dev` or `npm run start`
- Check `BASE_URL` env var
- Wait longer (default timeout: 30s)

### Live LLM Tests Skipped

**Symptom**: `Skipping Live LLM tests: LLM_API_KEY not set`

**Solution**:
- Set `LIVE_LLM=1`
- Set `LLM_API_KEY` (or `OPENAI_API_KEY`)
- Set `LLM_PROVIDER` if not using OpenAI

### Budget Violations

**Symptom**: `Budget violations detected`

**Solution**:
- Check `report.md` for specific violations
- Review metrics in `metrics.json`
- Check network conditions (latency)
- Verify app performance (Lighthouse)

### Video Recording Not Working

**Symptom**: No MP4 files in `video/` directory

**Solution**:
- Install `puppeteer-screen-recorder`: `npm install --save-dev puppeteer-screen-recorder`
- Or check `trace/` directory for DevTools traces (fallback)

## CI Integration

The suite is designed for CI/CD:

- **PR Runs**: Headless scenarios + Axe; artifacts on failure
- **Nightly Runs**: Headless + headful + Lighthouse + live matrix; always upload artifacts

See `.github/workflows/ui-all.yml` for CI configuration.

## Best Practices

1. **Run headless locally** for quick feedback
2. **Run headful before commits** to catch visual issues
3. **Run live LLM tests nightly** to catch provider/model regressions
4. **Review reports** after each run to track trends
5. **Update baselines** when UI changes intentionally
6. **Monitor budgets** to catch performance regressions early

## Next Steps

- See `DOCS/ui-testing-checklist.md` for pre-flight and triage steps
- See `scripts/ui-test/` for implementation details
- See `scripts/mcp/scenarios/` for scenario definitions

