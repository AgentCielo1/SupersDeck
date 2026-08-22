// The Lesson Player (Phase B1): learn.html?move=<id>
// Three modes from the Doc 06 §3 "Break It Down" design:
//   WATCH — full-speed demo, auto-orbit
//   STUDY — free orbit, slow-mo default, checkpoints panel
//   DRILL — tempo ladder (50/75/100%), count metronome, A/B loop

import tree from "./data/breaking.js";
import capture85 from "./data/capture85.js";
import { Viewer, decodeClip } from "./viewer3d.js";
import { MOVES } from "./moves3d.js";

const CAPTURES = {};
for (const c of capture85.clips) CAPTURES[c.id] = decodeClip(c);

// Study notes for the real capture clips (checkpoints live in the tree for moves).
const CAPTURE_NOTES = {
  "capture.85_04": ["watch the hips: they stay at one height while the feet fly", "hands take weight only for a beat — then gone", "every step lands inside the rhythm, even at this speed"],
  "capture.85_08": ["the extended leg is a compass drawing circles", "weight rolls hand → hand while the leg passes under", "notice the hop timing: body rises exactly as the leg sweeps"],
  "capture.85_11": ["upright but never stiff — knees absorbing every accent", "arms frame the body, they don't decorate it", "direction changes come from the hips, shoulders follow"],
  "capture.85_12": ["a full round: watch how toprock buys time to hear the music", "the get-down happens ON a beat, not between beats", "energy is spent in bursts, recovered in footwork"],
};

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const moveId = params.get("move") || "footwork.six_step";

const node = tree.nodes.find((n) => n.id === moveId);
const move = MOVES[moveId];
const cap = CAPTURES[moveId];
const title = cap ? cap.name : (node?.name ?? moveId);
document.title = `Learn: ${title}`;

$("#title").textContent = title;
$("#check-link").href = `practice.html?move=${moveId}&mode=check`;
$("#subtitle").textContent = cap
  ? "★ Real optical mocap (CMU subject 85) — study the finished form"
  : move
    ? `Procedural v1 · ${move.bpm} BPM · ${move.beats}-count${node?.anchor ? ` · typical: ${node.anchor}` : ""}`
    : "No animation yet — this move is in the Motion Factory queue (Doc 08). The checkpoints below still teach the shape.";

const viewer = new Viewer($("#stage"));
viewer.attachOrbit();

/* ---------------- playback state ---------------- */
let mode = "watch";
let playing = true, t = 0, last = performance.now();
let tempo = 0.5;            // drill tempo ladder starts at 50% (drill pedagogy)
let loopA = 0, loopB = 1;   // capture A/B loop (fractions)
let flashUntil = 0;         // checkpoint flash timestamp

const cycleSec = move ? (move.beats * 60) / move.bpm : (cap ? cap.duration : 1);

/* ---------------- metronome (drill mode) ---------------- */
let audio = null, metroTimer = null, beatCount = 0;
function metroStart() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const bpm = (move?.bpm ?? 96) * tempo;
    const interval = 60000 / bpm;
    metroStop();
    beatCount = 0;
    metroTimer = setInterval(() => {
      beatCount = (beatCount % 8) + 1;
      $("#counts").innerHTML = Array.from({ length: 8 }, (_, i) =>
        `<span class="ct ${i + 1 === beatCount ? "on" : ""} ${i % 2 ? "" : "even"}">${i + 1}</span>`).join("");
      const osc = audio.createOscillator(), g = audio.createGain();
      osc.frequency.value = beatCount === 1 ? 880 : 440;
      g.gain.setValueAtTime(0.12, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.08);
      osc.connect(g).connect(audio.destination);
      osc.start(); osc.stop(audio.currentTime + 0.09);
    }, interval);
  } catch { /* no audio (headless/blocked) — counts still render via rAF below */ }
}
function metroStop() { if (metroTimer) clearInterval(metroTimer); metroTimer = null; }

