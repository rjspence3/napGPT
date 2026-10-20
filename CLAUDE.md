# napGPT

Next.js + React + TypeScript project.

---

## Environment Setup

```bash
# Install Node dependencies
npm install
```

---

## Commands

```bash
# Start frontend
npm run dev
```

---

## Structure

```
artifacts/
  1762797107111/
    30_idle_and_overlay/
  1762797303757/
    30_idle_and_overlay/
  1762804431517/
    30_idle_and_overlay/
  1762806042288/
    30_idle_and_overlay/
  1762807178609/
    30_idle_and_overlay/
  1762883919327/
    30_idle_and_overlay/
  1762884305516/
    30_idle_and_overlay/
  1762884362494/
    35_coffee_economy/
  1762884747660/
    30_idle_and_overlay/
  1762884804659/
    35_coffee_economy/
  1762885102950/
    30_idle_and_overlay/
  1762885159918/
    35_coffee_economy/
docs/
  archive/
  assets/
  internal/
playwright-report/
  data/
public/
  icons/
scripts/
  mcp/
    scenarios/
    utils/
  ui-test/
src/
  app/
    api/
  components/
  lib/
    llm/
    nap/
    utils/
  styles/
test-results/
tests/
  config/
  e2e/
  mocks/
  results/
  screenshots/
  ui/
    failpack/
  unit/
  utils/
```

---

## Notes

- Tech: Next.js, React, TypeScript

<!-- BEGIN AGENT-DISCIPLINE (installed by dev/tools/install_agent_discipline.sh; edit the template, not this block) -->
## 🎳 Coding-Agent Discipline

These rules were earned in the kernel project, each from a measured failure. The hooks wired in
`.claude/settings.json` mechanise the ones that can be mechanised. The rest are narrative, which is
the floor, not a resting place. "Coding agents are like bowling balls. We need to mechanize the
bumpers else you gutter ball."

### Evidence before assertion
- **Verify before you assert, including your own high-confidence claims.** A statement that something
  exists, is wired, is broken, or is absent needs the observation that produced it: the command, its
  output, the file and line. A number inherited from a plan, a prior session, or memory is unmeasured
  until re-derived.
- **A zero is indistinguishable from a broken search.** Known false-zero shapes: `rg --include` (grep's
  flag, rg errors silently), `timeout N rg` (rg is a shell function here, timeout cannot exec it),
  `\.json` (skips `.jsonl`), `name\b` (does not match across `_`). On any surprising empty result, run
  a known-positive control before concluding absence. The zero-result hook runs one for `grep`.
- **Presence is not execution.** Code existing is not code firing. Before claiming a mechanism is
  broken, missing, or inert, gather runtime evidence that it does or does not fire. Before building a
  replacement, prove the original does not already do the job.
- **A defect claim names its input.** "The gate rejects commits it shouldn't" is not reportable
  without the command you ran and what it printed. There are two outcomes when a mechanism
  misbehaves: you gave it the wrong input, or the code is bad. You cannot claim the second without
  showing the first. The report-gate hook refuses the turn otherwise.
- **Classify before counting.** A grep count is a starting point, not an answer. Define the categories,
  surface every match with its classification, and give more than one count interpretation when the
  categories are ambiguous.
- **Read in full or state the slice.** Never silently `head -N` an input that feeds a decision. If it
  is too large, page it and say which range you read. Output that stops exactly at its cap proves
  only that the cap was reached.
- **A headline cites its proof.** "Done", "green", "verified", "complete" each point at the
  confirming observation, never at a proxy. Write-then-verify: done means the write landed and was
  read back, not that the call returned.

### Search before building
- Before creating any file or function, grep the codebase for the name and the behaviour. Use
  `grep -r --include="*.py"` (a real binary, safe under any runner) or `rg -g "*.py"`. Do not declare
  something absent without searching, and do not build what exists.
