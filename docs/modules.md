# NapGPT Modules Documentation

This document describes the three new modules added to NapGPT: **Blanket Mode**, **Coffee Economy**, and **Dream Drift Replies**.

---

## 🌕 Module 1: Blanket Mode

**Purpose**: Provides a cozy visual overlay when NapGPT is feeling sleepy (low effort or idle).

### Behavior

- **Automatic Activation**: Blanket appears when:
  - Effort level drops below threshold (default: 20)
  - App is idle for more than configured duration (default: 30 seconds)
- **Visual Design**: Semi-transparent gradient overlay with subtle texture, creating a "fuzzy blanket" effect
- **Accessibility**: Overlay is `aria-hidden="true"` and does not trap keyboard focus

### Configuration

Environment variables (all optional):

- `NEXT_PUBLIC_NAPGPT_BLANKET_IDLE_MS` (default: `30000`)
  - Milliseconds of idle time before blanket appears
- `NEXT_PUBLIC_NAPGPT_BLANKET_EFFORT_THRESH` (default: `20`)
  - Effort level below which blanket appears

### Implementation

- **Component**: `src/components/BlanketOverlay.tsx`
  - Full-screen overlay with Framer Motion animations
  - `data-testid="blanket-overlay"` for testing
- **Logic**: `src/lib/nap/blanket.ts`
  - `initBlanketAuto()` function monitors effort and idle state
  - Automatically toggles blanket based on conditions
- **State**: `src/lib/nap/state.ts`
  - `blanketOn: boolean` - current blanket state
  - `toggleBlanket()` - manual toggle function

### Testing

MCP scenario: `scripts/mcp/scenarios/25_blanket_mode.ts`

Tests:
1. Low effort triggers blanket
2. High effort hides blanket
3. Idle timeout triggers blanket

---

## ☕ Module 2: Coffee Economy

**Purpose**: Bean currency system that powers the Boost button. Users earn beans while idle and spend them to boost.

### Behavior

- **Bean Currency**: 
  - Start with 3 beans (configurable)
  - Maximum 10 beans (configurable)
  - Earn 1 bean every 10 seconds while idle (configurable)
- **Boost Integration**:
  - Each Boost click costs 1 bean
  - Boost is disabled when beans = 0
  - Toast notification shown when attempting boost without beans
- **UI Display**: Bean count shown next to Boost button with ☕ emoji

### Configuration

Environment variables (all optional):

- `NEXT_PUBLIC_NAPGPT_BEAN_TICK_MS` (default: `10000`)
  - Milliseconds between bean earnings while idle
- `NEXT_PUBLIC_NAPGPT_BEAN_MAX` (default: `10`)
  - Maximum number of beans
- Bean starting count: 3 (hardcoded in state)

### Implementation

- **Helpers**: `src/lib/nap/coffee.ts`
  - `initBeanTicker()` - monitors idle state and earns beans periodically
- **State**: `src/lib/nap/state.ts`
  - `beans: number` - current bean count
  - `spendBean(): boolean` - attempts to spend a bean, returns false if none available
  - `earnBean()` - adds one bean (capped at max)
- **UI**: `src/components/EffortBar.tsx`
  - Displays bean count with `data-testid="beans-count"`
  - Checks beans before allowing boost
  - Shows toast notification when boost refused

### Testing

MCP scenario: `scripts/mcp/scenarios/35_coffee_economy.ts`

Tests:
1. Initial bean count is ≥ 1
2. Beans decrement on Boost click
3. Boost is refused with toast when beans = 0
4. Beans regenerate while idle

---

## 🌙 Module 3: Dream Drift Replies

**Purpose**: Occasionally appends whimsical, dreamy fragments to normal replies for added personality.

### Behavior

- **Probability-Based**: With default probability of 7%, appends one of four dreamy fragments:
  - "Then I drifted off and dreamt arrays sorted themselves…"
  - "Somewhere a sleepy compiler hummed me a lullaby."
  - "I think a sheep whispered the answer first."
  - "Or maybe that was just a dream within a nap."
- **Smart Skipping**: 
  - Does not append when `flags.dream === true` (to avoid doubling up)
  - Does not append when reply was truncated mid-sentence
