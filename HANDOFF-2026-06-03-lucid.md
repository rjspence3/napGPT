# Handoff — napGPT — 2026-06-03 (lucid moments)

## TL;DR
Shipped a feature: NapGPT now occasionally **breaks character and gives a genuine, full answer** instead of always being lazy. Feature is **merged to `main`** (PR #4, squash `1f55994`), CI is green, working tree clean. Nothing in flight.

## What was done this session
1. **Diagnosed "the tool never answers any questions."** Root cause was two-layered:
   - napGPT is an intentional parody — a sleepy assistant gated by an effort slider (`src/lib/nap/engine.ts`). Low effort → refusals by design.
   - **Locally there was no API key**, so `getLLM()` (`src/lib/llm/adapter.ts:33-38`) falls back to `MockLLM`, which returns canned filler that never reads the question. The app shows a "Mock mode: no API key detected" banner (`src/app/page.tsx:58-62`).
2. **Implemented "lucid moments"** so it sometimes answers for real. Design decisions made WITH the user:
   - Trigger **scales with effort**: 0% below effort 16, ramping linearly to ~40% at effort 100 (~16% at the default 50). Dream mode excluded.
   - Mock mode **left as-is** (no API key = no real answer possible; the lucid path is exercised but still returns mock filler — no false promise).
3. **Merged** via PR #4 after full CI passed; synced local `main`; deleted the `feat/lucid-moments` branch (local + remote).

## The feature (how it works)
On a lucid hit, `respond()` in `src/lib/nap/engine.ts`:
- forces `strategy = "full-help"`
- swaps in `BASE_PROMPTS.lucid` (a non-lazy "snap awake and answer for real" system prompt, `src/lib/nap/prompts.ts`)
- grants `LUCID_MAX_TOKENS = 512` at `LUCID_TEMPERATURE = 0.5` (skips the laziness curve)
- **skips the entire degradation pipeline** (dropout/truncation/drift/sign-off) so the genuine answer survives intact
- sets `meta.lucid = true`

Tuning constants live at the top of the engine: `LUCID_MIN_EFFORT = 16`, `LUCID_MAX_CHANCE = 0.4`, `LUCID_MAX_TOKENS = 512`, `LUCID_TEMPERATURE = 0.5`.

### Files changed (all on `main` now)
- `src/lib/nap/engine.ts` — lucid roll, strategy override, prompt/token/temperature, pipeline skip, `meta.lucid`
- `src/lib/nap/prompts.ts` — added `BASE_PROMPTS.lucid`
- `src/lib/nap/config.ts` — added `ENABLE_LUCID_MOMENTS` flag
- `src/app/api/chat/route.ts` — allow `ENABLE_LUCID_MOMENTS` through the test-config zod schema

## Key design / safety detail (don't break this)
`ENABLE_LUCID_MOMENTS` defaults **on in the real app but OFF under test mode** (`config.ts`: `bool("NEXT_PUBLIC_NAPGPT_ENABLE_LUCID_MOMENTS", !isTestMode())`). When off, the code path **consumes zero randomness**, so the engine's random stream is byte-identical to before. This is why all 30 existing deterministic unit tests stayed unchanged and the full UI/MCP CI matrix passed. **If you ever change the gating, re-verify the random-stream invariant** or you'll break deterministic suites.

Disable entirely with env `NEXT_PUBLIC_NAPGPT_ENABLE_LUCID_MOMENTS=0`.

## Verification done
- `npx tsc --noEmit` — clean
- `NEXT_PUBLIC_TEST_MODE=1 npm run build` — clean (reproduces the CI build gate)
- 30 unit tests (`tests/unit/*.spec.ts`) — pass, unchanged
- Ad-hoc lucid spec — confirmed: fires at high effort + low roll (full-help, untruncated), not at high roll, never below effort 16, never when flag off
- CI on PR #4 — all green: UI Tests (PR), UI Tests matrix ubuntu/macos × headless/headful, MCP `test`, Vercel preview. Nightly/Lighthouse/Regression correctly skipped (cron-gated).

## Known caveats / possible follow-ups
- **Latency:** a full lucid answer (≤512 tokens) can approach the API route's **8s hard timeout** (`src/app/api/chat/route.ts:164`) on slow models, falling back to `"… zzz (took too long, try again)"`. If that shows up with a real key, lower `LUCID_MAX_TOKENS` or raise the timeout.
- **No automated test for lucid-on behavior** landed (only verified ad hoc). Could add a permanent unit test that sets `testConfig.ENABLE_LUCID_MOMENTS: true` + a deterministic `setTestRandomGenerator`.
- To actually SEE real answers in the running app: set `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) in `.env.local`, restart `npm run dev`, push the effort slider up.

## Repo state
- Branch: `main`, in sync with `origin/main`
- HEAD: `1f55994 feat(nap): rare "lucid moments" that give genuine answers (#4)`
- Working tree: clean
- Running unit tests outside the puppeteer jest config: use a temp config with `moduleNameMapper { '^@/(.*)$': '<rootDir>/src/$1' }`, `testEnvironment: node`, ts-jest transform, `testMatch: ['**/tests/unit/**/*.spec.ts']`. (The repo's `jest.config.js` only matches `tests/ui` under jest-puppeteer.)

## Nothing is in flight
No open PRs from this work, no background jobs, no pending decisions.
