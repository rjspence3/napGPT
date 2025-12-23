# napGPT TODO

## Accessibility: Color Contrast Audit

**Status:** Partial fix shipped, allowlist active in CI
**File:** `tests/utils/a11y.ts:50`

### Background
During CI stabilization, axe-core flagged `color-contrast` violations. Three background colors were lightened to improve contrast with `cozy-dim` (#2A1F1A):

| Color | Original | Current |
|-------|----------|---------|
| `cozy-amber` | #D4A574 | #F5DCC5 |
| `cozy-rose` | #E8B4B8 | #FADDE0 |
| `cozy-warm` | #F4D1AE | #FEF3E8 |

However, contrast violations persist elsewhere. The `color-contrast` rule remains in the CI allowlist.

### What's Needed
1. Run axe locally with verbose output to identify all failing elements
2. Audit all text/background color combinations in the app
3. Decide whether to:
   - Adjust more background colors (lighter)
   - Darken text color (currently `cozy-dim` #2A1F1A)
   - Use different colors for specific components
4. Verify all changes meet WCAG AA (4.5:1 for normal text, 3:1 for large text)
5. Remove `color-contrast` from `KNOWN_VIOLATIONS` in `tests/utils/a11y.ts`

### How to Debug
```bash
# Run a11y tests with full output
npm run test:ui-all -- --testPathPattern=a11y --verbose

# Or manually check contrast at:
# https://webaim.org/resources/contrastchecker/
```

### Affected Files
- `tailwind.config.ts` - color definitions
- `src/styles/theme.css` - CSS custom properties
- Components using cozy colors (MessageBubble, EffortBar, ChatWindow, EnergyMeter)
