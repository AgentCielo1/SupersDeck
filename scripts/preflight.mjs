#!/usr/bin/env node
/**
 * PREFLIGHT — the build gate (Next.js + Supabase variant of the Production Standard).
 * NO deploy ships without this passing.  Run: npm run preflight
 *
 * Enforces correctness (typecheck + lint + tests) AND resilience + security
 * invariants. Add a new guard here every time we learn a new failure mode
 * (see ~/Developer/eng-standards/PRODUCTION_STANDARD.md — the Mistake Ledger).
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'src');
const fails = [];
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => {
  console.log(`  \x1b[31m✗\x1b[0m ${m}`);
  fails.push(m);
};
const read = (p) => {
  try {
    return readFileSync(resolve(ROOT, p), 'utf8');
  } catch {
    return '';
  }
};
const pkg = JSON.parse(read('package.json') || '{}');
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

// Walk src collecting files (skip node_modules/.next).
function walk(dir, out = []) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e === 'node_modules' || e === '.next' || e === '.git') continue;
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e)) out.push(p);
  }
  return out;
}
const files = walk(SRC);
const grepFiles = (re) => files.filter((f) => re.test(readFileSync(f, 'utf8')));
const body = (f) => readFileSync(f, 'utf8');
const short = (f) => f.replace(ROOT + '/', '');
const info = (m) => console.log(`  \x1b[33m•\x1b[0m ${m}`);

console.log('SupersDeck preflight — correctness + resilience + security gate\n' + '='.repeat(62));

// ── 1. Correctness ──────────────────────────────────────────────────────────
function stage(label, cmd) {
  process.stdout.write(`\n▶ ${label}\n`);
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
    ok(label);
  } catch {
    bad(`${label} FAILED`);
  }
}
stage('typecheck (tsc --noEmit)', 'npx tsc --noEmit');
stage('lint (next lint)', 'npx next lint --max-warnings=0');
if (pkg.scripts?.test) stage('tests', 'npm test --silent');

// ── 2. Resilience invariants ────────────────────────────────────────────────
console.log('\n▶ resilience guards');
existsSync(resolve(SRC, 'app/error.tsx')) && existsSync(resolve(SRC, 'app/global-error.tsx'))
  ? ok('top-level error.tsx + global-error.tsx present')
  : bad('missing app/error.tsx or app/global-error.tsx (white-screen risk)');
existsSync(resolve(SRC, 'app/not-found.tsx')) ? ok('not-found.tsx present') : bad('missing app/not-found.tsx');
deps['@sentry/nextjs'] && existsSync(resolve(ROOT, 'sentry.server.config.ts'))
  ? ok('Sentry crash reporting wired')
  : bad('Sentry not wired (no field-crash visibility)');

// ── 3. Security invariants ──────────────────────────────────────────────────
console.log('\n▶ security guards');

// a) The service-role / any secret key must never be reachable from the client:
//    not via NEXT_PUBLIC_, and not referenced inside a 'use client' file.
const publicSecret = grepFiles(/process\.env\.NEXT_PUBLIC_[A-Z0-9_]*(SERVICE_ROLE|SECRET|PRIVATE)/);
const clientSecret = files.filter((f) => {
  const s = readFileSync(f, 'utf8');
  return /^['"]use client['"]/m.test(s) && /(SERVICE_ROLE|SUPABASE_SERVICE|_SECRET_KEY|PRIVATE_KEY)/.test(s);
});
publicSecret.length === 0 && clientSecret.length === 0
  ? ok('no secret/service-role key exposed to the client bundle')
  : bad(`SECRET reachable from client: ${[...publicSecret, ...clientSecret].map((f) => f.replace(ROOT + '/', '')).join(', ')}`);

// b) Input validation library present AND actually used at every WRITE boundary.
//    The gated surface is precisely the routes that read an untrusted request
//    BODY (.json/.formData/.text) plus every server action — that is where
//    unvalidated input reaches an insert/update. GET routes that only read
//    searchParams flow into parameterized PostgREST filters (lower risk) and are
//    reported as advisory, not gated. Requiring *every* route to "validate" (the
//    old denominator) diluted the metric with read-only routes.
const hasValidator = !!(deps.zod || deps.valibot || deps.yup);
hasValidator
  ? ok(`input-validation library present (${deps.zod ? 'zod' : deps.valibot ? 'valibot' : 'yup'})`)
  : bad('no input-validation library (zod/valibot) — inputs reach the DB unvalidated');

const apiRoutes = files.filter((f) => /\/app\/api\/.*route\.(ts|js)x?$/.test(f));
// Reads the REQUEST body — either the raw `request.json/formData/text(...)` (anchored
// to the request param so it does NOT match NextResponse.json(...) or an external
// fetch's res.json()), OR our `parseJson(request, schema)` helper, which wraps
// request.json() internally. Counting the helper is essential: once a route adopts
// parseJson the raw call disappears, so without this the validated routes would stop
// looking like body boundaries and the metric would silently collapse to a false pass.
const readsBody = (s) => /\b(request|req)\.(json|formData|text)\s*\(/.test(s) || /\bparseJson\s*\(/.test(s);
// A boundary "validates" if untrusted input flows through a schema before use.
// Precise tokens (parseJson helper / safeParse / z.object|array|enum) — not a bare
// parse( which would false-match JSON.parse / Date.parse.
const validates = (s) => /\b(parseJson|safeParse|z\.(object|array|enum|coerce|string|number)|valibot|yup)\b/.test(s);
const serverActions = files.filter((f) => /^['"]use server['"]/m.test(body(f)));
const writeBoundaries = [...new Set([...apiRoutes.filter((f) => readsBody(body(f))), ...serverActions])];
const unvalidated = writeBoundaries.filter((f) => !validates(body(f)));
if (writeBoundaries.length) {
  const n = writeBoundaries.length;
  unvalidated.length === 0
    ? ok(`inputs validated at all ${n}/${n} body/action write boundaries`)
    : bad(
        `${unvalidated.length}/${n} write boundaries take UNVALIDATED input: ` +
          unvalidated.slice(0, 8).map(short).join(', ') +
          (unvalidated.length > 8 ? ` …+${unvalidated.length - 8}` : ''),
      );
}
// Advisory: GET routes reading searchParams without a schema (lower risk, not gated).
const searchParamOnly = apiRoutes.filter((f) => /searchParams/.test(body(f)) && !readsBody(body(f)) && !validates(body(f)));
if (searchParamOnly.length) {
  info(`advisory: ${searchParamOnly.length} GET route(s) read searchParams without schema validation (parameterized filters — lower risk): ${searchParamOnly.slice(0, 6).map(short).join(', ')}${searchParamOnly.length > 6 ? ' …' : ''}`);
}

// c) Rate limiting on public/auth/expensive endpoints.
deps['@upstash/ratelimit'] || grepFiles(/ratelimit|rateLimit|rate-limit/i).length > 0
  ? ok('rate-limiting present')
  : bad('no rate-limiting (auth/public/AI endpoints are unthrottled — abuse + cost risk)');

// d) Security headers configured in next.config.
/async\s+headers\s*\(/.test(read('next.config.mjs') + read('next.config.js') + read('next.config.ts'))
  ? ok('security headers configured in next.config')
  : bad('no security headers() in next.config');

// e) Auth middleware present (gates protected routes server-side).
existsSync(resolve(SRC, 'middleware.ts')) || existsSync(resolve(ROOT, 'middleware.ts'))
  ? ok('middleware present (server-side route gating)')
  : bad('no middleware.ts — protected routes not gated at the edge');

// ── 4. Platform Standard conformance (STANDARD.md) ───────────────────────────
//  Two tiers: HARDENED-NOW invariants gate the build; MIGRATION-PENDING items
//  (the Prisma-7 / Upstash / Next-16 target stack) are tracked as advisories so a
//  live-PII app stays shippable while it migrates onto the standard, not before.
console.log('\n▶ platform-standard conformance (~/Developer/cielo-platform/STANDARD.md)');
// Hardened-now: Zod-validated env module must exist and actually parse process.env.
existsSync(resolve(SRC, 'env.ts')) && /safeParse\s*\(\s*process\.env/.test(read('src/env.ts'))
  ? ok('src/env.ts validates process.env with Zod (fail-fast on bad env)')
  : bad('no Zod-validated src/env.ts (env misconfig surfaces as deep runtime errors)');
// Hardened-now: an app-layer authz gate (requireRole) must back the RLS model.
existsSync(resolve(SRC, 'lib/authz.ts')) && /requireRole/.test(read('src/lib/authz.ts'))
  ? ok('src/lib/authz.ts requireRole present (app-layer authz backstops RLS)')
  : bad('no app-layer authz gate (RLS-only — service-role routes bypass it)');
// Migration-pending advisories — the target stack, not yet a hard gate here.
const pending = [];
(deps.prisma || deps['@prisma/client']) ? ok('Prisma present') : pending.push('Prisma 7 scoped-DB layer (src/lib/db/) — still on Supabase PostgREST');
deps['@upstash/ratelimit'] ? ok('Upstash ratelimit present') : pending.push('Upstash ratelimit (currently in-memory src/lib/ratelimit.ts — resets per-instance, not distributed)');
existsSync(resolve(SRC, 'proxy.ts')) || existsSync(resolve(ROOT, 'proxy.ts')) ? ok('proxy.ts (Next 16) present') : pending.push('middleware.ts→proxy.ts rename (on Next 16 upgrade)');
existsSync(resolve(ROOT, '.github/workflows')) ? ok('.github/workflows CI present') : pending.push('GitHub Actions CI (run this gate on every push)');
for (const p of pending) info(`migration-pending: ${p}`);

// ── Verdict ─────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(62));
if (fails.length) {
  console.log(`\x1b[31mPREFLIGHT FAILED — ${fails.length} issue(s). Do NOT deploy until fixed:\x1b[0m`);
  for (const f of fails) console.log(`   • ${f}`);
  process.exit(1);
}
console.log('\x1b[32mPREFLIGHT PASSED — safe to deploy.\x1b[0m');
