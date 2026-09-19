# Contributing to Sisonkhe In Transit

This document describes the exact workflow used to develop and deploy this system.

## The Workflow

We do **not** run a local dev server. We do **not** run tests locally. The workflow is:

1. **Engineer** (AI) provides complete code files
2. **Maintainer** (human) pastes them into a text editor / GitHub web UI
3. **Maintainer** commits to `main` or `develop`
4. **GitHub Actions** runs CI (typecheck, lint, test, build) automatically
5. **Vercel** deploys if CI passes (or blocks if it doesn't)
6. **Maintainer** verifies in the live deployment

That's it. No terminal, no `npm install`, no localhost.

## Branches

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production. Protected. Only merged PRs. | Production Vercel URL |
| `develop` | Staging. Free to push. | Preview Vercel URL |
| `feature/*` | Individual features. | Preview Vercel URL |

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add inspector QR scanner`
- `fix: correct queue rotation on month rollover`
- `chore: upgrade Next.js to 15.5.8`
- `docs: update ADR-003`
- `test: add coverage for virtualCards`
- `refactor: extract sync client into own module`

## What CI Checks

Every push runs:

1. **`npm run typecheck`** — TypeScript must compile with zero errors
2. **`npm run lint`** — ESLint must pass with zero warnings
3. **`npm test`** — Vitest unit tests must all pass
4. **`npm run build`** — Next.js production build must succeed

If any fails, the deployment is blocked. The maintainer will see a red ❌ on GitHub with a link to the failing step.

## The Testing Policy

**Tests are written by the engineer, not the maintainer.** The maintainer never runs `npm test`. Tests exist as a safety net that runs in CI.

When a bug is found in production:
1. Maintainer reports the bug
2. Engineer writes a failing test that reproduces it
3. Engineer fixes the code
4. Test now passes
5. Deploy proceeds
6. The same bug can never silently return

## Environment Variables

Never commit `.env.local` or any file containing secrets.

Secrets are set in:
- **Vercel Dashboard** → Project → Settings → Environment Variables
- **GitHub** → Settings → Secrets and variables → Actions (for CI-only secrets)

See `.env.example` for the full list of required variables.

## Database Migrations

Database migrations live in `drizzle/` and are applied via `drizzle-kit`.

**Migrations are not run automatically on deploy.** They are applied manually by the engineer via:
- Supabase SQL editor (preferred for review), or
- `npm run db:migrate` (once a local DB is available)

## Rollback Procedure

If a production deploy is broken:

1. **Immediate:** Vercel Dashboard → Deployments → Previous → "Promote to Production"
2. **Then:** `git revert <bad-commit>` and push
3. **Then:** Investigate the root cause, add a regression test

## Who To Ask

- **Product / domain questions:** Product Owner (NRTC contact)
- **Engineering questions:** Lead Engineer (AI)
- **Deployment issues:** Vercel dashboard
- **Database issues:** Supabase dashboard
