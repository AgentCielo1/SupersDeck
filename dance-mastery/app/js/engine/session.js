// The daily session generator — the "what do I do today" engine (Doc 05 §3,
// breaking-tuned per Doc 03 §5). Rules encoded here:
//   - warm-up is groove-based; power/technical attempts come early while fresh
//   - review before new; reviews are interleaved across families
//   - body prep late so tiredness never blocks skill work
//   - freestyle is NEVER skipped
//   - the firewall can force the session down to MVS, never up.

import { indexTree, frontier, bodyPrepQueue, STAGE } from "./graph.js";
import { dueNodeIds, keepWarmIds, interleave, gradeReview } from "./srs.js";
import { firewall } from "./streak.js";
import { seasonInfo } from "./season.js";

export const SIZES = {
  mvs: { label: "Worst day", minutes: 8, review: 1, newNodes: 0, bodyPrep: 0, freestyleTracks: 1 },
  normal: { label: "Normal day", minutes: 30, review: 4, newNodes: 1, bodyPrep: 2, freestyleTracks: 2 },
  big: { label: "Big day", minutes: 60, review: 6, newNodes: 2, bodyPrep: 3, freestyleTracks: 3 },
};

// Which sizes the firewall allows today (Doc 05 §4).
export function allowedSizes(state, today) {
  const fw = firewall(state, today);
  switch (fw.state) {
    case "mvs_required":
    case "never_miss_twice":
    case "reentry":
      return { fw, sizes: ["mvs"] };
    case "fresh_start":
      return { fw, sizes: ["mvs", "normal"] };
    default:
      return { fw, sizes: ["mvs", "normal", "big"] };
  }
}

export function generateSession(tree, state, size, today) {
  const idx = indexTree(tree);
  const cfg = SIZES[size];
  const season = seasonInfo(state, today);
  const blocks = [];

  blocks.push({
    kind: "ignition",
    title: "Ignition",
    detail: size === "mvs"
      ? "Press play. Groove one song from the practice playlist — rock on beat, nothing else."
      : "Groove one song, then wrist + shoulder + neck circuits while the second track plays.",
  });

  // Review (SRS): due first, keep-warm fill, interleaved across families.
  const due = dueNodeIds(state, today);
  const picked = due.slice(0, cfg.review);
  if (picked.length < cfg.review) {
    picked.push(...keepWarmIds(state, today, picked).slice(0, cfg.review - picked.length));
  }
  const reviewIds = interleave(picked, idx.nodesById);
  if (reviewIds.length) {
    blocks.push({
      kind: "review",
      title: "Review (interleaved)",
      note: "Rotating moves feels clumsier than drilling one — that clumsiness is the signature of durable learning.",
      items: reviewIds.map((id) => ({ id, node: idx.nodesById.get(id), due: due.includes(id) })),
    });
  }

  // New material — off-season weeks consolidate instead of opening nodes.
  if (cfg.newNodes > 0 && !season.offSeason) {
    const fresh = frontier(tree, idx, state).slice(0, cfg.newNodes);
    if (fresh.length) {
      blocks.push({
        kind: "new",
        title: "New material",
        note: "Attempts while fresh, low-rep clusters. Rough is the goal today; clean is the ladder's job.",
        items: fresh.map((n) => ({ id: n.id, node: n })),
      });
    }
  }

  // Body prep (attribute gates blocking the near frontier).
  if (cfg.bodyPrep > 0) {
    const attrs = bodyPrepQueue(tree, idx, state).slice(0, cfg.bodyPrep);
    if (attrs.length) {
      blocks.push({
        kind: "bodyprep",
        title: "Body prep",
        note: "These gates open the moves you're blocked on. Injury prevention IS the curriculum.",
        items: attrs.map((id) => ({ id, attr: idx.attributesById.get(id) })),
      });
    }
  }

  blocks.push({
    kind: "freestyle",
    title: "Freestyle (never skipped)",
    detail: `${cfg.freestyleTracks} track${cfg.freestyleTracks > 1 ? "s" : ""}, camera on if you can. No judgment, all play — leave the floor wanting more.`,
  });

  return { date: today, size, minutes: cfg.minutes, season, blocks };
}

// Apply a completed session to state: SRS grades, new-node stage-ups,
// attribute achievements, session log. `results` shape:
// { reviews: [{id, quality}], learned: [id], attrs: [id], stageUps: [{id, stage}] }
export function completeSession(tree, state, session, results, today) {
  const nodes = { ...state.nodes };
  const attributes = { ...state.attributes };

  for (const r of results.reviews ?? []) {
    const prev = nodes[r.id] ?? { stage: STAGE.learned };
    nodes[r.id] = gradeReview(prev, r.quality, today);
  }
  for (const id of results.learned ?? []) {
    const prev = nodes[id] ?? {};
    nodes[id] = gradeReview({ ...prev, stage: Math.max(prev.stage ?? 0, STAGE.learned) }, 1, today);
  }
  for (const s of results.stageUps ?? []) {
    const prev = nodes[s.id] ?? {};
    nodes[s.id] = { ...prev, stage: s.stage, cleanStreak: 0 };
  }
  for (const id of results.attrs ?? []) {
    attributes[id] = { achieved: true, date: today };
  }

  const sessions = state.sessions.some((s) => s.date === today)
    ? state.sessions
    : [...state.sessions, { date: today, size: session.size }];

  return { ...state, nodes, attributes, sessions };
}
