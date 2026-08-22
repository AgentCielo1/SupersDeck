// Move Library simulation — a zero-dependency preview of the 50-move mocap
// library (Doc 08 §3, procedural lane). A stylized breaker rendered with a
// tiny FK skeleton + canvas 3D projection. Every animated move here cost $0.

import tree from "./data/breaking.js";
import capture85 from "./data/capture85.js";

/* ---------------- tiny 3D math ---------------- */
const cos = Math.cos, sin = Math.sin, PI = Math.PI, TAU = PI * 2;
function rotX(v, a) { return [v[0], v[1] * cos(a) - v[2] * sin(a), v[1] * sin(a) + v[2] * cos(a)]; }
function rotY(v, a) { return [v[0] * cos(a) + v[2] * sin(a), v[1], -v[0] * sin(a) + v[2] * cos(a)]; }
function rotZ(v, a) { return [v[0] * cos(a) - v[1] * sin(a), v[0] * sin(a) + v[1] * cos(a), v[2]]; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
// world transform: local vec through pose orientation (roll->pitch->yaw)
function orient(v, yaw, pitch, roll) { return rotY(rotX(rotZ(v, roll), pitch), yaw); }

/* ---------------- skeleton ---------------- */
const DIM = { hipW: 0.11, torso: 0.48, neck: 0.07, headR: 0.105, shW: 0.21, upArm: 0.27, foreArm: 0.25, thigh: 0.42, shin: 0.41, foot: 0.12 };

// A pose is a flat param object; FK turns it into named 3D joint positions.
const BASE = {
  x: 0, y: 0.86, z: 0, yaw: 0, pitch: 0, roll: 0,          // pelvis
  tPitch: 0, tYaw: 0, tRoll: 0,                             // torso (rel)
  lHipF: 0, lHipA: 0.06, lKnee: 0.06, rHipF: 0, rHipA: 0.06, rKnee: 0.06,
  lShF: 0.1, lShA: 0.12, lElb: 0.25, rShF: 0.1, rShA: 0.12, rElb: 0.25,
};

function fk(p) {
  const R = (v) => orient(v, p.yaw, p.pitch, p.roll);
  const RT = (v) => R(orient(v, p.tYaw, p.tPitch, p.tRoll));
  const pelvis = [p.x, p.y, p.z];
  const chest = add(pelvis, scale(RT([0, 1, 0]), DIM.torso));
  const head = add(chest, scale(RT([0, 1, 0]), DIM.neck + DIM.headR));
  const J = { pelvis, chest, head };
  for (const [side, sgn] of [["l", -1], ["r", 1]]) {
    // legs hang from the pelvis frame
    const hip = add(pelvis, R([sgn * DIM.hipW, -0.03, 0]));
    const hf = p[side + "HipF"], ha = p[side + "HipA"], kn = p[side + "Knee"];
    const thighDir = R(rotZ(rotX([0, -1, 0], hf), sgn * ha));
    const knee = add(hip, scale(thighDir, DIM.thigh));
    const shinDir = R(rotZ(rotX([0, -1, 0], hf + kn), sgn * ha));
    const ankle = add(knee, scale(shinDir, DIM.shin));
    const toe = add(ankle, scale(R(rotZ(rotX([0, 0, 1], hf + kn), sgn * ha)), DIM.foot));
    J[side + "Hip"] = hip; J[side + "Knee"] = knee; J[side + "Ankle"] = ankle; J[side + "Toe"] = toe;
    // arms hang from the chest frame
    const sh = add(chest, RT([sgn * DIM.shW, -0.02, 0]));
    const sf = p[side + "ShF"], sa = p[side + "ShA"], el = p[side + "Elb"];
    const upDir = RT(rotZ(rotX([0, -1, 0], sf), sgn * sa));
    const elbow = add(sh, scale(upDir, DIM.upArm));
    const foreDir = RT(rotZ(rotX([0, -1, 0], sf + el), sgn * sa));
    const hand = add(elbow, scale(foreDir, DIM.foreArm));
    J[side + "Sh"] = sh; J[side + "Elbow"] = elbow; J[side + "Hand"] = hand;
  }
  return J;
}

// Cheap contact solver: the lowest body point always touches the floor
// (hands in footwork, head in headspins, back in backspins, feet standing).
function clampGround(J) {
  let min = Infinity;
  for (const v of Object.values(J)) min = Math.min(min, v[1]);
  const dy = 0.02 - min;
  for (const v of Object.values(J)) v[1] += dy;
  return J;
}

const BONES = [
  ["pelvis", "chest", 7.5], ["chest", "head", 5],
  ["lHip", "lKnee", 6], ["lKnee", "lAnkle", 5], ["lAnkle", "lToe", 4],
  ["rHip", "rKnee", 6], ["rKnee", "rAnkle", 5], ["rAnkle", "rToe", 4],
  ["lSh", "lElbow", 5], ["lElbow", "lHand", 4],
  ["rSh", "rElbow", 5], ["rElbow", "rHand", 4],
  ["lHip", "rHip", 6], ["lSh", "rSh", 6],
];

/* ---------------- animation core ---------------- */
// Keyframed moves: keys = [{t, pose-overrides}], cosine-eased, looped.
// spin/rootFn add continuous root motion on top (spins can't be keyframed).
function ease(u) { return 0.5 - 0.5 * cos(PI * u); }
function samplePose(move, t) {
  const keys = move.keys;
  const T = t % 1;
  let a = keys[keys.length - 1], b = keys[0], span = 1 - a.t + b.t, local = T + (T < a.t ? 1 : 0) - a.t;
  for (let i = 0; i < keys.length - 1; i++) {
    if (T >= keys[i].t && T < keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; span = b.t - a.t; local = T - a.t; break; }
  }
  const u = ease(span > 0 ? local / span : 0);
  const p = { ...BASE };
  for (const k of Object.keys(BASE)) {
    const va = a.p[k] ?? BASE[k], vb = b.p[k] ?? BASE[k];
    p[k] = va + (vb - va) * u;
  }
  if (move.spin) p.yaw += t * move.spin;      // continuous revolutions
  if (move.rootFn) move.rootFn(p, t % 1, t);   // extra root motion
  return p;
}

/* ---------------- the procedurally animated set ---------------- */
const D = 0.06; // default hip abduction
const MOVES = {
  "toprock.two_step": {
    bpm: 100, beats: 4,
    keys: [
      { t: 0.00, p: { y: 0.84, lHipF: 0.9, lKnee: 0.5, rHipF: -0.15, tYaw: 0.25, lShF: -0.7, lShA: 0.25, rShF: 0.9, rElb: 0.5, tPitch: 0.06 } },
      { t: 0.25, p: { y: 0.88, lHipF: 0.1, rHipF: 0.1, lShF: 0.25, rShF: 0.25, lShA: 0.5, rShA: 0.5 } },
      { t: 0.50, p: { y: 0.84, rHipF: 0.9, rKnee: 0.5, lHipF: -0.15, tYaw: -0.25, rShF: -0.7, rShA: 0.25, lShF: 0.9, lElb: 0.5, tPitch: 0.06 } },
      { t: 0.75, p: { y: 0.88, lHipF: 0.1, rHipF: 0.1, lShF: 0.25, rShF: 0.25, lShA: 0.5, rShA: 0.5 } },
    ],
    rootFn: (p, u) => { p.y += 0.015 * sin(u * TAU * 2); },
  },
  "toprock.indian_step": {
    bpm: 100, beats: 4,
    keys: [
      { t: 0.00, p: { y: 0.85, lHipF: 0.7, lHipA: 0.45, lKnee: 0.4, tRoll: 0.08, lShA: 0.9, rShA: 0.9, lShF: -0.3, rShF: -0.3 } },
      { t: 0.25, p: { y: 0.88, lHipF: 0.5, lHipA: -0.25, lKnee: 0.35, tYaw: 0.2, lShA: 0.15, rShA: 0.15, lElb: 0.6, rElb: 0.6 } },
      { t: 0.50, p: { y: 0.85, rHipF: 0.7, rHipA: 0.45, rKnee: 0.4, tRoll: -0.08, lShA: 0.9, rShA: 0.9, lShF: -0.3, rShF: -0.3 } },
      { t: 0.75, p: { y: 0.88, rHipF: 0.5, rHipA: -0.25, rKnee: 0.35, tYaw: -0.2, lShA: 0.15, rShA: 0.15, lElb: 0.6, rElb: 0.6 } },
    ],
  },
  "getdown.corkscrew": {
    bpm: 90, beats: 8, spin: TAU,
    keys: [
      { t: 0.00, p: { y: 0.86 } },
      { t: 0.35, p: { y: 0.45, tPitch: 0.5, lHipF: 1.5, rHipF: 1.5, lKnee: 1.9, rKnee: 1.9, lShF: 0.7, rShF: 0.7 } },
      { t: 0.55, p: { y: 0.3, tPitch: 0.7, lHipF: 1.9, rHipF: 1.9, lKnee: 2.3, rKnee: 2.3, lShF: 1.1, rShF: 1.1, lElb: 0.3, rElb: 0.3 } },
      { t: 0.8, p: { y: 0.6, tPitch: 0.25, lHipF: 0.9, rHipF: 0.9, lKnee: 1.1, rKnee: 1.1 } },
    ],
  },
  "footwork.six_step": {
    bpm: 96, beats: 6, spin: -TAU,
    keys: [
      { t: 0.00, p: { y: 0.36, tPitch: 0.85, lHipF: 1.3, lKnee: 2.3, rHipF: 0.45, rKnee: 0.1, rHipA: 0.4, lShF: -1.5, rShF: -1.3, lElb: 0.05, rElb: 0.05 } },
      { t: 0.17, p: { y: 0.34, tPitch: 0.9, lHipF: 1.35, lKnee: 2.3, rHipF: 1.0, rKnee: 1.2, rHipA: 0.55, lShF: -1.55, rShF: -1.2, lElb: 0.05, rElb: 0.05 } },
      { t: 0.33, p: { y: 0.36, tPitch: 0.85, rHipF: 1.3, rKnee: 2.3, lHipF: 0.45, lKnee: 0.1, lHipA: 0.5, lShF: -1.3, rShF: -1.5, lElb: 0.05, rElb: 0.05 } },
      { t: 0.5, p: { y: 0.34, tPitch: 0.8, rHipF: 1.35, rKnee: 2.25, lHipF: 0.9, lKnee: 0.9, lShF: -1.45, rShF: -1.45, lElb: 0.05, rElb: 0.05 } },
      { t: 0.67, p: { y: 0.36, tPitch: 0.85, lHipF: 1.25, lKnee: 2.2, rHipF: 0.5, rKnee: 0.2, rHipA: 0.3, lShF: -1.5, rShF: -1.35, lElb: 0.05, rElb: 0.05 } },
      { t: 0.83, p: { y: 0.34, tPitch: 0.9, lHipF: 1.3, lKnee: 2.2, rHipF: 1.15, rKnee: 1.1, lShF: -1.55, rShF: -1.25, lElb: 0.05, rElb: 0.05 } },
    ],
  },
  "footwork.cc": {
    bpm: 96, beats: 2,
    keys: [
      { t: 0.0, p: { y: 0.34, tPitch: 0.75, tYaw: 0.5, lHipF: 1.3, lKnee: 2.25, rHipF: 0.3, rKnee: 0.05, rHipA: 0.8, lShF: -1.4, lElb: 0.05, rShF: -0.4, rShA: 1.0, rElb: 0.3 } },
      { t: 0.5, p: { y: 0.34, tPitch: 0.75, tYaw: -0.5, rHipF: 1.3, rKnee: 2.25, lHipF: 0.3, lKnee: 0.05, lHipA: 0.8, rShF: -1.4, rElb: 0.05, lShF: -0.4, lShA: 1.0, lElb: 0.3 } },
    ],
  },
  "freeze.baby": {
    bpm: 60, beats: 4,
    keys: [
      { t: 0.0, p: { y: 0.34, pitch: 0.9, roll: 0.25, tPitch: 0.35, lHipF: 1.9, lKnee: 2.2, rHipF: 1.4, rKnee: 2.0, rHipA: 0.5, lShF: 1.5, lElb: 1.6, rShF: 1.6, rElb: 0.1 } },
      { t: 0.5, p: { y: 0.36, pitch: 0.92, roll: 0.28, tPitch: 0.35, lHipF: 1.85, lKnee: 2.15, rHipF: 1.5, rKnee: 2.05, rHipA: 0.55, lShF: 1.5, lElb: 1.6, rShF: 1.6, rElb: 0.1 } },
    ],
  },
  "freeze.chair": {
    bpm: 60, beats: 4,
    keys: [
      { t: 0.0, p: { y: 0.42, roll: 0.85, pitch: 0.25, tRoll: -0.3, lHipF: 1.2, lKnee: 1.5, rHipF: 0.6, rKnee: 0.9, rHipA: 0.6, rShF: 1.7, rElb: 1.7, lShF: -0.4, lShA: 0.7, lElb: 0.9 } },
      { t: 0.5, p: { y: 0.43, roll: 0.88, pitch: 0.27, tRoll: -0.3, lHipF: 1.25, lKnee: 1.55, rHipF: 0.62, rKnee: 0.9, rHipA: 0.62, rShF: 1.7, rElb: 1.7, lShF: -0.42, lShA: 0.72, lElb: 0.9 } },
    ],
  },
  "power.backspin": {
    bpm: 110, beats: 4, spin: 3 * TAU,
    keys: [
      { t: 0.0, p: { y: 0.24, pitch: -1.15, lHipF: 2.1, rHipF: 2.1, lKnee: 2.3, rKnee: 2.3, lShF: 1.3, rShF: 1.3, lElb: 1.9, rElb: 1.9, tPitch: 0.55 } },
      { t: 0.5, p: { y: 0.24, pitch: -1.15, lHipF: 2.0, rHipF: 2.2, lKnee: 2.2, rKnee: 2.35, lShF: 1.3, rShF: 1.3, lElb: 1.9, rElb: 1.9, tPitch: 0.55 } },
    ],
  },
  "power.windmill": {
    bpm: 112, beats: 4, spin: TAU,
    keys: [
      { t: 0.0, p: { y: 0.3, pitch: 1.35, lHipA: 1.1, rHipA: 1.1, lHipF: 0.35, rHipF: 0.35, lKnee: 0.05, rKnee: 0.05, lShF: 1.4, rShF: 1.4, lElb: 1.9, rElb: 1.9, tPitch: 0.35 } },
      { t: 0.5, p: { y: 0.26, pitch: 1.35, lHipA: 1.15, rHipA: 1.15, lHipF: 0.5, rHipF: 0.2, lKnee: 0.05, rKnee: 0.05, lShF: 1.5, rShF: 1.3, lElb: 1.9, rElb: 1.9, tPitch: 0.4 } },
    ],
    rootFn: (p, u, t) => { p.roll = sin(t * TAU) * 0.9; p.y += 0.05 * Math.abs(sin(t * TAU)); },
  },
  "power.swipes": {
    bpm: 104, beats: 4, spin: TAU,
    keys: [
      { t: 0.0, p: { y: 0.5, pitch: -0.7, tPitch: -0.3, lHipF: 0.9, rHipF: 0.9, lKnee: 1.2, rKnee: 1.2, lShF: -1.6, rShF: -1.6, lElb: -0.1, rElb: -0.1 } },
      { t: 0.45, p: { y: 0.34, pitch: -0.5, tPitch: -0.2, lHipF: 1.2, rHipF: 0.6, lKnee: 1.5, rKnee: 0.9, lShF: -1.7, rShF: -1.5 } },
      { t: 0.75, p: { y: 0.55, pitch: -0.8, tPitch: -0.35, lHipF: 0.7, rHipF: 1.1, lKnee: 1.0, rKnee: 1.4, lShF: -1.5, rShF: -1.7 } },
    ],
  },
  "power.headspin_taps": {
    bpm: 100, beats: 4, spin: 1.5 * TAU,
    keys: [
      { t: 0.0, p: { y: 1.02, pitch: PI, lHipA: 0.9, rHipA: 0.9, lHipF: 0.15, rHipF: 0.15, lKnee: 0.05, rKnee: 0.05, lShF: 0.6, rShF: 0.6, lShA: 1.15, rShA: 1.15, lElb: 0.9, rElb: 0.9 } },
      { t: 0.5, p: { y: 1.02, pitch: PI, lHipA: 1.05, rHipA: 0.75, lHipF: 0.25, rHipF: 0.1, lKnee: 0.05, rKnee: 0.05, lShF: 0.6, rShF: 0.6, lShA: 1.2, rShA: 1.1, lElb: 0.9, rElb: 0.9 } },
    ],
  },
  "power.flare": {
    bpm: 108, beats: 4, spin: TAU,
    keys: [
      { t: 0.0, p: { y: 0.6, tPitch: 1.15, lHipA: 1.2, rHipA: 1.2, lHipF: -0.3, rHipF: 0.5, lKnee: 0.05, rKnee: 0.05, lShF: 1.5, rShF: 1.5, lElb: 0.05, rElb: 0.05 } },
      { t: 0.5, p: { y: 0.66, tPitch: 1.05, lHipA: 1.25, rHipA: 1.25, lHipF: 0.5, rHipF: -0.3, lKnee: 0.05, rKnee: 0.05, lShF: 1.45, rShF: 1.55, lElb: 0.05, rElb: 0.05 } },
    ],
    rootFn: (p, u, t) => { p.x += 0.09 * cos(t * TAU); p.z += 0.09 * sin(t * TAU); },
  },
};

/* ---------------- real optical mocap clips (CMU subject 85) ---------------- */
function decodeClip(clip) {
  const bin = atob(clip.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const pos = new Int16Array(bytes.buffer); // millimeters
  const nJ = clip.joints.length;
  // drawable bones: parent links with real length; width by body part
  const bones = [];
  for (let j = 0; j < nJ; j++) {
    const p = clip.joints[j].parent;
    if (p < 0) continue;
    const dx = pos[j * 3] - pos[p * 3], dy = pos[j * 3 + 1] - pos[p * 3 + 1], dz = pos[j * 3 + 2] - pos[p * 3 + 2];
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 25) continue; // skip zero-length helper joints
    const n = clip.joints[j].name;
    const w = /Finger|Thumb|_end/.test(n) ? 2.5 : /Hand|Foot|Toe|Head/.test(n) ? 4 : /Arm|Leg/.test(n) ? 5 : 6.5;
    bones.push([p, j, w]);
  }
  const headEnd = clip.joints.findIndex((j) => j.name === "Head_end");
  return { ...clip, pos, nJ, bones, headEnd, duration: clip.nFrames / clip.fps };
}
const CAPTURES = {};
for (const c of capture85.clips) CAPTURES[c.id] = decodeClip(c);

function captureJoint(clip, frame, j) {
  const base = (frame * clip.nJ + j) * 3;
  return [clip.pos[base] / 1000, clip.pos[base + 1] / 1000, clip.pos[base + 2] / 1000];
}

/* ---------------- catalog ---------------- */
const FAMILY_LABELS = { toprock: "Toprock", getdown: "Get-downs", footwork: "Footwork", freeze: "Freezes", power: "Power", trick: "Tricks", musicality: "Musicality", culture: "Culture", meta: "Battle craft" };
const catalog = tree.nodes.filter((n) => ["move", "combo"].includes(n.type));

/* ---------------- viewer ---------------- */
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
let cam = { yaw: 0.7, pitch: 0.35, dist: 3.1, target: [0, 0.55, 0], auto: true };
let speed = 1, playing = true, t = 0, last = performance.now();
let currentId = "footwork.six_step";
const reelParam = new URLSearchParams(location.search).get("reel");
let reel = reelParam !== null;
const REEL_ORDER = reelParam === "capture" ? Object.keys(CAPTURES) : Object.keys(MOVES);
const REEL_SECONDS = (id) => CAPTURES[id] ? Math.min(CAPTURES[id].duration, 30) : 4.2;
let reelIdx = 0, reelTimer = 0;

function resize() {
  const r = canvas.getBoundingClientRect();
  canvas.width = r.width * devicePixelRatio;
  canvas.height = r.height * devicePixelRatio;
}
window.addEventListener("resize", resize);

function project(v) {
  // camera orbit around cam.target
  let p = [v[0] - cam.target[0], v[1] - cam.target[1], v[2] - cam.target[2]];
  p = rotY(p, -cam.yaw);
  p = rotX(p, -cam.pitch);
  const z = p[2] + cam.dist;
  const f = (canvas.height * 0.9) / Math.max(z, 0.1);
  return { x: canvas.width / 2 + p[0] * f, y: canvas.height * 0.52 - p[1] * f, z, f };
}

function drawFloor() {
  ctx.strokeStyle = "rgba(76,194,255,0.14)";
  ctx.lineWidth = 1 * devicePixelRatio;
  const N = 8, S = 0.5;
  const ox = Math.round(cam.target[0] / S) * S, oz = Math.round(cam.target[2] / S) * S;
  for (let i = -N; i <= N; i++) {
    for (const [a, b] of [
      [[ox + i * S, 0, oz - N * S], [ox + i * S, 0, oz + N * S]],
      [[ox - N * S, 0, oz + i * S], [ox + N * S, 0, oz + i * S]],
    ]) {
      const pa = project(a), pb = project(b);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    }
  }
}

function drawCapture(clip, frame) {
  const hips = captureJoint(clip, frame, 0);
  // smooth follow-cam on the dancer
  cam.target[0] += (hips[0] - cam.target[0]) * 0.08;
  cam.target[1] += (0.55 - cam.target[1]) * 0.08;
  cam.target[2] += (hips[2] - cam.target[2]) * 0.08;

  const sh = project([hips[0], 0, hips[2]]);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 0.4 * sh.f, 0.12 * sh.f, 0, 0, TAU); ctx.fill();

  const segs = clip.bones.map(([a, b, w]) => {
    const pa = project(captureJoint(clip, frame, a));
    const pb = project(captureJoint(clip, frame, b));
    return { pa, pb, w, depth: (pa.z + pb.z) / 2 };
  }).sort((s1, s2) => s2.depth - s1.depth);
  for (const s of segs) {
    const near = 1 - Math.min(1, Math.max(0, (s.depth - 2.2) / 2.6));
    ctx.strokeStyle = `rgba(76,194,255,${0.55 + 0.45 * near})`;
    ctx.lineCap = "round";
    ctx.lineWidth = s.w * devicePixelRatio * (s.pa.f / (canvas.height * 0.9)) * 7;
    ctx.beginPath(); ctx.moveTo(s.pa.x, s.pa.y); ctx.lineTo(s.pb.x, s.pb.y); ctx.stroke();
  }
  if (clip.headEnd >= 0) {
    const h = project(captureJoint(clip, frame, clip.headEnd));
    ctx.fillStyle = "#4cc2ff";
    ctx.beginPath(); ctx.arc(h.x, h.y, 0.085 * h.f, 0, TAU); ctx.fill();
  }
}