- Adopt the established external best practice when one exists. Custom-engineer only when the
  project's own documented decisions say otherwise.
- Eliminate first. Before building or measuring on a corpus, remove what is dead, what contradicts
  itself, and what misleads. Guards built over a dead corpus measure the dead corpus.
- Prune code and config that is not worth maintaining rather than carrying it. Removal goes through a
  reversible path (git), and names the reason.

### Diagnosis
- **Instrument, do not guess.** A revert is an abandoned hypothesis. Two reverts on the same cause
  without new evidence is a guessing loop; the next edit is theory three. Stop editing and observe:
  a trace at the suspected site, the suspect run in isolation, the mechanism's source read rather
  than inferred. The guess-guard hook nudges at the second revert.
- Consult sources in a fixed order when you need information to act: project docs and
  `DECISIONS.md` → the code and git history → this conversation → the user. On empty or ambiguous,
  go up, not sideways. Irreversible actions (push, delete, deploy, schema change) short-circuit to
  the user.
- When the plan and the code disagree, the deviation is the deliverable. Report it; do not leave the
  plan asserting what the code does not do.

### Reporting
- A report is a read-back of the act, never a restatement of its inputs. Say what you ran, what it
  returned, and what that means. If a step was skipped or could not be verified, say so first.
- Catches are first-class. A false premise, a correction, or a material deviation is surfaced the
  moment it is hit, not folded into a summary at the end.
- Truncate loud or not at all. Every truncation in output you produce must be visible to the reader.
- When a prompt says read-only, surface-findings, or no-commits, stop at that boundary. Capture any
  urge to fix as a finding instead.
- Before declaring a phase finished, review it for the **uninvestigated** (noticed and not resolved:
  every item is fixed, filed with an owner, blocked with the blocker named, or ruled out of scope by
  a citable reason), the **unmeasured** (asserted without the observation), and the **side-quest**
  (next-phase items that are projects dressed as tasks).
- If the user redirects you the same way three times, say so and propose the rule for this file.

### Git
- One logical change per commit. Stage by explicit path; never `git add .` or `git add -A`. Check
  `git diff --cached --stat` before committing.
- Commit messages name what changed and why. Write any message containing identifiers to a file and
  commit with `-F`: zsh command-substitutes backticks and silently deletes the identifier they wrap.
- Avoid the literal word "credentials" in commit messages; the user-level action gate blocks it. Write
  "secrets-scan" or similar.
- Gitignored files do not propagate to git worktrees. Copy them explicitly when parallelising.

### Shell and runtime on this machine
- macOS ships bash 3.2. `mapfile`, `readarray`, `declare -A`, and `${var,,}` do not exist and the
  worst of them fail silently. The bash-portability hook denies them and names the replacement.
- `rg` is a shell function wrapping the Claude Code binary's ripgrep. Never prefix it with `timeout`,
  `xargs`, `env`, or `nohup`.
- zsh `for x in $list` does not word-split a scalar. Iterate lists via `typeset -a` arrays and
  `"${ARR[@]}"`.
- Under `set -e`, `local X=$(cmd)` masks cmd's exit code. Declare, then assign.
- Long-running commands with redirection inside a loop can be auto-backgrounded and lose their
  output. Use chunked foreground loops.

### Code legibility
- A unit is understandable from its own text. Type hints present; docstrings state the contract.
- One canonical way to do each recurring thing. A second path is drift, not flexibility.
- Names are distinctive and appear verbatim in source. No runtime-constructed names at a boundary.
- Fail loud and typed. No silent fallback, swallowed exception, or quiet truncation. A fallback that
  returns a default prints why to stderr.
- Code carries its own checks. Co-locate assertions and tests as the verification anchor.
- Forbidden: `assert X, "X"` with the expression as its own message; `# type: ignore` or
  `# noqa` without a code and an inline reason; `cast()` where `isinstance` narrowing works.
<!-- END AGENT-DISCIPLINE -->
