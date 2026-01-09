# NapGPT

AI chat interface.

---

## Environment Setup

```bash
# Install dependencies
npm install
```

---

## Local Access

| Service | Domain | Port |
|---------|--------|------|
| Frontend (Next.js) | http://nap-gpt.test | 3000 |

Port assignments are defined in `~/Development/dev/ports.json` (authoritative).

---

## Commands

```bash
# Start dev server
npm run dev -- -p 3000

# Build for production
npm run build
```

---

## Notes

- Next.js frontend application

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
