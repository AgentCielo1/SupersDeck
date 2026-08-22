// The "what do I do today" screen — Phase B0 UI over the engine.

import tree from "./data/breaking.js";
import { todayKey, addDays } from "./engine/dates.js";
import { indexTree, STAGES, STAGE, familyProgress, workingPhase } from "./engine/graph.js";
import { QUALITY, stageUpSuggested } from "./engine/srs.js";
import { rollingWeek, firewall, freezesLeft, applyFreeze, repairYesterday } from "./engine/streak.js";
import { generateSession, completeSession, allowedSizes, SIZES } from "./engine/session.js";
import { loadState, saveState, newState, exportState, importState } from "./engine/store.js";

const $ = (sel) => document.querySelector(sel);
const idx = indexTree(tree);
const storage = window.localStorage;

let today = todayKey();
let state = loadState(today, storage);
let chosenSize = null;
let session = null;
// pending user input for this session
let pending = { reviews: new Map(), learned: new Set(), attrs: new Set(), stageUps: new Set(), blocks: new Set() };

const FAMILY_LABELS = {
  toprock: "Toprock", getdown: "Get-downs", footwork: "Footwork", freeze: "Freezes",
  power: "Power", trick: "Tricks", musicality: "Musicality", culture: "Culture", meta: "Battle craft",
};

const FIREWALL_COPY = {
  fresh: { cls: "ok", title: "Day one.", body: "The only goal this week: five sessions. The worst-day version counts fully." },
  normal: { cls: "ok", title: "System green.", body: "Show up, press play. Every session is a vote for the dancer." },
  mvs_required: { cls: "warn", title: "Missed yesterday — that's data, not a verdict.", body: "Today auto-downgrades to the 8-minute version. Never miss twice. You can also patch yesterday: completing today's session repairs it." },
  never_miss_twice: { cls: "warn", title: "Two or more days missed.", body: "One tap back in: today is MVS-only. If even that is too much, the 3-minute imagery rep counts — vividly rehearse your current move, eyes closed." },
  fresh_start: { cls: "alert", title: "A week off. The program bends — it doesn't break.", body: "No guilt screen. Fresh start Monday: the season resumes one node back, MVS-only for week one. Until then, any session you do is a bonus." },
  reentry: { cls: "alert", title: "Welcome back, dancer.", body: "You're a returning dancer, not a beginner and not a failure. Two-week re-entry: body-prep heavy, everything MVS-sized." },
};

function stageName(s) { return STAGES[s] ?? "untouched"; }

function nodeState(id) { return state.nodes[id] ?? {}; }

function render() {
  today = todayKey();
  const { fw, sizes } = allowedSizes(state, today);
  if (!chosenSize || !sizes.includes(chosenSize)) chosenSize = sizes.includes("normal") ? "normal" : sizes[0];
  session = generateSession(tree, state, chosenSize, today);
  const week = rollingWeek(state, today);
  const doneToday = state.sessions.some((s) => s.date === today);

  $("#season").textContent = session.season.offSeason
    ? `Season ${session.season.number} · Off-season week — light, playful, low-stakes`
    : `Season ${session.season.number} · Week ${session.season.week} of 6 · ${session.season.theme} · finale in ${session.season.daysToFinale}d`;
  $("#date").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const copy = FIREWALL_COPY[fw.state] ?? FIREWALL_COPY.normal;
  const fwEl = $("#firewall");
  fwEl.className = `banner ${copy.cls}`;
  fwEl.innerHTML = `<strong>${copy.title}</strong> ${copy.body}`;
  if (fw.state === "fresh_start" && fw.restartDate) fwEl.innerHTML += ` <em>(Monday: ${fw.restartDate})</em>`;

  $("#weekdots").innerHTML = week.days.map((d) =>
    `<span class="dot ${d.status}" title="${d.date}: ${d.status}"></span>`).join("");
  $("#weekcount").textContent = `${week.count}/${week.target} this week${week.met ? " ✓" : ""}`;
  $("#freezes").textContent = `❄ ${freezesLeft(state, today)} freeze${freezesLeft(state, today) === 1 ? "" : "s"} left this month`;

  $("#sizes").innerHTML = Object.entries(SIZES).map(([key, cfg]) => {
    const allowed = sizes.includes(key);
    const active = key === chosenSize;
    return `<button class="size ${active ? "active" : ""}" data-size="${key}" ${allowed ? "" : "disabled"}>
      <span>${cfg.label}</span><small>${cfg.minutes} min</small></button>`;
  }).join("");
  document.querySelectorAll("[data-size]").forEach((b) =>
    b.addEventListener("click", () => { chosenSize = b.dataset.size; resetPending(); render(); }));

  renderSession(doneToday);
  renderProgress();
}

