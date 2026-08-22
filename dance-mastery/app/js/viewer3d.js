// Shared zero-dependency 3D viewer: FK skeleton for procedural moves,
// position playback for real capture clips, canvas projection + drawing.
// Used by library.js (catalog) and learn.js (lesson player).

export const cos = Math.cos, sin = Math.sin, PI = Math.PI, TAU = PI * 2;
export function rotX(v, a) { return [v[0], v[1] * cos(a) - v[2] * sin(a), v[1] * sin(a) + v[2] * cos(a)]; }
export function rotY(v, a) { return [v[0] * cos(a) + v[2] * sin(a), v[1], -v[0] * sin(a) + v[2] * cos(a)]; }
export function rotZ(v, a) { return [v[0] * cos(a) - v[1] * sin(a), v[0] * sin(a) + v[1] * cos(a), v[2]]; }
export function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
export function scale(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
export function orient(v, yaw, pitch, roll) { return rotY(rotX(rotZ(v, roll), pitch), yaw); }

/* ---------------- stylized FK skeleton ---------------- */
export const DIM = { hipW: 0.11, torso: 0.48, neck: 0.07, headR: 0.105, shW: 0.21, upArm: 0.27, foreArm: 0.25, thigh: 0.42, shin: 0.41, foot: 0.12 };

export const BASE = {
  x: 0, y: 0.86, z: 0, yaw: 0, pitch: 0, roll: 0,
  tPitch: 0, tYaw: 0, tRoll: 0,
  lHipF: 0, lHipA: 0.06, lKnee: 0.06, rHipF: 0, rHipA: 0.06, rKnee: 0.06,
  lShF: 0.1, lShA: 0.12, lElb: 0.25, rShF: 0.1, rShA: 0.12, rElb: 0.25,
};

export function fk(p) {
  const R = (v) => orient(v, p.yaw, p.pitch, p.roll);
  const RT = (v) => R(orient(v, p.tYaw, p.tPitch, p.tRoll));
  const pelvis = [p.x, p.y, p.z];
  const chest = add(pelvis, scale(RT([0, 1, 0]), DIM.torso));
  const head = add(chest, scale(RT([0, 1, 0]), DIM.neck + DIM.headR));
  const J = { pelvis, chest, head };
  for (const [side, sgn] of [["l", -1], ["r", 1]]) {
    const hip = add(pelvis, R([sgn * DIM.hipW, -0.03, 0]));
    const hf = p[side + "HipF"], ha = p[side + "HipA"], kn = p[side + "Knee"];
    const thighDir = R(rotZ(rotX([0, -1, 0], hf), sgn * ha));
    const knee = add(hip, scale(thighDir, DIM.thigh));
    const shinDir = R(rotZ(rotX([0, -1, 0], hf + kn), sgn * ha));
    const ankle = add(knee, scale(shinDir, DIM.shin));
    const toe = add(ankle, scale(R(rotZ(rotX([0, 0, 1], hf + kn), sgn * ha)), DIM.foot));
    J[side + "Hip"] = hip; J[side + "Knee"] = knee; J[side + "Ankle"] = ankle; J[side + "Toe"] = toe;
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

// Cheap contact solver: the lowest body point always touches the floor.
export function clampGround(J) {
  let min = Infinity;
  for (const v of Object.values(J)) min = Math.min(min, v[1]);
  const dy = 0.02 - min;
  for (const v of Object.values(J)) v[1] += dy;
  return J;
}

export const BONES = [
  ["pelvis", "chest", 7.5], ["chest", "head", 5],
  ["lHip", "lKnee", 6], ["lKnee", "lAnkle", 5], ["lAnkle", "lToe", 4],
  ["rHip", "rKnee", 6], ["rKnee", "rAnkle", 5], ["rAnkle", "rToe", 4],
  ["lSh", "lElbow", 5], ["lElbow", "lHand", 4],
  ["rSh", "rElbow", 5], ["rElbow", "rHand", 4],
  ["lHip", "rHip", 6], ["lSh", "rSh", 6],
];

/* ---------------- keyframe sampling ---------------- */
function ease(u) { return 0.5 - 0.5 * cos(PI * u); }
export function samplePose(move, t) {
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
  if (move.spin) p.yaw += t * move.spin;
  if (move.rootFn) move.rootFn(p, t % 1, t);
  return p;
}

/* ---------------- capture clips ---------------- */
export function decodeClip(clip) {
  const bin = atob(clip.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const pos = new Int16Array(bytes.buffer);
  const nJ = clip.joints.length;
  const bones = [];
  for (let j = 0; j < nJ; j++) {
    const p = clip.joints[j].parent;
    if (p < 0) continue;
    const dx = pos[j * 3] - pos[p * 3], dy = pos[j * 3 + 1] - pos[p * 3 + 1], dz = pos[j * 3 + 2] - pos[p * 3 + 2];
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 25) continue;
    const n = clip.joints[j].name;
    const w = /Finger|Thumb|_end/.test(n) ? 2.5 : /Hand|Foot|Toe|Head/.test(n) ? 4 : /Arm|Leg/.test(n) ? 5 : 6.5;
    bones.push([p, j, w]);
  }
  const headEnd = clip.joints.findIndex((j) => j.name === "Head_end");
  return { ...clip, pos, nJ, bones, headEnd, duration: clip.nFrames / clip.fps };
}

export function captureJoint(clip, frame, j) {
  const base = (frame * clip.nJ + j) * 3;
  return [clip.pos[base] / 1000, clip.pos[base + 1] / 1000, clip.pos[base + 2] / 1000];
}

/* ---------------- the viewer ---------------- */
export class Viewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.cam = { yaw: 0.7, pitch: 0.35, dist: 3.1, target: [0, 0.55, 0], auto: true };
    this.colors = { proc: "245,166,35", cap: "76,194,255" };
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, r.width * devicePixelRatio);
    this.canvas.height = Math.max(1, r.height * devicePixelRatio);
  }

  attachOrbit() {
    this.canvas.addEventListener("pointerdown", (e) => {
      this.cam.auto = false;
      const start = { x: e.clientX, y: e.clientY, yaw: this.cam.yaw, pitch: this.cam.pitch };
      const move = (ev) => {
        this.cam.yaw = start.yaw + (ev.clientX - start.x) * 0.008;
        this.cam.pitch = Math.max(-0.1, Math.min(1.2, start.pitch + (ev.clientY - start.y) * 0.006));
      };
      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    });
  }

  project(v) {
    const c = this.cam;
    let p = [v[0] - c.target[0], v[1] - c.target[1], v[2] - c.target[2]];
    p = rotY(p, -c.yaw);
    p = rotX(p, -c.pitch);
    const z = p[2] + c.dist;
    const f = (this.canvas.height * 0.9) / Math.max(z, 0.1);
    return { x: this.canvas.width / 2 + p[0] * f, y: this.canvas.height * 0.52 - p[1] * f, z, f };
  }

  begin(dt) {
    if (this.cam.auto) this.cam.yaw += dt * 0.35;
    const { ctx, canvas } = this;
    ctx.fillStyle = "#0d0f14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(76,194,255,0.14)";
    ctx.lineWidth = 1 * devicePixelRatio;
    const N = 8, S = 0.5;
    const ox = Math.round(this.cam.target[0] / S) * S, oz = Math.round(this.cam.target[2] / S) * S;
    for (let i = -N; i <= N; i++) {
      for (const [a, b] of [
        [[ox + i * S, 0, oz - N * S], [ox + i * S, 0, oz + N * S]],
        [[ox - N * S, 0, oz + i * S], [ox + N * S, 0, oz + i * S]],
      ]) {
        const pa = this.project(a), pb = this.project(b);
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      }
    }
  }

  #shadow(x, z) {
    const sh = this.project([x, 0, z]);
    this.ctx.fillStyle = "rgba(0,0,0,0.45)";
    this.ctx.beginPath();
    this.ctx.ellipse(sh.x, sh.y, 0.4 * sh.f, 0.12 * sh.f, 0, 0, TAU);
    this.ctx.fill();
  }

  #segs(segs, rgb) {
    const { ctx, canvas } = this;
    segs.sort((s1, s2) => s2.depth - s1.depth);
    for (const s of segs) {
      const near = 1 - Math.min(1, Math.max(0, (s.depth - 2.2) / 2.6));
      ctx.strokeStyle = `rgba(${rgb},${0.55 + 0.45 * near})`;
      ctx.lineCap = "round";
      ctx.lineWidth = s.w * devicePixelRatio * (s.pa.f / (canvas.height * 0.9)) * 7;
      ctx.beginPath(); ctx.moveTo(s.pa.x, s.pa.y); ctx.lineTo(s.pb.x, s.pb.y); ctx.stroke();
    }
  }

  renderProcedural(move, t) {
    // follow-cam eases home for the in-place stylized figure
    this.cam.target[0] *= 0.92; this.cam.target[2] *= 0.92;
    this.cam.target[1] += (0.55 - this.cam.target[1]) * 0.08;
    const J = clampGround(fk(samplePose(move, t)));
    this.#shadow(J.pelvis[0], J.pelvis[2]);
    this.#segs(BONES.map(([a, b, w]) => {
      const pa = this.project(J[a]), pb = this.project(J[b]);
      return { pa, pb, w, depth: (pa.z + pb.z) / 2 };
    }), this.colors.proc);
    const h = this.project(J.head);
    this.ctx.fillStyle = "#f5a623";
    this.ctx.beginPath(); this.ctx.arc(h.x, h.y, DIM.headR * h.f, 0, TAU); this.ctx.fill();
  }

  renderCapture(clip, frame) {
    const hips = captureJoint(clip, frame, 0);
    this.cam.target[0] += (hips[0] - this.cam.target[0]) * 0.08;
    this.cam.target[1] += (0.55 - this.cam.target[1]) * 0.08;
    this.cam.target[2] += (hips[2] - this.cam.target[2]) * 0.08;
    this.#shadow(hips[0], hips[2]);
    this.#segs(clip.bones.map(([a, b, w]) => {
      const pa = this.project(captureJoint(clip, frame, a));
      const pb = this.project(captureJoint(clip, frame, b));
      return { pa, pb, w, depth: (pa.z + pb.z) / 2 };
    }), this.colors.cap);
    if (clip.headEnd >= 0) {
      const h = this.project(captureJoint(clip, frame, clip.headEnd));
      this.ctx.fillStyle = "#4cc2ff";
      this.ctx.beginPath(); this.ctx.arc(h.x, h.y, 0.085 * h.f, 0, TAU); this.ctx.fill();
    }
  }
}
