// The Practice Mirror (Phase B2): Tier-1 live feedback + Tier-3 record & review.
// Honesty rules from Doc 06 §4 are enforced here: every verdict passes the
// visibility gate first, and when the camera can't see you, the app says so
// instead of scoring.

import tree from "./data/breaking.js";
import capture85 from "./data/capture85.js";
import poseRefs, { CHANNELS } from "./data/pose-refs.js";
import {
  fromMediaPipe, normalizePose, angleFeatures, visibilityGate,
  dtw, dtwScore, channelDeviation, detectTempo, tempoVerdict, stillness,
} from "./engine/pose.js";
import { CameraPoseSource, ReplayPoseSource } from "./pose-runtime.js";
import { Viewer, decodeClip } from "./viewer3d.js";
import { MOVES } from "./moves3d.js";

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const FPS = 30;

const CHANNEL_NAMES = {
  elbowL: "left elbow", elbowR: "right elbow", kneeL: "left knee", kneeR: "right knee",
  hipL: "left hip fold", hipR: "right hip fold", torso: "torso lean",
};
const GATE_COPY = {
  no_pose: "Looking for you…",
  low_visibility: "I can't see you well — add light, face the camera.",
  missing_points: "I can't see your whole body yet.",
  out_of_frame: "Step back — get your whole body in frame.",
};

const CAPTURE_NAMES = {};
for (const c of capture85.clips) CAPTURE_NAMES[c.id] = c.name;
function moveName(id) {
  return CAPTURE_NAMES[id] ?? tree.nodes.find((n) => n.id === id)?.name ?? id;
}

/* ---------------- move selection ---------------- */
let moveId = params.get("move") && poseRefs[params.get("move")] ? params.get("move") : "toprock.two_step";
$("#move").innerHTML = Object.keys(poseRefs).map((id) =>
  `<option value="${id}" ${id === moveId ? "selected" : ""}>${moveName(id)}${poseRefs[id].source === "capture" ? " ★" : ""}</option>`).join("");
$("#move").addEventListener("change", (e) => { moveId = e.target.value; resetBuffers(); syncMoveUi(); });

function ref() { return poseRefs[moveId]; }
function targetBpm() { return ref().bpm ?? 96; }

/* ---------------- pose stream + buffers ---------------- */
const stage = $("#stage");
const sctx = stage.getContext("2d");
const video = $("#cam");
let source = null, demo = params.has("demo");
let lastLm = null, lastGate = { ok: false, reason: "no_pose" };

const buf = { t: [], hipY: [], poses: [], angles: [] }; // rolling ~10s
function resetBuffers() { buf.t = []; buf.hipY = []; buf.poses = []; buf.angles = []; }
// pose frames arrive at rAF rate, not a fixed fps — measure it
function effFps() {
  const n = buf.t.length;
  if (n < 10) return FPS;
  return Math.max(10, Math.min(120, (1000 * (n - 1)) / (buf.t[n - 1] - buf.t[0])));
}
function pushFrame(ts, pose) {
  const cutoff = ts - 10000;
  while (buf.t.length && buf.t[0] < cutoff) {
    buf.t.shift(); buf.hipY.shift(); buf.poses.shift(); buf.angles.shift();
  }
  buf.t.push(ts);
  buf.hipY.push((pose.kp.hipL[1] + pose.kp.hipR[1]) / 2);
  const norm = normalizePose(pose);
  buf.poses.push(norm);
  buf.angles.push(angleFeatures(norm));
}

function onLandmarks(lm, ts) {
  lastLm = lm;
  const pose = fromMediaPipe(lm);
  lastGate = visibilityGate(pose);
  if (lastGate.ok) pushFrame(ts, pose);
  if (recording && lastGate.ok) recording.angles.push(angleFeatures(normalizePose(pose)));
}

