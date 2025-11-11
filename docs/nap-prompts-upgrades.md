# NapGPT Prompt System Upgrades

This document describes the 10 prompt/behavior improvements added to NapGPT, including feature flags, examples, and how to disable features in production.

## Overview

All new features are gated by environment variables with safe defaults. Most features are enabled by default for a better user experience, but can be disabled for production if needed.

## Feature Flags

All flags use the `NEXT_PUBLIC_NAPGPT_` prefix and can be set in `.env.local` or environment variables.

### 1. Context-Aware Micro-Modes

**Flag:** `NEXT_PUBLIC_NAPGPT_ENABLE_MICRO_MODES`  
**Default:** `true` (enabled)

Adds context-aware micro-modes that adjust the system prompt based on detected intent:

- **Tech:** "You are lazy but curious; answer succinctly with a practical tip."
- **Existential:** "You are lazy but gentle; keep it humane and minimal."
- **Complaint:** "You are lazy but empathetic; acknowledge the pain briefly."

**Example:**
```
User: "How do I use React hooks?"
→ Detects tech intent → Uses tech micro-mode
```

**Disable:** Set `NEXT_PUBLIC_NAPGPT_ENABLE_MICRO_MODES=false`

---

### 2. Self-Referential Humor Templates

**Flag:** `NEXT_PUBLIC_NAPGPT_ALLOW_SELF_REFERENCES`  
**Default:** `false` (disabled)

Adds self-referential humor templates that reference the AI's own responses:

- "I was halfway through a nap when I remembered: {fact}."
- "Between yawns, it came to me: {fact}."

**Probability:** Controlled by `NEXT_PUBLIC_NAPGPT_SELF_REF_PROB` (default: 0.06)

**Example:**
```
Response: "I was halfway through a nap when I remembered: React is a library for building UIs."
```

**Enable:** Set `NEXT_PUBLIC_NAPGPT_ALLOW_SELF_REFERENCES=true`

---

### 3. Non-Linear Laziness Curve

**Flag:** `NEXT_PUBLIC_NAPGPT_ENABLE_LAZINESS_CURVE`  
**Default:** `true` (enabled)

Replaces linear effort scaling with an S-curve that suppresses low-effort responses more sharply:

```
y = (effort/100)^1.7
```

**Effect:**
- Low effort (0-20): Response length suppressed sharply
- Medium effort (40-60): Moderate suppression
- High effort (80-100): Full response length allowed

**Example:**
```
Effort 10: maxTokens ≈ 24 (heavily suppressed)
Effort 50: maxTokens ≈ 80 (moderate)
Effort 90: maxTokens ≈ 320 (full)
```

**Disable:** Set `NEXT_PUBLIC_NAPGPT_ENABLE_LAZINESS_CURVE=false`

---

### 4. Prior-Turn Echo Fragments

**Flag:** `NEXT_PUBLIC_NAPGPT_ENABLE_ECHO_FRAGMENTS`  
**Default:** `true` (enabled)

Adds echo fragments that reference previous replies:

- "Didn't I mumble something like that earlier?"
- "Pretty sure I yawned this last time too."

**Probability:** Controlled by `NEXT_PUBLIC_NAPGPT_ECHO_FRAGMENT_PROB` (default: 0.08)

**Example:**
```
Turn 1: "React is a library..."
Turn 2: "Here's more about React... Didn't I mumble something like that earlier?"
```

**Disable:** Set `NEXT_PUBLIC_NAPGPT_ENABLE_ECHO_FRAGMENTS=false`

---

### 5. Multi-Sentence Refusal Variants

**Flag:** `NEXT_PUBLIC_NAPGPT_ENABLE_RICH_REFUSALS`  
**Default:** `true` (enabled)

Expands refusal messages with multi-sentence variants:

- "I'd help, but my neurons filed a nap request. Maybe later."
- "Tempting. But my pillow has tenure. Short answer: not now."

