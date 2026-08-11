# Service-role call sites — classification

`getServerSupabase()` builds a client with `SUPABASE_SERVICE_ROLE_KEY`, which
bypasses Row-Level Security entirely. `createSupabaseServerClient()` uses the
anon key plus the request's auth cookie, so RLS sees the caller.

66 sites used the service role. 37 were converted across two batches. **29 remain**, and every one
is classified below with the evidence for keeping it. The ratchet
(`ci/service-role-ratchet.mjs`) pins that number; it may only fall.

The question for each site is not "could this be converted" but "is there a
signed-in user at this point". Where there isn't, the service role is the only
thing that works, and the protection lives elsewhere — a signed token, a rate
limit, a cron secret, a webhook signature.

## Authoritative source of truth

`src/middleware.ts` decides what is reachable without a session. Anything in
`PUBLIC_PATHS` or `PUBLIC_API_BY_METHOD` — or under `/api/cron/` — is served to
callers with no cookie, so those handlers CANNOT use the user-scoped client.

```
PUBLIC_PATHS          /login /auth /intake /track /sign-in /privacy /terms
PUBLIC_API_BY_METHOD  POST /api/work-orders        (tenant intake, anonymous)
                      POST /api/intake/photo       (tenant photo, anonymous)
                      GET  /api/buildings/*        (QR posters + /intake)
                      GET|POST /api/public/sign-in/*  (contractor QR)
                      POST /api/billing/webhook    (Stripe signature)
/api/cron/*           always public; authenticated by CRON_SECRET
```

## KEEP — no user exists at this point (28 sites)

| sites | path | why |
|---|---|---|
| 1 | `POST /api/work-orders` | tenant intake from `/intake`, anonymous. Gated by a durable per-IP rate limit and the signed `x-intake-token`. **Measured:** user-scoped → 404 "Unknown building"; service role → 201 |
| 1 | `GET /api/buildings/[id]` | QR posters and `/intake` read building info with no session. **Measured:** user-scoped → 404; service role → 200. PATCH/DELETE in the same file stay user-scoped |
| 1 | `POST /api/intake/photo` | tenant attaches a photo to their ticket, anonymous |
| 2 | `/api/public/sign-in/[buildingCode]` | contractor self-sign-in from the door QR; never signed in |
| 1 | `POST /api/billing/webhook` | Stripe; identity is the request signature |
| 7 | `/api/cron/*` + `/api/violations/refresh` | scheduled; authenticated by `CRON_SECRET`, no cookie |
| 1 | `app/track/[ticketNumber]/page.tsx` | `/track` is public — a tenant follows their ticket without an account |
| 2 | `lib/push.ts` | delivery fan-out: reads OTHER users' push subscriptions to notify them |
| 2 | `lib/alerts.ts` | alert fan-out across an org's staff |
| 4 | `lib/cloud/store.ts` | cloud-drive storage layer, called from background paths |
| 1 | `lib/wo-archive.ts` | archive sweep, no acting user |
| 5 | `app/api/profiles/*`, `app/api/profile/consent` | **see the note below** — a product question, not a mechanical one |

## CONVERTED IN BATCH 2 — behind scenario coverage (11 sites)

Each of these has a step in `sim/apps/supersdeck-routes.mjs` asserting it still
serves real rows, written and passing before the change.

| sites | path | coverage |
|---|---|---|
| 2 | `/api/compliance-documents` | GET asserted against owner ground truth |
| 3 | `/api/alerts`, `+/acknowledge`, `+/resolve` | behind the login gate |
| 2 | `/api/push/subscribe` | the user's own subscription |
| 4 | `contractors`, `contractors/logbook`, `contractors/qr`, `certifications` | each asserts a known row appears in the HTML |

A blinded server component still returns 200 and renders an empty list, so the
page checks assert content, not status. Falsified by dropping the certifications
read policies: `BLINDED: HTTP 200 but "Candiany Rodriguez" missing`.

## STILL OPEN — deliberately (1 site)

| sites | path | why |
|---|---|---|
| 1 | `POST /api/billing/create-checkout` | calls Stripe; there is no way to exercise it in the simulator, and converting a payment path with no coverage is what this document exists to prevent |

`/api/profiles/*` and `/api/profile/consent` (5 sites) are deliberately ambiguous and sits in KEEP for now:
an admin editing staff needs to see rows RLS may hide from them, so converting
it requires deciding what a manager may see, which is a product question.

## What this pass cost, and why it was worth running

Converting on the "does it call requireRole()" signal alone put two PUBLIC
routes into the first batch. Both broke anonymous flows and both are now
reverted with the measurement recorded inline.

The first attempt to prove that breakage was itself wrong: `scripts/dev-sim.sh`
defaulted `SUPABASE_SERVICE_ROLE_KEY` to the anon key, so service-role routes
were ALSO running under RLS and failing identically. That made the revert look
justified for the wrong reason. The script now refuses to start unless the key
actually decodes to `role=service_role`, and the conclusion was re-established
with the privilege levels genuinely different.
