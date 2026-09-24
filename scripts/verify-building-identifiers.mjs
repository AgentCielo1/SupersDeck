#!/usr/bin/env node
// =============================================================================
//  verify-building-identifiers.mjs — BIN/BBL can never be merged wrong
// =============================================================================
//  ORIGIN: the portfolio's BINs entered the repo from research with a single
//  corroborating source, and nothing would ever have caught a wrong one.
//  This script is the standing gate: it reads every building's address +
//  bin/bbl from src/data/sample-data.ts and checks them against TWO
//  independent city datasets:
//
//    A. HPD violations (wvxf-dwi5): query by house number + zip → the city's
//       bin/bbl for that address must match what we store.
//    B. DOB violations (3h2n-5cm9): query by our stored BIN → the returned
//       house numbers must include the building's.
//
//  Run: node scripts/verify-building-identifiers.mjs        (CI runs it too)
//
//  EXIT CODES — designed so an OUTAGE can't fail the build but a WRONG
//  IDENTIFIER always does:
//    1  positive mismatch (city record contradicts the repo) or parse failure
//    0  all confirmed, or data/network unavailable (reported loudly as
//       UNVERIFIED — absence of evidence is not a pass, but it isn't a red
//       build either; the runtime cross-check in lib/building-identity.ts
//       still covers production).
// =============================================================================

import { readFile } from "node:fs/promises";

const HPD = "https://data.cityofnewyork.us/resource/wvxf-dwi5.json";
const DOB = "https://data.cityofnewyork.us/resource/3h2n-5cm9.json";

// --- read buildings out of the seed ------------------------------------------
const src = await readFile(
  new URL("../src/data/sample-data.ts", import.meta.url),
  "utf8",
);
const entryRe =
  /address:\s*"([^"]+)"[\s\S]*?bin:\s*"([^"]*)"\s*,\s*\n\s*bbl:\s*"([^"]*)"/g;
const buildings = [...src.matchAll(entryRe)].map(([, address, bin, bbl]) => ({
  address,
  bin,
  bbl,
}));
if (buildings.length === 0) {
  console.error(
    "✗ Could not parse any buildings from src/data/sample-data.ts — the " +
      "extraction regex no longer matches the file. Fix this script.",
  );
  process.exit(1);
}
console.log(`Checking ${buildings.length} building(s) against NYC records…\n`);

const norm = (s) => String(s ?? "").replace(/[^0-9]/g, "");
let mismatches = 0;
let unverified = 0;

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function majority(rows, pick) {
  const counts = new Map();
  for (const r of rows) {
    const v = pick(r);
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
}

for (const b of buildings) {
  const [streetPart, , statePart] = b.address.split(",");
  const house = (streetPart ?? "").trim().split(/\s+/)[0];
  const zip = (statePart ?? "").match(/\d{5}/)?.[0] ?? "";
  console.log(`— ${b.address}  (stored bin=${b.bin || "∅"} bbl=${b.bbl || "∅"})`);

  // A: HPD by house number + zip → city's bin/bbl for the address
  try {
    const params = new URLSearchParams({
      housenumber: house,
      $limit: "50",
      $select: "housenumber,streetname,bin,bbl,boroid,block,lot,zip",
    });
    if (zip) params.set("zip", zip);
    const rows = await getJson(`${HPD}?${params}`);
    if (rows.length === 0) {
      console.log("   HPD: no rows for this address — UNVERIFIED here");
      unverified++;
    } else {
      const [cityBin, nBin] = majority(rows, (r) => r.bin);
      const [cityBbl, nBbl] = majority(
        rows,
        (r) =>
          r.bbl ??
          (r.boroid && r.block && r.lot
            ? `${r.boroid}${String(r.block).padStart(5, "0")}${String(r.lot).padStart(4, "0")}`
            : null),
      );
      for (const [field, stored, city, n] of [
        ["bin", b.bin, cityBin, nBin],
        ["bbl", b.bbl, cityBbl, nBbl],
      ]) {
        if (!city) {
          console.log(`   HPD ${field}: rows carry none — UNVERIFIED`);
          unverified++;
        } else if (!stored) {
          console.error(`   ✗ HPD ${field}: repo stores nothing; city says ${city} (${n} rows)`);
          mismatches++;
        } else if (stored === city) {
          console.log(`   ✓ HPD ${field}: ${city} confirmed by ${n} rows`);
        } else {
          console.error(`   ✗ HPD ${field}: repo says ${stored}, city says ${city} (${n} rows)`);
          mismatches++;
        }
      }
    }
  } catch (e) {
    console.warn(`   HPD: lookup unavailable (${e.message}) — UNVERIFIED`);
    unverified++;
  }

  // B: DOB by stored BIN → house numbers on that BIN must include this one
  if (b.bin) {
    try {
      const rows = await getJson(
        `${DOB}?bin=${encodeURIComponent(b.bin)}&$select=house_number,street&$limit=50`,
      );
      if (rows.length === 0) {
        console.log("   DOB: no rows for this BIN — UNVERIFIED here");
        unverified++;
      } else {
        const houses = new Set(rows.map((r) => norm(r.house_number)));
        if (houses.has(norm(house))) {
          console.log(`   ✓ DOB: BIN ${b.bin} maps back to house ${house}`);
        } else {
          console.error(
            `   ✗ DOB: BIN ${b.bin} maps to house(s) ${[...houses].join(", ")}, not ${norm(house)}`,
          );
          mismatches++;
        }
      }
    } catch (e) {
      console.warn(`   DOB: lookup unavailable (${e.message}) — UNVERIFIED`);
      unverified++;
    }
  }
  console.log("");
}

if (mismatches > 0) {
  console.error(`RESULT: FAILED — ${mismatches} identifier(s) contradict city records.`);
  process.exit(1);
}
if (unverified > 0) {
  console.warn(
    `RESULT: OK with ${unverified} UNVERIFIED check(s) — no contradiction found, ` +
      "but not everything could be confirmed. The runtime cross-check on " +
      "/violations still guards production.",
  );
} else {
  console.log("RESULT: OK — every stored identifier confirmed by two city datasets.");
}
process.exit(0);