**Example:**
```
User: "Can you do this work?"
Response: "I'd help, but my neurons filed a nap request. Maybe later."
```

**Disable:** Set `NEXT_PUBLIC_NAPGPT_ENABLE_RICH_REFUSALS=false`

---

### 6. Dream-Drift Content Blending

**Flag:** `NEXT_PUBLIC_NAPGPT_ENABLE_DRIFT_BLEND`  
**Default:** `true` (enabled)

Adds mid-sentence blending option for dream drift fragments (20% of drift cases):

**Classic (80%):** Append at end
```
"React is a library. Then I drifted off and dreamt arrays sorted themselves…"
```

**Blended (20%):** Insert mid-sentence
```
"React is a library. Then I drifted off and dreamt arrays sorted themselves… It's useful for UIs."
```

**Ratio:** Controlled by `NEXT_PUBLIC_NAPGPT_DRIFT_BLEND_RATIO` (default: 0.2)

**Disable:** Set `NEXT_PUBLIC_NAPGPT_ENABLE_DRIFT_BLEND=false`

---

### 7. Visible Wake Reaction Lines

**Flag:** `NEXT_PUBLIC_NAPGPT_ENABLE_WAKE_REACTIONS`  
**Default:** `true` (enabled)

Adds visible reaction lines when wake keywords are detected:

- "Who said 'urgent'? Fine, caffeine mode on…"
- "Deadline? Okay okay, sitting up now."

**Wake Keywords:** "motivate me", "urgent", "deadline", "important", "please help"

**Example:**
```
User: "This is urgent! Please help"
Response: "Who said 'urgent'? Fine, caffeine mode on… Here's the answer..."
```

**Disable:** Set `NEXT_PUBLIC_NAPGPT_ENABLE_WAKE_REACTIONS=false`

---

### 8. Mode/Tone-Aware Stop Sequences

**Flag:** `NEXT_PUBLIC_NAPGPT_ENABLE_DYNAMIC_STOPS`  
**Default:** `true` (enabled)

Replaces static stop sequences with dynamic ones based on mode and strategy:

**Base stops:** `["\n\nNapGPT:", "… zzz"]`

**Dream mode:** Adds `"— drifting off"`

**Refuse strategy:** Adds `"…maybe later"`

**Example:**
```
Dream mode + refuse: ["\n\nNapGPT:", "… zzz", "— drifting off", "…maybe later"]
```

**Disable:** Set `NEXT_PUBLIC_NAPGPT_ENABLE_DYNAMIC_STOPS=false`

---

### 9. /recall Command (a.k.a. /mumble)

**Flag:** `NEXT_PUBLIC_NAPGPT_ENABLE_RECALL_COMMAND`  
**Default:** `true` (enabled)

Adds `/recall` (or `/mumble`) command to paraphrase the last reply:

**With history:**
```
User: "/recall"
Response: "I vaguely recall saying: React is a library for building UIs."
```

**No history:**
```
User: "/recall"
Response: "I only remember pillows."
```

**Disable:** Set `NEXT_PUBLIC_NAPGPT_ENABLE_RECALL_COMMAND=false`

---

### 10. Behavioral Tests

All features are covered by comprehensive unit and E2E tests with deterministic RNG seeding.

**Test Files:**
- `tests/unit/nap.prompts.spec.ts` - Prompt assembly tests
- `tests/unit/nap.behavior.spec.ts` - Behavior feature tests
- `tests/e2e/llm-chat-scenarios.ts` - Extended E2E scenarios

---

## Configuration Examples

### Production (Conservative)

```env
NEXT_PUBLIC_NAPGPT_ENABLE_MICRO_MODES=true
NEXT_PUBLIC_NAPGPT_ALLOW_SELF_REFERENCES=false
NEXT_PUBLIC_NAPGPT_ENABLE_LAZINESS_CURVE=true
NEXT_PUBLIC_NAPGPT_ENABLE_ECHO_FRAGMENTS=false
NEXT_PUBLIC_NAPGPT_ENABLE_RICH_REFUSALS=true
NEXT_PUBLIC_NAPGPT_ENABLE_DRIFT_BLEND=false
NEXT_PUBLIC_NAPGPT_ENABLE_WAKE_REACTIONS=true
NEXT_PUBLIC_NAPGPT_ENABLE_DYNAMIC_STOPS=true
NEXT_PUBLIC_NAPGPT_ENABLE_RECALL_COMMAND=true
```

