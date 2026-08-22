import test from "node:test";
import assert from "node:assert/strict";
import {
  angleAt, normalizePose, angleFeatures, visibilityGate,
  dtw, dtwScore, channelDeviation, detectTempo, tempoVerdict,
  stillness, fromMediaPipe, worstSegments, CORE_POINTS, ANGLE_CHANNELS,
} from "../js/engine/pose.js";

// A synthetic upright pose in image space ([0,1], y down), parameterized so
// tests can bend joints deterministically.
function makePose({ elbowBend = Math.PI, kneeBend = Math.PI, cx = 0.5, scale = 1, lift = 0 } = {}) {
  const kp = {
    shoulderL: [0.4, 0.3 - lift], shoulderR: [0.6, 0.3 - lift],
    hipL: [0.42, 0.55 - lift], hipR: [0.58, 0.55 - lift],
    kneeL: [0.42, 0.75 - lift], kneeR: [0.58, 0.75 - lift],
  };
  const foldK = (Math.PI - kneeBend);
  kp.ankleL = [0.42 + Math.sin(foldK) * 0.2, 0.75 - lift + Math.cos(foldK) * 0.2];
  kp.ankleR = [0.58 - Math.sin(foldK) * 0.2, 0.75 - lift + Math.cos(foldK) * 0.2];
  const foldE = (Math.PI - elbowBend);
  kp.elbowL = [0.4, 0.45 - lift]; kp.elbowR = [0.6, 0.45 - lift];
  kp.wristL = [0.4 + Math.sin(foldE) * 0.15, 0.45 - lift + Math.cos(foldE) * 0.15];
  kp.wristR = [0.6 - Math.sin(foldE) * 0.15, 0.45 - lift + Math.cos(foldE) * 0.15];
  // true similarity transform: scale about (0.5, 0.5), then translate to cx
  for (const n of Object.keys(kp)) {
    kp[n] = [(kp[n][0] - 0.5) * scale + cx, (kp[n][1] - 0.5) * scale + 0.5];
  }
  return { kp, vis: 1 };
}

test("angleAt: right angle and straight line", () => {
  assert.ok(Math.abs(angleAt([1, 0], [0, 0], [0, 1]) - Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(angleAt([-1, 0], [0, 0], [1, 0]) - Math.PI) < 1e-9);
});

test("normalizePose is translation- and scale-invariant", () => {
  const a = normalizePose(makePose({ cx: 0.3, scale: 1 }));
  const b = normalizePose(makePose({ cx: 0.7, scale: 2 }));
  for (const n of CORE_POINTS) {
    assert.ok(Math.abs(a.kp[n][0] - b.kp[n][0]) < 1e-6, `${n} x`);
    assert.ok(Math.abs(a.kp[n][1] - b.kp[n][1]) < 1e-6, `${n} y`);
  }
});

test("angleFeatures reacts to a bent knee", () => {
  const straight = angleFeatures(normalizePose(makePose()));
  const bent = angleFeatures(normalizePose(makePose({ kneeBend: Math.PI / 2 })));
  assert.equal(straight.length, ANGLE_CHANNELS.length);
  const kneeIdx = ANGLE_CHANNELS.indexOf("kneeL");
  assert.ok(straight[kneeIdx] > bent[kneeIdx] + 0.5, "bent knee reads as smaller angle");
});

test("visibilityGate: refuses low visibility and out-of-frame bodies", () => {
  assert.equal(visibilityGate(makePose()).ok, true);
  assert.equal(visibilityGate({ ...makePose(), vis: 0.3 }).ok, false);
  const cut = makePose();
  cut.kp.ankleL = [0.5, 1.4]; // feet below the frame
  const v = visibilityGate(cut);
  assert.equal(v.ok, false);
  assert.equal(v.reason, "out_of_frame");
  assert.equal(visibilityGate(null).ok, false);
});

function angleSeq(fn, n = 60) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(angleFeatures(normalizePose(makePose(fn(i / n)))));
  return out;
}

