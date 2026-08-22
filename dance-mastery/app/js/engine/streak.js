// Streaks bend, they don't break (Doc 05 Law 6): rolling 5-of-7 target,
// two monthly freezes, 48h repair, and the relapse firewall (Doc 05 §4).

import { addDays, diffDays, monthKey, nextMonday } from "./dates.js";

export const WEEKLY_TARGET = 5;
export const FREEZES_PER_MONTH = 2;

export function practicedDates(state) {
  return new Set(state.sessions.map((s) => s.date));
}

export function frozenDates(state) {
  return new Set(state.freezes ?? []);
}

export function freezesLeft(state, today) {
  const mk = monthKey(today);
  const used = (state.freezes ?? []).filter((d) => monthKey(d) === mk).length;
  return Math.max(0, FREEZES_PER_MONTH - used);
}

// Freeze a missed day (auto-offered by the UI). Counts for streak/firewall,
// never as practice.
export function applyFreeze(state, date, today) {
  if (freezesLeft(state, today) <= 0) return state;
  if (practicedDates(state).has(date) || frozenDates(state).has(date)) return state;
  return { ...state, freezes: [...(state.freezes ?? []), date] };
}

// The last-7-days view: [{date, status}] oldest→today.
// status: done | frozen | missed | today
export function rollingWeek(state, today) {
  const done = practicedDates(state);
  const frozen = frozenDates(state);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDays(today, -i);
    let status = "missed";
    if (done.has(date)) status = "done";
    else if (frozen.has(date)) status = "frozen";
    else if (date === today) status = "today";
    days.push({ date, status });
  }
  const count = days.filter((d) => d.status === "done" || d.status === "frozen").length;
  return { days, count, target: WEEKLY_TARGET, met: count >= WEEKLY_TARGET };
}

export function lastCoveredDate(state) {
  const all = [...practicedDates(state), ...frozenDates(state)].sort();
  return all[all.length - 1] ?? null;
}

// The relapse firewall state machine (Doc 05 §4). Missed days are the gap
// since the last covered (practiced or frozen) day, excluding today.
//   0 missed  -> normal
//   1 missed  -> mvs_required        ("never miss twice" is now live)
//   2-6       -> never_miss_twice    (imagery patch offered, MVS only)
//   7-29      -> fresh_start         (season resumes reduced, next Monday)
//   30+       -> reentry             (2-week returning-dancer ramp)
export function firewall(state, today) {
  const last = lastCoveredDate(state);
  if (!last) return { state: "fresh", missedDays: 0 };
  if (practicedDates(state).has(today)) return { state: "normal", missedDays: 0, doneToday: true };
  const missedDays = Math.max(0, diffDays(last, today) - 1);
  if (missedDays === 0) return { state: "normal", missedDays };
  if (missedDays === 1) return { state: "mvs_required", missedDays };
  if (missedDays < 7) return { state: "never_miss_twice", missedDays };
  if (missedDays < 30) return { state: "fresh_start", missedDays, restartDate: nextMonday(today) };
  return { state: "reentry", missedDays };
}

// Repair: a missed day within the last 48h can be patched by today's MVS —
// the patch marks yesterday frozen (no extra freeze consumed; the session is
// the payment). Returns state unchanged if nothing is repairable.
export function repairYesterday(state, today) {
  const y = addDays(today, -1);
  if (practicedDates(state).has(y) || frozenDates(state).has(y)) return state;
  return { ...state, freezes: [...(state.freezes ?? []), y] };
}