- **Test Override**: Supports `window.__nap_test.dreamDriftProb` for deterministic testing

### Configuration

Environment variables (optional):

- `NEXT_PUBLIC_NAPGPT_DREAM_DRIFT_PROB` (default: `0.07`)
  - Probability (0.0 to 1.0) of appending drift fragment

### Implementation

- **Engine**: `src/lib/nap/engine.ts`
  - Dream Drift logic runs after all other post-processing
  - Checks probability and appends random fragment
  - Respects `flags.dream` to avoid duplication

### Testing

MCP scenario: `scripts/mcp/scenarios/55_dream_drift.ts`

Tests:
1. With probability = 1.0, drift fragments appear
2. With probability = 0.0, no drift fragments appear
3. Uses `window.__nap_test.dreamDriftProb` for test control

---

## 🧪 Test Configuration

### Test Overrides

For deterministic testing, scenarios can set:

```typescript
// In browser context
window.__nap_test = {
  dreamDriftProb: 1.0  // Force drift for testing
};
```

### Running Tests

```bash
# Run all MCP scenarios
pnpm test:mcp

# Run with visible browser
pnpm test:mcp:headful
```

### Test Artifacts

Each scenario saves:
- Screenshot: `artifacts/{timestamp}/{scenario}/screenshot.png`
- Metrics JSON: `artifacts/{timestamp}/{scenario}/metrics.json`

---

## 🔧 Environment Variables Summary

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_NAPGPT_BLANKET_IDLE_MS` | `30000` | Idle time (ms) before blanket appears |
| `NEXT_PUBLIC_NAPGPT_BLANKET_EFFORT_THRESH` | `20` | Effort threshold for blanket |
| `NEXT_PUBLIC_NAPGPT_BEAN_TICK_MS` | `10000` | Bean earning interval (ms) |
| `NEXT_PUBLIC_NAPGPT_BEAN_MAX` | `10` | Maximum beans |
| `NEXT_PUBLIC_NAPGPT_DREAM_DRIFT_PROB` | `0.07` | Dream drift probability (0.0-1.0) |

---

## 📁 File Structure

```
src/
  components/
    BlanketOverlay.tsx          # Blanket visual component
  lib/
    nap/
      blanket.ts                 # Blanket auto-logic
      coffee.ts                  # Bean ticker logic
      state.ts                   # Zustand store (all modules)
      engine.ts                  # Dream Drift injection

scripts/mcp/scenarios/
  25_blanket_mode.ts            # Blanket tests
  35_coffee_economy.ts          # Coffee tests
  55_dream_drift.ts             # Dream Drift tests

docs/
  modules.md                    # This file
```

---

## ✅ Acceptance Criteria

All modules meet the following:

- ✅ Blanket appears when effort < threshold OR idle > configured ms
- ✅ Beans decrement on Boost; cannot go negative
- ✅ Boost refused with toast when beans = 0
- ✅ Beans regenerate while idle at configured cadence
- ✅ Dream Drift appends fragments according to probability
- ✅ Dream Drift disabled when `flags.dream === true`
- ✅ All MCP scenarios pass
- ✅ No ESLint or TypeScript errors
- ✅ Accessibility preserved (ARIA labels, no focus traps)

---

## 🎨 UX Notes

- **Blanket Mode**: Creates a cozy, dimmed atmosphere when NapGPT is sleepy
- **Coffee Economy**: Adds gamification element - encourages waiting/idling to earn boosts
- **Dream Drift**: Adds whimsical personality without being intrusive (low probability)

---

## 🔐 Guardrails

- **Performance**: All tickers and intervals are properly cleaned up on unmount
- **Accessibility**: Blanket overlay does not interfere with keyboard navigation
- **Determinism**: Test scenarios can override probabilities for reliable testing
- **Memory**: No memory leaks from intervals or subscriptions

---

## 📝 Notes

- All modules are opt-in via environment variables (defaults provided)
- Modules work independently and can be enabled/disabled separately
- Test scenarios are isolated and can run independently
- All state is managed through Zustand for consistency