function resetPending() {
  pending = { reviews: new Map(), learned: new Set(), attrs: new Set(), stageUps: new Set(), blocks: new Set() };
}

function renderSession(doneToday) {
  const el = $("#session");
  if (doneToday) {
    el.innerHTML = `<div class="card done-card"><h2>Session counted. 🗳️</h2>
      <p>That was a vote for <strong>“I am a dancer who trains daily.”</strong> Leave the floor wanting more — see you tomorrow.</p></div>`;
    $("#complete").style.display = "none";
    return;
  }
  $("#complete").style.display = "block";

  el.innerHTML = session.blocks.map((b, i) => {
    if (b.kind === "ignition" || b.kind === "freestyle") {
      const checked = pending.blocks.has(b.kind) ? "checked" : "";
      return `<div class="card"><h2>${b.title}</h2><p>${b.detail}</p>
        <label class="check"><input type="checkbox" data-block="${b.kind}" ${checked}> Done</label></div>`;
    }
    if (b.kind === "review") {
      return `<div class="card"><h2>${b.title}</h2><p class="note">${b.note}</p>` + b.items.map((it) => {
        const ns = nodeState(it.id);
        const grade = pending.reviews.get(it.id);
        const suggest = stageUpSuggested(ns);
        const up = pending.stageUps.has(it.id);
        return `<div class="item">
          <div class="item-head"><span class="fam ${it.node.family}">${FAMILY_LABELS[it.node.family] ?? it.node.family}</span>
            <strong><a class="mlink" href="learn.html?move=${it.id}">${it.node.name}</a></strong> <span class="stage">${stageName(ns.stage ?? 0)}</span>
            ${it.due ? "" : '<span class="warm">keep-warm</span>'}</div>
          <div class="grades">${["Rough", "OK", "Clean"].map((g, q) =>
            `<button class="grade ${grade === q ? "sel" : ""}" data-review="${it.id}" data-q="${q}">${g}</button>`).join("")}
          ${suggest ? `<button class="levelup ${up ? "sel" : ""}" data-up="${it.id}">⬆ ${stageName((ns.stage ?? 1) + 1)}?</button>` : ""}</div>
        </div>`;
      }).join("") + `</div>`;
    }
    if (b.kind === "new") {
      return `<div class="card"><h2>${b.title}</h2><p class="note">${b.note}</p>` + b.items.map((it) => {
        const checked = pending.learned.has(it.id) ? "checked" : "";
        return `<div class="item">
          <div class="item-head"><span class="fam ${it.node.family}">${FAMILY_LABELS[it.node.family] ?? it.node.family}</span>
            <strong><a class="mlink" href="learn.html?move=${it.id}">${it.node.name}</a></strong>${it.node.anchor ? ` <span class="anchor">${it.node.anchor}</span>` : ""}</div>
          <label class="check"><input type="checkbox" data-learned="${it.id}" ${checked}> Got real reps in (marks it Learned)</label>
        </div>`;
      }).join("") + `</div>`;
    }
    if (b.kind === "bodyprep") {
      return `<div class="card"><h2>${b.title}</h2><p class="note">${b.note}</p>` + b.items.map((it) => {
        const checked = pending.attrs.has(it.id) ? "checked" : "";
        return `<div class="item">
          <div class="item-head"><span class="fam attr">Gate</span> <strong>${it.attr.name}</strong></div>
          <p class="test">Test: ${it.attr.test}</p>
          <label class="check"><input type="checkbox" data-attr="${it.id}" ${checked}> Passed the test today</label>
        </div>`;
      }).join("") + `</div>`;
    }
    return "";
  }).join("");

  document.querySelectorAll("[data-review]").forEach((b) => b.addEventListener("click", () => {
    pending.reviews.set(b.dataset.review, Number(b.dataset.q)); renderSession(false);
  }));
  document.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", () => {
    pending.stageUps.has(b.dataset.up) ? pending.stageUps.delete(b.dataset.up) : pending.stageUps.add(b.dataset.up);
    renderSession(false);
  }));
  document.querySelectorAll("[data-learned]").forEach((c) => c.addEventListener("change", () => {
    c.checked ? pending.learned.add(c.dataset.learned) : pending.learned.delete(c.dataset.learned);
  }));
  document.querySelectorAll("[data-attr]").forEach((c) => c.addEventListener("change", () => {
    c.checked ? pending.attrs.add(c.dataset.attr) : pending.attrs.delete(c.dataset.attr);
  }));
  document.querySelectorAll("[data-block]").forEach((c) => c.addEventListener("change", () => {
    c.checked ? pending.blocks.add(c.dataset.block) : pending.blocks.delete(c.dataset.block);
  }));
}

