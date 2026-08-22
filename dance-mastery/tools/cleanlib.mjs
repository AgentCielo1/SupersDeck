// Motion Factory · Station 4: cleanup filters as pure functions.
// Frames = array of per-frame position arrays [x0,y0,z0, x1,y1,z1, ...] in
// meters (Float64Array or number[]). All functions return NEW frame arrays.

export function toFloat(frames) {
  return frames.map((f) => Float64Array.from(f));
}

// Temporal box smoothing (N passes ≈ gaussian). Kills marker jitter without
// touching overall timing. radius in frames at 30fps: 1-2 is gentle.
export function smooth(frames, { radius = 1, passes = 2 } = {}) {
  let cur = toFloat(frames);
  const N = cur.length, L = cur[0].length;
  for (let p = 0; p < passes; p++) {
    const out = cur.map((f) => Float64Array.from(f));
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, i - radius), b = Math.min(N - 1, i + radius);
      for (let k = 0; k < L; k++) {
        let s = 0;
        for (let j = a; j <= b; j++) s += cur[j][k];
        out[i][k] = s / (b - a + 1);
      }
    }
    cur = out;
  }
  return cur;
}

// No body point below the floor (y channels are indices 3k+1).
export function clampFloor(frames, { floor = 0 } = {}) {
  const out = toFloat(frames);
  for (const f of out)
    for (let k = 1; k < f.length; k += 3)
      if (f[k] < floor) f[k] = floor;
  return out;
}

// Contact locking: for the given joints, find runs where the joint is low
// and (horizontally) slow — a plant — and pin it to the run's mean position.
// The #1 fix for foot/hand skating in reconstructed dance data.
export function contactLock(frames, jointIdxs, { heightThresh = 0.07, velThresh = 0.015, minRun = 3 } = {}) {
  const out = toFloat(frames);
  const N = out.length;
  for (const j of jointIdxs) {
    const X = j * 3, Y = X + 1, Z = X + 2;
    let runStart = -1;
    const flush = (endEx) => {
      if (runStart < 0 || endEx - runStart < minRun) { runStart = -1; return; }
      let mx = 0, my = 0, mz = 0;
      for (let i = runStart; i < endEx; i++) { mx += out[i][X]; my += out[i][Y]; mz += out[i][Z]; }
      const n = endEx - runStart;
      mx /= n; my /= n; mz /= n;
      for (let i = runStart; i < endEx; i++) { out[i][X] = mx; out[i][Y] = Math.min(my, heightThresh); out[i][Z] = mz; }
      // short blend into/out of the pin so it doesn't pop
      for (const [edge, dir] of [[runStart, -1], [endEx - 1, 1]]) {
        const nb = edge + dir;
        if (nb >= 0 && nb < N) {
          out[nb][X] = (out[nb][X] + mx) / 2;
          out[nb][Z] = (out[nb][Z] + mz) / 2;
        }
      }
      runStart = -1;
    };
    for (let i = 0; i < N; i++) {
      const low = out[i][Y] < heightThresh;
      const vx = i > 0 ? out[i][X] - out[i - 1][X] : 0;
      const vz = i > 0 ? out[i][Z] - out[i - 1][Z] : 0;
      const slow = Math.hypot(vx, vz) < velThresh;
      if (low && slow) { if (runStart < 0) runStart = i; }
      else flush(i);
    }
    flush(N);
  }
  return out;
}

// Seamless loop: crossfade the tail into the head and trim.
// Returns N-blend frames where frame[last] flows continuously into frame[0].
export function loopBlend(frames, { blend = 10 } = {}) {
  const orig = toFloat(frames);
  const N = orig.length, L = orig[0].length;
  if (blend >= N / 2) throw new Error("blend window too large for clip");
  const out = [];
  for (let i = 0; i < N - blend; i++) {
    if (i < blend) {
      const alpha = i / blend; // 0 → pure tail, →1 pure head
      const f = new Float64Array(L);
      for (let k = 0; k < L; k++) f[k] = (1 - alpha) * orig[N - blend + i][k] + alpha * orig[i][k];
      out.push(f);
    } else {
      out.push(orig[i]);
    }
  }
  return out;
}

// Seam gap metric (for tests/QC): mean |last - first| across channels.
export function seamGap(frames) {
  const a = frames[frames.length - 1], b = frames[0];
  let s = 0;
  for (let k = 0; k < a.length; k++) s += Math.abs(a[k] - b[k]);
  return s / a.length;
}

/* ---- clip-module helpers (Int16 mm <-> meter frames) ---- */
export function clipToFrames(clip, pos) {
  const L = clip.joints.length * 3, out = [];
  for (let f = 0; f < clip.nFrames; f++) {
    const fr = new Float64Array(L);
    for (let k = 0; k < L; k++) fr[k] = pos[f * L + k] / 1000;
    out.push(fr);
  }
  return out;
}

export function framesToBase64(frames) {
  const N = frames.length, L = frames[0].length;
  const buf = new Int16Array(N * L);
  for (let f = 0; f < N; f++)
    for (let k = 0; k < L; k++)
      buf[f * L + k] = Math.max(-32000, Math.min(32000, Math.round(frames[f][k] * 1000)));
  return Buffer.from(buf.buffer).toString("base64");
}
