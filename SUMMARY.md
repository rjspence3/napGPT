# Summary: Make Claude the primary LLM for napGPT

## What was done
Fixed an inconsistency in `mode/route.ts` where `hasApiKey` only checked `OPENAI_API_KEY`, causing the UI to show "mock mode" even when `ANTHROPIC_API_KEY` was set and Claude was active. Updated the check to include `ANTHROPIC_API_KEY` first. The adapter and `.env.example` already had Claude as the default — no other changes were needed.

## Key findings / Output
- `src/app/api/mode/route.ts` — updated `hasApiKey` to check `ANTHROPIC_API_KEY || OPENAI_API_KEY`
- `.env.example` — already correct (Anthropic-first), no changes required
- `adapter.ts` — already correct (`resolveProvider()` prefers Anthropic), no changes required
- `MIGRATION-NOTES.md` — documents the fix and updated setup instructions

## Actions needed
None — complete. The one-line fix in `mode/route.ts` is the only code change needed.
