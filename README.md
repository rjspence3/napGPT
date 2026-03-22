# NapGPT

**The AI that just... doesn't feel like it right now.**

A cozy, intentionally-lazy AI chatbot built with Next.js 15, TypeScript, and Tailwind CSS. NapGPT wraps a normal LLM with a "Nap Wrapper" that modulates responses based on an Effort Level (0-100), sometimes refusing to help, stalling, napping mid-reply, or giving one-liners.

## Features

- 🎯 **Effort-based responses**: Adjust the effort slider (0-100) to control how helpful NapGPT is
- ☕ **Boost button**: Temporarily increase effort for one reply (with cooldown)
- ⚡ **Energy meter**: Visual indicator that drains during responses and refills over time
- 💾 **Persistent State**: Beans, effort, and energy levels are saved across sessions
- 😴 **Nap timer**: Auto-sleep overlay after 30 seconds of inactivity
- 🛌 **Blanket mode**: Automatic cozy overlay when effort is low or idle for too long
- 🎨 **Cozy UI**: Warm palette, rounded corners, soft shadows, gentle animations
- 🎭 **Easter eggs**: `/nap` command, `/dream` command for surreal responses
- 🔄 **LLM adapter**: Works with Anthropic Claude (primary) or OpenAI API, falls back to mock mode (no API key required)

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- (Optional) Upstash Redis for production rate limiting

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rjspence3/napGPT.git
cd napGPT
```

2. Install dependencies:
```bash
pnpm install
```

3. (Optional) Set up Anthropic API key:
```bash
# Create a .env.local file in the root directory (never commit this file)
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env.local
```

If you don't set an API key, the app will run in **mock mode** with deterministic responses.

### Run Locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Development with Auto-Restart Monitor

For development with automatic server restart on failures:

```bash
pnpm dev:monitored
```

This runs a monitor script that checks server health every 5 seconds and automatically restarts the dev server if it becomes unhealthy (after 3 consecutive failures).

### Build for Production

```bash
pnpm build
pnpm start
```

## Testing

Run the Playwright e2e tests:

```bash
# Run all e2e tests
pnpm test:e2e

# Run UI element tests only
pnpm test:ui

# Run CDP-based tests (Puppeteer)
pnpm test:ui-cdp
```

See [tests/README.md](tests/README.md) for detailed testing documentation.

## Usage

### Effort Levels

- **0-15**: Instant refusal ("meh… too tired")
- **16-35**: One-sentence answer, suggests googling
- **36-70**: Short, low-effort answer with mild sarcasm
- **71-85**: Normal answer but with lazy tone
- **86-100**: Full answer (rare), then "going back to sleep" line

### Commands

- `/nap` - Returns a nap message and triggers a brief nap state
- `/dream` - Switches to surreal, dreamy tone for one reply (mock mode only)

### Wake-Up Triggers

- Click the **☕ Boost** button to temporarily increase effort for the next reply (10 second cooldown)
- Type keywords like "motivate me", "urgent", "deadline", "important", "please help" to add +15 effort for one reply

### Nap Timer

Toggle the **🌙 Nap Timer** button to enable/disable automatic napping. When enabled, NapGPT will automatically show a napping overlay after 30 seconds of inactivity.

### Blanket Mode

Blanket mode automatically activates a cozy visual overlay when:
- Effort level is below 20, OR
- Nap timer is enabled and idle for 30+ seconds

The blanket overlay creates a warm, dimmed atmosphere with a subtle gradient and texture effect. It automatically toggles based on effort and idle state.

### Default Values

- **Initial Effort**: 50 (moderate laziness)
- **Initial Energy**: 100% (fully charged)
- **Energy Drain**: 10 points per message
- **Energy Refill**: 0.5 points per 100ms
- **Boost Cooldown**: 10 seconds
- **Idle Threshold**: 30 seconds (for nap timer)

## Project Structure

```
napgpt/
  src/
    app/
      api/
        chat/route.ts       # Chat API endpoint (POST/PUT)
        mode/route.ts       # Mode detection endpoint (GET)
      layout.tsx            # Root layout
      page.tsx              # Main page
      globals.css           # Global styles
    components/
      ChatWindow.tsx        # Main chat interface
      MessageBubble.tsx     # Message display component
      EffortBar.tsx         # Effort controls
      EnergyMeter.tsx       # Energy indicator
      IdleOverlay.tsx       # Nap overlay
      BlanketOverlay.tsx     # Blanket mode overlay
    lib/
      llm/
        adapter.ts          # LLM interface + factory
        openai.ts           # OpenAI implementation
        mock.ts             # Mock LLM (no network)
      nap/
        engine.ts           # Effort bands, strategies
        tone.ts             # Tone templates
        state.ts            # Zustand store
        utils.ts            # Helper functions
        blanket.ts          # Blanket mode auto-activation
      rate-limit.ts         # Rate limiting logic (Redis/Memory)
  scripts/
    monitor.js              # Dev server health monitor
  tests/
    e2e/
      smoke.spec.ts         # Basic smoke tests
      ui-elements.spec.ts   # Comprehensive UI tests
      ui-elements-cdp.ts    # CDP-based UI tests
