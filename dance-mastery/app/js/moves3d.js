// Procedural v1 move animations ($0 lane, Doc 08 §3.1) for the FK skeleton in
// viewer3d.js. Each: keyframed pose params + optional continuous spin/rootFn.

import { TAU, PI, sin, cos } from "./viewer3d.js";

export const MOVES = {
  "toprock.two_step": {
    bpm: 100, beats: 4,
    keys: [
      { t: 0.00, p: { y: 0.84, lHipF: 0.9, lKnee: 0.5, rHipF: -0.15, tYaw: 0.25, lShF: -0.7, lShA: 0.25, rShF: 0.9, rElb: 0.5, tPitch: 0.06 } },
      { t: 0.25, p: { y: 0.88, lHipF: 0.1, rHipF: 0.1, lShF: 0.25, rShF: 0.25, lShA: 0.5, rShA: 0.5 } },
      { t: 0.50, p: { y: 0.84, rHipF: 0.9, rKnee: 0.5, lHipF: -0.15, tYaw: -0.25, rShF: -0.7, rShA: 0.25, lShF: 0.9, lElb: 0.5, tPitch: 0.06 } },
      { t: 0.75, p: { y: 0.88, lHipF: 0.1, rHipF: 0.1, lShF: 0.25, rShF: 0.25, lShA: 0.5, rShA: 0.5 } },
    ],
    rootFn: (p, u) => { p.y += 0.015 * sin(u * TAU * 2); },
  },
  "toprock.indian_step": {
    bpm: 100, beats: 4,
    keys: [
      { t: 0.00, p: { y: 0.85, lHipF: 0.7, lHipA: 0.45, lKnee: 0.4, tRoll: 0.08, lShA: 0.9, rShA: 0.9, lShF: -0.3, rShF: -0.3 } },
      { t: 0.25, p: { y: 0.88, lHipF: 0.5, lHipA: -0.25, lKnee: 0.35, tYaw: 0.2, lShA: 0.15, rShA: 0.15, lElb: 0.6, rElb: 0.6 } },
      { t: 0.50, p: { y: 0.85, rHipF: 0.7, rHipA: 0.45, rKnee: 0.4, tRoll: -0.08, lShA: 0.9, rShA: 0.9, lShF: -0.3, rShF: -0.3 } },
      { t: 0.75, p: { y: 0.88, rHipF: 0.5, rHipA: -0.25, rKnee: 0.35, tYaw: -0.2, lShA: 0.15, rShA: 0.15, lElb: 0.6, rElb: 0.6 } },
    ],
  },
  "getdown.corkscrew": {
    bpm: 90, beats: 8, spin: TAU,
    keys: [
      { t: 0.00, p: { y: 0.86 } },
      { t: 0.35, p: { y: 0.45, tPitch: 0.5, lHipF: 1.5, rHipF: 1.5, lKnee: 1.9, rKnee: 1.9, lShF: 0.7, rShF: 0.7 } },
      { t: 0.55, p: { y: 0.3, tPitch: 0.7, lHipF: 1.9, rHipF: 1.9, lKnee: 2.3, rKnee: 2.3, lShF: 1.1, rShF: 1.1, lElb: 0.3, rElb: 0.3 } },
      { t: 0.8, p: { y: 0.6, tPitch: 0.25, lHipF: 0.9, rHipF: 0.9, lKnee: 1.1, rKnee: 1.1 } },
    ],
  },
  "footwork.six_step": {
    bpm: 96, beats: 6, spin: -TAU,
    keys: [
      { t: 0.00, p: { y: 0.36, tPitch: 0.85, lHipF: 1.3, lKnee: 2.3, rHipF: 0.45, rKnee: 0.1, rHipA: 0.4, lShF: -1.5, rShF: -1.3, lElb: 0.05, rElb: 0.05 } },
      { t: 0.17, p: { y: 0.34, tPitch: 0.9, lHipF: 1.35, lKnee: 2.3, rHipF: 1.0, rKnee: 1.2, rHipA: 0.55, lShF: -1.55, rShF: -1.2, lElb: 0.05, rElb: 0.05 } },
      { t: 0.33, p: { y: 0.36, tPitch: 0.85, rHipF: 1.3, rKnee: 2.3, lHipF: 0.45, lKnee: 0.1, lHipA: 0.5, lShF: -1.3, rShF: -1.5, lElb: 0.05, rElb: 0.05 } },
      { t: 0.5, p: { y: 0.34, tPitch: 0.8, rHipF: 1.35, rKnee: 2.25, lHipF: 0.9, lKnee: 0.9, lShF: -1.45, rShF: -1.45, lElb: 0.05, rElb: 0.05 } },
      { t: 0.67, p: { y: 0.36, tPitch: 0.85, lHipF: 1.25, lKnee: 2.2, rHipF: 0.5, rKnee: 0.2, rHipA: 0.3, lShF: -1.5, rShF: -1.35, lElb: 0.05, rElb: 0.05 } },
      { t: 0.83, p: { y: 0.34, tPitch: 0.9, lHipF: 1.3, lKnee: 2.2, rHipF: 1.15, rKnee: 1.1, lShF: -1.55, rShF: -1.25, lElb: 0.05, rElb: 0.05 } },
    ],
  },
  "footwork.cc": {
    bpm: 96, beats: 2,
    keys: [
      { t: 0.0, p: { y: 0.34, tPitch: 0.75, tYaw: 0.5, lHipF: 1.3, lKnee: 2.25, rHipF: 0.3, rKnee: 0.05, rHipA: 0.8, lShF: -1.4, lElb: 0.05, rShF: -0.4, rShA: 1.0, rElb: 0.3 } },
      { t: 0.5, p: { y: 0.34, tPitch: 0.75, tYaw: -0.5, rHipF: 1.3, rKnee: 2.25, lHipF: 0.3, lKnee: 0.05, lHipA: 0.8, rShF: -1.4, rElb: 0.05, lShF: -0.4, lShA: 1.0, lElb: 0.3 } },
    ],
  },
  "freeze.baby": {
    bpm: 60, beats: 4,
    keys: [
      { t: 0.0, p: { y: 0.34, pitch: 0.9, roll: 0.25, tPitch: 0.35, lHipF: 1.9, lKnee: 2.2, rHipF: 1.4, rKnee: 2.0, rHipA: 0.5, lShF: 1.5, lElb: 1.6, rShF: 1.6, rElb: 0.1 } },
      { t: 0.5, p: { y: 0.36, pitch: 0.92, roll: 0.28, tPitch: 0.35, lHipF: 1.85, lKnee: 2.15, rHipF: 1.5, rKnee: 2.05, rHipA: 0.55, lShF: 1.5, lElb: 1.6, rShF: 1.6, rElb: 0.1 } },
    ],
  },
  "freeze.chair": {
    bpm: 60, beats: 4,
    keys: [
      { t: 0.0, p: { y: 0.42, roll: 0.85, pitch: 0.25, tRoll: -0.3, lHipF: 1.2, lKnee: 1.5, rHipF: 0.6, rKnee: 0.9, rHipA: 0.6, rShF: 1.7, rElb: 1.7, lShF: -0.4, lShA: 0.7, lElb: 0.9 } },
      { t: 0.5, p: { y: 0.43, roll: 0.88, pitch: 0.27, tRoll: -0.3, lHipF: 1.25, lKnee: 1.55, rHipF: 0.62, rKnee: 0.9, rHipA: 0.62, rShF: 1.7, rElb: 1.7, lShF: -0.42, lShA: 0.72, lElb: 0.9 } },
    ],
  },
  "power.backspin": {
    bpm: 110, beats: 4, spin: 3 * TAU,
    keys: [
      { t: 0.0, p: { y: 0.24, pitch: -1.15, lHipF: 2.1, rHipF: 2.1, lKnee: 2.3, rKnee: 2.3, lShF: 1.3, rShF: 1.3, lElb: 1.9, rElb: 1.9, tPitch: 0.55 } },
      { t: 0.5, p: { y: 0.24, pitch: -1.15, lHipF: 2.0, rHipF: 2.2, lKnee: 2.2, rKnee: 2.35, lShF: 1.3, rShF: 1.3, lElb: 1.9, rElb: 1.9, tPitch: 0.55 } },
    ],
  },
  "power.windmill": {
    bpm: 112, beats: 4, spin: TAU,
    keys: [
      { t: 0.0, p: { y: 0.3, pitch: 1.35, lHipA: 1.1, rHipA: 1.1, lHipF: 0.35, rHipF: 0.35, lKnee: 0.05, rKnee: 0.05, lShF: 1.4, rShF: 1.4, lElb: 1.9, rElb: 1.9, tPitch: 0.35 } },
      { t: 0.5, p: { y: 0.26, pitch: 1.35, lHipA: 1.15, rHipA: 1.15, lHipF: 0.5, rHipF: 0.2, lKnee: 0.05, rKnee: 0.05, lShF: 1.5, rShF: 1.3, lElb: 1.9, rElb: 1.9, tPitch: 0.4 } },
    ],
    rootFn: (p, u, t) => { p.roll = sin(t * TAU) * 0.9; p.y += 0.05 * Math.abs(sin(t * TAU)); },
  },
  "power.swipes": {
    bpm: 104, beats: 4, spin: TAU,
    keys: [
      { t: 0.0, p: { y: 0.5, pitch: -0.7, tPitch: -0.3, lHipF: 0.9, rHipF: 0.9, lKnee: 1.2, rKnee: 1.2, lShF: -1.6, rShF: -1.6, lElb: -0.1, rElb: -0.1 } },
      { t: 0.45, p: { y: 0.34, pitch: -0.5, tPitch: -0.2, lHipF: 1.2, rHipF: 0.6, lKnee: 1.5, rKnee: 0.9, lShF: -1.7, rShF: -1.5 } },
      { t: 0.75, p: { y: 0.55, pitch: -0.8, tPitch: -0.35, lHipF: 0.7, rHipF: 1.1, lKnee: 1.0, rKnee: 1.4, lShF: -1.5, rShF: -1.7 } },
    ],
  },
  "power.headspin_taps": {
    bpm: 100, beats: 4, spin: 1.5 * TAU,
    keys: [
      { t: 0.0, p: { y: 1.02, pitch: PI, lHipA: 0.9, rHipA: 0.9, lHipF: 0.15, rHipF: 0.15, lKnee: 0.05, rKnee: 0.05, lShF: 0.6, rShF: 0.6, lShA: 1.15, rShA: 1.15, lElb: 0.9, rElb: 0.9 } },
      { t: 0.5, p: { y: 1.02, pitch: PI, lHipA: 1.05, rHipA: 0.75, lHipF: 0.25, rHipF: 0.1, lKnee: 0.05, rKnee: 0.05, lShF: 0.6, rShF: 0.6, lShA: 1.2, rShA: 1.1, lElb: 0.9, rElb: 0.9 } },
    ],
  },
  "power.flare": {
    bpm: 108, beats: 4, spin: TAU,
    keys: [
      { t: 0.0, p: { y: 0.6, tPitch: 1.15, lHipA: 1.2, rHipA: 1.2, lHipF: -0.3, rHipF: 0.5, lKnee: 0.05, rKnee: 0.05, lShF: 1.5, rShF: 1.5, lElb: 0.05, rElb: 0.05 } },
      { t: 0.5, p: { y: 0.66, tPitch: 1.05, lHipA: 1.25, rHipA: 1.25, lHipF: 0.5, rHipF: -0.3, lKnee: 0.05, rKnee: 0.05, lShF: 1.45, rShF: 1.55, lElb: 0.05, rElb: 0.05 } },
    ],
    rootFn: (p, u, t) => { p.x += 0.09 * cos(t * TAU); p.z += 0.09 * sin(t * TAU); },
  },
};
