# NapGPT MCP Test Suite

Comprehensive end-to-end UI testing using Chrome DevTools Protocol (CDP) via Puppeteer, providing the same capabilities as `chrome-devtools-mcp` but in a programmatic test harness.

## Overview

This test suite validates all UI features of NapGPT:
- Effort slider and band routing
- Boost button and cooldown
- Idle/Nap overlay
- Energy meter
- Commands (`/dream`, `/nap`)
- Context threading
- Error handling and retries
- Math/code intent guards
- Dropout and non-sequitur bounds

## Prerequisites

- Node.js 20+
- pnpm
- Chrome/Chromium installed
- Application running on `http://localhost:3000` (or set `E2E_BASE_URL`)

## Installation

Dependencies are already included in the project:
- `puppeteer` - Chrome automation
- `tsx` - TypeScript execution
- `zod` - Schema validation (if needed)

## Usage

### Run All Tests (Headless)

```bash
pnpm test:mcp
```

### Run Tests with Visible Browser

```bash
pnpm test:mcp:headful
```

Or:

```bash
HEADFUL=1 pnpm test:mcp
```

### Generate Report

After running tests, generate a markdown report:

```bash
pnpm test:mcp:report
```

### Custom Base URL

```bash
E2E_BASE_URL=http://localhost:3001 pnpm test:mcp
```

## Test Scenarios

### 00_smoke.ts
Basic smoke test: page load, mock banner visibility, message sending, non-empty response.

### 10_effort_bands.ts
Tests effort bands (5, 25, 60, 92) with strategy-like behavior:
- Low effort (5): Refusal phrases, <200 chars
- Medium-low (25): One-liner, <300 chars
- Medium-high (60): 3-6 lines, 120-800 chars
- High (92): Longer answer, may include sign-off

### 20_boost_and_cooldown.ts
Tests boost button:
- Enabled initially
- Disabled after click (cooldown)
- Remains disabled during cooldown
- Response received after boost

### 30_idle_and_overlay.ts
Tests idle overlay:
- Nap timer toggle
- Overlay appears on idle
- Overlay dismisses on interaction

### 40_energy_meter.ts
Tests energy meter:
- Initial energy level
- Drains on message sends
- Refills after inactivity

### 50_commands_dream_nap.ts
Tests commands:
- `/dream`: Non-empty whimsical response
- `/nap`: Overlay appears, input disabled, auto-dismisses after 5s

### 60_context_threading.ts
Tests conversation context:
- First message receives response
- Follow-up maintains context
- Responses are non-empty

### 70_error_and_retry.ts
Tests error handling:
- Network blocking simulation
- Graceful error messages
- Recovery after unblock

### 80_math_and_code_guards.ts
Tests intent guards:
- Math question at low effort: Non-empty, contains number
- Code question at high effort: Non-empty, contains code terms

### 90_non_sequitur_dropout_bounds.ts
Tests bounds:
- Dropout never below 40 chars
- Non-sequitur only for general prompts
- Responses always substantial

## Artifacts

Each test run creates artifacts in `artifacts/<timestamp>/`:

- `results.json` - Test results with pass/fail, duration, notes
- `report.md` - Human-readable markdown report
- `<scenario>/screenshot.png` - Full-page screenshot
- `<scenario>/console.log.json` - Console logs
- `<scenario>/network.har` - Network traffic (HAR format)
- `<scenario>/metrics.json` - Custom metrics (energy readings, etc.)

## Architecture

### MCP Client (`utils/mcpClient.ts`)
Wraps Puppeteer with CDP session, providing:
- Browser/page/CDP session access
- Browser operations wrapper
- Artifact collector

### Browser Operations (`utils/browserOps.ts`)
High-level browser interactions:
- `click()`, `type()`, `setSlider()`
- `getText()`, `isVisible()`, `isDisabled()`
- `waitFor()`, `waitForNetworkIdle()`

### Assertions (`utils/assertions.ts`)
Test assertion helpers:
- `assert()`, `assertEquals()`, `assertNotEmpty()`
- `assertContains()`, `assertBetween()`
- `assertTrue()`, `assertFalse()`

### Artifacts (`utils/artifacts.ts`)
Artifact collection:
- Screenshots
- Console logs
- Network logs (HAR)
- Performance traces
- Custom metrics

## CI Integration

The GitHub Action (`.github/workflows/ui-mcp.yml`) runs tests on:
- Push to `main`/`develop`
- Pull requests
- Manual workflow dispatch

It:
1. Builds the application
2. Starts the server
3. Runs MCP tests
4. Generates report
5. Uploads artifacts

## Troubleshooting

### Tests Timeout
- Increase timeouts in `config.ts`
- Check if app is running
- Verify network connectivity

### Chrome Not Found
- Install Chrome/Chromium
- Set `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false` if using Puppeteer's bundled Chrome

### Selectors Not Found
- Verify `data-testid` attributes are present
- Check selector in browser DevTools
- Ensure page is fully loaded

### Empty Responses
- Check API endpoint is working
- Verify mock mode if no API key
- Check network logs in artifacts

## Extending

### Add New Scenario

1. Create `scenarios/XX_name.ts`:
```typescript
import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runNameTest(client: MCPClient): Promise<{
  passed: boolean;
  duration: number;
  notes: string[];
}> {
  // Test implementation
}
```

2. Import in `run-mcp-tests.ts`
3. Add to `SCENARIOS` array

### Custom Artifacts

Use `artifacts.saveMetrics()` to save custom data:

```typescript
await artifacts.saveMetrics(`${artifactDir}/custom.json`, {
  customData: "value",
});
```

## Notes

- Tests use **Puppeteer with CDP** (same protocol as `chrome-devtools-mcp`)
- All interactions go through **CDP domains** (Page, Runtime, Network, DOM, Input)
- Tests are **deterministic** with seeded RNG (see `utils/rng.ts`)
- **Retry-on-stale** DOM reads prevent flakes
- **Strict selectors** with `data-testid` attributes

## Dependencies

- `puppeteer@^24.29.0` - Chrome automation
- `tsx@^4.20.6` - TypeScript execution
- `zod@^3.22.4` - Schema validation (if needed)

No additional MCP client packages required - we use Puppeteer's native CDP support.