/* ---------------- modes ---------------- */
const MODE_SETUP = {
  watch: () => { viewer.cam.auto = true; tempo = 1; metroStop(); $("#drillbar").style.display = "none"; },
  study: () => { viewer.cam.auto = false; metroStop(); $("#drillbar").style.display = "none"; if (speedInput.value === "1") { speedInput.value = "0.4"; } syncSpeed(); },
  drill: () => { viewer.cam.auto = false; $("#drillbar").style.display = "flex"; metroStart(); },
};
function setMode(m) {
  mode = m;
  document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
  MODE_SETUP[m]();
}
document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

/* ---------------- controls ---------------- */
const speedInput = $("#speed");
function syncSpeed() { $("#speedv").textContent = `${Number(speedInput.value).toFixed(2)}×`; }
speedInput.addEventListener("input", syncSpeed);
$("#play").addEventListener("click", (e) => { playing = !playing; e.target.textContent = playing ? "⏸" : "▶"; });

document.querySelectorAll("[data-tempo]").forEach((b) => b.addEventListener("click", () => {
  tempo = Number(b.dataset.tempo);
  document.querySelectorAll("[data-tempo]").forEach((x) => x.classList.toggle("active", x === b));
  if (mode === "drill") metroStart();
}));

// A/B loop over the clip/cycle (drill mode)
$("#loopA").addEventListener("input", (e) => { loopA = Number(e.target.value); if (loopB < loopA + 0.05) loopB = Math.min(1, loopA + 0.05); $("#loopB").value = loopB; });
$("#loopB").addEventListener("input", (e) => { loopB = Number(e.target.value); if (loopA > loopB - 0.05) loopA = Math.max(0, loopB - 0.05); $("#loopA").value = loopA; });

/* ---------------- checkpoints panel ---------------- */
const checkpoints = cap ? (CAPTURE_NOTES[moveId] ?? []) : (node?.checkpoints ?? []);
const mistakes = cap ? [] : (node?.mistakes ?? []);
$("#checkpoints").innerHTML =
  (checkpoints.length ? `<h3>Form checkpoints</h3><ol>` + checkpoints.map((c, i) =>
    `<li data-cp="${i}">${c}</li>`).join("") + `</ol>` : "") +
  (mistakes.length ? `<h3 class="warn-h">Watch out for</h3><ul>` + mistakes.map((m) =>
    `<li class="warn">${m}</li>`).join("") + `</ul>` : "") +
  (node?.prereqs?.length ? `<h3>Built on</h3><p class="prereqs">${node.prereqs.map((p) => p.id).join(" · ")}</p>` : "");
document.querySelectorAll("[data-cp]").forEach((li) => li.addEventListener("click", () => {
  document.querySelectorAll("[data-cp]").forEach((x) => x.classList.remove("hl"));
  li.classList.add("hl");
  flashUntil = performance.now() + 1200; // pulse the figure so the eye returns to the body
}));

/* ---------------- render loop ---------------- */
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const speed = Number(speedInput.value) * (mode === "drill" ? tempo : 1);
  if (playing) {
    if (move) t += (dt / cycleSec) * speed;
    else if (cap) t += dt * speed;
  }
  // A/B loop (drill): wrap time inside the window
  if (mode === "drill" && (loopA > 0 || loopB < 1)) {
    if (cap) {
      const dur = cap.duration;
      if (t / dur > loopB || t / dur < loopA) t = loopA * dur;
    } else if (move) {
      const cy = t % 1;
      if (cy > loopB || cy < loopA) t = Math.floor(t) + loopA;
    }
  }
  viewer.begin(dt);
  const pulse = now < flashUntil ? 0.5 + 0.5 * Math.sin(now / 60) : null;
  if (pulse !== null) viewer.colors.proc = `245,${Math.round(166 + 60 * pulse)},35`;
  else viewer.colors.proc = "245,166,35";
  if (cap) viewer.renderCapture(cap, Math.floor(t * cap.fps) % cap.nFrames);
  else if (move) viewer.renderProcedural(move, t);
  else {
    const ctx = viewer.ctx;
    ctx.fillStyle = "rgba(139,148,171,0.9)";
    ctx.font = `${16 * devicePixelRatio}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Animation in the factory queue — read the checkpoints, watch a reference video, drill with the metronome.", viewer.canvas.width / 2, viewer.canvas.height / 2);
  }
  requestAnimationFrame(frame);
}

syncSpeed();
setMode(move || cap ? "watch" : "drill");
requestAnimationFrame(frame);
