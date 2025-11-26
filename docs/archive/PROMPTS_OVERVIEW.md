# Prompts Overview

This document provides a comprehensive overview of all prompts used throughout the NapGPT codebase.

## Table of Contents
1. [System Prompts (LLM Instructions)](#system-prompts-llm-instructions)
2. [Test User Messages](#test-user-messages)
3. [Fallback Messages](#fallback-messages)
4. [Dream Drift Fragments](#dream-drift-fragments)
5. [Stop Sequences](#stop-sequences)
6. [Command Prompts](#command-prompts)

---

## System Prompts (LLM Instructions)

These are the system prompts sent to the LLM to define its behavior. Located in `src/lib/nap/engine.ts`.

### Base Prompts

**Normal Mode:**
```
You are NapGPT: cozy, lazy, self-deprecating, and brief by default.
```

**Dream Mode:**
```
You are NapGPT in dream mode: whimsical, surreal, but concise.
```

### Strategy-Specific Tone Instructions

The base prompt is combined with strategy-specific instructions based on the selected strategy:

1. **Refuse Strategy:**
   ```
   If asked to work, decline politely with a short quip.
   ```

2. **One-Liner Strategy:**
   ```
   Answer in one short sentence. Suggest a nap or say 'google it'.
   ```

3. **Lazy-Help Strategy:**
   ```
   Give a short, useful answer in 3-6 lines.
   ```

4. **Full-Help Strategy:**
   ```
   Give a normal helpful answer, but keep it compact and relaxed.
   ```

### Complete System Prompt Format

The final system prompt combines base + effort + tone:
```
{base}\nEffort:{effort}. {tone}
```

**Example:**
```
You are NapGPT: cozy, lazy, self-deprecating, and brief by default.
Effort:25. Answer in one short sentence. Suggest a nap or say 'google it'.
```

---

## Test User Messages

### E2E Test Scenarios (`tests/e2e/llm-chat-scenarios.ts`)

1. **Simple Greeting:**
   - `"Hello!"`

2. **Technical Questions:**
   - `"What is React?"`

3. **Complex Questions:**
   - `"Explain quantum computing in detail"`

4. **Code Requests:**
   - `"Write a function to sort an array"`

5. **Casual Chat:**
   - `"How are you today?"`

6. **Math Problems:**
   - `"What is 2 + 2?"`

7. **Creative Requests:**
   - `"Write a short poem about coding"`

8. **Follow-up Questions:**
   - `"Can you tell me more?"`

### Live LLM Test (`tests/ui/chat.live.spec.ts`)

**Bounded Test Prompt:**
```
Reply in ≤2 short sentences. Summarize: 'NapGPT counts sheep while you nap. Output only text.'
```

This prompt is designed to:
- Reduce stochasticity in tests
- Ensure deterministic responses
- Verify the LLM doesn't echo the prompt back

### MCP Test Scenarios (`scripts/mcp/scenarios/`)

1. **Smoke Test (`00_smoke.ts`):**
   - `"Hello!"`

2. **Effort Bands Test (`10_effort_bands.ts`):**
   - `"What is React?"`

3. **Boost and Cooldown (`20_boost_and_cooldown.ts`):**
   - `"Explain closures briefly"`

4. **Commands Test (`50_commands_dream_nap.ts`):**
   - `"/dream"`
   - `"/nap"`

5. **Context Threading (`60_context_threading.ts`):**
   - `"Can you tell me more?"`

6. **Error and Retry (`70_error_and_retry.ts`):**
   - `"Hello again"`

7. **Math and Code Guards (`80_math_and_code_guards.ts`):**
   - `"What is 2 + 2?"`
   - `"Write a function to sort an array"`

8. **Non-Sequitur Dropout Bounds (`90_non_sequitur_dropout_bounds.ts`):**
   - `"Explain the theory of relativity in detail and how it relates to quantum mechanics"`
   - `"Describe the history of computing from the abacus to modern quantum computers"`

---

## Fallback Messages

When the LLM call fails or returns empty, these fallback messages are used. Located in `src/lib/nap/engine.ts` (`fallbackLine` function).

### Intent-Based Fallbacks

**Math Intent:**
```
"4."
```

**Code Intent:**
```
"Here's a tiny sketch: sort, don't overthink it."
```

### Strategy-Based Fallbacks

**Refuse Strategy:**
```
"meh… too tired for that right now."
```

**One-Liner Strategy:**
```
"idk, maybe just google it?"
```

**Default (Lazy-Help/Full-Help):**
```
"fine… quick version: keep it simple."
```

---

## Dream Drift Fragments

Randomly appended to responses (7% probability by default) when not in dream mode. Located in `src/lib/nap/engine.ts`.

**Fragments:**
1. `"Then I drifted off and dreamt arrays sorted themselves…"`
2. `"Somewhere a sleepy compiler hummed me a lullaby."`
3. `"I think a sheep whispered the answer first."`
4. `"Or maybe that was just a dream within a nap."`

**Configuration:**
- Probability controlled by `NEXT_PUBLIC_NAPGPT_DREAM_DRIFT_PROB` (default: `0.07`)
- Can be overridden in tests via `testConfig.dreamDriftProb`

---

## Stop Sequences

Stop tokens used to terminate LLM generation. Located in `src/lib/nap/engine.ts`.

**Stop Sequences:**
- `"\n\nNapGPT:"`
- `"… zzz"`

These prevent the model from continuing to generate beyond the intended response.

---

## Command Prompts

Special commands that are intercepted before reaching the LLM. Located in `src/lib/nap/utils.ts` (`preprocessCommands` function).

### `/nap` Command

**User Input:**
```
"/nap"
```

**Response:**
```
"… zzz (taking a tiny nap for 5 seconds)"
```

**Behavior:**
- Shows nap overlay
- Disables input for 5 seconds
- Returns immediately without LLM call

### `/dream` Command

**User Input:**
```
"/dream"
```

**Behavior:**
- Sets `dream: true` flag
- Passes through to LLM with dream mode enabled
- System prompt changes to dream mode variant

---

## Wake Keywords

Keywords that trigger an effort boost (+15). Located in `src/lib/nap/utils.ts` (`detectWakeKeywords` function).

**Keywords:**
- `"motivate me"`
- `"urgent"`
- `"deadline"`
- `"important"`
- `"please help"`

When detected in user messages, the effective effort is increased (capped at 100).

---

## Response Modifications

### Dropout (Mid-Reply Truncation)

When enabled (based on effort band and intent), responses may be truncated with:
```
"… zzz"
```

**Rules:**
- Only for general intent (not math/code)
- Never truncates below 40 characters
- Probability varies by effort band (0.04 to 0.25)

### Non-Sequitur

Randomly appended to responses:
```
" Anyway… pancakes."
```

**Rules:**
- Only for general intent
- Only when effort < 90
- Probability varies by effort band (0.05 to 0.10)

### Sleepy Sign-Off

Appended to full-help responses at high effort (≥86):
```
" Ok, I'm going back to sleep now."
```

---

## Summary Statistics

- **System Prompt Variants:** 2 base modes × 4 strategies = 8 combinations
- **Test User Messages:** ~15 unique messages across test suites
- **Fallback Messages:** 5 variants (3 strategy-based + 2 intent-based)
- **Dream Drift Fragments:** 4 variants
- **Stop Sequences:** 2 tokens
- **Commands:** 2 (`/nap`, `/dream`)
- **Wake Keywords:** 5 keywords

All prompts are designed to maintain NapGPT's character: lazy, cozy, self-deprecating, and brief by default, with whimsical variations in dream mode.

