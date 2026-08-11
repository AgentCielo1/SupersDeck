#!/usr/bin/env node
// =============================================================================
//  perf-gate.mjs — fail the build on scale regressions
// =============================================================================
//  A green unit suite says nothing about behaviour at client scale. On
//  2026-08-09, seeding 100,000 units surfaced two HIGH defects in the most
//  reviewed app in the suite (master-build/SCALE-FINDINGS.md):
//
//    F1  `select * from work_orders order by reported_at desc` had no index.
//        At 80,000 rows Postgres switched to
//            Sort Method: external merge  Disk: 6272kB
//        — it ran out of work_mem and spilled the sort to disk. At 432 units it
//        sorts in memory and looks perfectly healthy.
//    F2  The same query had no LIMIT, materialising 12 MB into the Node process
//        on every page load.
//
//  This gate re-creates that scale and asserts the plans stay healthy. It is the
//  measurement from that day, turned into something that cannot regress.
//
//  Usage:  node ci/perf-gate.mjs --url "postgresql://..."
//  In CI:  a postgres service container; see .github/workflows/ci.yml
// =============================================================================
import pg from "pg";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const URL = arg("url", process.env.PERF_DATABASE_URL);
if (!URL) {
  console.error("Missing --url (or PERF_DATABASE_URL).");
  process.exit(1);
}
if (/supabase\.co/.test(URL) && !/localhost|127\.0\.0\.1/.test(URL)) {
  console.error("⛔ Refusing to run the perf gate against a hosted database.");
  process.exit(2);
}

// -----------------------------------------------------------------------------
//  Budgets. Each entry is a real query the app issues.
// -----------------------------------------------------------------------------
const BUDGETS = [
  {
    name: "work-orders listing (db.fetchWorkOrders)",
    sql: `select * from work_orders order by reported_at desc limit 500`,
    maxMs: 50,
    maxRows: 500,
    forbid: [/external merge/i, /Seq Scan on work_orders/i],
  },
  {
    name: "units listing (db.fetchUnits)",
    sql: `select * from units order by label limit 500`,
    maxMs: 50,
    maxRows: 500,
    forbid: [/external merge/i],
  },
  {
    name: "per-building work orders (building page)",
    sql: `select * from work_orders where building_id = 'syn-b-0'
          order by reported_at desc limit 100`,
    maxMs: 25,
    maxRows: 100,
    forbid: [/Seq Scan on work_orders/i, /external merge/i],
  },
  {
    name: "per-building units (building page)",
    sql: `select * from units where building_id = 'syn-b-0' order by label`,
    maxMs: 25,
    maxRows: 200,
    forbid: [/Seq Scan on units/i],
  },
];

const client = new pg.Client(URL);
await client.connect();

const rows = (await client.query(`select count(*)::int n from units`)).rows[0].n;
const wos = (await client.query(`select count(*)::int n from work_orders`)).rows[0].n;
console.log(`\nperf gate — ${rows.toLocaleString()} units / ${wos.toLocaleString()} work orders\n`);

if (rows < 10000) {
  console.error(`⛔ Only ${rows} units seeded. This gate is meaningless below 10,000 —`);
  console.error(`   the defects it protects against are invisible at demo scale.`);
  console.error(`   Run scripts/seed-scale.mjs first.`);
  process.exit(1);
}

let failures = 0;

for (const b of BUDGETS) {
  const res = await client.query(`explain (analyze, buffers) ${b.sql}`);
  const plan = res.rows.map((r) => r["QUERY PLAN"]).join("\n");
  const ms = Number(/Execution Time: ([\d.]+) ms/.exec(plan)?.[1] ?? NaN);
  const actualRows = Number(/actual .*?rows=(\d+)/.exec(plan)?.[1] ?? NaN);

  const problems = [];
  for (const rx of b.forbid ?? []) {
    if (rx.test(plan)) problems.push(`plan contains ${rx}`);
  }
  if (Number.isFinite(ms) && ms > b.maxMs) problems.push(`${ms}ms > budget ${b.maxMs}ms`);
  if (Number.isFinite(actualRows) && actualRows > b.maxRows) {
    problems.push(`returned ${actualRows} rows > cap ${b.maxRows}`);
  }

  if (problems.length) {
    console.log(`✖ ${b.name}`);
    problems.forEach((p) => console.log(`    ${p}`));
    console.log(plan.split("\n").slice(0, 6).map((l) => `    │ ${l}`).join("\n"));
    failures++;
  } else {
    console.log(`✔ ${b.name}  (${ms}ms, ${actualRows} rows)`);
  }
}

await client.end();
console.log("");
if (failures) {
  console.error(`✖ ${failures} of ${BUDGETS.length} queries regressed at scale.`);
  console.error(`  See master-build/SCALE-FINDINGS.md for what these budgets protect.`);
  process.exit(1);
}
console.log(`✔ all ${BUDGETS.length} queries within budget at ${rows.toLocaleString()} units.`);
