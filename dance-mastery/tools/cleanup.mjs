// Motion Factory · Station 4 CLI: apply cleanup filters to a clip in a
// generated data module and append the result as a new clip.
//
// Usage:
//   node cleanup.mjs <module.js> <clipId> <newId> "<newName>" [ops]
//   ops: smooth | lock | loop=N | floor   (default: smooth lock floor)
//
// Example (seamless helicopter loop):
//   node cleanup.mjs ../app/js/data/capture85.js capture.85_08 \
//     capture.85_08_loop "Helicopter — cleaned seamless loop" smooth lock floor loop=10

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { smooth, clampFloor, contactLock, loopBlend, seamGap, clipToFrames, framesToBase64 } from "./cleanlib.mjs";

const [modPath, clipId, newId, newName, ...ops] = process.argv.slice(2);
if (!modPath || !clipId || !newId || !newName) {
  console.error("usage: node cleanup.mjs <module.js> <clipId> <newId> <newName> [smooth|lock|floor|loop=N ...]");
  process.exit(1);
}
const opList = ops.length ? ops : ["smooth", "lock", "floor"];

const data = (await import(pathToFileURL(modPath))).default;
const clip = data.clips.find((c) => c.id === clipId);
if (!clip) throw new Error(`clip ${clipId} not found in ${modPath}`);

const bytes = Buffer.from(clip.data, "base64");
const pos = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
let frames = clipToFrames(clip, pos);
console.log(`in : ${clipId} — ${frames.length} frames, seam gap ${seamGap(frames).toFixed(4)}m`);

const contactJoints = clip.joints
  .map((j, i) => ({ n: j.name, i }))
  .filter(({ n }) => /Foot|Toe|Hand(_end)?$/.test(n))
  .map(({ i }) => i);

for (const op of opList) {
  if (op === "smooth") frames = smooth(frames, { radius: 1, passes: 2 });
  else if (op === "lock") frames = contactLock(frames, contactJoints);
  else if (op === "floor") frames = clampFloor(frames);
  else if (op.startsWith("loop=")) frames = loopBlend(frames, { blend: Number(op.slice(5)) });
  else throw new Error("unknown op " + op);
  console.log(`op : ${op} → ${frames.length} frames`);
}
console.log(`out: seam gap ${seamGap(frames).toFixed(4)}m`);

data.clips = data.clips.filter((c) => c.id !== newId);
data.clips.push({
  id: newId, name: newName, fps: clip.fps, nFrames: frames.length,
  joints: clip.joints, data: framesToBase64(frames),
});

const src = readFileSync(modPath, "utf8");
const header = src.slice(0, src.indexOf("export default"));
writeFileSync(modPath, header + `export default ${JSON.stringify({ clips: data.clips }, null, 1)};\n`);
console.log(`wrote ${newId} into ${modPath}`);
