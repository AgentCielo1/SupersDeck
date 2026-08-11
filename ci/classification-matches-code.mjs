#!/usr/bin/env node
/**
 * The classification document must add up to what the code actually does.
 *
 * It drifted the first time it was edited: the profiles group was written as 4
 * when the code had 5, so the doc claimed 28 sites while the ratchet counted 29.
 * A document that disagrees with the code is worse than no document — it is read
 * as authoritative and it is wrong.
 *
 * Run: node ci/classification-matches-code.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../src", import.meta.url).pathname;
const DOC = new URL("../docs/SERVICE-ROLE-CLASSIFICATION.md", import.meta.url).pathname;

function walk(d) {
  return readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
}

let actual = 0;
for (const f of walk(ROOT)) {
  if (f.endsWith("/lib/supabase.ts") || f.endsWith("/lib/supabase-server.ts")) continue;
  actual += (readFileSync(f, "utf8").match(/\bgetServerSupabase\s*\(\s*\)/g) ?? []).length;
}

const md = readFileSync(DOC, "utf8");
const sections = md.split("## ");
const sum = (heading) => {
  const b = sections.find((x) => x.startsWith(heading));
  return b ? [...b.matchAll(/^\| (\d+) \|/gm)].reduce((a, m) => a + Number(m[1]), 0) : 0;
};
const documented = sum("KEEP") + sum("STILL OPEN");

console.log(`code: ${actual} service-role sites | doc: ${documented} (KEEP + STILL OPEN)`);
if (documented !== actual) {
  console.error(`\n✖ the classification document is out of date by ${Math.abs(actual - documented)} site(s).`);
  console.error(`  Update docs/SERVICE-ROLE-CLASSIFICATION.md so its tables sum to ${actual}.`);
  process.exit(1);
}
console.log("✔ the document matches the code");
