#!/usr/bin/env node
// =============================================================================
//  check-guide-drift.mjs — does the guide still describe this app?
// =============================================================================
//  A user guide is a set of claims about software that changes weekly. Nothing
//  normally checks those claims, so guides rot silently and the reader — who
//  trusts the guide more than their own judgement — concludes they are the
//  problem. That is the failure mode this exists to remove.
//
//  Two levels, deliberately separated by cost:
//
//    --static   every route named in a recipe exists in the generated
//               reference, and every role named is a role the app has.
//               No app, no database, no stack. Runs in a second, anywhere.
//
//    --live     every `expect` string actually renders on its page, fetched
//               from a running app as a signed-in user. Needs the local-stack
//               harness, so it runs there rather than in the daily job.
//
//  Static catches the common rot (a route renamed or removed). Live catches the
//  rot static cannot see: the page still exists, but the thing the guide tells
//  you to look for is gone.
// =============================================================================
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const GUIDE = resolve(ROOT, "docs/guide.json");

const LIVE = process.argv.includes("--live");
const APP_URL = (process.env.SIM_APP_URL ?? "").replace(/\/$/, "");

const guide = JSON.parse(readFileSync(GUIDE, "utf8"));
const tasks = guide.tasks ?? [];
if (!tasks.length) {
  console.error("✖ docs/guide.json declares no tasks — an empty guide passes every check and teaches nobody anything");
  process.exit(1);
}

// The reference is regenerated here rather than read off disk, so a stale
// REFERENCE.md cannot make a broken route look valid.
const ref = JSON.parse(execFileSync("node", [resolve(HERE, "generate-guide-reference.mjs"), "--json"], { encoding: "utf8" }));
const knownRoles = new Set(Object.values(ref.roles).flat());
const knownPages = new Set(ref.pages);

// A dynamic segment matches any concrete value: /buildings/[id]/edit covers
// /buildings/123/edit. Compared as patterns rather than strings so a recipe
// pointing at a real record is not reported as a missing route.
const pagePatterns = ref.pages.map((p) => ({
  page: p,
  re: new RegExp("^" + p.replace(/\[[^\]]+\]/g, "[^/]+").replace(/\//g, "\\/") + "$"),
}));
const routeExists = (r) => knownPages.has(r) || pagePatterns.some((p) => p.re.test(r));

const problems = [];
let steps = 0;

for (const t of tasks) {
  if (!t.title || !t.why) problems.push({ task: t.id, kind: "INCOMPLETE", detail: "a task needs a title and a why" });
  for (const role of t.who ?? []) {
    if (!knownRoles.has(role)) {
      problems.push({ task: t.id, kind: "UNKNOWN ROLE", detail: `"${role}" is not a role this app has (${[...knownRoles].sort().join(", ")})` });
    }
  }
  for (const s of t.steps ?? []) {
    steps++;
    if (!routeExists(s.route)) {
      problems.push({ task: t.id, kind: "MISSING ROUTE", detail: `${s.route} — the guide sends the reader somewhere that does not exist` });
    }
    if (!s.expect) {
      problems.push({ task: t.id, kind: "NO ANCHOR", detail: `step "${s.do?.slice(0, 40)}" names nothing to look for, so nothing can verify it` });
    }
  }
}

// ── live: does the page actually say what the guide claims? ─────────────────
if (LIVE) {
  if (!APP_URL) {
    console.error("✖ --live needs SIM_APP_URL. Refusing to report a pass having checked nothing.");
    process.exit(1);
  }
  const cookie = process.env.SIM_COOKIE ?? "";
  if (!cookie) {
    console.error("✖ --live needs SIM_COOKIE (a signed-in session). Without it every page redirects to /login");
    console.error("  and each expectation fails for the wrong reason.");
    process.exit(1);
  }
  // HTML entities. "Log a heat & hot-water reading" in the source renders as
  // "heat &amp; hot-water", so a plain substring match failed against a page
  // that was displaying exactly what the guide promised. The first live run
  // reported that as a rotted guide — the checker was wrong, not the app.
  const plain = (html) => html
    .replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .toLowerCase();

  const seen = new Map();
  for (const t of tasks) {
    for (const s of t.steps ?? []) {
      if (!routeExists(s.route)) continue; // already reported
      // A step marked signed-out is fetched WITHOUT the session. /login
      // redirects a signed-in user to the dashboard, which is correct app
      // behaviour; checking it with a cookie reported that correctness as a
      // fault, which is how a checker teaches you to distrust a working app.
      const signedOut = s.as === "signed-out";
      const key = `${s.route}|${signedOut ? "out" : "in"}`;
      if (!seen.has(key)) {
        const res = await fetch(`${APP_URL}${s.route}`, {
          headers: signedOut ? {} : { cookie },
          redirect: "manual",
        });
        seen.set(key, { status: res.status, body: res.status === 200 ? await res.text() : "" });
      }
      const got = seen.get(key);
      const who = signedOut ? "a signed-out visitor" : "a signed-in user";
      if (got.status !== 200) {
        problems.push({ task: t.id, kind: "PAGE NOT SERVED", detail: `${s.route} answered HTTP ${got.status} to ${who}` });
      } else if (!plain(got.body).includes(plain(String(s.expect)))) {
        problems.push({ task: t.id, kind: "ANCHOR GONE", detail: `${s.route} no longer shows "${s.expect}" — the guide tells the reader to look for something that is not there` });
      }
    }
  }
}

for (const p of problems) console.log(`  ✖ ${p.kind.padEnd(16)} [${p.task}] ${p.detail}`);
console.log("");
console.log(`  ${tasks.length} task(s), ${steps} step(s) checked${LIVE ? " against the running app" : " (static: routes and roles only)"}.`);
if (!problems.length) console.log(`  ✔ the guide still describes this app.`);
else console.log(`  ⚠️  ${problems.length} claim(s) the app no longer supports.`);

process.exit(problems.length ? 1 : 0);
