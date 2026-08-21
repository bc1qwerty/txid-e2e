# txid-e2e

## Language
- Respond in Korean (한국어로 응답)

## Description
End-to-end test suite for all txid.uk subdomains. Uses Playwright to verify functionality across the entire platform.

## Tech Stack
- **Testing**: Playwright (^1.49.0)
- **Config**: playwright.config.ts

## Key Files
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
  - `audit-status.spec.ts` -- cross-site availability audit
- `playwright.config.ts` -- Playwright configuration
- `run-tests.sh` -- Test runner script
- Standalone test files: `black-test.mjs`, `click-test.mjs`, `comm-test.mjs`, `mobile-test.mjs`

## Build & Run
```bash
npm test              # Run all Playwright tests
npm run test:report   # Show HTML test report
bash run-tests.sh     # Run via shell script
```

## Status
- Active, covers 11 txid.uk subdomains
