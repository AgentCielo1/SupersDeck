#!/usr/bin/env node
// =============================================================================
//  seed-scale.mjs — seed SupersDeck at REAL CLIENT SCALE
// =============================================================================
//  Why this exists: the demo seed is 3 buildings / 432 units (Forest Hills).
//  Every app is therefore only exercised at ~1/100th of the scale it is being
//  SOLD at. Bugs that only appear at scale — unpaginated selects, N+1 queries,
//  missing indexes, timeouts, UI that renders 50k rows — are invisible until a
//  real client hits them.
//
//  This seeds MULTIPLE ORGS by construction, so tenant-isolation regressions
//  surface immediately rather than at the first second customer.
//
//  ⚠️ SYNTHETIC DATA ONLY. Never point this at a database holding real tenant
//     PII, and never clone real records to reach volume. Names/phones/emails
//     are generated. The guard below refuses to run against the known
//     production hosts.
//
//  Usage:
//    node scripts/seed-scale.mjs --url "postgresql://..." --units 20000 --orgs 3
//    node scripts/seed-scale.mjs --url "..." --units 100000 --orgs 5 --wipe
//
//  Defaults: 20,000 units across 2 orgs.
// =============================================================================
import pg from "pg";
import { randomUUID } from "node:crypto";

// ── args ─────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]?.startsWith("--") ? true : arr[i + 1]]);
    return acc;
  }, []),
);
const TARGET_UNITS = Number(args.units ?? 20000);
const ORG_COUNT = Number(args.orgs ?? 2);
const WIPE = Boolean(args.wipe);
const URL = args.url ?? process.env.SEED_DATABASE_URL;

if (!URL) {
  console.error("Missing --url (or SEED_DATABASE_URL). Refusing to guess a target.");
  process.exit(1);
}

// ── production guard ─────────────────────────────────────────────────────────
// Fail closed: this writes tens of thousands of synthetic rows. Pointing it at a
// live database would corrupt real client data.
const FORBIDDEN = [
  "db.izfzcvusozmzotjjmmkn.supabase.co", // SupersDeck production
  "db.uccqmfkxqosdbnczryzc.supabase.co", // shared BoroDesk production
];
for (const host of FORBIDDEN) {
  if (URL.includes(host)) {
    console.error(
      `\n⛔ REFUSING TO RUN.\n   Target contains a known PRODUCTION host: ${host}\n` +
        `   This seeder writes synthetic data at volume. Point it at a local or\n` +
        `   throwaway database instead.\n`,
    );
    process.exit(2);
  }
}
if (/\bprod\b|production/i.test(URL)) {
  console.error("⛔ REFUSING TO RUN: target URL looks like production.");
  process.exit(2);
}

// ── deterministic synthetic generators (no faker dependency) ─────────────────
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const FIRST = ["Maria", "James", "Aisha", "Luis", "Chen", "Fatima", "Andre", "Nina", "Omar", "Rosa", "Dmitri", "Grace"];
const LAST = ["Gomez", "Okafor", "Nguyen", "Patel", "Rivera", "Kim", "Haddad", "Silva", "Novak", "Bell", "Duarte", "Osei"];
const STREETS = ["Elm Street", "Grand Concourse", "Ocean Parkway", "Kings Highway", "Northern Boulevard", "Bay Ridge Avenue"];
const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
const CATEGORIES = ["plumbing", "electrical", "heat", "hot_water", "appliance", "door_lock", "pest", "elevator", "general"];
const PRIORITIES = ["low", "normal", "high", "emergency"];
const STATUSES = ["new", "open", "in_progress", "resolved", "closed"];

const person = () => `${pick(FIRST)} ${pick(LAST)}`;
const phone = () => `917${String(int(1000000, 9999999))}`;
const email = (n) => `${n.toLowerCase().replace(/\s+/g, ".")}.${int(100, 999)}@example.invalid`;

// ── main ─────────────────────────────────────────────────────────────────────
const client = new pg.Client(URL);
await client.connect();
const t0 = Date.now();

console.log(`\nSeeding ${TARGET_UNITS.toLocaleString()} units across ${ORG_COUNT} orgs…`);
console.log(`target: ${URL.replace(/:[^:@]*@/, ":***@")}\n`);

if (WIPE) {
  console.log("wiping existing synthetic data…");
  await client.query(`
    delete from work_orders where reporter_name like 'SYN:%';
    delete from units where id like 'syn-%';
    delete from buildings where id like 'syn-%';
  `);
}

