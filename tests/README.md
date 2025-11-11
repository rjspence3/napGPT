# UI Element Tests

This directory contains comprehensive tests for all UI elements in NapGPT using Chrome DevTools Protocol (CDP) capabilities, similar to what `chrome-devtools-mcp` provides.

## Test Files

### 1. `smoke.spec.ts` (Playwright)
Basic smoke tests to verify the application loads and basic functionality works.

### 2. `ui-elements.spec.ts` (Playwright)
Comprehensive Playwright test suite that tests all UI components:
- **Header Component**: Title, styling, backdrop blur
- **EnergyMeter Component**: Energy display, progress bar, refill behavior
- **ChatWindow Component**: Empty state, input field, send button, message bubbles
- **EffortBar Component**: Slider, boost button, nap timer toggle
- **IdleOverlay Component**: Napping overlay, animations
- **MessageBubble Component**: User/assistant messages, typing indicators
- **Commands**: `/nap` and `/dream` command handling
- **Accessibility**: ARIA labels and semantic HTML
- **Responsive Design**: Mobile, tablet, desktop viewports
- **Error Handling**: API errors, empty messages
- **State Persistence**: Effort level persistence

### 3. `api-button-tests.spec.ts` (Playwright)
Comprehensive API integration tests for all button-triggered API calls:
- **Send Button**: POST /api/chat with messages, effort, and flags
- **Boost Button**: PUT /api/chat to set boost cookie
- **Effort Slider**: Affects effort parameter in API calls
- **Mode API**: GET /api/mode on page load
- **Error Handling**: Rate limiting, network errors, validation
- **Integration**: Complete user flows with real API calls

### 4. `ui-elements-cdp.ts` (Puppeteer/CDP)
Direct Chrome DevTools Protocol tests using Puppeteer (same technology as `chrome-devtools-mcp`):
- Tests all UI elements using CDP
- Takes screenshots during testing
- Provides detailed test results

## Running Tests

### Prerequisites
1. Start the development server:
   ```bash
   pnpm dev
   ```

2. In another terminal, run the tests:

### Playwright Tests
```bash
# Run all UI element tests
pnpm test:ui

# Run API button tests (requires .env with OPENAI_API_KEY)
pnpm test:api

# Or run all e2e tests
pnpm test:e2e
```

### CDP Tests (Puppeteer)
```bash
# Run CDP-based tests
pnpm test:ui-cdp

# With visible browser (non-headless)
HEADLESS=false pnpm test:ui-cdp

# Custom base URL
BASE_URL=http://localhost:3000 pnpm test:ui-cdp
```

## Test Coverage

### Components Tested

#### Header
- ✅ NapGPT title visibility and text
- ✅ Header styling (backdrop blur, borders)
- ✅ EnergyMeter integration

#### EnergyMeter
- ✅ Energy label visibility
- ✅ Energy percentage display
- ✅ Progress bar rendering
- ✅ Energy refill over time
- ✅ Energy consumption on actions

#### ChatWindow
- ✅ Empty state display (emoji, message, hints)
- ✅ Input field visibility and functionality
- ✅ Send button states (enabled/disabled)
- ✅ Message sending (Enter key and button)
- ✅ Message display (user and assistant)
- ✅ Typing indicator
- ✅ Message alignment (user right, assistant left)
- ✅ Input clearing after send
- ✅ Napping overlay (/nap command)

#### EffortBar
- ✅ Effort slider visibility and range (0-100)
- ✅ Effort level label updates
- ✅ Boost button visibility and functionality
- ✅ Boost cooldown display
- ✅ Nap Timer toggle button
- ✅ Button state changes

#### IdleOverlay
- ✅ Napping overlay display
- ✅ Overlay animation
- ✅ Input disabling during nap
- ✅ Overlay timeout (5 seconds)

#### MessageBubble
- ✅ User message display
- ✅ Assistant message display
- ✅ Typing indicator animation
- ✅ Message alignment

#### Commands
- ✅ `/nap` command triggers nap animation
- ✅ `/dream` command sends with dream flag

#### Accessibility
- ✅ ARIA labels on all interactive elements
- ✅ Semantic HTML structure

#### Responsive Design
- ✅ Mobile viewport (375x667)
- ✅ Tablet viewport (768x1024)
- ✅ Desktop viewport (1920x1080)

#### Error Handling
- ✅ API error handling
- ✅ Empty message validation
- ✅ Network failure handling

### API Integration Tests

#### Send Button (POST /api/chat)
- ✅ Sends message and receives response
- ✅ Includes effort level in request
- ✅ Includes dream flag for /dream command
- ✅ Sends conversation history
- ✅ Handles API errors gracefully
- ✅ Respects rate limiting (10 req/min)
- ✅ Consumes energy on send

#### Boost Button (PUT /api/chat)
- ✅ Calls PUT /api/chat with boost value
- ✅ Sets boost cookie for next request
- ✅ Disables button during cooldown
- ✅ Prevents multiple API calls during cooldown
- ✅ Boost affects next chat response

#### Effort Slider
- ✅ Sends correct effort value in API requests
- ✅ Low effort produces different responses than high effort
- ✅ Effort persists across multiple messages

#### Mode API (GET /api/mode)
- ✅ Called on page load
- ✅ Shows mock mode banner when no API key
- ✅ Hides mock mode banner when API key exists

#### Request/Response Validation
- ✅ Validates request format (messages, effort, flags)
- ✅ Validates response format (reply, meta)
- ✅ Handles network timeouts gracefully

#### Integration Flows
- ✅ Complete flow: boost → send → receive response
- ✅ Multiple messages maintain conversation context

## Screenshots

The CDP tests automatically take screenshots and save them to `tests/screenshots/`. This helps with visual regression testing and debugging.

## Using chrome-devtools-mcp

The tests use Puppeteer, which is the same underlying technology that `chrome-devtools-mcp` uses. The MCP server provides Chrome DevTools Protocol access through the Model Context Protocol, making it easy for AI agents to interact with browsers.

To use `chrome-devtools-mcp` directly with an MCP client (like Claude Desktop), configure it in your MCP settings:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--headless=false",
        "--isolated=true"
      ]
    }
  }
}
```

## Test Results

Both test suites provide detailed output:
- ✅ Passed tests
- ❌ Failed tests with error messages
- 📊 Total test count and pass/fail summary

## Continuous Integration

These tests can be integrated into CI/CD pipelines. The Playwright tests are already configured in `playwright.config.ts` and will automatically start the dev server if needed.

