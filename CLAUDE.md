# SupersDeck

Cross-platform (web + installable PWA) building-ops app for residential
building superintendents managing NYC HPD-regulated multifamily buildings.
Next.js 14 + Prisma + Supabase; tenant work-order intake via public QR link.

## Session scope guard

This repository is the SupersDeck project **only**. Cloud sessions sometimes
open with this repo attached by default even when the task has nothing to do
with SupersDeck (the session picker pre-fills the last-used repository).

If the task you were given is unrelated to SupersDeck:

- Do **not** create branches, commit, or push work to this repository.
- Tell the user this session is attached to SupersDeck, ask which repository
  (if any) the work belongs in, and attach that repo instead.
- Keep unrelated deliverables (research, documents, artifacts) out of this
  repo's history entirely.

## Reference-data provenance rule

Any real-world identifier hardcoded into this repo (BIN, BBL, HPD ID,
addresses used as lookup keys, dataset IDs) must be verifiable, not just
researched once:

- Buildings' BIN/BBL are gated by `scripts/verify-building-identifiers.mjs`
  (runs in CI; queries HPD + DOB and fails on contradiction) and
  cross-checked at runtime on every sync (`src/lib/building-identity.ts`,
  surfaced on `/violations`).
- When adding a new identifier of any kind, either extend that verifier to
  cover it or cite two independent sources in the commit message. A value
  only one source ever confirmed and nothing re-checks is a latent bug.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — `prisma generate` + `next build`
- `npm run lint` / `npm run typecheck` — lint and type-check
- `npm test` — unit tests (Vitest, config in `tests/unit/`)
- `npm run check:buckets` / `npm run verify:guards:access` — CI parity and
  access-control guard checks in `ci/`
