// Motor-learning-adapted spaced review (Doc 06 §5): expanding intervals with a
// hard cap (physical skills decay; raw flashcard curves don't apply), graded by
// practiced quality, and interleaved across move families (contextual
// interference — Doc 05 Law 8).

import { diffDays, addDays } from "./dates.js";
import { STAGE } from "./graph.js";

export const INTERVALS = [1, 2, 4, 7, 12, 20, 30];
export const MAX_INTERVAL = 35;

export const QUALITY = { rough: 0, ok: 1, clean: 2 };

// Returns the updated per-node SRS state after a review.
export function gradeReview(nodeState, quality, today) {
  const i = nodeState.intervalIndex ?? -1;
  let next;
  if (quality <= QUALITY.rough) next = Math.max(0, i - 2);
  else if (quality === QUALITY.ok) next = Math.max(0, i); // repeat the interval
  else next = Math.min(INTERVALS.length - 1, i + 1);
  const interval = Math.min(INTERVALS[next], MAX_INTERVAL);
  return {
    ...nodeState,
    intervalIndex: next,
    lastReviewed: today,
    dueDate: addDays(today, interval),
    reps: (nodeState.reps ?? 0) + 1,
    cleanStreak: quality === QUALITY.clean ? (nodeState.cleanStreak ?? 0) + 1 : 0,
  };
}

// Nodes owned (stage >= learned) whose review is due, most-overdue first.
export function dueNodeIds(state, today) {
  return Object.entries(state.nodes)
    .filter(([, ns]) => (ns.stage ?? 0) >= STAGE.learned)
    .filter(([, ns]) => !ns.dueDate || diffDays(ns.dueDate, today) >= 0)
    .sort((a, b) => {
      const oa = a[1].dueDate ? diffDays(a[1].dueDate, today) : 9999;
      const ob = b[1].dueDate ? diffDays(b[1].dueDate, today) : 9999;
      return ob - oa || a[0].localeCompare(b[0]);
    })
    .map(([id]) => id);
}

// Keep-warm fill when fewer nodes are due than the session wants:
// least-recently-reviewed owned nodes not already picked.
export function keepWarmIds(state, today, exclude) {
  const ex = new Set(exclude);
  return Object.entries(state.nodes)
    .filter(([id, ns]) => (ns.stage ?? 0) >= STAGE.learned && !ex.has(id))
    .sort((a, b) => {
      const la = a[1].lastReviewed ?? "0000-00-00";
      const lb = b[1].lastReviewed ?? "0000-00-00";
      return la.localeCompare(lb) || a[0].localeCompare(b[0]);
    })
    .map(([id]) => id);
}

// Round-robin across families so consecutive drills never share a family.
export function interleave(ids, nodesById) {
  const buckets = new Map();
  for (const id of ids) {
    const fam = nodesById.get(id)?.family ?? "other";
    if (!buckets.has(fam)) buckets.set(fam, []);
    buckets.get(fam).push(id);
  }
  const queues = [...buckets.values()];
  const out = [];
  while (out.length < ids.length) {
    for (const q of queues) {
      if (q.length) out.push(q.shift());
    }
  }
  return out;
}

// A clean-streak of 3 at review is the self-attest cue to climb the ladder
// (Learned→Clean→Fast→Styled). The user confirms; the engine only suggests.
export function stageUpSuggested(nodeState) {
  return (nodeState.cleanStreak ?? 0) >= 3 && (nodeState.stage ?? 0) < STAGE.styled;
}
