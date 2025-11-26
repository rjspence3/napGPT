# Elevate NapGPT UI Test Suite - Deterministic, Network-Verified, CI-Ready

## Summary

Refactors and extends the NapGPT UI test suite to be **deterministic, verifiably network-backed, accessible, and CI-ready** using Jest + Puppeteer. All tests now use fake timers, seeded RNG, network interception, and comprehensive artifact collection.

## What Changed

### Core Infrastructure

1. **Determinism**
   - Added `@sinonjs/fake-timers` for controllable time in tests
   - Seeded RNG wrapper (`tests/utils/rng.ts`) replaces `Math.random()`
   - All timers and randomness now deterministic

2. **Network Verification**
   - POST body capture for `/api/chat` requests
   - SSE/WebSocket chunk counting for streaming detection
   - HAR (HTTP Archive) generation for network analysis
   - Fake LLM server for deterministic responses

3. **Accessibility**
   - Axe-core integration with P0 violation detection
   - Zero tolerance for critical/serious violations
   - Tests on key screens (initial, with messages, overlays)

4. **Visual Regression**
   - `jest-image-snapshot` for 10 high-risk states
   - Before/during/after screenshot pattern
   - Focused crops for chat input and assistant replies

5. **Performance**
   - Lighthouse CI integration
   - Baseline thresholds for performance/accessibility/best-practices
   - Automated on `main` branch

6. **Traceability**
   - `capabilities.yml` mapping of capabilities → test IDs
   - Coverage verification (fails if P0 tests missing)
   - 40+ capabilities tracked

7. **Stable Artifacts**
   - Consistent screenshot naming (before/during/after)
   - HAR files for network analysis
   - Lighthouse reports
   - All artifacts uploaded in CI

8. **CI Matrix**
   - Headless + headful modes
   - Ubuntu + macOS runners
   - Artifact uploads
   - Lighthouse CI on `main`

## Files Added

### Test Infrastructure
- `jest.config.js` - Jest configuration
- `jest.setup.ts` - Global test setup
- `jest-puppeteer.config.js` - Puppeteer configuration
- `.lighthouserc.js` - Lighthouse CI config

### Test Utilities
- `tests/utils/clock.ts` - Fake timers wrapper
- `tests/utils/rng.ts` - Seeded RNG wrapper
- `tests/utils/network.ts` - Network interception & HAR
- `tests/utils/screen.ts` - Screenshot helpers (before/during/after)
- `tests/utils/a11y.ts` - Axe-core integration
- `tests/utils/traceability.ts` - Coverage verification
- `tests/utils/guardrails.ts` - Quality checks

### Test Specs
- `tests/ui/chat.e2e.spec.ts` - Network-verified chat tests
- `tests/ui/overlay.spec.ts` - Overlay state tests
- `tests/ui/a11y.spec.ts` - Accessibility tests
- `tests/ui/visual.spec.ts` - Visual regression tests

### Mocks & Config
- `tests/mocks/server.ts` - Deterministic fake LLM server
- `tests/config/capabilities.yml` - Capability → test mapping

### CI
- `.github/workflows/ui-tests.yml` - CI matrix workflow

## Files Modified

- `package.json` - Added Jest scripts and dependencies

## House Rules Enforced

✅ **No `waitForTimeout`** - All waits use state-based selectors or network events  
✅ **Fake timers** - All timer logic uses `@sinonjs/fake-timers`  
✅ **Seeded RNG** - All randomness via `tests/utils/rng.ts`  
✅ **Stable selectors** - All interactive elements use `data-testid`  

## New Scripts

```bash
npm run test:ui-all          # Run all Jest UI tests (headless)
npm run test:ui-all:headful  # Run with visible browser
npm run test:serve-llm        # Start fake LLM server
npm run ci:lighthouse        # Run Lighthouse CI
npm run test:guardrails      # Run quality checks
```

## Acceptance Criteria Met

✅ Tests are deterministic (fake timers + seeded RNG)  
✅ Chat test proves network round-trip (POST body capture)  
✅ Streaming detection via SSE chunk counting  
✅ UI states bound to request lifecycle  
✅ Zero P0 accessibility violations  
✅ 10 visual snapshots for high-risk states  
✅ Lighthouse CI with baseline thresholds  
✅ Capabilities YAML with 40+ tests tracked  
✅ CI uploads artifacts (screens, HAR, LHCI)  

## Guardrail Checks

Automated checks prevent:
- `waitForTimeout` usage
- `Math.random()` usage (must use seeded RNG)
- Missing `data-testid` on interactive selectors

## Phase 2 (Punted)

- Full streaming implementation verification (currently detects chunks but doesn't require >2)
- Beans min/max state manipulation (requires state injection hooks)
- Full traceability integration in Jest (currently manual check)

## Breaking Changes

None - this is additive test infrastructure. App behavior unchanged.

## Testing

Run locally:
```bash
# Start fake LLM server
npm run test:serve-llm &

# Run tests
npm run test:ui-all
```

CI will run automatically on PRs and `main` branch.

