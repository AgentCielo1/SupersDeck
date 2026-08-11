#!/usr/bin/env node
// =============================================================================
//  verify-guards.mjs — automated "prove the gate can fail"
// =============================================================================
//  WHY THIS EXISTS
//
//  On 2026-08-09 THREE separate tests in this suite passed while the invariant
//  they claimed to protect was broken:
//
//    1. StaffBrain's fail-closed tenancy test asserted `status: 503` — but
//       authenticate() also throws 503 for "auth backend unavailable", so it
//       passed with the guard deleted.
//    2. LiftLog's tenant-scoping test scanned an 8-line window, which bled into
//       the NEXT function; a `withOrg(` there made an unscoped query look scoped.
//    3. The SupersDeck tenant migration left a row org-less; only staging caught it.
//
//  A green suite is not evidence. The only evidence a test protects something is
//  that it FAILS when that something is removed. This runner automates that:
//  it applies a deliberate mutation, asserts the named test goes red, and
//  restores the file. If the test still passes, the guard is decorative and CI
//  fails.
//
//  USAGE
//    node ci/verify-guards.mjs                 # uses ci/guards.json
//    node ci/verify-guards.mjs path/to/x.json
//
//  MANIFEST SHAPE (ci/guards.json)
//    {
//      "testCommand": "npm test --silent",
//      "guards": [
//        {
//          "name": "human-readable invariant",
//          "file": "src/lib/hpd.ts",
//          "find": "exact substring present in the file",
//          "replace": "the broken version",
//          "expect": "substring that must appear in the failing test output"
//        }
//      ]
//    }
//
//  Guarantees: every file is restored in a finally block, including on SIGINT.
// =============================================================================
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const manifestPath = resolve(process.argv[2] ?? "ci/guards.json");
if (!existsSync(manifestPath)) {
  console.error(`✖ No guard manifest at ${manifestPath}`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const testCommand = manifest.testCommand ?? "npm test --silent";
const guards = manifest.guards ?? [];

if (guards.length === 0) {
  console.error("✖ Manifest declares no guards. An empty manifest proves nothing.");
  process.exit(1);
}

/** Run the suite. Returns { passed, output }. */
function runTests() {
  try {
    const output = execSync(testCommand, { encoding: "utf8", stdio: "pipe" });
    return { passed: true, output };
  } catch (e) {
    return { passed: false, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const originals = new Map();
function restoreAll() {
  for (const [file, content] of originals) writeFileSync(file, content);
  originals.clear();
}
process.on("SIGINT", () => { restoreAll(); process.exit(130); });
process.on("uncaughtException", (e) => { restoreAll(); throw e; });

let failures = 0;

try {
  // 0. Baseline: the suite must be green before we can trust a red.
  process.stdout.write("● baseline suite … ");
  const base = runTests();
  if (!base.passed) {
    console.log("FAIL");
    console.error("\n✖ The suite is already failing. Fix that before verifying guards.\n");
    console.error(base.output.slice(-2000));
    process.exit(1);
  }
  console.log("green\n");

  for (const g of guards) {
    const file = resolve(g.file);
    process.stdout.write(`● ${g.name}\n    mutating ${g.file} … `);

    if (!existsSync(file)) {
      console.log(`✖ file not found`);
      failures++;
      continue;
    }
    const original = readFileSync(file, "utf8");
    if (!original.includes(g.find)) {
      console.log(`✖ anchor not found — the guard moved, manifest is stale`);
      console.log(`      looking for: ${JSON.stringify(g.find.slice(0, 70))}`);
      failures++;
      continue;
    }

    originals.set(file, original);
    writeFileSync(file, original.replace(g.find, g.replace));

    const mutated = runTests();
    writeFileSync(file, original);
    originals.delete(file);

    if (mutated.passed) {
      console.log("✖ SUITE STILL GREEN");
      console.log(`      The invariant was broken and no test noticed.`);
      console.log(`      This guard is decorative. Fix the test, not this runner.`);
      failures++;
      continue;
    }

    if (g.expect && !mutated.output.includes(g.expect)) {
      console.log("✖ failed, but for the WRONG REASON");
      console.log(`      expected output to contain: ${JSON.stringify(g.expect)}`);
      console.log(`      (a test can go red incidentally — that is not proof)`);
      failures++;
      continue;
    }

    console.log("✔ test correctly went red");
  }
} finally {
  restoreAll();
}

console.log("");
if (failures > 0) {
  console.error(`✖ ${failures} of ${guards.length} guard(s) are not actually protecting anything.`);
  process.exit(1);
}
console.log(`✔ all ${guards.length} guard(s) verified — each one fails when its invariant is broken.`);
