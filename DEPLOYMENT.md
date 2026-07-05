# Deploying SupersDeck to Vercel

Why bother: while you run `npm run dev` on your laptop, only you can use the
app. Once it's deployed, Adam can use it from his phone, you can install the
PWA, your tenants can scan QR codes that point at real URLs, and the daily
HPD violation cron actually fires.

Time: ~30-45 minutes the first time. Mostly account creation and DNS.

---

## 1. Bump Next.js + install latest deps locally first

I bumped `package.json` to `next@14.2.33` (latest 14.x with security patches)
and added `resend` for the Class-C alert email.

```bash
cd supersdeck
npm install
rm -rf .next
npm run dev   # smoke test that nothing broke
```

Browse the app, click around. If something errors, fix locally — Vercel will
see the same problem.

---

## 2. Get the code into GitHub

If you don't already have it in git:

```bash
git init
echo "node_modules\n.next\n.env.local\n.env*.local" > .gitignore   # already shipped
git add .
git commit -m "Initial commit"
```

Then create a **new private repo** at <https://github.com/new>:
- Name: `supersdeck`
- Visibility: **Private** (matters — your env vars and seed data shouldn't
  be world-readable even though they're in .env.local which is gitignored,
  the repo itself shouldn't be open)
- **Don't** initialize with a README, .gitignore, or license

GitHub shows you the push commands after creation. They'll look like:

```bash
git remote add origin git@github.com:YOURUSERNAME/supersdeck.git
git branch -M main
git push -u origin main
```

If your machine isn't set up for SSH push, use HTTPS instead and GitHub will
walk you through a personal-access-token flow on first push.

---

## 3. Create a Vercel project

1. Sign up at <https://vercel.com> with the same GitHub account (easiest).
2. Dashboard → **Add New… → Project**.
3. **Import** the `supersdeck` repo from the list.
4. Vercel auto-detects Next.js. Leave Framework Preset / Root Directory /
   Build Command / Output Directory at their defaults.
5. **Don't deploy yet** — expand the **Environment Variables** section first.

---

## 4. Add environment variables

Paste these into the Environment Variables panel before the first deploy.
Get the Supabase values from your project (Settings → API on supersdeck-prod
/ izfz). For the Resend key, Resend dashboard → API Keys → Create.

| Name                              | Value                                                | Notes                                                                                  |
| --------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | `https://<your-project-ref>.supabase.co`              | Same as `.env.local`                                                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | (your anon key)                                       | Same as `.env.local`                                                                   |
| `SUPABASE_SERVICE_ROLE_KEY`       | (your service-role key)                              | **Secret.** Mark as such in Vercel's UI.                                               |
| `RESEND_API_KEY`                  | (key from Resend dashboard, `re_…`)                  | **Secret.** Used by the violations-alert cron.                                         |
| `RESEND_FROM_EMAIL`               | `SupersDeck <onboarding@resend.dev>` (or your domain) | Until you've verified a custom domain in Resend, use this. Only sends to your own email. |
| `CRON_SECRET`                     | a random 32-char string you generate                  | Prevents random people from triggering your cron. Generate with `openssl rand -hex 16`.|

Click **Deploy**. First build takes 2-3 minutes.

---

## 5. Update Supabase URL Configuration for the production URL

Once Vercel finishes deploying, you'll get a URL like
`https://supersdeck-abc123.vercel.app`. **Add this to Supabase** so magic
links and password resets work in production:

Supabase dashboard → Authentication → URL Configuration:

- **Site URL**: `https://supersdeck-abc123.vercel.app` (or your custom
  domain once you set one up)
- **Redirect URLs**: include
  `https://supersdeck-abc123.vercel.app/auth/callback`

Keep `http://localhost:3003` in the Redirect URLs list too so local dev still
works.

---

## 6. Verify the deployment

Open your Vercel URL in a browser. You should get redirected to `/login`.
Sign in with the password you set via `set-user-password.sql`. You should
land on the dashboard. Smoke-test a few things:

- Buildings page loads
- Compliance page loads
- Create a new work order → check that it appears in your dashboard
- Open `/track/<that-WO's-ticket-number>` in an incognito window → verify
  the public tenant page works
- People page → invite Adam (he'll need a password set via SQL until SMTP
  works with a verified domain)

---

## 7. Hook up a custom domain (optional, ~10 min)

If you own a domain (`supersdeck.app`, `mybuildings.com`, anything):

1. Vercel → your project → **Settings → Domains** → Add the domain.
2. Vercel shows you the DNS records to add. Add them in your registrar
   (Namecheap, Cloudflare, etc.). Propagation is usually < 5 minutes.
3. Update Supabase URL Configuration: Site URL = `https://yourdomain.com`,
   add `https://yourdomain.com/auth/callback` to Redirect URLs.
4. Verify your custom domain in Resend (Domains → Add) so the violation
   digest email can go from `noreply@yourdomain.com` and reach ANY admin,
   not just your Resend account owner.
5. Update `RESEND_FROM_EMAIL` env var in Vercel to your verified address.

---

## 8. The crons (automatic, no action needed)

`vercel.json` registers two crons:

- **`/api/violations/refresh`** — daily at 07:00 UTC. Pulls fresh HPD
  violations into the `violations` table.
- **`/api/cron/violations-alert`** — daily at 07:15 UTC. Diffs the last 24
  hours, emails admins if there's anything new (especially Class C).

Both require `CRON_SECRET`; Vercel automatically signs cron requests with
`Authorization: Bearer $CRON_SECRET` if you've set that env var.

To test the alert without waiting:

```bash
curl -X POST "https://yourdomain.com/api/cron/violations-alert" \
  -H "Authorization: Bearer $CRON_SECRET"
```

You should see a JSON response with `{"sent":true,…}` if there were new
violations, or `{"sent":false,"reason":"no new violations in last 24h"}`.

---

## Future redeploys

Every `git push` to `main` auto-deploys. Preview branches get their own URLs
automatically — useful for testing risky changes.
