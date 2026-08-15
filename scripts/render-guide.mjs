#!/usr/bin/env node
// =============================================================================
//  render-guide.mjs — turn the verified recipes into the document people read
// =============================================================================
//  docs/guide.json is the single source. It produces three things:
//
//    docs/GUIDE.md   this — the written guide, for a person starting from zero
//    the drift check every route and anchor below is verified against the app
//    the in-app tour  (next) — same steps, shown in place
//
//  One source, three surfaces. A step corrected here is corrected everywhere,
//  which is the only way this stays true across sixteen apps.
//
//  Written for someone who knows the building and not the software. No feature
//  tours, no module names — each section is a thing you came here to do.
// =============================================================================
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const guide = JSON.parse(readFileSync(resolve(ROOT, "docs/guide.json"), "utf8"));
const OUT = resolve(ROOT, "docs/GUIDE.md");

const ROLE_PLAIN = {
  admin: "Admin", super: "Super", manager: "Manager", porter: "Porter",
};
const who = (roles) => (roles ?? []).map((r) => ROLE_PLAIN[r] ?? r).join(", ");

const L = [
  "<!-- GENERATED from docs/guide.json by scripts/render-guide.mjs — edit the JSON, not this file -->",
  "",
  `# ${guide.app} — how to use it`,
  "",
  guide.audience,
  "",
  "Each section below is a task, not a feature. Find the thing you are trying to",
  "do and follow the steps. You do not need to read this in order, and you do not",
  "need to read all of it.",
  "",
  "Every step in this guide is checked automatically against the running app, so",
  "if a screen here does not match what you see, that is a bug worth reporting —",
  "not something you are doing wrong.",
  "",
  "## What you can do",
  "",
  "| task | who can do it |",
  "|---|---|",
  ...guide.tasks.map((t) => `| [${t.title}](#${t.id}) | ${who(t.who)} |`),
  "",
];

for (const t of guide.tasks) {
  L.push(`## ${t.title}`, "", `<a id="${t.id}"></a>`, "");
  L.push(`**Who:** ${who(t.who)}`, "");
  L.push(t.why, "");
  L.push("**Steps**", "");
  t.steps.forEach((s, i) => {
    L.push(`${i + 1}. ${s.do}`);
    L.push(`   *Screen:* \`${s.route}\`${s.as === "signed-out" ? " (before you sign in)" : ""}`);
  });
  L.push("");
}

L.push("---", "",
  "**Permissions.** What you can reach depends on your role. If a screen in this",
  "guide is not there for you, your role does not include it — ask an Admin. The",
  "full breakdown of who can do what is in [REFERENCE.md](REFERENCE.md), which is",
  "generated from the app's own code.",
  "");

writeFileSync(OUT, L.join("\n"));
console.log(`  ✔ wrote docs/GUIDE.md — ${guide.tasks.length} tasks, ${guide.tasks.reduce((n, t) => n + t.steps.length, 0)} steps`);
