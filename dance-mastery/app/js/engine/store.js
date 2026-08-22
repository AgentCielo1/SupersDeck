// State persistence with injectable storage (localStorage in the browser,
// plain objects in tests). Every read/write is guarded (Doc 06: storage can
// throw in previews/private windows).

const KEY = "dance-mastery-state-v1";

export function newState(today) {
  return {
    version: 1,
    startDate: today,
    sessions: [],   // [{date, size}]
    nodes: {},      // id -> {stage, intervalIndex, dueDate, lastReviewed, reps, cleanStreak}
    attributes: {}, // id -> {achieved, date}
    freezes: [],    // ["YYYY-MM-DD"] frozen (or repaired) days
  };
}

export function loadState(today, storage) {
  try {
    const raw = storage?.getItem?.(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === 1) return s;
    }
  } catch { /* fall through to fresh state */ }
  return newState(today);
}

export function saveState(state, storage) {
  try {
    storage?.setItem?.(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

export function importState(json) {
  const s = JSON.parse(json);
  if (!s || s.version !== 1 || !Array.isArray(s.sessions)) {
    throw new Error("Not a dance-mastery v1 state file");
  }
  return s;
}