/* ---------------- stage drawing ---------------- */
const LINKS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
function drawStage() {
  const w = stage.width = stage.clientWidth * devicePixelRatio;
  const h = stage.height = stage.clientHeight * devicePixelRatio;
  sctx.clearRect(0, 0, w, h);
  if (!demo && video.readyState >= 2) {
    // mirror the camera like a real mirror
    sctx.save(); sctx.scale(-1, 1); sctx.drawImage(video, -w, 0, w, h); sctx.restore();
  } else {
    sctx.fillStyle = "#0d0f14"; sctx.fillRect(0, 0, w, h);
  }
  if (lastLm) {
    const px = (l) => [(demo ? l.x : 1 - l.x) * w, l.y * h];
    sctx.lineCap = "round";
    for (const [a, b] of LINKS) {
      const la = lastLm[a], lb = lastLm[b];
      if (!la || !lb || la.visibility < 0.4 || lb.visibility < 0.4) continue;
      const [ax, ay] = px(la), [bx, by] = px(lb);
      sctx.strokeStyle = lastGate.ok ? "rgba(56,193,114,0.9)" : "rgba(139,148,171,0.6)";
      sctx.lineWidth = 5 * devicePixelRatio;
      sctx.beginPath(); sctx.moveTo(ax, ay); sctx.lineTo(bx, by); sctx.stroke();
    }
  }
  const banner = $("#gate");
  if (!lastGate.ok) { banner.textContent = GATE_COPY[lastGate.reason] ?? "…"; banner.style.display = "block"; }
  else banner.style.display = "none";
  requestAnimationFrame(drawStage);
}

