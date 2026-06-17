# @workorder/kit

Backend-agnostic work-order building blocks shared across the app suite
(SupersDeck, Forest Hills Intake, …). One source of truth for the work-order
**contract**, the **print sheet**, the multilingual **speak-or-type intake**,
**translate-to-English**, **voice capture**, and the **QR poster**.

## Hard rules
- Imports **only** `react` + `qrcode` (peer deps). **Never** `@prisma/client`,
  `@supabase/*`, `next/*`, or any app's `@/lib/*`.
- `title` / `description` on the contract are **always English**; the resident's
  original language lives under `original`.
- Each app keeps a thin **adapter** mapping its DB rows ↔ `NormalizedWorkOrder`.
  Adapters live in the app, not here.

## How it's consumed
Vendored into each app via `git subtree` at `src/vendor/workorder-kit`, imported
through the `@workorder/kit/*` tsconfig path alias. To sync after changes:

```
git subtree pull --prefix src/vendor/workorder-kit <kit-repo> main --squash
```

Graduates to a pnpm/Turborepo monorepo package once a 3rd app consumes it.

## Modules
- `contract.ts` — `NormalizedWorkOrder`, status/priority unions, `statusLabel`/`priorityLabel`.
- (incoming) `qr/`, `print/`, `intake/`, `translate/`, `voice/`.