function drawFigure(J) {
  // soft shadow
  const sh = project([J.pelvis[0], 0, J.pelvis[2]]);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 0.42 * sh.f, 0.13 * sh.f, 0, 0, TAU); ctx.fill();

  const segs = BONES.map(([a, b, w]) => {
    const pa = project(J[a]), pb = project(J[b]);
    return { pa, pb, w, depth: (pa.z + pb.z) / 2 };
  }).sort((s1, s2) => s2.depth - s1.depth);
  for (const s of segs) {
    const near = 1 - Math.min(1, Math.max(0, (s.depth - 2.2) / 2.2));
    ctx.strokeStyle = `rgba(245,166,35,${0.55 + 0.45 * near})`;
    ctx.lineCap = "round";
    ctx.lineWidth = s.w * devicePixelRatio * (s.pa.f / (canvas.height * 0.9)) * 7;
    ctx.beginPath(); ctx.moveTo(s.pa.x, s.pa.y); ctx.lineTo(s.pb.x, s.pb.y); ctx.stroke();
  }
  const h = project(J.head);
  ctx.fillStyle = "#f5a623";
  ctx.beginPath(); ctx.arc(h.x, h.y, DIM.headR * h.f, 0, TAU); ctx.fill();
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const move = MOVES[currentId];
  const cap = CAPTURES[currentId];
  if (playing) {
    if (move) t += (dt / ((move.beats * 60) / move.bpm)) * speed;
    else if (cap) t += dt * speed; // seconds for captures
  }
  if (cam.auto) cam.yaw += dt * 0.35;
  if (reel) {
    reelTimer += dt;
    if (reelTimer > REEL_SECONDS(REEL_ORDER[reelIdx])) {
      reelTimer = 0; reelIdx = (reelIdx + 1) % REEL_ORDER.length; select(REEL_ORDER[reelIdx]);
    }
  }
  ctx.fillStyle = "#0d0f14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawFloor();
  if (cap) {
    drawCapture(cap, Math.floor(t * cap.fps) % cap.nFrames);
  } else {
    // ease the follow-cam back to the origin for procedural moves
    cam.target[0] *= 0.92; cam.target[2] *= 0.92;
    cam.target[1] += (0.55 - cam.target[1]) * 0.08;
    if (move) drawFigure(clampGround(fk(samplePose(move, t))));
  }
  requestAnimationFrame(frame);
}

