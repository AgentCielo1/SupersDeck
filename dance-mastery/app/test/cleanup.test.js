import test from "node:test";
import assert from "node:assert/strict";
import { smooth, clampFloor, contactLock, loopBlend, seamGap } from "../../tools/cleanlib.mjs";

// tiny synthetic rig: 2 joints (6 channels)
function noisyFrames(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const base = Math.sin((i / n) * Math.PI * 2);
    out.push([base + ((i * 7919) % 13) / 130 - 0.05, 0.5, 0, 0, 0.02, 0]);
  }
  return out;
}
function channelVariance(frames, k) {
  const vals = frames.map((f) => f[k]);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  let acc = 0;
  for (let i = 1; i < vals.length; i++) acc += (vals[i] - vals[i - 1]) ** 2;
  return acc / (vals.length - 1);
}

test("smooth reduces frame-to-frame jitter without killing the signal", () => {
  const raw = noisyFrames(120);
  const out = smooth(raw, { radius: 1, passes: 2 });
  assert.ok(channelVariance(out, 0) < channelVariance(raw, 0) * 0.6, "jitter reduced");
  const range = Math.max(...out.map((f) => f[0])) - Math.min(...out.map((f) => f[0]));
  assert.ok(range > 1.5, "underlying sine survives");
});

test("clampFloor removes floor penetration only", () => {
  const out = clampFloor([[0, -0.03, 0, 0, 0.4, 0], [0, 0.02, 0, 0, -0.01, 0]]);
  assert.equal(out[0][1], 0);
  assert.equal(out[0][4], 0.4);
  assert.equal(out[1][4], 0);
  assert.equal(out[1][1], 0.02);
});

test("contactLock pins a low, slow joint and leaves flight phases alone", () => {
  const frames = [];
  for (let i = 0; i < 30; i++) {
    // joint 0: planted frames 5-20 (low, tiny drift = skating), airborne otherwise
    const planted = i >= 5 && i <= 20;
    frames.push([planted ? 0.3 + i * 0.002 : i * 0.05, planted ? 0.02 : 0.4, 0, 0, 0.5, 0]);
  }
  const out = contactLock(frames, [0], { heightThresh: 0.07, velThresh: 0.02 });
  // pinned run has identical positions (no skating)
  assert.equal(out[8][0], out[15][0]);
  assert.equal(out[8][2], out[15][2]);
  // airborne frames untouched
  assert.equal(out[2][0], frames[2][0]);
  // second joint never modified
  assert.equal(out[10][4], 0.5);
});

test("loopBlend closes the seam", () => {
  // a clip that ends 0.3 away from where it starts
  const frames = [];
  for (let i = 0; i < 60; i++) frames.push([i * 0.005, 0.5, 0, 0, 0, 0]);
  const gapBefore = seamGap(frames);
  const out = loopBlend(frames, { blend: 10 });
  assert.equal(out.length, 50);
  const first = out[0][0], afterWrap = out[0][0] - out[out.length - 1][0];
  assert.ok(Math.abs(afterWrap) < gapBefore * 0.5, "wrap step is much smaller than original seam");
  assert.ok(Number.isFinite(first));
});

test("loopBlend rejects absurd blend windows", () => {
  assert.throws(() => loopBlend([[0], [1], [2], [3]], { blend: 3 }));
});
