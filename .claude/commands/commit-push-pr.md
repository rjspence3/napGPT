---
description: "Run quality gates, commit all changes, push, and open a PR. Usage: /commit-push-pr [optional context]"
---

Commit, push, and open a PR for the current changes in napGPT.

**Context:** $ARGUMENTS

## Step 1: Quality gates

```bash
npm run lint    # Must exit 0 — zero ESLint errors
npm run build   # Must complete — catches type errors and broken imports
```

Do NOT run `test:ui-all`, `test:e2e`, or any `test:ui:live` — they require a
running dev server or make live LLM API calls.

If any gate fails, stop and report. Do not proceed to commit.

## Step 2: Inspect changes

Run in parallel:
- `git status` — see what's staged/unstaged
- `git diff` — review what changed
- `git log --oneline -5` — match commit message style

## Step 3: Commit

Stage tracked files only:
```bash
git add -u
```

Add new source files explicitly if needed. Do not add `artifacts/`,
`.next/`, `playwright-report/`, `test-results/`, or `node_modules/`.

If on `main`, create a feature branch first:
```bash
git checkout -b feat/<short-slug>
```

Write the commit message as `type: description` (feat/fix/chore/docs/refactor/test).
Use a HEREDOC.

## Step 4: Push

```bash
git push -u origin HEAD
```

## Step 5: Open PR

```bash
gh pr create --title "..." --body "$(cat <<'EOF'
## Summary
- [bullet points of what changed]

## Test plan
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] [any manual verification at http://nap-gpt.test]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
