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

// b) Input validation library present AND actually used in API routes / actions.
const hasValidator = !!(deps.zod || deps.valibot || deps.yup);
const boundaryFiles = files.filter((f) => /\/app\/api\/.*route\.(ts|js)x?$/.test(f) || /['"]use server['"]/.test(readFileSync(f, 'utf8')));
const validatedBoundaries = boundaryFiles.filter((f) => /\b(zod|z\.|safeParse|parse\(|valibot|yup)\b/.test(readFileSync(f, 'utf8')));
hasValidator
  ? ok(`input-validation library present (${deps.zod ? 'zod' : deps.valibot ? 'valibot' : 'yup'})`)
  : bad('no input-validation library (zod/valibot) — inputs reach the DB unvalidated');
if (boundaryFiles.length) {
  const ratio = validatedBoundaries.length / boundaryFiles.length;
  ratio >= 0.6
    ? ok(`inputs validated at ${validatedBoundaries.length}/${boundaryFiles.length} API/action boundaries`)
    : bad(`only ${validatedBoundaries.length}/${boundaryFiles.length} API/action boundaries validate input`);
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

// ── Verdict ─────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(62));
if (fails.length) {
  console.log(`\x1b[31mPREFLIGHT FAILED — ${fails.length} issue(s). Do NOT deploy until fixed:\x1b[0m`);
  for (const f of fails) console.log(`   • ${f}`);
  process.exit(1);
}
console.log('\x1b[32mPREFLIGHT PASSED — safe to deploy.\x1b[0m');
