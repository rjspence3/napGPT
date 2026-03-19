# Migration Notes: Claude as Primary LLM

## Changes Made

### `src/app/api/mode/route.ts`
**Before:**
```typescript
const hasApiKey = !!process.env.OPENAI_API_KEY;
```

**After:**
```typescript
const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
```

This fixes an inconsistency: `adapter.ts` already preferred Anthropic via `resolveProvider()`, but the `/api/mode` endpoint only checked `OPENAI_API_KEY` to determine mock mode. With only `ANTHROPIC_API_KEY` set, the UI would show "mock mode" while the actual LLM was using Claude — now they agree.

### `.env.example` (no change needed)
Already documented Anthropic as the default provider. No edits required.

### `adapter.ts` (no change needed)
`resolveProvider()` already checks `ANTHROPIC_API_KEY` before `OPENAI_API_KEY`. Model defaults to `claude-sonnet-4-5`. No edits required.

## Setup (Updated)

Set your Anthropic key in `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

OpenAI remains available as a fallback by setting `LLM_PROVIDER=openai` and `OPENAI_API_KEY`.