const UNITS_PER_BUILDING = 120; // realistic mid-size NYC multifamily
const buildingsTotal = Math.ceil(TARGET_UNITS / UNITS_PER_BUILDING);
const buildingsPerOrg = Math.ceil(buildingsTotal / ORG_COUNT);

const orgIds = [];
for (let o = 0; o < ORG_COUNT; o++) {
  // Org 0 is the existing seed org so the current tenant keeps working.
  const id = o === 0 ? "00000000-0000-0000-0000-000000000001" : randomUUID();
  orgIds.push(id);
  await client.query(
    `insert into orgs (id, name, subscription_status) values ($1, $2, 'active')
     on conflict (id) do nothing`,
    [id, o === 0 ? "SupersDeck" : `Synthetic Mgmt Co ${o}`],
  );
}

let unitsMade = 0;
let wosMade = 0;

for (let b = 0; b < buildingsTotal; b++) {
  const org = orgIds[Math.min(Math.floor(b / buildingsPerOrg), ORG_COUNT - 1)];
  const bid = `syn-b-${b}`;
  const unitCount = Math.min(UNITS_PER_BUILDING, TARGET_UNITS - unitsMade);
  if (unitCount <= 0) break;

  await client.query(
    `insert into buildings (id, name, address, borough, num_units, num_floors,
       has_section8, is_pact_rad, has_oil_heat, has_cooling_tower, has_sprinkler,
       has_known_lead, org_id)
     values ($1,$2,$3,$4,$5,$6,$7,false,$8,false,$9,$10,$11)
     on conflict (id) do nothing`,
    [bid, `Synthetic Building ${b}`, `${int(1, 999)}-${int(10, 99)} ${pick(STREETS)}`,
     pick(BOROUGHS), unitCount, Math.ceil(unitCount / 8),
     rnd() > 0.6, rnd() > 0.7, rnd() > 0.5, rnd() > 0.8, org],
  );

  // Bulk-insert units in one statement per building (fast + realistic).
  const uVals = [];
  const uParams = [];
  for (let u = 0; u < unitCount; u++) {
    const uid = `syn-u-${b}-${u}`;
    const i = uVals.length * 3;
    uVals.push(`($${i + 1},$${i + 2},$${i + 3})`);
    uParams.push(uid, bid, `${Math.floor(u / 8) + 1}${String.fromCharCode(65 + (u % 8))}`);
  }
  await client.query(
    `insert into units (id, building_id, label) values ${uVals.join(",")}
     on conflict (id) do nothing`,
    uParams,
  );
  unitsMade += unitCount;

  // Work orders: ~0.8 per unit per year is realistic; seed a slice of that.
  const woCount = Math.round(unitCount * 0.8);
  const wVals = [];
  const wParams = [];
  for (let w = 0; w < woCount; w++) {
    const name = person();
    const i = wVals.length * 10;
    wVals.push(`($${i+1},$${i+2},$${i+3},$${i+4},$${i+5},$${i+6},$${i+7},$${i+8},$${i+9},$${i+10})`);
    wParams.push(
      `syn-wo-${b}-${w}`,
      `SYN-${b}-${String(w).padStart(5, "0")}`,
      bid,
      `syn-u-${b}-${int(0, unitCount - 1)}`,
      pick(["Leak under sink", "No heat", "Door lock broken", "Outlet sparking", "Roaches reported", "Elevator stuck"]),
      pick(CATEGORIES),
      pick(STATUSES),
      pick(PRIORITIES),
      `SYN:${name}`,
      new Date(Date.now() - int(0, 365) * 86400000).toISOString(),
    );
  }
  if (wVals.length) {
    await client.query(
      `insert into work_orders (id, ticket_number, building_id, unit_id, title,
         category, status, priority, reporter_name, reported_at)
       values ${wVals.join(",")} on conflict (id) do nothing`,
      wParams,
    );
    wosMade += woCount;
  }

  if (b % 25 === 0 || b === buildingsTotal - 1) {
    process.stdout.write(
      `\r  buildings ${b + 1}/${buildingsTotal}  units ${unitsMade.toLocaleString()}  work orders ${wosMade.toLocaleString()}   `,
    );
  }
}

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n\n✅ seeded in ${secs}s`);
console.log(`   orgs:        ${ORG_COUNT}`);
console.log(`   buildings:   ${buildingsTotal.toLocaleString()}`);
console.log(`   units:       ${unitsMade.toLocaleString()}`);
console.log(`   work orders: ${wosMade.toLocaleString()}`);
console.log(`\nSynthetic rows are identifiable: buildings/units ids start "syn-", reporters "SYN:".`);
await client.end();
