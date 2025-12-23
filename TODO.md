# napGPT TODO

## Accessibility: Color Contrast (CI-only failure)

**Status:** Allowlist active - passes locally, fails in CI
**File:** `tests/utils/a11y.ts:50`

### Background
During CI stabilization, axe-core flagged `color-contrast` violations. Three background colors were lightened:

| Color | Original | Current |
|-------|----------|---------|
| `cozy-amber` | #D4A574 | #F5DCC5 |
| `cozy-rose` | #E8B4B8 | #FADDE0 |
| `cozy-warm` | #F4D1AE | #FEF3E8 |

### Current Status
- **Local:** No violations detected (macOS, Chrome headless)
- **CI:** Fails on "should have zero P0 violations with messages" test
- **Failing test:** Only occurs after sending a message (message bubbles visible)

### Hypothesis
Headless Chrome in CI (Ubuntu/macOS GitHub runners) may render colors differently than local Chrome. The contrast calculation by axe-core could be affected by:
- Font rendering differences
- Anti-aliasing settings
- Color profile handling

### Investigation Steps
1. Download CI artifacts to inspect screenshots
2. Add verbose axe output to CI to see exact failing elements
3. Compare rendered colors between local and CI environments
4. Consider using a more aggressive contrast ratio (e.g., 7:1 instead of 4.5:1)

### Files
- `tailwind.config.ts` - color definitions
- `src/styles/theme.css` - CSS custom properties
- `tests/utils/a11y.ts` - allowlist location
- Components: MessageBubble, EffortBar, ChatWindow, EnergyMeter
