import test from "node:test";
import assert from "node:assert/strict";

import tree from "../js/data/breaking.js";
import { addDays, diffDays, monthKey, nextMonday, isMonday } from "../js/engine/dates.js";
import { indexTree, isUnlocked, blockers, frontier, bodyPrepQueue, workingPhase, STAGE } from "../js/engine/graph.js";
import { gradeReview, dueNodeIds, keepWarmIds, interleave, stageUpSuggested, INTERVALS, QUALITY } from "../js/engine/srs.js";
import { rollingWeek, firewall, applyFreeze, repairYesterday, freezesLeft, WEEKLY_TARGET } from "../js/engine/streak.js";
import { seasonInfo, SEASON_WEEKS } from "../js/engine/season.js";
import { generateSession, completeSession, allowedSizes, SIZES } from "../js/engine/session.js";
import { newState, loadState, saveState, exportState, importState } from "../js/engine/store.js";

const T = "2026-08-22";
const idx = indexTree(tree);

function fresh() {
  return newState(T);
}

function withStages(state, stages) {
  const nodes = { ...state.nodes };
  for (const [id, stage] of Object.entries(stages)) nodes[id] = { ...(nodes[id] ?? {}), stage };
  return { ...state, nodes };
}

function withAttrs(state, ids) {
  const attributes = { ...state.attributes };
  for (const id of ids) attributes[id] = { achieved: true, date: T };
  return { ...state, attributes };
}

// ---------- dates ----------

test("date arithmetic crosses month and year boundaries", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(diffDays("2026-01-01", "2026-01-03"), 2);
  assert.equal(monthKey("2026-08-22"), "2026-08");
  assert.ok(isMonday(nextMonday(T)));
  assert.ok(diffDays(T, nextMonday(T)) >= 1 && diffDays(T, nextMonday(T)) <= 7);
});

// ---------- graph ----------

test("tree integrity: every prereq id resolves", () => {
  for (const n of tree.nodes) {
    for (const p of n.prereqs ?? []) {
      const found = idx.nodesById.has(p.id) || idx.attributesById.has(p.id);
      assert.ok(found, `${n.id} references unknown prereq ${p.id}`);
    }
  }
});

test("windmill is locked until its hard prereqs hit Clean + shoulder gate", () => {
  const windmill = idx.nodesById.get("power.windmill");
  let s = fresh();
  assert.equal(isUnlocked(idx, s, windmill), false);
  s = withStages(s, {
    "power.backspin": STAGE.clean,
    "freeze.turtle": STAGE.clean,
    "freeze.baby": STAGE.clean,
  });
  assert.equal(isUnlocked(idx, s, windmill), false, "still blocked by attr.shoulder.l1");
  assert.deepEqual(blockers(idx, s, windmill), ["attr.shoulder.l1"]);
  s = withAttrs(s, ["attr.shoulder.l1"]);
  assert.equal(isUnlocked(idx, s, windmill), true);
});

test("Learned is not enough to unlock dependents (body prepared before the move)", () => {
  const three = idx.nodesById.get("footwork.three_step");
  const s = withStages(fresh(), { "footwork.six_step": STAGE.learned });
  assert.equal(isUnlocked(idx, s, three), false);
});

test("frontier starts with phase-0 nodes for a fresh dancer", () => {
  const f = frontier(tree, idx, fresh());
  assert.ok(f.length > 0);
  assert.equal(f[0].phase, 0, "lowest-phase material is offered first");
  for (let i = 1; i < f.length; i++) {
    assert.ok(f[i].phase >= f[i - 1].phase, "frontier is sorted by phase");
  }
  assert.ok(f.some((n) => n.id === "culture.origins"));
});

test("bodyPrepQueue surfaces the gates blocking the near frontier, lowest phase first", () => {
  const q = bodyPrepQueue(tree, idx, fresh());
  assert.ok(q.includes("attr.wrist.l1"), "wrist L1 gates 6-step and baby freeze");
  assert.ok(q.includes("attr.core.l1"));
  const wp = workingPhase(tree, fresh());
  assert.equal(wp, 0);
});

// ---------- srs ----------

test("gradeReview expands on clean, repeats on ok, regresses on rough", () => {
  let ns = { stage: STAGE.learned };
  ns = gradeReview(ns, QUALITY.clean, T);
  assert.equal(ns.intervalIndex, 0);
  assert.equal(ns.dueDate, addDays(T, INTERVALS[0]));
  ns = gradeReview(ns, QUALITY.clean, addDays(T, 1));
  assert.equal(ns.intervalIndex, 1);
  ns = gradeReview(ns, QUALITY.ok, addDays(T, 3));
  assert.equal(ns.intervalIndex, 1, "ok repeats the interval");
  ns = gradeReview(ns, QUALITY.rough, addDays(T, 5));
  assert.equal(ns.intervalIndex, 0, "rough steps back two");
  assert.equal(ns.cleanStreak, 0);
});

