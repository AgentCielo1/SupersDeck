#!/usr/bin/env node
// =============================================================================
//  check-bucket-parity.mjs — the SQL and the code must name the SAME buckets
// =============================================================================
//  WHY THIS EXISTS
//
//  supabase/storage-setup.sql created and hardened a bucket called `wo-photos`.
//  The application had moved to `work-orders`. For months the hardening applied
//  cleanly to an empty bucket nothing used, while the live bucket ran on
//  whatever Supabase's defaults were. Nothing failed: uploads worked, the SQL
//  ran without error, and the app never mentioned the discrepancy.
//
//  That is the point. This class of defect is INVISIBLE FROM INSIDE THE APP —
//  no test that exercises the product can catch it, because both halves work
//  perfectly, just on different objects. With only two people using SupersDeck,
//  nobody was ever going to stumble over it either. The only thing that catches
//  it is a check that reads both files and compares the strings.
//
//  THE RULE
//    Every bucket named in src/lib/buckets.ts must have storage policies in the
//    active SQL, and every bucket the active SQL creates policies for must be
//    named in src/lib/buckets.ts. Superseded SQL files are exempt (they are
//    historical), and they must say so in their header.
//
//  USAGE:  node ci/check-bucket-parity.mjs
// =============================================================================
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(process.cwd());
const BUCKETS_TS = join(ROOT, "src/lib/buckets.ts");
const SQL_DIR = join(ROOT, "supabase");

/** A file that declares itself superseded is history, not policy. */
function isSuperseded(sql) {
  return /SUPERSEDED\s*—?\s*DO NOT RUN/i.test(sql.slice(0, 2000));
}

/** Strip `--` line comments and /* *\/ blocks. Without this, a migration that
 *  merely DISCUSSES an old bucket in its header ("the policies read
 *  bucket_id = 'wo-photos'") is read as still creating policies for it — the
 *  check's first run failed exactly that way on its own documentation. */
function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((line) => {
      // Naive but sufficient here: these files have no `--` inside string
      // literals. Assert that, rather than assuming it silently.
      const i = line.indexOf("--");
      return i === -1 ? line : line.slice(0, i);
    })
    .join("\n");
}

// ---- 1. What the CODE says -------------------------------------------------
const codeSrc = readFileSync(BUCKETS_TS, "utf8");
const codeBuckets = new Set(
  [...codeSrc.matchAll(/export const [A-Z_]+_BUCKET\s*=\s*"([^"]+)"/g)].map((m) => m[1]),
);

if (codeBuckets.size === 0) {
  console.error(`✖ No bucket constants found in ${BUCKETS_TS}.`);
  console.error("  Either the file moved or the naming convention changed —");
  console.error("  a check that finds nothing must fail, not pass vacuously.");
  process.exit(1);
}

// ---- 2. What the ACTIVE SQL says -------------------------------------------
const sqlBuckets = new Map(); // bucket -> file that mentions it
const sqlFiles = readdirSync(SQL_DIR).filter((f) => f.endsWith(".sql"));
let activeFiles = 0;

for (const f of sqlFiles) {
  const raw = readFileSync(join(SQL_DIR, f), "utf8");
  if (isSuperseded(raw)) continue;
  activeFiles++;
  const sql = stripSqlComments(raw);
  // Buckets appear as storage.buckets inserts and as bucket_id predicates.
  const found = [
    ...sql.matchAll(/bucket_id\s*=\s*'([^']+)'/g),
    ...sql.matchAll(/into storage\.buckets[\s\S]{0,120}?values\s*\(\s*'([^']+)'/g),
  ].map((m) => m[1]);
  for (const b of found) if (!sqlBuckets.has(b)) sqlBuckets.set(b, f);
}

if (activeFiles === 0) {
  console.error("✖ Every SQL file claims to be superseded. Nothing is being checked.");
  process.exit(1);
}

// ---- 3. Compare ------------------------------------------------------------
const problems = [];

for (const b of codeBuckets) {
  if (!sqlBuckets.has(b)) {
    problems.push(
      `Bucket "${b}" is used by the app (src/lib/buckets.ts) but NO active SQL ` +
        `file creates policies for it. Its objects are governed by whatever ` +
        `Supabase defaults to — which is exactly how wo-photos happened.`,
    );
  }
}

for (const [b, file] of sqlBuckets) {
  if (!codeBuckets.has(b)) {
    problems.push(
      `Bucket "${b}" is hardened in supabase/${file} but nothing in the app ` +
        `uses it. Either the app moved on and that SQL now protects an empty ` +
        `bucket, or a constant was renamed. Mark the file superseded or fix it.`,
    );
  }
}

if (problems.length > 0) {
  console.error("✖ Storage bucket parity FAILED\n");
  for (const p of problems) console.error(`  • ${p}\n`);
  console.error(`  code (src/lib/buckets.ts): ${[...codeBuckets].join(", ")}`);
  console.error(`  active SQL:                ${[...sqlBuckets.keys()].join(", ")}`);
  process.exit(1);
}

console.log(
  `✔ bucket parity — code and active SQL agree on: ${[...codeBuckets].sort().join(", ")}`,
);