### Development (All Features)

```env
NEXT_PUBLIC_NAPGPT_ENABLE_MICRO_MODES=true
NEXT_PUBLIC_NAPGPT_ALLOW_SELF_REFERENCES=true
NEXT_PUBLIC_NAPGPT_ENABLE_LAZINESS_CURVE=true
NEXT_PUBLIC_NAPGPT_ENABLE_ECHO_FRAGMENTS=true
NEXT_PUBLIC_NAPGPT_ENABLE_RICH_REFUSALS=true
NEXT_PUBLIC_NAPGPT_ENABLE_DRIFT_BLEND=true
NEXT_PUBLIC_NAPGPT_ENABLE_WAKE_REACTIONS=true
NEXT_PUBLIC_NAPGPT_ENABLE_DYNAMIC_STOPS=true
NEXT_PUBLIC_NAPGPT_ENABLE_RECALL_COMMAND=true
```

### Minimal (Disable All)

```env
NEXT_PUBLIC_NAPGPT_ENABLE_MICRO_MODES=false
NEXT_PUBLIC_NAPGPT_ALLOW_SELF_REFERENCES=false
NEXT_PUBLIC_NAPGPT_ENABLE_LAZINESS_CURVE=false
NEXT_PUBLIC_NAPGPT_ENABLE_ECHO_FRAGMENTS=false
NEXT_PUBLIC_NAPGPT_ENABLE_RICH_REFUSALS=false
NEXT_PUBLIC_NAPGPT_ENABLE_DRIFT_BLEND=false
NEXT_PUBLIC_NAPGPT_ENABLE_WAKE_REACTIONS=false
NEXT_PUBLIC_NAPGPT_ENABLE_DYNAMIC_STOPS=false
NEXT_PUBLIC_NAPGPT_ENABLE_RECALL_COMMAND=false
```

## Probability Controls

Additional fine-tuning via environment variables:

- `NEXT_PUBLIC_NAPGPT_DREAM_DRIFT_PROB` (default: 0.07) - Dream drift probability
- `NEXT_PUBLIC_NAPGPT_SELF_REF_PROB` (default: 0.06) - Self-reference probability
- `NEXT_PUBLIC_NAPGPT_ECHO_FRAGMENT_PROB` (default: 0.08) - Echo fragment probability
- `NEXT_PUBLIC_NAPGPT_DRIFT_BLEND_RATIO` (default: 0.2) - Blend vs append ratio

## Testing

All features support deterministic testing via `testConfig`:

```typescript
await respond({
  messages: [...],
  effort: 50,
  testConfig: {
    ENABLE_MICRO_MODES: true,
    dreamDriftProb: 1.0, // Force drift
    testRandomFn: () => 0.5, // Deterministic RNG
  },
});
```

## Backward Compatibility

All features maintain backward compatibility:
- Existing behavior preserved when flags disabled
- No breaking changes to public interfaces
- Safe defaults ensure production stability

## Files Modified

- `src/lib/nap/config.ts` - Configuration and flags
- `src/lib/nap/prompts.ts` - Central prompt registry
- `src/lib/nap/conversation-state.ts` - Conversation state tracking
- `src/lib/nap/utils.ts` - Helper functions
- `src/lib/nap/engine.ts` - Main response logic
- `src/app/api/chat/route.ts` - API route updates
- `tests/unit/nap.prompts.spec.ts` - Unit tests
- `tests/unit/nap.behavior.spec.ts` - Behavior tests
- `tests/e2e/llm-chat-scenarios.ts` - Extended E2E scenarios