/* ---------------- modes ---------------- */
let mode = "tempo";
function setMode(m) {
  mode = m;
  document.querySelectorAll("[data-pmode]").forEach((b) => b.classList.toggle("active", b.dataset.pmode === m));
  $("#panel-tempo").style.display = m === "tempo" ? "block" : "none";
  $("#panel-freeze").style.display = m === "freeze" ? "block" : "none";
  $("#panel-check").style.display = m === "check" ? "block" : "none";
  $("#panel-review").style.display = m === "review" ? "block" : "none";
}
document.querySelectorAll("[data-pmode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.pmode)));

function syncMoveUi() {
  $("#target-bpm").textContent = `${targetBpm()} BPM target`;
  $("#check-name").textContent = moveName(moveId);
  buildCheckpoints();
}

// Tempo (groove) — evaluated twice a second over the last 6 seconds
setInterval(() => {
  if (mode !== "tempo") return;
  const fps = effFps();
  const n = buf.hipY.length;
  const win = Math.min(n, Math.round(6 * fps));
  if (win < fps * 2 || !lastGate.ok) { $("#bpm").textContent = "—"; $("#beat-pill").className = "pill"; $("#beat-pill").textContent = "listening to your bounce…"; return; }
  const r = detectTempo(buf.hipY.slice(n - win), fps);
  $("#bpm").textContent = r.bpm ? `${r.bpm}` : "—";
  const v = tempoVerdict(r.bpm, targetBpm());
  const pill = $("#beat-pill");
  if (!r.bpm) { pill.className = "pill"; pill.textContent = "keep bouncing — bigger, steadier"; }
  else if (v.onBeat) { pill.className = "pill good"; pill.textContent = "ON BEAT"; }
  else { pill.className = "pill bad"; pill.textContent = `off by ${(v.offBy * 100).toFixed(0)}% — ride the ${targetBpm()}`; }
}, 500);

// Freeze — live hold timer
let bestHold = 0;
setInterval(() => {
  if (mode !== "freeze") return;
  const fps = effFps();
  const r = stillness(buf.poses.slice(-Math.round(8 * fps)), fps);
  bestHold = Math.max(bestHold, r.longest);
  $("#hold").textContent = r.activeRun >= 0.4 ? `${r.activeRun.toFixed(1)}s` : "0.0s";
  $("#hold").classList.toggle("good", r.activeRun >= 3);
  $("#hold-best").textContent = `best: ${bestHold.toFixed(1)}s · goal: 3.0s on beat`;
}, 250);

// Move check — record one rep, DTW against the reference
let recording = null;
$("#rec-rep").addEventListener("click", () => {
  if (recording) return finishRep();
  const durMs = Math.min(10000, (ref().frames.length / ref().fps) * 1800);
  recording = { angles: [], timer: setTimeout(finishRep, durMs) };
  $("#rec-rep").textContent = "⏹ Stop";
  $("#check-result").innerHTML = `<p class="muted">Recording… do the move now.</p>`;
});
function finishRep() {
  clearTimeout(recording.timer);
  const frames = recording.angles;
  recording = null;
  $("#rec-rep").textContent = "● Record a rep";
  if (frames.length < FPS) {
    $("#check-result").innerHTML = `<p class="muted">I didn't see enough clean frames — check the framing note above and try again.</p>`;
    return;
  }
  const { dist } = dtw(frames, ref().frames);
  const score = dtwScore(dist);
  const dev = channelDeviation(frames, ref().frames)
    .filter((d) => Number.isFinite(d.deg))
    .sort((a, b) => b.deg - a.deg)
    .slice(0, 2);
  const grade = score >= 80 ? ["good", "Clean — log it in Today"] : score >= 55 ? ["mid", "Getting there — drill at 75%"] : ["bad", "Rough — back to 50% tempo, watch the reference"];
  const callouts = score >= 80 ? [] : dev; // a clean rep doesn't need nitpicks
  $("#check-result").innerHTML = `
    <div class="score ${grade[0]}">${score}</div>
    <p class="verdict">${grade[1]}</p>
    ${callouts.map((d) => `<p class="muted">watch your <strong>${CHANNEL_NAMES[d.channel]}</strong> (±${d.deg.toFixed(0)}°)</p>`).join("")}
    <p class="tiny">Tier-1 estimate on ${frames.length} clean frames vs the ${poseRefs[moveId].source === "capture" ? "mocap" : "instructor"} reference. Camera scoring is honest, not perfect — your eyes in review mode are the judge.</p>`;
}

/* ---------------- Tier 3: record & review ---------------- */
let mediaRec = null, chunks = [], reviewViewer = null, reviewT = 0, reviewMove = null, reviewCap = null;
$("#rec-clip").addEventListener("click", () => {
  if (mediaRec) { mediaRec.stop(); return; }
  const stream = demo || !video.srcObject ? stage.captureStream(30) : video.srcObject;
  chunks = [];
  mediaRec = new MediaRecorder(stream, { mimeType: "video/webm" });
  mediaRec.ondataavailable = (e) => chunks.push(e.data);
  mediaRec.onstop = () => {
    const url = URL.createObjectURL(new Blob(chunks, { type: "video/webm" }));
    $("#review-video").src = url;
    $("#review-video").loop = true;
    $("#review-video").play().catch(() => {});
    $("#review-stage-wrap").style.display = "grid";
    mediaRec = null;
    $("#rec-clip").textContent = "● Record (max 20s)";
    startReviewReference();
  };
  mediaRec.start();
  $("#rec-clip").textContent = "⏹ Stop & review";
  setTimeout(() => mediaRec && mediaRec.stop(), 20000);
});

function startReviewReference() {
  if (!reviewViewer) {
    reviewViewer = new Viewer($("#review-stage"));
    reviewViewer.attachOrbit();
    reviewViewer.cam.auto = false;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const speed = Number($("#review-speed").value);
      reviewT += dt * speed;
      reviewViewer.begin(dt);
      if (reviewCap) reviewViewer.renderCapture(reviewCap, Math.floor(reviewT * reviewCap.fps) % reviewCap.nFrames);
      else if (reviewMove) reviewViewer.renderProcedural(reviewMove, reviewT / ((reviewMove.beats * 60) / reviewMove.bpm));
      $("#review-video").playbackRate = speed;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  reviewMove = MOVES[moveId] ?? null;
  reviewCap = null;
  if (!reviewMove) {
    const raw = capture85.clips.find((c) => c.id === moveId);
    if (raw) reviewCap = decodeClip(raw);
  }
}

function buildCheckpoints() {
  const node = tree.nodes.find((n) => n.id === moveId);
  const cps = node?.checkpoints ?? [];
  $("#review-cps").innerHTML = cps.length
    ? `<h4>Walk the checkpoints</h4>` + cps.map((c, i) => `<label class="cp"><input type="checkbox"> ${i + 1}. ${c}</label>`).join("")
    : `<p class="muted">No checkpoint list for this clip — compare shapes and timing side by side.</p>`;
}

/* ---------------- source startup ---------------- */
async function startCamera() {
  try {
    source = new CameraPoseSource({ vendorBase: "vendor" });
    await source.init(video);
    source.start(onLandmarks);
    $("#src-note").textContent = "live camera · pose runs on this device — nothing is uploaded";
  } catch (e) {
    $("#src-note").innerHTML = `camera/model unavailable (${e.message.slice(0, 60)}…) — <button id="go-demo">use demo mode</button> or run <code>node scripts/fetch-models.mjs</code>`;
    document.getElementById("go-demo")?.addEventListener("click", startDemo);
  }
}
function startDemo() {
  demo = true;
  source?.stop?.();
  const raw = capture85.clips.find((c) => c.id === (poseRefs[moveId]?.source === "capture" ? moveId : "capture.85_11"));
  source = new ReplayPoseSource(raw);
  source.start(onLandmarks);
  $("#src-note").textContent = `demo mode · replaying "${raw.name}" through the full feedback pipeline`;
}

syncMoveUi();
setMode(params.get("mode") ?? "tempo");
requestAnimationFrame(drawStage);
if (demo) startDemo(); else startCamera();
