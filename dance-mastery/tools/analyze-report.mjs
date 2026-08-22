// Tier-2 · Station 2: landmarks.json -> report.json.
// Scores an extracted clip with the SAME engine Tier-1 uses live
// (app/js/engine/pose.js) — one source of truth for all scoring math.
//
// Usage: node analyze-report.mjs <landmarks.json> <moveId> <out-report.json>

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const appJs = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "js");
const {
  fromMediaPipe, normalizePose, angleFeatures, visibilityGate,
  dtw, dtwScore, channelDeviation, worstSegments, detectTempo, stillness,
} = await import(pathToFileURL(join(appJs, "engine", "pose.js")));
const { default: poseRefs } = await import(pathToFileURL(join(appJs, "data", "pose-refs.js")));
const { default: tree } = await import(pathToFileURL(join(appJs, "data", "breaking.js")));
const { default: capture85 } = await import(pathToFileURL(join(appJs, "data", "capture85.js")));

const [inPath, moveId, outPath] = process.argv.slice(2);
if (!inPath || !moveId || !outPath) {
  console.error("usage: node analyze-report.mjs <landmarks.json> <moveId> <out-report.json>");
  console.error("moves with references:", Object.keys(poseRefs).join(", "));
  process.exit(1);
}
const ref = poseRefs[moveId];
if (!ref) { console.error(`no reference for ${moveId}`); process.exit(1); }

const data = JSON.parse(readFileSync(inPath, "utf8"));
const fps = data.fps || 30;

// core-point subset stored for the review page's skeleton replay
const REPLAY_IDX = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

const gate = { total: data.frames.length, clean: 0, reasons: {} };
const angles = [], poses = [], hipY = [], replay = [];
for (const lm of data.frames) {
  const pose = lm ? fromMediaPipe(lm) : null;
  const v = visibilityGate(pose);
  if (!v.ok) {
    gate.reasons[v.reason] = (gate.reasons[v.reason] ?? 0) + 1;
    replay.push(null);
    continue;
  }
  gate.clean++;
  const norm = normalizePose(pose);
  poses.push(norm);
  angles.push(angleFeatures(norm));
  hipY.push((pose.kp.hipL[1] + pose.kp.hipR[1]) / 2);
  replay.push(REPLAY_IDX.map((i) => [
    Math.round(lm[i].x * 1000) / 1000,
    Math.round(lm[i].y * 1000) / 1000,
    Math.round((lm[i].visibility ?? 1) * 100) / 100,
  ]));
}

const moveName = capture85.clips.find((c) => c.id === moveId)?.name
  ?? tree.nodes.find((n) => n.id === moveId)?.name ?? moveId;

let report;
if (gate.clean < fps) {
  report = {
    version: 1, moveId, moveName, source: data.source, fps, model: data.model,
    gate, verdict: "insufficient",
    note: "Fewer than one second of clean, whole-body frames. Fix framing/light and re-record — no score is more honest than a fake one.",
  };
} else {
  const { dist } = dtw(angles, ref.frames);
  const score = dtwScore(dist);
  const grade = score >= 80 ? "clean" : score >= 55 ? "getting_there" : "rough";
  // deviation flags use uniform (non-DTW) alignment, which drifts on clean
  // reps of unequal length — so flags only ship when the score says "problem"
  const channels = score >= 80 ? [] : channelDeviation(angles, ref.frames)
    .filter((d) => Number.isFinite(d.deg))
    .sort((a, b) => b.deg - a.deg)
    .map((d) => ({ channel: d.channel, deg: Math.round(d.deg) }));
  const segments = score >= 80 ? [] : worstSegments(angles, ref.frames, fps);
  const still = stillness(poses, fps);
  const tempo = detectTempo(hipY, fps);
  // per-frame deviation curve for the review timeline (uniform alignment,
  // downsampled to ≤240 points; smoothed lightly so the curve reads as shape)
  const T = Math.min(240, angles.length);
  const timeline = [];
  for (let i = 0; i < T; i++) {
    const a = angles[Math.floor((i * angles.length) / T)];
    const b = ref.frames[Math.floor((i * ref.frames.length) / T)];
    let s = 0, c = 0;
    for (let k = 0; k < a.length; k++) {
      if (Number.isFinite(a[k]) && Number.isFinite(b[k])) { s += Math.abs(a[k] - b[k]); c++; }
    }
    timeline.push(c ? Math.round(((s / c) * 180) / Math.PI) : null);
  }
  for (let i = 1; i < timeline.length - 1; i++) {
    if (timeline[i] !== null && timeline[i - 1] !== null && timeline[i + 1] !== null) {
      timeline[i] = Math.round((timeline[i - 1] + timeline[i] * 2 + timeline[i + 1]) / 4);
    }
  }
  report = {
    version: 1, moveId, moveName, source: data.source, fps, model: data.model,
    gate, verdict: "scored", score, grade,
    channels: channels.slice(0, 3),
    segments,
    timeline: { points: timeline, durationSec: Math.round((angles.length / fps) * 10) / 10 },
    extras: {
      freezeLongestSec: Math.round(still.longest * 10) / 10,
      tempoBpm: tempo.bpm,
      tempoConfidence: Math.round(tempo.confidence * 100) / 100,
      refBpm: ref.bpm ?? null,
    },
    user: { fps, points: ["nose", "shoulderL", "shoulderR", "elbowL", "elbowR", "wristL", "wristR", "hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR"], frames: replay },
  };
}

writeFileSync(outPath, JSON.stringify(report));
const summary = report.verdict === "scored"
  ? `score ${report.score} (${report.grade}) · ${gate.clean}/${gate.total} clean frames · worst: ${report.segments.map((s) => `${s.startSec.toFixed(1)}-${s.endSec.toFixed(1)}s ±${s.deg}°`).join(", ") || "none"}`
  : `insufficient (${gate.clean}/${gate.total} clean)`;
console.log(`wrote ${outPath}: ${moveName} — ${summary}`);
