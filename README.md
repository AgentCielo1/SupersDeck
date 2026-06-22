# BoroDesk

Cross-platform (web + installable PWA) building-ops app built for residential
building superintendents. Designed around the day-1 reality of someone walking
into a portfolio of NYC HPD-regulated multifamily buildings with no system in
place: every recurring inspection, filing, and certification a NYC super needs
to track is seeded in; vendor categories cover every trade a super calls; and
tenant work-order intake works via a public QR-code link.

## What's in milestone 1

- **Dashboard** with at-a-glance stats: open work orders, emergencies, HPD
  risk, overdue compliance, things due in the next 30 days.
- **Compliance** view: 40+ recurring NYC items (HPD/DOB/FDNY/DEP/DOHMH/HUD)
  pre-loaded with statute, agency, vendor type required, deadline, and
  consequence-if-missed. Filtered by status and grouped by category.
- **Work orders**: list, detail, and an internal "new work order" form. Public
  tenant intake at `/intake/<building-id>` for QR codes posted in lobbies.
- **Buildings**: per-building profile with PACT/RAD, Section 8, sprinkler,
  cooling-tower, oil-heat flags that gate which compliance items apply.
- **Vendor directory**: every trade categorized — plumbing, electrical, fire
  safety, HVAC, elevator, facade, pest, environmental, etc., with
  subcategories. Plus a list of real city licensee lookups (DOB, FDNY, DEP,
  EPA, NYS DOL) so the super finds verified, licensed vendors without anyone
  fabricating data.
- **My vendors**: empty on day 1, populates as the super adds vendors they
  actually use.
- **Heat & hot water log**: scaffolded for daily heat-season entries (Oct 1 –
  May 31, 68°F day / 62°F night, 120°F hot water).
- **Certifications**: tracks FDNY Certificates of Fitness, EPA RRP, OSHA-30
  for the super and staff, with a recommended-cert list for NYC residential.

## Running it (≈3 minutes)

You'll need [Node.js](https://nodejs.org/) 18.17+ installed.

```bash
cd supersdeck
npm install
npm run dev
```

Open <http://localhost:3000> in your browser. No database, no env vars, no
Supabase account needed for phase 1 — everything reads from bundled seed data.

For mobile preview on a real phone: with `npm run dev` running, find your
Mac's local IP (`ipconfig getifaddr en0`) and open
`http://<that-ip>:3000` on your phone connected to the same Wi-Fi.

## Project layout

```
supersdeck/
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── public/
│   └── manifest.json          # PWA manifest
├── supabase/
│   └── schema.sql             # phase 2 — run in Supabase SQL editor when ready
└── src/
    ├── app/
    │   ├── layout.tsx          # root layout with sidebar nav
    │   ├── page.tsx            # dashboard
    │   ├── compliance/         # compliance command center
    │   ├── buildings/          # building profiles + units
    │   ├── work-orders/        # list, detail, new
    │   ├── vendors/            # my vendors + directory
    │   ├── heat-log/           # heat-season log
    │   ├── certifications/     # FDNY / EPA / OSHA tracker
    │   ├── intake/[buildingCode]/  # PUBLIC tenant intake (QR target)
    │   └── globals.css
    ├── components/             # Sidebar, StatCard, PageHeader, ComplianceRow,
    │                           # WorkOrderCard, EmptyState
    ├── data/
    │   ├── compliance-templates.ts   # the 40+ NYC compliance items
    │   ├── vendor-categories.ts      # trades + city licensee sources
    │   └── sample-data.ts            # buildings, units, work orders, etc.
    ├── lib/
    │   ├── db.ts               # phase-1 data access (seed); swap to Supabase later
    │   ├── compliance.ts       # generator + due-date helpers
    │   └── format.ts           # date/string helpers
    └── types/
        └── index.ts            # shared TypeScript types
```

## Phase 2 — wire up Supabase

When you're ready to persist data:

1. Create a free Supabase project at <https://supabase.com>.
2. In the SQL editor, run `supabase/schema.sql`.
3. Copy `.env.example` → `.env.local` and fill in your project URL + anon key.
4. Replace the read-from-seed implementations in `src/lib/db.ts` with calls to
   `@supabase/supabase-js`. Page/component code does not change — types are
   identical.
5. Optional: add Supabase Auth (email magic-link) and turn on Row Level
   Security on every table.

## Phase 3 — what comes next

- **Heat sensors**: poll cheap WiFi temperature sensors (Govee, Aqara) via
  cloud APIs; auto-write `heat_logs`. Generates HPD-compliant printable
  monthly log from the resulting time series.
- **HPD violation auto-pull**: daily fetch from NYC Open Data
  (`socrata/wvxf-dwi5` HPD violations dataset) to surface new violations the
  morning after the inspector visits.
- **SMS notifications** (Twilio): tenant gets an SMS when the super marks
  their work order as in-progress, vendor-scheduled, or resolved.
- **Multi-tenant + auth**: invite porters, handymen, and the management
  company to read-only or update-only views.
- **Native push** (after PWA is dialed in): wrap with Capacitor if you want
  iOS / Android push without rewriting the app.

## Honest data notes

- **Compliance items** are seeded from real, citable NYC code — Admin Code,
  Local Laws, FDNY/DEP/DOHMH/HUD rules. The statute string on each item is
  accurate as of the build date. Verify against the current code before you
  rely on it operationally; rules change.
- **Vendor categories** are exhaustive for typical NYC residential needs.
- **Vendor records** are intentionally empty out of the box. Use the linked
  city licensee lookups to find verified vendors — this app does not fabricate
  business names, phone numbers, or license details.
- **Sample buildings and units** are placeholders for demo. Replace with your
  real buildings via the buildings page (phase 2 will add a CSV importer).

## License

Add a license before sharing. MIT is a friendly default.
