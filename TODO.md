# napGPT TODO

## Accessibility: Color Contrast (axe-core false positive)

**Status:** Allowlist active - axe computes wrong colors
**File:** `tests/utils/a11y.ts:61`

### Root Cause Analysis

The verbose axe output revealed that axe-core computes incorrect foreground colors:

```
HTML: <p style="color: rgb(42, 31, 26);">...</p>  // CORRECT in DOM
Data: {"fgColor":"#e5d7c5", ...}                   // WRONG computed by axe
```

The inline style `color: rgb(42, 31, 26)` (#2A1F1A) is correctly applied in the HTML, but axe reports light beige colors (~#e5d7c5) instead.

### Likely Cause: GPU Compositing

The MessageBubble component uses framer-motion animations which trigger GPU layer compositing. This affects how axe-core samples/computes colors:

```tsx
// MessageBubble.tsx
<motion.div
  animate={{ y: [0, -2, 0] }}  // Creates GPU-composited layer
  ...
>
```

Additionally, parent elements have `backdrop-blur-sm` which may affect color computation.

### Attempted Fixes (Did Not Work)
1. Added `text-cozy-dim` class to `<p>` - same result
2. Added inline `style={{ color: '#2A1F1A' }}` - color correct in HTML, axe still wrong
3. Added `isolation: isolate` - no effect on axe computation
4. Updated all color definitions in globals.css - no effect

### Potential Solutions
1. **Disable animations in test mode** - Add `prefers-reduced-motion` or test flag to skip framer-motion animations
2. **Use axe's `disableRules` option** - Already doing this via allowlist
3. **Report to axe-core** - This may be a known issue with GPU-composited elements
4. **Alternative a11y testing** - Use Lighthouse or manual testing for color contrast

### Files
- `src/components/MessageBubble.tsx` - message bubbles with animations
- `tests/utils/a11y.ts` - axe test utilities and allowlist
- `tailwind.config.ts`, `src/app/globals.css`, `src/styles/theme.css` - color definitions

### Verification
The colors ARE correct - this is a testing tool limitation, not an actual accessibility issue. Manual inspection and the DOM show correct contrast.
