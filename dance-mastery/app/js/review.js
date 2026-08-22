// Tier-2 review viewer: loads a report.json produced by tools/analyze.sh and
// renders the verdict, the deviation timeline, and a synced replay of your
// skeleton next to the reference.

import tree from "./data/breaking.js";
import capture85 from "./data/capture85.js";
import { Viewer, decodeClip } from "./viewer3d.js";
import { MOVES } from "./moves3d.js";

const $ = (s) => document.querySelector(s);
const CHANNEL_NAMES = {
  elbowL: "left elbow", elbowR: "right elbow", kneeL: "left knee", kneeR: "right knee",
  hipL: "left hip fold", hipR: "right hip fold", torso: "torso lean",
};
const GRADE_COPY = {
  clean: ["good", "Clean — log it in Today and raise the tempo."],
  getting_there: ["mid", "Getting there — drill the flagged seconds at 75%."],
  rough: ["bad", "Rough — back to 50% tempo; walk the checkpoints in the lesson first."],
};

let report = null, playT = 0, playing = true, speed = 0.5;
let refViewer = null, refMove = null, refCap = null;

/* ---------------- loading ---------------- */
async function loadFromUrl(src) {
  try { render(await (await fetch(src)).json()); }
  catch (e) { $("#drop").textContent = `Couldn't load ${src}: ${e.message}`; }
}
$("#file").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (f) render(JSON.parse(await f.text()));
});
document.body.addEventListener("dragover", (e) => e.preventDefault());
document.body.addEventListener("drop", async (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f) render(JSON.parse(await f.text()));
});

/* ---------------- verdict ---------------- */
function render(r) {
  report = r;
  $("#drop").style.display = "none";
  $("#content").style.display = "grid";
  $("#move-name").textContent = r.moveName;
  $("#meta").textContent = `${r.source} · ${r.model} · ${r.gate.clean}/${r.gate.total} clean frames`;

  if (r.verdict !== "scored") {
    $("#verdict").innerHTML = `<div class="score bad">—</div><p class="verdict-line">${r.note}</p>
      <p class="muted">gate: ${Object.entries(r.gate.reasons).map(([k, v]) => `${k} ×${v}`).join(" · ") || "no frames"}</p>`;
    $("#chart-wrap").style.display = "none";
    $("#replay-wrap").style.display = "none";
    return;
  }
  const [cls, copy] = GRADE_COPY[r.grade];
  $("#verdict").innerHTML = `
    <div class="score ${cls}">${r.score}</div>
    <p class="verdict-line">${copy}</p>
    ${(r.channels ?? []).map((c) => `<p class="muted">watch your <strong>${CHANNEL_NAMES[c.channel] ?? c.channel}</strong> (±${c.deg}°)</p>`).join("")}
    <p class="muted">${r.extras.freezeLongestSec >= 1 ? `longest hold ${r.extras.freezeLongestSec}s · ` : ""}${r.extras.tempoBpm ? `bounce ≈ ${r.extras.tempoBpm} BPM${r.extras.refBpm ? ` (target ${r.extras.refBpm})` : ""}` : ""}</p>
    <div id="seg-chips">${(r.segments ?? []).map((s, i) =>
      `<button class="chip" data-seg="${i}">⚠ ${s.startSec.toFixed(1)}–${s.endSec.toFixed(1)}s · ±${s.deg}°</button>`).join("")}</div>`;
  document.querySelectorAll("[data-seg]").forEach((b) => b.addEventListener("click", () => {
    playT = r.segments[Number(b.dataset.seg)].startSec; playing = true;
  }));

  drawChart();
  startReplay();
}

/* ---------------- deviation timeline (single series + warn bands) ---------------- */
const chart = $("#chart");
const cctx = chart.getContext("2d");
let hoverX = null;
chart.addEventListener("pointermove", (e) => { hoverX = e.offsetX; drawChart(); });
chart.addEventListener("pointerleave", () => { hoverX = null; drawChart(); });
chart.addEventListener("click", (e) => {
  if (!report?.timeline) return;
  playT = (e.offsetX / chart.clientWidth) * report.timeline.durationSec;
});

