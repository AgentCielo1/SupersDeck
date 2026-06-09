# Supabase setup (≈5 minutes)

Phase 2 swaps SupersDeck from bundled-seed mode to a real Postgres database
hosted on Supabase. You'll do four things: create the project, run the
schema, run the seed, paste credentials into `.env.local`. After that, every
page in the app reads and writes live data.

---

## 1. Create a Supabase project

1. Go to <https://supabase.com> and sign in (GitHub login is fastest).
2. Click **New project**.
3. Name: `supersdeck-prod` (or whatever you like). Pick a strong database
   password and save it in a password manager — you won't need it day-to-day
   but losing it means a hard reset.
4. Region: pick the closest to you (e.g. **East US (Virginia)** for NYC).
5. Plan: the free tier is fine until you have multiple buildings of real
   traffic. Free includes 500 MB DB + 1 GB file storage + 50,000 monthly
   active users.
6. Click **Create new project** and wait ~30 seconds for provisioning.

---

## 2. Run the schema

1. In the Supabase dashboard, left sidebar: **SQL Editor**.
2. Click **New query**.
3. Open `supabase/schema.sql` from this repo, copy the whole file, paste in.
4. Click **Run** (or ⌘/Ctrl-Enter). Should report "Success. No rows
   returned." within a second.

You can verify by opening **Table Editor** in the left sidebar — you'll see
`buildings`, `units`, `compliance_templates`, `vendors`, etc., all empty.

---

## 3. Run the seed

1. SQL Editor → **New query**.
2. Open `supabase/seed.sql` from this repo, copy the whole file, paste in.
3. Click **Run**.

This loads:

- 40 compliance templates (HPD/DOB/FDNY/DEP/DOHMH/HUD/EPA/OSHA)
- 68 vendor categories (top-level + subcategories)
- 12 official city licensee-lookup sources
- 3 buildings — Building 1 (62-27 108th St), Building 2 (108-53 62nd Dr),
  Building 3 (110-01 62nd Dr)
- 432 units (12 floors × 12 lines × 3 buildings)
- 4 sample work orders so the dashboard isn't empty on first load

Re-running `seed.sql` is safe — every insert is `ON CONFLICT DO NOTHING`,
unit generation uses the `(building_id, label)` unique constraint, and
overlays use `UPDATE` by id. So if you tweak the seed and re-run, you won't
get duplicates.

---

## 3a. Disable Row Level Security (dev mode)

**This step is easy to miss and will cost you an hour if you do.** Supabase
enables RLS by default on new tables. With RLS on and no policies attached,
the `anon` role gets blocked from reading anything — which makes the whole
app look empty even though the rows are sitting in Postgres.

For phase 1-3 (single-super, no auth) just disable RLS. SQL Editor → **New
query** → paste the contents of `supabase/disable-rls-for-dev.sql` → Run.

Verify it worked with a quick curl from your supersdeck folder:

```bash
ANON=$(grep ANON_KEY .env.local | cut -d= -f2-)
curl -s "https://YOUR-PROJECT-REF.supabase.co/rest/v1/buildings?select=name" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```

Should print `[{"name":"Building 1"},{"name":"Building 2"},{"name":"Building 3"}]`.
If it prints `[]`, the RLS is still on; re-run the disable script.

When auth lands in phase 4, re-enable RLS with proper per-role policies. See
the comment block at the top of `disable-rls-for-dev.sql` for an example.

---

## 4. Wire up `.env.local`

1. Supabase dashboard, left sidebar: **Project settings → API**.
2. Copy these three values:

   - **Project URL** (looks like `https://xxxxxxx.supabase.co`)
   - **anon public** key (the long JWT under "Project API keys")
   - **service_role** key (also under "Project API keys" — *keep this
     secret*, it bypasses RLS)

3. In the repo root, copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

4. Fill it in:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...                    # long string
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...                        # also long
   ```

5. Restart the dev server (Ctrl-C then `npm run dev` again).

The app should now load the same data — but coming from Postgres, not the
bundled TS files. Confirm by editing a row in the Supabase Table Editor and
refreshing the page.

---

## 5. Enable auth (phase 4 — needed before sharing with anyone)

Until you do this step, the app is wide open: anyone with the URL can read
and write everything. The moment you want to share with a porter, the
management company, or anyone else, do this.

**5a. Enable email auth in Supabase.** Dashboard → **Authentication →
Providers**. Email should already be on by default. Confirm **"Enable email
provider"** is checked. Leave "Confirm email" on (recommended) — the magic
link itself acts as confirmation.

**5b. Configure redirect URLs.** Dashboard → **Authentication → URL
Configuration**. Set:
- **Site URL**: `http://localhost:3000` (or wherever you'll host it later —
  this is the base URL the magic-link email links to).