/* ---------------- UI ---------------- */
function select(id) {
  currentId = id;
  t = 0;
  const cap = CAPTURES[id];
  const animated = Boolean(MOVES[id]);
  const n = catalog.find((c) => c.id === id);
  document.getElementById("move-name").textContent = cap ? cap.name : (n?.name ?? id);
  document.getElementById("move-meta").innerHTML = cap
    ? `<span class="badge star">★ real optical mocap</span> CMU Graphics Lab, subject 85 (pro breaker, marker stage) · ${Math.round(cap.duration)}s · this is the "finished version" motion quality`
    : animated
      ? `<span class="badge ok">procedural v1 · $0</span> ${MOVES[id].bpm} BPM · ${MOVES[id].beats}-count loop · drag to orbit`
      : `<span class="badge queue">factory queue</span> lane: self-capture (Doc 08) — phone rig → FreeMoCap → Blender → GLB`;
  if (!animated && !cap) currentId = null; // show empty stage note
  document.getElementById("empty").style.display = (animated || cap) ? "none" : "grid";
  document.querySelectorAll(".mv").forEach((el) => el.classList.toggle("sel", el.dataset.id === id));
}

function buildList() {
  const box = document.getElementById("list");
  const fams = [...new Set(catalog.map((n) => n.family))];
  const capGroup = `<div class="fam-group"><h3>★ Studio capture — the finished look</h3>` +
    Object.values(CAPTURES).map((c) =>
      `<button class="mv anim cap" data-id="${c.id}"><span>${c.name}</span><em>★ mocap</em></button>`).join("") +
    `</div>`;
  box.innerHTML = capGroup + fams.map((f) => {
    const rows = catalog.filter((n) => n.family === f).map((n) => {
      const anim = Boolean(MOVES[n.id]);
      return `<button class="mv ${anim ? "anim" : ""}" data-id="${n.id}">
        <span>${n.name}</span><em>${anim ? "▶ v1" : "queued"}</em></button>`;
    }).join("");
    return `<div class="fam-group"><h3>${FAMILY_LABELS[f] ?? f}</h3>${rows}</div>`;
  }).join("");
  box.querySelectorAll(".mv").forEach((el) => el.addEventListener("click", () => { reel = false; select(el.dataset.id); }));
  const counts = `${catalog.length} moves in the library · ${Object.keys(CAPTURES).length} real studio-mocap clips (CMU) · ${Object.keys(MOVES).length} procedural v1 · ${catalog.length - Object.keys(MOVES).length} in the factory queue`;
  document.getElementById("counts").textContent = counts;
}

canvas.addEventListener("pointerdown", (e) => {
  cam.auto = false;
  const start = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch };
  const move = (ev) => {
    cam.yaw = start.yaw + (ev.clientX - start.x) * 0.008;
    cam.pitch = Math.max(-0.1, Math.min(1.2, start.pitch + (ev.clientY - start.y) * 0.006));
  };
  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
});
document.getElementById("play").addEventListener("click", (e) => { playing = !playing; e.target.textContent = playing ? "⏸" : "▶"; });
document.getElementById("speed").addEventListener("input", (e) => {
  speed = Number(e.target.value);
  document.getElementById("speedv").textContent = `${speed.toFixed(2)}×`;
});
document.getElementById("orbit").addEventListener("click", () => { cam.auto = !cam.auto; });

resize();
buildList();
select(reel ? REEL_ORDER[0] : "footwork.six_step");
requestAnimationFrame(frame);
