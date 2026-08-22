// Phase B2 · Tier-1 feedback engine — pure functions, no DOM, no ML runtime.
// Consumes "poses": arrays of named 2D/3D keypoints in a common core set,
// produced either by MediaPipe (camera), the FK skeleton, or capture clips.
//
// Design rules from Doc 06 §4:
//  - every verdict is gated on visibility ("I can't see you well" beats a
//    hallucinated correction)
//  - live scoring only for upright/tempo material; DTW on normalized joint
//    angles is the validated comparison method
//  - the mocap reference IS the scoring reference.

/* ---------------- core keypoint set ----------------
   pose = { kp: { name: [x, y, z?] }, vis?: mean-visibility 0..1 }
   Names: shoulderL/R, elbowL/R, wristL/R, hipL/R, kneeL/R, ankleL/R, head?  */

export const CORE_POINTS = [
  "shoulderL", "shoulderR", "elbowL", "elbowR", "wristL", "wristR",
  "hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR",
];

function sub(a, b) { return a.map((v, i) => v - (b[i] ?? 0)); }
function len(v) { return Math.hypot(...v); }
function mid(a, b) { return a.map((v, i) => (v + b[i]) / 2); }

export function angleAt(a, b, c) {
  // angle at b between rays b→a and b→c, radians; NaN-safe
  const u = sub(a, b), w = sub(c, b);
  const lu = len(u), lw = len(w);
  if (lu < 1e-9 || lw < 1e-9) return NaN;
  let cos = u.reduce((s, v, i) => s + v * (w[i] ?? 0), 0) / (lu * lw);
  cos = Math.max(-1, Math.min(1, cos));
  return Math.acos(cos);
}

// Translation/scale-invariant: center on mid-hip, scale by torso length.
export function normalizePose(pose) {
  const k = pose.kp;
  for (const n of ["hipL", "hipR", "shoulderL", "shoulderR"]) {
    if (!k[n]) return null;
  }
  const hips = mid(k.hipL, k.hipR);
  const shoulders = mid(k.shoulderL, k.shoulderR);
  const torso = len(sub(shoulders, hips));
  if (torso < 1e-6) return null;
  const out = {};
  for (const [n, p] of Object.entries(k)) out[n] = sub(p, hips).map((v) => v / torso);
  return { kp: out, vis: pose.vis ?? 1 };
}

// The 7-channel angle signature shared by camera, FK, and mocap skeletons.
export const ANGLE_CHANNELS = ["elbowL", "elbowR", "kneeL", "kneeR", "hipL", "hipR", "torso"];

export function angleFeatures(pose) {
  const k = pose.kp;
  const hips = mid(k.hipL, k.hipR);
  const shoulders = mid(k.shoulderL, k.shoulderR);
  const up = hips.map((v, i) => v + (i === 1 ? -1 : 0)); // y-down image space: "up" is -y
  return [
    angleAt(k.shoulderL, k.elbowL, k.wristL),
    angleAt(k.shoulderR, k.elbowR, k.wristR),
    angleAt(k.hipL, k.kneeL, k.ankleL),
    angleAt(k.hipR, k.kneeR, k.ankleR),
    angleAt(shoulders, k.hipL, k.kneeL),
    angleAt(shoulders, k.hipR, k.kneeR),
    angleAt(up, hips, shoulders), // torso lean vs vertical
  ];
}

/* ---------------- confidence / framing gate ---------------- */
// verdict: { ok, reason } — when !ok, the app says what to fix, never scores.
export function visibilityGate(pose, { minVis = 0.6, margin = 0.03 } = {}) {
  if (!pose) return { ok: false, reason: "no_pose" };
  if ((pose.vis ?? 0) < minVis) return { ok: false, reason: "low_visibility" };
  for (const n of CORE_POINTS) {
    const p = pose.kp[n];
    if (!p) return { ok: false, reason: "missing_points" };
    // image-space poses are in [0,1]; out-of-frame joints mean truncation
    if (p[0] < -margin || p[0] > 1 + margin || p[1] < -margin || p[1] > 1 + margin) {
      return { ok: false, reason: "out_of_frame" };
    }
  }
  return { ok: true };
}

