// Motion Factory · Station 4 tool #1: BVH → compact viewer data.
// Parses BVH, runs FK per frame, normalizes (meters, floor at y=0, centered),
// downsamples to 30fps, quantizes joint positions to Int16 millimeters, and
// emits a JS module for the library viewer.
//
// Usage: node bvh2json.mjs out.js id1=Name1:file1.bvh id2=Name2:file2.bvh ...

import { readFileSync, writeFileSync } from "node:fs";

function parseBVH(text) {
  const tok = text.split(/\s+/);
  let i = 0;
  const next = () => tok[i++];
  const joints = []; // {name, parent, offset, channels}
  function parseJoint(parent) {
    const kw = next(); // ROOT | JOINT | End
    let name;
    if (kw === "End") { next(); name = joints[parent].name + "_end"; } // "Site"
    else name = next();
    const idx = joints.length;
    joints.push({ name, parent, offset: [0, 0, 0], channels: [] });
    if (next() !== "{") throw new Error("expected {");
    for (;;) {
      const t = next();
      if (t === "OFFSET") {
        joints[idx].offset = [Number(next()), Number(next()), Number(next())];
      } else if (t === "CHANNELS") {
        const n = Number(next());
        for (let c = 0; c < n; c++) joints[idx].channels.push(next());
      } else if (t === "JOINT" || t === "End") {
        i--; parseJoint(idx);
      } else if (t === "}") return;
      else throw new Error("unexpected " + t);
    }
  }
  if (next() !== "HIERARCHY") throw new Error("not BVH");
  parseJoint(-1);
  if (next() !== "MOTION") throw new Error("no MOTION");
  next(); const nFrames = Number(next());          // "Frames:" N
  next(); next(); const frameTime = Number(next()); // "Frame" "Time:" t
  const chCount = joints.reduce((s, j) => s + j.channels.length, 0);
  const frames = [];
  for (let f = 0; f < nFrames; f++) {
    const row = new Float64Array(chCount);
    for (let c = 0; c < chCount; c++) row[c] = Number(next());
    frames.push(row);
  }
  return { joints, frames, frameTime };
}

// 3x3 matrix helpers (column-major thinking, applied as m·v)
function matMul(a, b) {
  const r = new Array(9);
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++)
      r[row * 3 + col] = a[row * 3] * b[col] + a[row * 3 + 1] * b[3 + col] + a[row * 3 + 2] * b[6 + col];
  return r;
}
function matVec(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
function rot(axis, deg) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  if (axis === "X") return [1, 0, 0, 0, c, -s, 0, s, c];
  if (axis === "Y") return [c, 0, s, 0, 1, 0, -s, 0, c];
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

function fkAll(bvh, outFps = 30) {
  const { joints, frames, frameTime } = bvh;
  const stride = Math.max(1, Math.round(1 / frameTime / outFps));
  const out = [];
  for (let f = 0; f < frames.length; f += stride) {
    const row = frames[f];
    const world = [];
    let ci = 0;
    const pos = new Float64Array(joints.length * 3);
    joints.forEach((j, idx) => {
      let R = I3, T = [...j.offset];
      for (const ch of j.channels) {
        const v = row[ci++];
        if (ch.endsWith("position")) T["XYZ".indexOf(ch[0])] += v;
        else R = matMul(R, rot(ch[0], v));
      }
      if (j.parent < 0) {
        world[idx] = { R, p: T };
      } else {
        const P = world[j.parent];
        world[idx] = { R: matMul(P.R, R), p: addV(P.p, matVec(P.R, T)) };
      }
      pos[idx * 3] = world[idx].p[0];
      pos[idx * 3 + 1] = world[idx].p[1];
      pos[idx * 3 + 2] = world[idx].p[2];
    });
    out.push(pos);
  }
  return out;
}
function addV(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }

function normalize(framesPos, nJoints) {
  // CMU units → meters (ASF scale constant), then floor + center.
  const CMU = 0.056444;
  let minY = Infinity, sumX = 0, sumZ = 0, n = 0, maxY = -Infinity;
  for (const p of framesPos)
    for (let j = 0; j < nJoints; j++) {
      minY = Math.min(minY, p[j * 3 + 1]); maxY = Math.max(maxY, p[j * 3 + 1]);
      sumX += p[j * 3]; sumZ += p[j * 3 + 2]; n++;
    }
  const cx = sumX / n, cz = sumZ / n;
  const height = (maxY - minY) * CMU;
  // sanity: an adult sequence should span 1.2–2.6m of vertical range
  const scale = height > 1.2 && height < 2.6 ? CMU : (1.75 / (maxY - minY));
  for (const p of framesPos)
    for (let j = 0; j < nJoints; j++) {
      p[j * 3] = (p[j * 3] - cx) * scale;
      p[j * 3 + 1] = (p[j * 3 + 1] - minY) * scale;
      p[j * 3 + 2] = (p[j * 3 + 2] - cz) * scale;
    }
  return framesPos;
}

function quantize(framesPos) {
  const nF = framesPos.length, len = framesPos[0].length;
  const buf = new Int16Array(nF * len);
  for (let f = 0; f < nF; f++)
    for (let k = 0; k < len; k++)
      buf[f * len + k] = Math.max(-32000, Math.min(32000, Math.round(framesPos[f][k] * 1000)));
  return Buffer.from(buf.buffer).toString("base64");
}

const [outPath, ...specs] = process.argv.slice(2);
const clips = specs.map((spec) => {
  const [id, rest] = spec.split("=");
  const [name, file] = rest.split(":");
  const bvh = parseBVH(readFileSync(file, "utf8"));
  const frames = normalize(fkAll(bvh), bvh.joints.length);
  console.log(`${id}: ${bvh.joints.length} joints, ${frames.length} frames @30fps`);
  return {
    id, name, fps: 30, nFrames: frames.length,
    joints: bvh.joints.map((j) => ({ name: j.name, parent: j.parent })),
    data: quantize(frames),
  };
});
writeFileSync(outPath,
  `// GENERATED by dance-mastery/tools/bvh2json.mjs — real optical motion capture.\n` +
  `// Source: CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), subject 85\n` +
  `// (breakdance sessions), BVH conversion by B. Hahne (cgspeed). The CMU database\n` +
  `// is free for all uses; credit: "The data used in this project was obtained from\n` +
  `// mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217."\n` +
  `export default ${JSON.stringify({ clips }, null, 1)};\n`);
console.log("wrote", outPath);