test("stage-up is suggested after three consecutive clean reviews", () => {
  let ns = { stage: STAGE.learned };
  for (let i = 0; i < 3; i++) ns = gradeReview(ns, QUALITY.clean, addDays(T, i));
  assert.equal(ns.cleanStreak, 3);
  assert.ok(stageUpSuggested(ns));
});

test("dueNodeIds: never-reviewed owned nodes are due; future-dated are not", () => {
  let s = withStages(fresh(), { "toprock.groove": STAGE.learned, "toprock.two_step": STAGE.learned });
  s.nodes["toprock.two_step"] = gradeReview(s.nodes["toprock.two_step"], QUALITY.clean, T);
  const due = dueNodeIds(s, T);
  assert.ok(due.includes("toprock.groove"), "never reviewed => due now");
  assert.ok(!due.includes("toprock.two_step"), "reviewed today => due tomorrow, not now");
  assert.ok(dueNodeIds(s, addDays(T, 1)).includes("toprock.two_step"));
});

test("interleave round-robins across families", () => {
  const ids = ["footwork.six_step", "footwork.three_step", "toprock.two_step", "freeze.baby"];
  const out = interleave(ids, idx.nodesById);
  assert.equal(out.length, 4);
  const fams = out.map((id) => idx.nodesById.get(id).family);
  assert.notEqual(fams[0], fams[1], "consecutive items should switch family");
});

// ---------- streak & firewall ----------

function practiced(state, dates) {
  return { ...state, sessions: dates.map((d) => ({ date: d, size: "mvs" })) };
}

test("rollingWeek counts done + frozen toward the 5/7 target", () => {
  let s = practiced(fresh(), [addDays(T, -1), addDays(T, -2), addDays(T, -3), addDays(T, -5)]);
  s = applyFreeze(s, addDays(T, -4), T);
  const w = rollingWeek(s, T);
  assert.equal(w.count, 5);
  assert.equal(w.target, WEEKLY_TARGET);
  assert.ok(w.met);
});

test("firewall state machine walks the documented ladder", () => {
  assert.equal(firewall(fresh(), T).state, "fresh");
  assert.equal(firewall(practiced(fresh(), [addDays(T, -1)]), T).state, "normal");
  assert.equal(firewall(practiced(fresh(), [addDays(T, -2)]), T).state, "mvs_required");
  assert.equal(firewall(practiced(fresh(), [addDays(T, -4)]), T).state, "never_miss_twice");
  const fs = firewall(practiced(fresh(), [addDays(T, -10)]), T);
  assert.equal(fs.state, "fresh_start");
  assert.ok(isMonday(fs.restartDate));
  assert.equal(firewall(practiced(fresh(), [addDays(T, -40)]), T).state, "reentry");
  assert.equal(firewall(practiced(fresh(), [T]), T).state, "normal");
});

test("freezes: two per month, and a frozen day heals the firewall", () => {
  let s = practiced(fresh(), [addDays(T, -2)]);
  assert.equal(freezesLeft(s, T), 2);
  s = applyFreeze(s, addDays(T, -1), T);
  assert.equal(freezesLeft(s, T), 1);
  assert.equal(firewall(s, T).state, "normal", "frozen yesterday => no missed days");
  s = applyFreeze(s, addDays(T, -3), T);
  assert.equal(freezesLeft(s, T), 0);
  const before = s;
  s = applyFreeze(s, addDays(T, -4), T);
  assert.equal(s, before, "no freezes left => no-op");
});

test("repairYesterday patches a single missed day without consuming a monthly freeze count", () => {
  let s = practiced(fresh(), [addDays(T, -2)]);
  assert.equal(firewall(s, T).state, "mvs_required");
  s = repairYesterday(s, T);
  assert.equal(firewall(s, T).state, "normal");
});

// ---------- season ----------

test("season math: week 7 is off-season, then season 2 starts", () => {
  const s = fresh();
  assert.deepEqual(
    [seasonInfo(s, T).number, seasonInfo(s, T).week, seasonInfo(s, T).offSeason],
    [1, 1, false]
  );
  assert.equal(seasonInfo(s, T).daysToFinale, 41, "finale is the last day of week 6");
  assert.equal(seasonInfo(s, addDays(T, 41)).daysToFinale, 0);
  const w7 = addDays(T, 6 * 7 + 1);
  const info7 = seasonInfo(s, w7);
  assert.equal(info7.week, SEASON_WEEKS);
  assert.ok(info7.offSeason);
  const s2 = seasonInfo(s, addDays(T, SEASON_WEEKS * 7));
  assert.equal(s2.number, 2);
  assert.equal(s2.week, 1);
});

// ---------- session generator ----------