function drawChart() {
  if (!report?.timeline) return;
  const dpr = devicePixelRatio;
  const W = chart.width = chart.clientWidth * dpr;
  const H = chart.height = chart.clientHeight * dpr;
  const pts = report.timeline.points;
  const dur = report.timeline.durationSec;
  const maxY = Math.max(30, ...pts.filter((p) => p !== null)) * 1.15;
  const X = (i) => (i / (pts.length - 1)) * (W - 46 * dpr) + 8 * dpr;
  const Y = (v) => H - 22 * dpr - (v / maxY) * (H - 40 * dpr);
  cctx.clearRect(0, 0, W, H);

  // warning bands for flagged segments (semantic, not the accent)
  for (const s of report.segments ?? []) {
    cctx.fillStyle = "rgba(255,107,107,0.12)";
    const x0 = (s.startSec / dur) * (W - 46 * dpr) + 8 * dpr;
    const x1 = (s.endSec / dur) * (W - 46 * dpr) + 8 * dpr;
    cctx.fillRect(x0, 12 * dpr, x1 - x0, H - 34 * dpr);
  }
  // recessive grid + right-edge scale labels
  cctx.font = `${10 * dpr}px system-ui`;
  cctx.fillStyle = "rgba(139,148,171,0.8)";
  cctx.strokeStyle = "rgba(38,46,66,0.9)";
  cctx.lineWidth = dpr;
  for (const g of [0, Math.round(maxY / 2), Math.round(maxY)]) {
    cctx.beginPath(); cctx.moveTo(8 * dpr, Y(g)); cctx.lineTo(W - 38 * dpr, Y(g)); cctx.stroke();
    cctx.fillText(`${g}°`, W - 34 * dpr, Y(g) + 3 * dpr);
  }
  // the deviation line
  cctx.strokeStyle = "#4cc2ff";
  cctx.lineWidth = 2 * dpr;
  cctx.beginPath();
  let started = false;
  pts.forEach((p, i) => {
    if (p === null) { started = false; return; }
    if (!started) { cctx.moveTo(X(i), Y(p)); started = true; }
    else cctx.lineTo(X(i), Y(p));
  });
  cctx.stroke();
  // playhead
  const px = (playT / dur) * (W - 46 * dpr) + 8 * dpr;
  cctx.strokeStyle = "rgba(245,166,35,0.9)";
  cctx.beginPath(); cctx.moveTo(px, 10 * dpr); cctx.lineTo(px, H - 20 * dpr); cctx.stroke();
  // crosshair + tooltip
  if (hoverX !== null) {
    const i = Math.round(((hoverX * dpr - 8 * dpr) / (W - 46 * dpr)) * (pts.length - 1));
    if (i >= 0 && i < pts.length && pts[i] !== null) {
      const hx = X(i), hy = Y(pts[i]);
      cctx.strokeStyle = "rgba(232,235,242,0.35)";
      cctx.lineWidth = dpr;
      cctx.beginPath(); cctx.moveTo(hx, 10 * dpr); cctx.lineTo(hx, H - 20 * dpr); cctx.stroke();
      cctx.fillStyle = "#4cc2ff";
      cctx.beginPath(); cctx.arc(hx, hy, 4 * dpr, 0, Math.PI * 2); cctx.fill();
      cctx.strokeStyle = "#151924"; cctx.lineWidth = 2 * dpr; cctx.stroke();
      const label = `${((i / (pts.length - 1)) * dur).toFixed(1)}s · ±${pts[i]}°`;
      cctx.font = `${11 * dpr}px system-ui`;
      const tw = cctx.measureText(label).width + 12 * dpr;
      const tx = Math.min(Math.max(hx - tw / 2, 4 * dpr), W - tw - 4 * dpr);
      cctx.fillStyle = "rgba(27,33,48,0.95)";
      cctx.fillRect(tx, 2 * dpr, tw, 16 * dpr);
      cctx.fillStyle = "#e8ebf2";
      cctx.fillText(label, tx + 6 * dpr, 13 * dpr);
    }
  }
}

/* ---------------- synced replay: you vs the reference ---------------- */
const uc = $("#user-stage");
const uctx = uc.getContext("2d");
const LINKS = [[1, 2], [1, 3], [3, 5], [2, 4], [4, 6], [1, 7], [2, 8], [7, 8], [7, 9], [9, 11], [8, 10], [10, 12]];

function startReplay() {
  refMove = MOVES[report.moveId] ?? null;
  refCap = null;
  if (!refMove) {
    const raw = capture85.clips.find((c) => c.id === report.moveId);
    if (raw) refCap = decodeClip(raw);
  }
  if (!refViewer) {
    refViewer = new Viewer($("#ref-stage"));
    refViewer.attachOrbit();
    refViewer.cam.auto = false;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (playing && report?.verdict === "scored") {
        playT = (playT + dt * speed) % report.timeline.durationSec;
      }
      drawUser();
      refViewer.begin(dt);
      if (refCap) refViewer.renderCapture(refCap, Math.floor(playT * refCap.fps) % refCap.nFrames);
      else if (refMove) refViewer.renderProcedural(refMove, playT / ((refMove.beats * 60) / refMove.bpm));
      drawChart();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

function drawUser() {
  const dpr = devicePixelRatio;
  const W = uc.width = uc.clientWidth * dpr;
  const H = uc.height = uc.clientHeight * dpr;
  uctx.fillStyle = "#0d0f14"; uctx.fillRect(0, 0, W, H);
  const frames = report.user.frames;
  const f = frames[Math.floor(playT * report.user.fps) % frames.length];
  uctx.fillStyle = "rgba(139,148,171,0.8)";
  uctx.font = `${11 * dpr}px system-ui`;
  uctx.fillText("YOU", 10 * dpr, 16 * dpr);
  if (!f) { uctx.fillText("(no clean pose this frame)", 10 * dpr, H / 2); return; }
  const px = (p) => [p[0] * W, p[1] * H];
  uctx.strokeStyle = "#38c172";
  uctx.lineCap = "round";
  uctx.lineWidth = 4 * dpr;
  for (const [a, b] of LINKS) {
    if (!f[a] || !f[b] || f[a][2] < 0.4 || f[b][2] < 0.4) continue;
    const [ax, ay] = px(f[a]), [bx, by] = px(f[b]);
    uctx.beginPath(); uctx.moveTo(ax, ay); uctx.lineTo(bx, by); uctx.stroke();
  }
  const head = f[0];
  if (head && head[2] > 0.4) {
    const [hx, hy] = px(head);
    uctx.fillStyle = "#38c172";
    uctx.beginPath(); uctx.arc(hx, hy, 7 * dpr, 0, Math.PI * 2); uctx.fill();
  }
}

$("#play").addEventListener("click", (e) => { playing = !playing; e.target.textContent = playing ? "⏸" : "▶"; });
$("#speed").addEventListener("input", (e) => { speed = Number(e.target.value); $("#speedv").textContent = `${speed.toFixed(2)}×`; });

const src = new URLSearchParams(location.search).get("src");
if (src) loadFromUrl(src);
