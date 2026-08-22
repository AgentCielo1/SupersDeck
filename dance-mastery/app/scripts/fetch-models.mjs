// Downloads the MediaPipe tasks-vision runtime + pose model into app/vendor/
// (gitignored — run once per machine). Runtime comes from the npm registry
// tarball (CDNs are often blocked on locked-down networks); the model from
// Google's model store. After this, the Practice Mirror runs fully offline.
// Usage: node scripts/fetch-models.mjs

import { mkdirSync, writeFileSync, existsSync, copyFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const VER = "0.10.14"; // matches the mediapipe version validated in the factory venv
const TARBALL = `https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-${VER}.tgz`;
const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const RUNTIME_FILES = [
  "vision_bundle.mjs",
  "wasm/vision_wasm_internal.js",
  "wasm/vision_wasm_internal.wasm",
  "wasm/vision_wasm_nosimd_internal.js",
  "wasm/vision_wasm_nosimd_internal.wasm",
];

const vendor = join(dirname(fileURLToPath(import.meta.url)), "..", "vendor");
mkdirSync(join(vendor, "wasm"), { recursive: true });

async function fetchTo(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

if (RUNTIME_FILES.every((f) => existsSync(join(vendor, f)))) {
  console.log("runtime already vendored");
} else {
  const work = join(tmpdir(), `mp-tasks-vision-${VER}`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const tgz = join(work, "pkg.tgz");
  process.stdout.write("fetch tasks-vision tarball ... ");
  await fetchTo(TARBALL, tgz);
  execFileSync("tar", ["xzf", tgz, "-C", work]);
  for (const f of RUNTIME_FILES) {
    copyFileSync(join(work, "package", f), join(vendor, f));
  }
  rmSync(work, { recursive: true, force: true });
  console.log("ok");
}

const modelDest = join(vendor, "pose_landmarker_lite.task");
if (existsSync(modelDest)) {
  console.log("model already vendored");
} else {
  process.stdout.write("fetch pose_landmarker_lite.task ... ");
  await fetchTo(MODEL, modelDest);
  console.log("ok");
}
console.log("vendor/ ready — the Practice Mirror can use the live camera.");