test("MVS session: ignition + at most one review + freestyle, ~8 minutes, no new material", () => {
  const s = withStages(fresh(), { "toprock.groove": STAGE.learned });
  const sess = generateSession(tree, s, "mvs", T);
  const kinds = sess.blocks.map((b) => b.kind);
  assert.deepEqual(kinds, ["ignition", "review", "freestyle"]);
  assert.equal(sess.minutes, SIZES.mvs.minutes);
  assert.equal(sess.blocks[1].items.length, 1);
});

test("normal session for a fresh dancer offers phase-0 new material and body prep", () => {
  const sess = generateSession(tree, fresh(), "normal", T);
  const kinds = sess.blocks.map((b) => b.kind);
  assert.ok(kinds.includes("new"));
  assert.ok(kinds.includes("bodyprep"));
  assert.equal(kinds[kinds.length - 1], "freestyle", "freestyle is always last and never skipped");
  const newBlock = sess.blocks.find((b) => b.kind === "new");
  assert.ok(newBlock.items.every((i) => i.node.phase === 0));
});

test("firewall gates the allowed sizes", () => {
  assert.deepEqual(allowedSizes(practiced(fresh(), [addDays(T, -2)]), T).sizes, ["mvs"]);
  assert.deepEqual(allowedSizes(practiced(fresh(), [addDays(T, -10)]), T).sizes, ["mvs", "normal"]);
  assert.deepEqual(allowedSizes(practiced(fresh(), [addDays(T, -1)]), T).sizes, ["mvs", "normal", "big"]);
});

test("completeSession applies grades, learned nodes, attrs, and logs once per day", () => {
  let s = withStages(fresh(), { "toprock.groove": STAGE.learned });
  const sess = generateSession(tree, s, "normal", T);
  s = completeSession(tree, s, sess, {
    reviews: [{ id: "toprock.groove", quality: QUALITY.clean }],
    learned: ["culture.origins"],
    attrs: ["attr.wrist.l1"],
    stageUps: [{ id: "toprock.groove", stage: STAGE.clean }],
  }, T);
  assert.equal(s.nodes["toprock.groove"].stage, STAGE.clean);
  assert.equal(s.nodes["culture.origins"].stage, STAGE.learned);
  assert.ok(s.attributes["attr.wrist.l1"].achieved);
  assert.equal(s.sessions.length, 1);
  s = completeSession(tree, s, sess, { reviews: [] }, T);
  assert.equal(s.sessions.length, 1, "same-day completion logs once");
});

test("off-season week generates no new material", () => {
  const s = fresh();
  const offDay = addDays(T, 6 * 7 + 1);
  const sess = generateSession(tree, s, "normal", offDay);
  assert.ok(sess.season.offSeason);
  assert.ok(!sess.blocks.some((b) => b.kind === "new"));
});

// ---------- store ----------

test("store round-trips through an injected storage and rejects junk imports", () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const s = practiced(fresh(), [T]);
  assert.ok(saveState(s, storage));
  assert.deepEqual(loadState(T, storage), s);
  assert.deepEqual(importState(exportState(s)), s);
  assert.throws(() => importState('{"version":99}'));
  const broken = { getItem: () => { throw new Error("blocked"); } };
  assert.equal(loadState(T, broken).version, 1, "blocked storage still yields a fresh state");
});

// ---------- full journey smoke ----------

test("simulated 30 days: daily MVS/normal sessions keep the firewall green and advance the tree", () => {
  let s = fresh();
  for (let i = 0; i < 30; i++) {
    const day = addDays(T, i);
    const { sizes } = allowedSizes(s, day);
    const size = sizes.includes("normal") ? "normal" : "mvs";
    const sess = generateSession(tree, s, size, day);
    const results = { reviews: [], learned: [], attrs: [] };
    for (const b of sess.blocks) {
      if (b.kind === "review") for (const it of b.items) results.reviews.push({ id: it.id, quality: QUALITY.clean });
      if (b.kind === "new") for (const it of b.items) results.learned.push(it.id);
      if (b.kind === "bodyprep" && i % 7 === 6) for (const it of b.items) results.attrs.push(it.id);
    }
    // self-attest stage-ups when suggested, so the graph opens over time
    results.stageUps = Object.entries(s.nodes)
      .filter(([, ns]) => stageUpSuggested(ns))
      .map(([id, ns]) => ({ id, stage: Math.min(ns.stage + 1, STAGE.styled) }));
    s = completeSession(tree, s, sess, results, day);
  }
  assert.equal(s.sessions.length, 30);
  assert.equal(firewall(s, addDays(T, 29)).state, "normal");
  const owned = Object.values(s.nodes).filter((n) => (n.stage ?? 0) >= STAGE.learned).length;
  assert.ok(owned >= 8, `expected steady vocabulary growth, got ${owned} owned nodes`);
  assert.ok(workingPhase(tree, s) >= 0);
});
