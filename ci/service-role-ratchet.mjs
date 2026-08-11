#!/usr/bin/env node
/**
 * Ratchet: calls that use the SERVICE ROLE key may only go DOWN.
 *
 * getServerSupabase() returns a client built with SUPABASE_SERVICE_ROLE_KEY,
 * which bypasses Row-Level Security completely. Every such call is protected by
 * nothing but the `.eq("org_id", …)` written beside it. The user-scoped client
 * (createSupabaseServerClient) already exists and already works — this pins the
 * count so the conversion cannot quietly reverse.
 *
 * Some routes legitimately need it: the public QR sign-in, the cron jobs, the
 * billing webhook. Those are the reason the budget is not 0.
 *
 * Run: node ci/service-role-ratchet.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BUDGET = Number(process.env.SERVICE_ROLE_BUDGET ?? 40);
const ROOT = new URL("../src", import.meta.url).pathname;
const CALL = /\bgetServerSupabase\s*\(\s*\)/g;

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
}

const sites = [];
for (const file of walk(ROOT)) {
  if (file.endsWith("/lib/supabase.ts") || file.endsWith("/lib/supabase-server.ts")) continue;
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(CALL)) {
    sites.push(`${file.replace(ROOT, "src")}:${src.slice(0, m.index).split("\n").length}`);
  }
}

console.log(`Service-role call sites: ${sites.length} (budget ${BUDGET})`);
if (sites.length > BUDGET) {
  console.error(`\n✖ ${sites.length - BUDGET} NEW service-role call(s) — these bypass RLS.`);
  console.error(`  Use createSupabaseServerClient() where a user is signed in.\n`);
  for (const s of sites.slice(0, 20)) console.error(`    ${s}`);
  process.exit(1);
}
if (sites.length < BUDGET) {
  console.log(`✔ ${BUDGET - sites.length} fewer than budgeted — lower SERVICE_ROLE_BUDGET to ${sites.length} to lock it in.`);
} else {
  console.log("✔ at budget");
}