/* ---------------- DTW comparison (Tier-1 move check) ---------------- */
// A, B: arrays of angle-feature frames. Returns { dist (mean rad), path }.
export function dtw(A, B, { band = 0.25 } = {}) {
  const n = A.length, m = B.length;
  const w = Math.max(4, Math.floor(Math.max(n, m) * band));
  const INF = Infinity;
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(INF));
  D[0][0] = 0;
  const cost = (a, b) => {
    let s = 0, c = 0;
    for (let k = 0; k < a.length; k++) {
      if (Number.isFinite(a[k]) && Number.isFinite(b[k])) { s += Math.abs(a[k] - b[k]); c++; }
    }
    return c ? s / c : 0;
  };
  for (let i = 1; i <= n; i++) {
    const jLo = Math.max(1, Math.floor((i * m) / n) - w);
    const jHi = Math.min(m, Math.ceil((i * m) / n) + w);
    for (let j = jLo; j <= jHi; j++) {
      const c = cost(A[i - 1], B[j - 1]);
      D[i][j] = c + Math.min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1]);
    }
  }
  const dist = D[n][m] / (n + m);
  return { dist };
}

// Map mean angular deviation → 0-100 score. ≤6° ≈ perfect, ≥40° ≈ 0.
export function dtwScore(distRad) {
  const deg = (distRad * 180) / Math.PI;
  return Math.round(Math.max(0, Math.min(100, 100 - ((deg - 6) * 100) / 34)));
}

// Per-channel deviation (uniform time-resample) → the "worst joint" callout.
export function channelDeviation(A, B) {
  const n = Math.min(A.length, B.length, 64);
  const C = A[0].length;
  const dev = new Float64Array(C);
  const cnt = new Float64Array(C);
  for (let i = 0; i < n; i++) {
    const a = A[Math.floor((i * A.length) / n)];
    const b = B[Math.floor((i * B.length) / n)];
    for (let k = 0; k < C; k++) {
      if (Number.isFinite(a[k]) && Number.isFinite(b[k])) { dev[k] += Math.abs(a[k] - b[k]); cnt[k]++; }
    }
  }
  return [...dev].map((s, k) => ({
    channel: ANGLE_CHANNELS[k],
    deg: cnt[k] ? ((s / cnt[k]) * 180) / Math.PI : NaN,
  }));
}

// Worst-deviation time windows (Tier-2 review flags): slide a window over the
// user sequence, compare against the time-proportional slice of the reference,
// return the top non-overlapping segments by mean angular deviation.
export function worstSegments(A, B, fps, { windowSec = 1, count = 2 } = {}) {
  const w = Math.max(4, Math.round(windowSec * fps));
  if (A.length < w * 2) return [];
  const scores = [];
  for (let s = 0; s + w <= A.length; s += Math.max(1, Math.round(w / 4))) {
    const bs = Math.floor((s / A.length) * B.length);
    const bw = Math.max(4, Math.floor((w / A.length) * B.length));
    let sum = 0, cnt = 0;
    for (let i = 0; i < w; i++) {
      const a = A[s + i];
      const b = B[Math.min(B.length - 1, bs + Math.floor((i / w) * bw))];
      for (let k = 0; k < a.length; k++) {
        if (Number.isFinite(a[k]) && Number.isFinite(b[k])) { sum += Math.abs(a[k] - b[k]); cnt++; }
      }
    }
    if (cnt) scores.push({ start: s, deg: ((sum / cnt) * 180) / Math.PI });
  }
  scores.sort((a, b) => b.deg - a.deg);
  const picked = [];
  for (const c of scores) {
    if (picked.some((p) => Math.abs(p.start - c.start) < w)) continue;
    picked.push(c);
    if (picked.length >= count) break;
  }
  return picked
    .sort((a, b) => a.start - b.start)
    .map((p) => ({ startSec: p.start / fps, endSec: (p.start + w) / fps, deg: Math.round(p.deg) }));
}

