// Generates a landmarks.json (same format analyze-clip.py emits) from a
// bundled capture clip — lets the whole Tier-2 pipeline run and be tested
// with no camera and no video. Also handy as a golden fixture: a clip scored
// against its own reference should come out high.
//
// Usage: node gen-test-landmarks.mjs <captureClipId> <out.json> [seconds]

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const appJs = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "js");
const { ReplayPoseSource } = await import(pathToFileURL(join(appJs, "pose-runtime.js")));
const { default: capture85 } = await import(pathToFileURL(join(appJs, "data", "capture85.js")));

const [clipId, outPath, seconds] = process.argv.slice(2);
const raw = capture85.clips.find((c) => c.id === clipId);
if (!raw || !outPath) {
  console.error("usage: node gen-test-landmarks.mjs <captureClipId> <out.json> [seconds]");
  console.error("clips:", capture85.clips.map((c) => c.id).join(", "));
  process.exit(1);
}

const src = new ReplayPoseSource(raw);
const n = seconds ? Math.min(src.clip.nFrames, Math.round(Number(seconds) * src.clip.fps)) : src.clip.nFrames;
const frames = [];
for (let f = 0; f < n; f++) frames.push(src.landmarksAt(f));

writeFileSync(outPath, JSON.stringify({
  version: 1,
  source: `replay:${clipId}`,
  fps: src.clip.fps,
  model: "replay(capture)",
  nFrames: frames.length,
  detected: frames.length,
  frames,
}));
console.log(`wrote ${outPath}: ${frames.length} frames from ${clipId}`);
