# BoroDesk multi-tenant — deploy & onboarding runbook

The `feat/borodesk` branch turns the single-org app into a multi-tenant SaaS
(`organizations` + `org_id` on every tenant table + org-scoped RLS). The schema
change and the app change **must ship together** — the public service-role
insert paths set `org_id` from the building, and `org_id` is `NOT NULL`.

## 1. Coordinated production deploy (do these close together)

1. **Merge `feat/borodesk` → `main`** (triggers the Vercel prod build) — but DON'T
   let traffic hit it before step 2. Easiest: run the migration first against the
   same DB, since it's additive/idempotent and backfills existing rows to
   `org-default`.
2. **Run `supabase/migration-organizations.sql`** in the Supabase SQL editor
   (project `izfzcvusozmzotjjmmkn`). Idempotent; backfills all existing data to
   `org-default`.
3. **Run `supabase/migration-contractors.sql`** if not already applied (it now
   also includes `alter table contractor_visits add column if not exists phone`).
4. **Env:** confirm `CRON_SECRET` (cron auth), `RESEND_API_KEY` (email), and the
   VAPID keys (push) are set in Vercel.

> Order safety: the migration backfills `org-default` before setting `NOT NULL`,
> so existing rows are fine. New rows from authed users auto-stamp via the
> `set_org_id` trigger; public intake / contractor sign-in set `org_id` from the
> building explicitly (service-role bypasses the trigger).

## 2. Post-deploy smoke test

- **Tenant intake** (anonymous): open `/intake/bldg-1` → building name loads
  (verifies the public `GET /api/buildings/[id]` still works under RLS — it uses
  the service role on purpose).
- **Contractor sign-in gate**: open `/sign-in/bldg-1` → RapidFix = blocked,
  Apex = cleared. Confirms the gate + `org_id` insert path.
- **Dashboard**: log in → `/contractors`, `/work-orders`, `/buildings` show your
  org's data only (reads go through `src/lib/db.ts` = cookie client + RLS).

## 3. Onboard a customer org (e.g. Prestige)

1. Run `supabase/onboard-org.sql` with their name/slug to create the org row.
2. Supabase → Authentication → Users → **Invite user** with metadata:
   `{ "role": "admin", "full_name": "...", "org_id": "org-prestige" }`.
3. They log in → `handle_new_user` stamps their profile → they see an empty,
   isolated workspace and create their own buildings/vendors (auto-stamped).
4. Verify isolation with the count queries at the bottom of `onboard-org.sql`.

## 4. Known follow-ups (not blockers)

- In-app org provisioning UI + a platform-admin role (today onboarding is
  SQL + Supabase invite — fine for the first few customers).
- An in-app org-name indicator / switcher in the sidebar.
- `work_order_updates` timeline inserts rely on the `set_org_id` trigger (authed)
  — correct, but add explicit `org_id` if any of those paths ever go service-role.