/* ---------------- tempo detection (groove/toprock) ---------------- */
// series: vertical position of a stable point (mid-hip y) per frame.
// Returns { bpm, confidence } via autocorrelation over plausible beat lags.
export function detectTempo(series, fps, { minBpm = 60, maxBpm = 140 } = {}) {
  const n = series.length;
  if (n < fps * 2) return { bpm: null, confidence: 0 };
  const mean = series.reduce((a, b) => a + b, 0) / n;
  const x = series.map((v) => v - mean);
  const denom = x.reduce((a, b) => a + b * b, 0) || 1e-9;
  let best = { lag: 0, r: 0 };
  const lo = Math.round((60 / maxBpm) * fps), hi = Math.round((60 / minBpm) * fps);
  for (let lag = lo; lag <= Math.min(hi, n - 1); lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += x[i] * x[i + lag];
    const r = s / denom;
    if (r > best.r) best = { lag, r };
  }
  if (!best.lag || best.r < 0.15) return { bpm: null, confidence: best.r };
  // a bounce often hits twice per beat — fold implausibly fast readings
  let bpm = (60 * fps) / best.lag;
  while (bpm > maxBpm) bpm /= 2;
  while (bpm < minBpm) bpm *= 2;
  return { bpm: Math.round(bpm), confidence: Math.min(1, best.r) };
}

export function tempoVerdict(bpm, targetBpm, { tolerance = 0.08 } = {}) {
  if (!bpm) return { onBeat: false, offBy: null };
  // accept the half/double-time interpretations dancers actually use
  const candidates = [targetBpm, targetBpm / 2, targetBpm * 2];
  const offs = candidates.map((c) => Math.abs(bpm - c) / c);
  const offBy = Math.min(...offs);
  return { onBeat: offBy <= tolerance, offBy };
}

/* ---------------- freeze/stillness detection ---------------- */
// poses: array of normalized poses (one per frame). Returns longest still
// run in seconds plus whether one is active at the end (for a live timer).
export function stillness(poses, fps, { eps = 0.045, window = 3 } = {}) {
  const n = poses.length;
  if (n < window + 1) return { longest: 0, activeRun: 0 };
  const still = new Array(n).fill(false);
  for (let i = window; i < n; i++) {
    let move = 0, cnt = 0;
    for (const name of CORE_POINTS) {
      const a = poses[i]?.kp[name], b = poses[i - window]?.kp[name];
      if (a && b) { move += Math.hypot(a[0] - b[0], a[1] - b[1]); cnt++; }
    }
    still[i] = cnt > 0 && move / cnt < eps;
  }
  let longest = 0, run = 0;
  for (let i = 0; i < n; i++) {
    run = still[i] ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let activeRun = 0;
  for (let i = n - 1; i >= 0 && still[i]; i--) activeRun++;
  return { longest: longest / fps, activeRun: activeRun / fps };
}

/* ---------------- MediaPipe adapter ---------------- */
// 33-landmark array (x,y in [0,1], optional z, visibility) → core pose.
const MP = {
  shoulderL: 11, shoulderR: 12, elbowL: 13, elbowR: 14, wristL: 15, wristR: 16,
  hipL: 23, hipR: 24, kneeL: 25, kneeR: 26, ankleL: 27, ankleR: 28,
};
export function fromMediaPipe(landmarks) {
  if (!landmarks || landmarks.length < 33) return null;
  const kp = {};
  let vis = 0, c = 0;
  for (const [name, i] of Object.entries(MP)) {
    const l = landmarks[i];
    kp[name] = [l.x, l.y, l.z ?? 0];
    vis += l.visibility ?? 1; c++;
  }
  return { kp, vis: vis / c };
}
