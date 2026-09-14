# txid-e2e

## Language
- Respond in Korean (한국어로 응답)

## Description
End-to-end test suite for all txid.uk subdomains. Uses Playwright to verify functionality across the entire platform.

## Tech Stack
- **Testing**: Playwright (^1.49.0)
- **Config**: playwright.config.ts

## Key Files
- `fixtures.ts` -- shared test/expect export every spec imports; disables umami analytics on every page (suite hits production directly)
- `tests/` -- Test specs per subdomain:
  - `txid-uk.spec.ts` -- Main site
  - `learn.spec.ts` -- Learn subdomain
  - `apps.spec.ts` -- Apps subdomain
  - `tools.spec.ts` -- Tools subdomain
  - `tx.spec.ts` -- Transaction explorer
  - `sim.spec.ts` -- Simulator
  - `id.spec.ts` -- Identity
  - `news.spec.ts` -- News subdomain
  - `community.spec.ts` -- Community subdomain
  - `api.spec.ts` -- api.txid.uk endpoints
  - `dev-debugger.spec.ts` -- dev.txid.uk script debugger
  - `audit-status.spec.ts` -- status.txid.uk + dev.txid.uk availability
  - `sweep-regressions.spec.ts` -- request-level locks for the 2026-08/09 full-fleet sweep fixes (www redirect, lokl 404, matrix CSP, ...)
  - `fleet-smoke.spec.ts` -- request-level availability for ghs, dash, txt, blog
- `playwright.config.ts` -- Playwright configuration
- `run-tests.sh` -- Test runner script
- Root `*.mjs` debug scripts were removed 2026-09-14 (stale 2026-04 one-offs targeting moved URLs; recover from git history if ever needed)

## Build & Run
```bash
npm test              # Run all Playwright tests
npm run test:report   # Show HTML test report
bash run-tests.sh     # Run via shell script
```

## CI
- `.github/workflows/ci.yml` -- push/PR/dispatch + nightly cron (21:00 UTC) against production; Playwright browser cache + best-effort apt deps (2026-08-19 apt-hang hardening); Telegram alert on failure
- `.github/workflows/keepalive.yml` -- keeps the scheduled workflow from being auto-disabled for repo inactivity
- Consumed remotely: archive's post-deploy smoke job checks out this repo and runs the deployed sites' specs

## Status
- Active. 14 spec files covering 19 live txid.uk hosts.
