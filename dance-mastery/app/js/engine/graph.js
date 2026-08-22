// Skill-graph engine over the style skill-tree format (Doc 06 §5).
// Stages per node: 0 = untouched, then the Learned→Clean→Fast→Styled ladder.

export const STAGES = ["untouched", "learned", "clean", "fast", "styled"];
export const STAGE = { untouched: 0, learned: 1, clean: 2, fast: 3, styled: 4 };

// A hard move prerequisite is met at Clean, not Learned: "the body is prepared
// before the move is attempted" (Doc 01, principle 5).
export const UNLOCK_STAGE = STAGE.clean;

export function indexTree(tree) {
  const nodesById = new Map();
  for (const n of tree.nodes) nodesById.set(n.id, n);
  const attributesById = new Map();
  for (const a of tree.attributes) attributesById.set(a.id, a);
  return { nodesById, attributesById };
}

export function nodeStage(state, id) {
  return state.nodes[id]?.stage ?? 0;
}

export function attributeMet(state, id) {
  return Boolean(state.attributes[id]?.achieved);
}

function isAttrId(id) {
  return id.startsWith("attr.");
}

// A node is unlocked when every hard prerequisite is satisfied:
// attribute prereqs achieved, move/concept prereqs at Clean or better.
export function isUnlocked(idx, state, node) {
  for (const p of node.prereqs ?? []) {
    if (p.kind !== "hard") continue;
    if (isAttrId(p.id)) {
      if (!attributeMet(state, p.id)) return false;
    } else if (nodeStage(state, p.id) < UNLOCK_STAGE) {
      return false;
    }
  }
  return true;
}

// What still blocks a node, for "this is why it's locked / what it unlocks" UI
// (Doc 03 gap #5: foundation's value must be visible).
export function blockers(idx, state, node) {
  const out = [];
  for (const p of node.prereqs ?? []) {
    if (p.kind !== "hard") continue;
    if (isAttrId(p.id)) {
      if (!attributeMet(state, p.id)) out.push(p.id);
    } else if (nodeStage(state, p.id) < UNLOCK_STAGE) {
      out.push(p.id);
    }
  }
  return out;
}

// Frontier: unlocked, untouched nodes — the "new material" candidates —
// lowest phase first, then stable by family for variety.
export function frontier(tree, idx, state) {
  return tree.nodes
    .filter((n) => nodeStage(state, n.id) === 0 && isUnlocked(idx, state, n))
    .sort((a, b) => (a.phase - b.phase) || a.family.localeCompare(b.family) || a.id.localeCompare(b.id));
}

// Unmet attributes that hard-block any node within `phaseHorizon` of the
// current working phase — the body-prep queue (Doc 03 §6).
export function bodyPrepQueue(tree, idx, state) {
  const currentPhase = workingPhase(tree, state);
  const wanted = new Map(); // attrId -> lowest blocking phase
  for (const n of tree.nodes) {
    if (n.phase > currentPhase + 1) continue;
    if (nodeStage(state, n.id) > 0) continue;
    for (const p of n.prereqs ?? []) {
      if (p.kind === "hard" && isAttrId(p.id) && !attributeMet(state, p.id)) {
        const prev = wanted.get(p.id);
        if (prev === undefined || n.phase < prev) wanted.set(p.id, n.phase);
      }
    }
  }
  return [...wanted.entries()]
    .sort((a, b) => (a[1] - b[1]) || a[0].localeCompare(b[0]))
    .map(([id]) => id);
}

// The phase you are "in": lowest phase that still has untouched or
// below-Clean nodes. Phase 0 concepts never hold this back once learned.
export function workingPhase(tree, state) {
  const phases = [...new Set(tree.nodes.map((n) => n.phase))].sort((a, b) => a - b);
  for (const ph of phases) {
    const nodes = tree.nodes.filter((n) => n.phase === ph);
    const done = nodes.every((n) => nodeStage(state, n.id) >= UNLOCK_STAGE);
    if (!done) return ph;
  }
  return phases[phases.length - 1];
}

export function familyProgress(tree, state) {
  const fams = new Map();
  for (const n of tree.nodes) {
    const f = fams.get(n.family) ?? { family: n.family, total: 0, touched: 0, clean: 0 };
    f.total += 1;
    const s = nodeStage(state, n.id);
    if (s >= STAGE.learned) f.touched += 1;
    if (s >= STAGE.clean) f.clean += 1;
    fams.set(n.family, f);
  }
  return [...fams.values()];
}