- **Redirect URLs**: add `http://localhost:3000/auth/callback`. You can add
  multiple, one per environment (preview deploys, production, etc.).

If you skip this step, the magic-link email lands somewhere wrong and the
session never sets. Spend the 30 seconds.

**5c. Run the auth-setup SQL.** SQL Editor → New query → paste contents of
`supabase/auth-setup.sql` → Run. This creates the `profiles` table, the
auto-create-profile trigger, and **re-enables RLS** on every app table with
policies that allow any authenticated user to do everything. (That replaces
the `disable-rls-for-dev.sql` step from phase 1; per-role policies will land
in phase 5.)

**5d. Restart the dev server** (`Ctrl-C`, `rm -rf .next`, `npm run dev`) so
the new middleware picks up. Open `http://localhost:3003` — you should now
get redirected to `/login`.

**5e. Send yourself a magic link.** Enter your email, click "Send sign-in
link". Check your inbox (and spam folder — Supabase's free tier sometimes
gets flagged). Click the link; you'll land back on the dashboard, signed in.
The first user to sign up automatically gets the **admin** role.

**5f. Invite the rest of the team.** For each person:
1. Dashboard → **Authentication → Users → Invite user** → enter their email.
   Supabase sends them a magic link.
2. Once they sign in once, a row appears in the `profiles` table with
   default role `super`. Change it from the **Table Editor** if needed:
   `porter` for handymen/cleaners, `manager` for the property-management
   company, `read_only` for owners, `admin` for you.

Phase 5 will turn the role column into actual per-role permissions
(porter → can only update WO status, manager → no delete, etc.). Today
every authenticated user can do everything via the broad RLS policy.

---

## How the fallback works

`src/lib/supabase.ts` checks for `NEXT_PUBLIC_SUPABASE_URL` +
`NEXT_PUBLIC_SUPABASE_ANON_KEY` at startup. If either is missing, the data
layer (`src/lib/db.ts`) silently uses the bundled seed instead. So:

- **No env set** → seed mode, app works for demos & onboarding contributors.
- **Both set** → live Supabase mode, all reads and writes hit Postgres.

This means you never break anyone's local setup by forgetting to share an
env var, and you can flip back to seed mode by commenting out the env vars
to debug.

---

## Using the CSV importer (phase 2 only)

Once Supabase is wired:

1. Go to **Buildings** → pick a building → **Import units (CSV)**.
2. Download the sample template (linked at the top of the page).
3. Edit the CSV in Excel / Numbers / Google Sheets. Required column:
   `label`. Optional: `line, floor, bedrooms, bathrooms, occupied,
   tenant_name, tenant_phone, is_section8, has_children_under_6,
   has_children_under_11, notes`.
4. Upload, review the preview (warnings highlighted), click **Import**.
5. Re-uploading the same file is safe — units are upserted by
   `(building_id, label)`.

---

## Using the QR poster generator

1. Go to **Buildings** → pick a building → **QR poster (lobby)**.
2. Optionally fill in your name + phone so they print on the poster.
3. Pick English / Español / both.
4. Click **Print poster** (or Cmd/Ctrl-P) → print to PDF or directly to
   your printer.
5. Tape it up in the lobby. Tenants scan with their phone camera → land on
   the `/intake/<building-id>` page → submit a ticket → you see it in
   **Work orders** instantly.

---

## Phase 3 hooks (later)

When you're ready:

- **Auth** → enable Supabase Auth (email magic link is one toggle), then
  uncomment the `enable row level security` lines at the bottom of
  `schema.sql` and add policies (one per role: super, porter, manager,
  read-only).
- **HPD violation auto-pull** → add a daily cron (Supabase Edge Function or
  Vercel Cron) that hits the NYC Open Data API
  (`https://data.cityofnewyork.us/resource/wvxf-dwi5.json`) and writes new
  rows to a `violations` table.
- **Tenant-signature on completion** → when the handyman marks a work order
  complete, capture a touchscreen signature from the tenant as proof of
  acknowledgment. No SMS needed (intentional: zero per-message cost, and
  the handyman is on site anyway).

Each of these is a separate task; tell me which to tackle when you're
ready.

Note: SMS notifications are intentionally NOT on the roadmap — they have
per-message costs (Twilio ~$0.008/SMS) and the existing in-person
completion-signature flow gives the tenant their confirmation without one.
