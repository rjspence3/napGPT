# NapGPT UI Testing Checklist

## Pre-Flight Checklist

Before running the UI test suite, verify:

- [ ] **App is running** - `npm run dev` or `npm run start`
- [ ] **App is accessible** - Open `http://localhost:3000` in browser
- [ ] **Dependencies installed** - `npm install` completed
- [ ] **Environment variables set** (if running live LLM tests):
  - [ ] `LIVE_LLM=1`
  - [ ] `LLM_API_KEY` or `OPENAI_API_KEY`
  - [ ] `LLM_PROVIDER` (if not using OpenAI)
- [ ] **Artifacts directory writable** - `artifacts/` directory exists and is writable
- [ ] **Sufficient disk space** - Tests generate screenshots, videos, HAR files
- [ ] **Network connectivity** (if running live LLM tests)

## Running Tests

### Basic Run

```bash
npm run test:ui:headless
```

### With Live LLM

```bash
LIVE_LLM=1 LLM_PROVIDER=openai LLM_API_KEY=sk-... npm run test:ui:live
```

### Headful (for debugging)

```bash
npm run test:ui:headful
```

## Post-Run Checklist

After tests complete:

- [ ] **Check exit code** - Should be `0` for success
- [ ] **Review console output** - Look for `✅` or `❌` indicators
- [ ] **Open report** - `artifacts/latest/index.html` or `artifacts/latest/report.md`
- [ ] **Check budget violations** - Review budget section in report
- [ ] **Review failed tests** - Check error messages in report
- [ ] **Inspect artifacts** - Screenshots, HAR, logs for failed tests

## Triage Steps

### Test Failures

1. **Identify failing test** - Check report for test name
2. **Check error message** - Review error in report or logs
3. **Review screenshots** - Look at before/during/after screenshots
4. **Check HAR files** - Inspect network requests/responses
5. **Review console logs** - Check for JavaScript errors
6. **Reproduce locally** - Run failing test in isolation if possible

### Budget Violations

1. **Identify violated budget** - Check budget section in report
2. **Review metrics** - Check `metrics.json` for actual values
3. **Compare to baseline** - Check if this is a regression
4. **Check network conditions** - Latency may affect timing budgets
5. **Review app performance** - Check Lighthouse scores
6. **Investigate root cause** - Code changes, dependencies, infrastructure

### Live LLM Issues

1. **Check API key** - Verify `LLM_API_KEY` is valid
2. **Check provider/model** - Verify provider and model are correct
3. **Review token usage** - Check cost guardrail violations
4. **Check rate limits** - Verify not hitting provider rate limits
5. **Review response quality** - Check entropy and length assertions
6. **Check network** - Verify connectivity to provider API

### Accessibility Issues

1. **Review Axe report** - `artifacts/latest/axe/report.json`
2. **Identify violations** - Check critical/serious violations
3. **Review affected elements** - Check HTML in Axe report
4. **Fix violations** - Update code to fix a11y issues
5. **Re-run Axe** - Verify fixes

### Performance Issues

1. **Review Lighthouse report** - `artifacts/latest/lighthouse/report.html`
2. **Check performance score** - Should be ≥ 70
3. **Review metrics** - Check FCP, LCP, TTI, TBT, CLS
4. **Identify bottlenecks** - Check Lighthouse recommendations
5. **Optimize** - Apply Lighthouse suggestions
6. **Re-run Lighthouse** - Verify improvements

## Handoff Checklist

When handing off test results:

- [ ] **Report generated** - `artifacts/latest/report.md` and `index.html` exist
- [ ] **All artifacts collected** - Screenshots, HAR, logs, videos, traces
- [ ] **Budget summary included** - Budget violations clearly documented
- [ ] **Failed tests documented** - Error messages and steps to reproduce
- [ ] **Recommendations provided** - Next steps for fixing issues
- [ ] **Artifacts accessible** - Shared via CI artifacts or file share

## Maintenance Checklist

Periodically:

- [ ] **Update baselines** - Update pixel baselines when UI changes intentionally
- [ ] **Review budgets** - Adjust budgets if app behavior changes
- [ ] **Update scenarios** - Add new scenarios for new features
- [ ] **Clean artifacts** - Remove old artifacts to save disk space
- [ ] **Update dependencies** - Keep test dependencies up to date
- [ ] **Review CI config** - Update GitHub Actions workflow if needed

## Emergency Procedures

### Tests Hanging

1. **Kill process** - `Ctrl+C` or `kill <pid>`
2. **Check browser processes** - Kill orphaned Chrome/Puppeteer processes
3. **Check app state** - Verify app is still running
4. **Restart app** - `npm run dev` or `npm run start`
5. **Re-run tests** - Try again

### Out of Disk Space

1. **Clean artifacts** - Remove old `artifacts/` directories
2. **Reduce artifact retention** - Update CI config to keep fewer artifacts
3. **Exclude large artifacts** - Skip video recording if not needed
4. **Compress artifacts** - Zip artifacts before uploading

### API Key Leaked

1. **Rotate key immediately** - Generate new API key from provider
2. **Check artifacts** - Verify secrets are redacted in HAR/logs
3. **Review git history** - Check if key was committed
4. **Update CI secrets** - Update GitHub secrets with new key
5. **Notify team** - Alert team about key rotation

## Support

- **Documentation**: See `DOCS/ui-testing-runbook.md`
- **Implementation**: See `scripts/ui-test/`
- **Scenarios**: See `scripts/mcp/scenarios/`
- **Issues**: Create GitHub issue with test output and artifacts