function renderProgress() {
  const fams = familyProgress(tree, state).filter((f) => f.total > 0);
  const phase = workingPhase(tree, state);
  $("#progress").innerHTML = `<h2>The tree · Phase ${phase}</h2>` + fams.map((f) => {
    const pct = Math.round((f.touched / f.total) * 100);
    const pctClean = Math.round((f.clean / f.total) * 100);
    return `<div class="prog"><span class="prog-label">${FAMILY_LABELS[f.family] ?? f.family}</span>
      <div class="bar"><div class="fill clean" style="width:${pctClean}%"></div><div class="fill touched" style="width:${pct - pctClean}%"></div></div>
      <span class="prog-num">${f.clean}/${f.total}</span></div>`;
  }).join("");
}

$("#complete").addEventListener("click", () => {
  const wasMvsRequired = firewall(state, today).state === "mvs_required";
  const results = {
    reviews: [...pending.reviews.entries()].map(([id, quality]) => ({ id, quality })),
    learned: [...pending.learned],
    attrs: [...pending.attrs],
    stageUps: [...pending.stageUps].map((id) => ({ id, stage: Math.min((nodeState(id).stage ?? 1) + 1, STAGE.styled) })),
  };
  state = completeSession(tree, state, session, results, today);
  if (wasMvsRequired) state = repairYesterday(state, today); // showing up repairs yesterday
  saveState(state, storage);
  resetPending();
  render();
});

$("#export").addEventListener("click", async () => {
  const data = exportState(state);
  try { await navigator.clipboard.writeText(data); $("#export").textContent = "Copied ✓"; }
  catch { window.prompt("Copy your training state:", data); }
  setTimeout(() => ($("#export").textContent = "Export"), 1500);
});

$("#import").addEventListener("click", () => {
  const raw = window.prompt("Paste a previously exported state:");
  if (!raw) return;
  try { state = importState(raw); saveState(state, storage); resetPending(); render(); }
  catch (e) { alert(`Import failed: ${e.message}`); }
});

$("#freeze").addEventListener("click", () => {
  const y = addDays(today, -1);
  const before = state;
  state = applyFreeze(state, y, today);
  if (state === before) { alert("Nothing to freeze (yesterday is covered, or no freezes left this month)."); return; }
  saveState(state, storage);
  render();
});

$("#reset").addEventListener("click", () => {
  if (!confirm("Reset ALL training data? Export first if you want a backup.")) return;
  state = newState(todayKey());
  saveState(state, storage);
  resetPending();
  render();
});

render();
