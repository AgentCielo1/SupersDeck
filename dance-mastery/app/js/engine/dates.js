// Date keys are local-calendar "YYYY-MM-DD" strings. All arithmetic happens on
// keys via UTC so DST can never shift a practice day.

export function todayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toUtc(key) {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(key, n) {
  const t = toUtc(key) + n * 86400000;
  const dt = new Date(t);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// diffDays("2026-01-01", "2026-01-03") === 2
export function diffDays(a, b) {
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}

export function monthKey(key) {
  return key.slice(0, 7);
}

export function isMonday(key) {
  return new Date(toUtc(key)).getUTCDay() === 1;
}

export function nextMonday(key) {
  let k = addDays(key, 1);
  while (!isMonday(k)) k = addDays(k, 1);
  return k;
}
