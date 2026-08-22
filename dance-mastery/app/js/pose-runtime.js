// Pose sources for the Practice Mirror. Both emit MediaPipe-style 33-landmark
// arrays via cb(landmarks|null, tsMs), so the scoring pipeline is identical
// whether frames come from the camera or a replayed capture clip.

import { decodeClip, captureJoint } from "./viewer3d.js";

/* ---------------- live camera via MediaPipe tasks-vision ----------------
   Requires vendored runtime (run: node scripts/fetch-models.mjs). */
export class CameraPoseSource {
  constructor({ vendorBase = "vendor" } = {}) {
    this.vendorBase = vendorBase;
    this.running = false;
  }

  async init(videoEl) {
    this.video = videoEl;
    const vision = await import(`../${this.vendorBase}/vision_bundle.mjs`);
    const fileset = await vision.FilesetResolver.forVisionTasks(`${this.vendorBase}/wasm`);
    this.landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: `${this.vendorBase}/pose_landmarker_lite.task`, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
      audio: false,
    });
    videoEl.srcObject = stream;
    await videoEl.play();
    this.stream = stream;
  }

  start(cb) {
    this.running = true;
    let lastTs = -1;
    const loop = () => {
      if (!this.running) return;
      const ts = performance.now();
      if (this.video.readyState >= 2 && ts !== lastTs) {
        lastTs = ts;
        const res = this.landmarker.detectForVideo(this.video, ts);
        cb(res.landmarks?.[0] ?? null, ts);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    this.stream?.getTracks().forEach((t) => t.stop());
  }
}

/* ---------------- replay source (demo mode / testing) ----------------
   Streams a capture clip as synthetic landmarks — the whole feedback
   pipeline runs end-to-end with no camera and no ML runtime. */
const CMU_TO_MP = [
  ["Head_end", 0],
  ["LeftArm", 11], ["RightArm", 12],
  ["LeftForeArm", 13], ["RightForeArm", 14],
  ["LeftHand", 15], ["RightHand", 16],
  ["LeftUpLeg", 23], ["RightUpLeg", 24],
  ["LeftLeg", 25], ["RightLeg", 26],
  ["LeftFoot", 27], ["RightFoot", 28],
];

export class ReplayPoseSource {
  constructor(rawClip, { speed = 1 } = {}) {
    this.clip = decodeClip(rawClip);
    this.speed = speed;
    this.idx = {};
    this.clip.joints.forEach((j, i) => { this.idx[j.name] = i; });
    // fixed framing: fit the whole clip's XY extent into image space
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let f = 0; f < this.clip.nFrames; f += 3) {
      for (const [cmu] of CMU_TO_MP) {
        const j = this.idx[cmu];
        if (j === undefined) continue;
        const p = captureJoint(this.clip, f, j);
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      }
    }
    const span = Math.max(maxX - minX, maxY - minY) || 1;
    this.view = { minX, maxY, span: span * 1.25, padX: (span * 1.25 - (maxX - minX)) / 2, padY: (span * 1.25 - (maxY - minY)) / 2 };
    this.running = false;
  }

  landmarksAt(frame) {
    const lm = Array.from({ length: 33 }, () => ({ x: -1, y: -1, z: 0, visibility: 0 }));
    for (const [cmu, mpIdx] of CMU_TO_MP) {
      const j = this.idx[cmu];
      if (j === undefined) continue;
      const p = captureJoint(this.clip, frame, j);
      lm[mpIdx] = {
        x: (p[0] - this.view.minX + this.view.padX) / this.view.span,
        y: (this.view.maxY - p[1] + this.view.padY) / this.view.span,
        z: p[2] * 0.2,
        visibility: 0.95,
      };
    }
    return lm;
  }

  start(cb) {
    this.running = true;
    const t0 = performance.now();
    const loop = () => {
      if (!this.running) return;
      const ts = performance.now();
      const frame = Math.floor(((ts - t0) / 1000) * this.clip.fps * this.speed) % this.clip.nFrames;
      cb(this.landmarksAt(frame), ts);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() { this.running = false; }
}