```

## Environment Variables

### Required
- None - the app runs in mock mode by default

### Optional

**API Configuration:**
- `ANTHROPIC_API_KEY` (optional): Your Anthropic API key. Get one at [console.anthropic.com](https://console.anthropic.com). If not set, runs in mock mode.
- `OPENAI_API_KEY` (optional): Your OpenAI API key. Set `LLM_PROVIDER=openai` to activate.
- `NAPGPT_MODEL` (optional): Model to use (default: `claude-sonnet-4-5` for Anthropic, `gpt-4o-mini` for OpenAI)
- `NAPGPT_MAX_TOKENS` (optional): Max tokens per response (default: `300`)

**Rate Limiting (Production — Required for serverless):**
- `KV_URL` (optional): Redis connection URL (e.g., from Upstash)
- `KV_REST_API_URL` (optional): Upstash Redis REST API URL
- `KV_REST_API_TOKEN` (optional): Upstash Redis REST API Token

> **Note:** Rate limiting is per-instance only without Redis configured. On serverless platforms like Vercel, each cold-start instance is independent, so a single IP can bypass limits across instances. Configure Redis (`KV_*` vars) for production.

**Feature Configuration:**
- `NEXT_PUBLIC_NAPGPT_BLANKET_IDLE_MS` (optional): Idle time in ms before blanket activates (default: `30000`)
- `NEXT_PUBLIC_NAPGPT_BLANKET_EFFORT_THRESH` (optional): Effort threshold below which blanket activates (default: `20`)
- `NEXT_PUBLIC_NAPGPT_BEAN_MAX` (optional): Maximum coffee beans (default: `10`)

## API Endpoints

### POST `/api/chat`
Sends a chat message and receives a response from NapGPT.

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "effort": 50,
  "flags": {
    "dream": false
  }
}
```

**Response:**
```json
{
  "reply": "Response text...",
  "meta": {
    "strategy": "short-answer",
    "effort": 50,
    "gaveUp": false,
    "nonSequitur": false
  }
}
```

**Rate Limiting:** 10 requests per minute per IP address (100 requests/minute in test mode).

### PUT `/api/chat`
Sets a boost cookie for the next chat request.

**Request Body:**
```json
{
  "boost": 20
}
```

### GET `/api/mode`
Returns the current mode (mock or real API).

**Response:**
```json
{
  "isMock": true
}
```

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** + custom cozy theme
- **Framer Motion** for animations
- **Zustand** for state management
- **Anthropic SDK** (primary) / **OpenAI SDK** (optional)
- **Playwright** for e2e testing

## License

MIT

---

**Note**: This is a parody project. NapGPT is intentionally lazy and may not always be helpful. That's the point! 😴