test("dtw: self-match scores ~100, mismatch scores low, phase shift stays decent", () => {
  const bounce = (u) => ({ kneeBend: Math.PI - 0.5 - 0.4 * Math.sin(u * Math.PI * 4) });
  const A = angleSeq(bounce);
  const self = dtwScore(dtw(A, A).dist);
  assert.ok(self >= 98, `self=${self}`);
  const shifted = angleSeq((u) => bounce(u + 0.12));
  const near = dtwScore(dtw(A, shifted).dist);
  assert.ok(near >= 80, `phase-shifted=${near}`);
  const other = angleSeq((u) => ({ elbowBend: Math.PI - 1.2 * Math.abs(Math.sin(u * Math.PI * 2)), kneeBend: Math.PI }));
  const far = dtwScore(dtw(A, other).dist);
  assert.ok(far < near - 10, `different move ${far} should score below ${near}`);
});

test("channelDeviation points at the joint that is actually wrong", () => {
  const A = angleSeq(() => ({}));
  const B = angleSeq(() => ({ kneeBend: Math.PI / 2 }));
  const dev = channelDeviation(A, B);
  const worst = [...dev].filter((d) => Number.isFinite(d.deg)).sort((a, b) => b.deg - a.deg)[0];
  assert.ok(worst.channel.startsWith("knee"), `worst=${worst.channel}`);
});

test("detectTempo finds a 96bpm bounce within a few bpm", () => {
  const fps = 30, bpm = 96, secs = 6;
  const series = [];
  for (let i = 0; i < fps * secs; i++) {
    series.push(0.5 + 0.02 * Math.sin((i / fps) * (bpm / 60) * Math.PI * 2) + 0.002 * Math.sin(i));
  }
  const r = detectTempo(series, fps);
  assert.ok(r.bpm && Math.abs(r.bpm - bpm) <= 4, `detected ${r.bpm}`);
  assert.ok(r.confidence > 0.3);
  assert.ok(tempoVerdict(r.bpm, bpm).onBeat);
  assert.ok(tempoVerdict(r.bpm, bpm * 2).onBeat, "half-time counts as on-beat");
  assert.equal(tempoVerdict(r.bpm, bpm * 1.4).onBeat, false);
});

test("detectTempo declines to guess on flat/short input", () => {
  assert.equal(detectTempo([0.5, 0.5, 0.5], 30).bpm, null);
  assert.equal(detectTempo(new Array(300).fill(0.5), 30).bpm, null);
});

test("stillness: measures a hold and a live active run", () => {
  const fps = 30;
  const poses = [];
  for (let i = 0; i < fps * 6; i++) {
    const moving = i < fps * 2; // 2s moving, then 4s frozen
    poses.push(normalizePose(makePose({ lift: moving ? 0.05 * Math.sin(i / 2) : 0 })));
  }
  const r = stillness(poses, fps);
  assert.ok(r.longest > 3.2, `longest=${r.longest}`);
  assert.ok(r.activeRun > 3.2, "still frozen at the end");
});

test("worstSegments flags the window where the rep actually breaks", () => {
  const fps = 30;
  // 6s clip that matches the reference except seconds 3-4, where knees go wrong
  const good = (u) => ({ kneeBend: Math.PI - 0.4 * Math.sin(u * Math.PI * 6) });
  const A = [], B = [];
  for (let i = 0; i < fps * 6; i++) {
    const u = i / (fps * 6);
    B.push(angleFeatures(normalizePose(makePose(good(u)))));
    const broken = i >= fps * 3 && i < fps * 4;
    A.push(angleFeatures(normalizePose(makePose(broken ? { kneeBend: Math.PI / 2 } : good(u)))));
  }
  const segs = worstSegments(A, B, fps, { windowSec: 1, count: 2 });
  assert.ok(segs.length >= 1);
  const worst = [...segs].sort((a, b) => b.deg - a.deg)[0];
  assert.ok(worst.startSec >= 2.4 && worst.startSec <= 3.6, `flagged ${worst.startSec}s`);
  assert.ok(worst.deg > 10);
});

test("worstSegments returns [] on clips too short to window", () => {
  assert.deepEqual(worstSegments([[1], [1]], [[1], [1]], 30), []);
});

test("fromMediaPipe maps the 33-landmark layout", () => {
  const lm = Array.from({ length: 33 }, (_, i) => ({ x: i / 33, y: 0.5, z: 0, visibility: 0.9 }));
  const pose = fromMediaPipe(lm);
  assert.ok(pose.kp.shoulderL && pose.kp.ankleR);
  assert.ok(Math.abs(pose.vis - 0.9) < 1e-9);
  assert.equal(fromMediaPipe(null), null);
});
