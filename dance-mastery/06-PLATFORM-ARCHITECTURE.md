# 06 — Platform Architecture: The New-Age Learning Engine

This document turns the vision into a buildable product: the animated-instructor pipeline,
the interactive lesson player, the feedback system, the curriculum-as-data engine, and the
legal posture that makes it all safe to ship. It is grounded in a deep research pass across
existing products (STEEZY, Just Dance, Dance Central, Peloton, Kemtai/Onyx, Dance Reality),
pose-estimation research, mocap/3D pipelines, and the current copyright case law.

---

## 1. The market gap we are filling

| Product class | What they have | What they lack |
|---|---|---|
| STEEZY / CLI Studios | Best-in-class video classes (front/back view, mirror, speed, looping) | Zero feedback, weak prerequisite structure, no daily adaptive plan |
| Just Dance / Dance Central | Scoring + per-limb feedback (Dance Central's "Break It Down" mode is the best instructional loop ever shipped) | Party games, not curricula; dead platforms (Kinect) |
| New AI dance apps (Dancio, Dance Buddy, etc.) | Phone-camera feedback | Thin content, no curriculum depth, no credibility |
| Camera fitness (Kemtai, Onyx, Tempo) | Proven real-time form correction UX (audio cues so you never look at the screen) | Exercise only, no dance |
| Peloton / Apple Fitness+ | Streaks, badges, community retention mechanics | Leaderboards demotivate novices; no skill acquisition |

**Nobody has: high-quality 3D-animated instruction + honest camera feedback + a real
prerequisite-aware curriculum + a motivation engine.** That combination is the product.

---

## 2. The animated instructor: why 3D, and the pipeline

### Why 3D animation beats video (product case)
Every STEEZY player feature falls out of a 3D scene for free, plus things video can never do:

- **Free orbit camera** — view a windmill from underneath or a six-step from directly above.
- **Frame-perfect slow motion** — no interpolation blur at 10% speed.
- **True mirroring** — a transform, not a flipped video.
- **Skeleton & joint-angle overlay** on the instructor; **ghost/onion-skin trails** showing
  the path of a limb through space.
- **Exact segment looping** ("loop just the sweep of the CC").
- **Follow mode + inspect mode** — the same clip serves the mirror-view follow-along and
  the walk-around anatomical study.
- **Tiny files** — a rigged character is 1–3 MB compressed; each move's animation clip is
  tens of KB (vs. many MB of video). A 500-move library is smaller than one video course.
- **The same mocap clip is the lesson asset AND the scoring reference** for form feedback.

And the strategic reason: **animation is our clean-room expression.** We synthesize the
*knowledge* of a thousand courses (methods and moves are not copyrightable — see §6) and
express it through original scripts, original cues, and original animated performances we
own outright.

### Capture pipeline (costed)

| Stage | Choice | Cost reality |
|---|---|---|
| Capture (MVP) | Markerless video-to-3D: Move.ai multi-cam (~$99+/mo), DeepMotion, Rokoko Vision (free tier) | Hundreds of dollars; quality on inversions varies — fine for toprock/footwork/grooves |
| Capture (power moves) | One rented optical studio day (OptiTrack/Vicon) — gold standard for fast/inverted motion | ~$2.5–5k/day + dancer day rate $500–1.5k; one day ≈ dozens of moves |
| Capture (owned rig later) | Rokoko Smartsuit Pro II ($2,495; ~$3,495 w/ gloves) | IMU drift on floorwork is real; use for upright styles |
| Cleanup | Blender + freelance animator | 2–4 hrs per minute of animation; floor-contact fixes dominate for breaking |
| Retarget | Blender (Auto-Rig Pro ~$40) / Mixamo auto-rig (free, commercial-use OK) onto our stylized character | Stylized avatar also defuses performer-likeness issues |
| Delivery | glTF/GLB, Draco/meshopt compression (29 MB → 2.5 MB is typical), three.js + react-three-fiber | Keep GLBs < 5 MB; animation-only GLBs are tens of KB |

**MVP budget sketch:** a professionally captured, cleaned ~50-move breaking library lands
around **$8–15k** (one optical day + cleanup), or **under $2k** scrappy (Rokoko/Move.ai +
our own cleanup hours). Content cost is no longer the barrier it was five years ago.

**Performer agreements (non-negotiable):** written work-for-hire covering (a) ownership of
motion data and derivatives, (b) retargeting onto any character, (c) reuse in scoring
models, (d) likeness policy (we retarget to stylized avatars), (e) credit and optional
rev-share — the STEEZY choreographer-credit model buys community goodwill cheaply.

---

## 3. The lesson player (the core surface)

One player, two modes, borrowed from the best of Dance Central + STEEZY + Onyx:

**Learn mode ("Break It Down")** — per move:
1. *Watch*: full-speed animated demo, auto-orbiting to the 2–3 most informative angles.
2. *Study*: free orbit + slow-mo + skeleton overlay; tap any checkpoint ("weight on the
   ball of the left foot here") to see it highlighted on the body.
3. *Drill*: segment-looped follow-along at 50% → 75% → 100% tempo with metronome/counts;
   audio-first cues ("drop the shoulder… now sweep") so you never stare at the screen mid-move.
4. *Check*: record a rep with the camera (or self-attest for moves CV can't judge — see §4);
   get per-checkpoint feedback, Dance Central-style (the failing limb highlights).

**Flow mode** — generated daily sessions (Doc 05): warm-up → drills for due moves
(interleaved) → new material → strength/mobility block → freestyle track. The player
strings clips into one continuous guided session with music and voice coaching.

Every move node carries: animated clip ID, entry/exit poses (so the session generator can
chain moves into combos), tempo range, checkpoints, common mistakes (each with its own
mini-clip), regressions/progressions, and prerequisite edges.

---

## 4. Camera feedback: the honesty-tiered system

Pose estimation is good enough to ship — **if we never pretend it works where it doesn't.**
Research is unambiguous: models (MediaPipe/BlazePose 33 kpts, MoveNet, Apple Vision 3D)
run at 30+ FPS on-device but **fail on inversions, fast rotation, motion blur, baggy
clothes, and floor-level self-occlusion** — which is exactly where breaking power moves
live. So, three honest tiers:

- **Tier 1 — Live scoring** (upright, moderate-speed material: toprock, grooves, salsa
  steps, footwork tempo, held freezes >0.5s): on-device MoveNet/MediaPipe; skeleton
  normalized (hip-centered, torso-scaled), joint-angle time series compared to the mocap
  reference via **DTW** — the literature-validated method (~97% proficiency-classification
  accuracy in published studies). Feedback is per-checkpoint, not fake-precise degrees.
- **Tier 2 — Async clip review** (fast/complex material): record 60fps+ slow-mo, run a
  heavy model server-side, return annotated review in seconds-to-minutes: side-by-side
  skeleton overlay of you vs. the reference, flagged checkpoints.
- **Tier 3 — Proxy + self-assessment** (power moves, inversions): we do *not* pretend to
  judge an airflare's joint angles. We score proxies (entry position, freeze hold time,
  rotation count via optical flow) and structure **guided self-review**: the app frames
  your recording next to the reference at the same tempo and walks you through the
  checkpoint list — video self-review is itself a proven motor-learning feedback loop.

Golden rule baked into the engine: **every feedback statement is gated on per-keypoint
confidence; when confidence collapses, the app says "I can't see this well" instead of
hallucinating corrections.** Trust in feedback is the product; one absurd correction kills it.

---

## 5. Curriculum-as-data: the skill graph engine

The deep, defensible core — none of the surveyed apps has it.

- **Store a DAG, render a path.** Duolingo (2022 path redesign) and Khan Academy (retired
  knowledge map) both learned the same lesson: keep the prerequisite graph in data, but
  present beginners a mostly-linear default route. Explorers can open the full map view.
- **Node types:** `move`, `drill`, `combo`, `concept` (musicality, history), `attribute`
  (strength/mobility gates: e.g., 30s crow hold, wrist prep milestones).
- **Typed edges:** `hard_prereq`, `helps`, `same_family`. Example:
  `windmill ← {backspin, stab, shoulder-roll comfort}`; `airflare ← {windmill, handstand
  shoulder strength}`.
- **Mastery model:** per-node mastery probability updated Bayesian-Knowledge-Tracing-style
  from scored attempts (camera-verified where possible, self-attested otherwise).
- **Review scheduler — motor-learning-adapted, not raw flashcard SRS:** FSRS/SM-2 model
  declarative memory, and the motor-skill literature says physical skills decay differently.
  Our hybrid: expanding-interval review *per move* (skills do decay), graded by measured
  quality; sessions **interleave 3–5 due moves** (contextual-interference research — 2024
  meta-analysis — shows random practice beats blocked for retention and transfer); and
  strength-gated skills follow **progressive-overload timelines**, not memory curves.
- **New styles are content drops, not code.** A salsa pack = a new graph file + clip
  library on the same engine (Doc 04 defines the template).

```jsonc
// Node schema sketch (full seed in data/breaking-skill-tree.json)
{
  "id": "footwork.six_step",
  "type": "move",
  "family": "footwork",
  "prereqs": [{ "id": "footwork.hooks", "kind": "hard_prereq" }],
  "attributes_required": ["wrist_prep.level1"],
  "clips": { "demo": "gltf/six_step.glb", "mistakes": ["hips_high", "flat_hands"] },
  "checkpoints": ["hips low and level", "weight rides the hands", "steps trace a circle"],
  "tempo_bpm": [85, 105],
  "feedback_tier": 1,
  "review": { "scheduler": "srs", "interleave_group": "footwork" }
}
```

---

## 6. Legal architecture (why the animated approach is safe)

Grounded in current law — this is the posture, verified against the case law:

1. **Individual moves and social dances are not copyrightable.** US Copyright Office
   Circular 52 is explicit: individual steps (waltz basic, ballet positions), short
   routines "even if novel or distinctive," and social dances are not registrable. The
   Fortnite cases (Ribeiro/2 Milly) collapsed on exactly this. Teaching six-steps,
   windmills, salsa basics, Afro grooves = teaching free movement vocabulary.
2. **But extended registered choreography is protected** — *Hanagami v. Epic* (9th Cir.
   2023) held that copying even a small, qualitatively significant chunk of a registered
   choreographic work can infringe. **Rule: we teach vocabulary, technique, and our own
   original combos — never a named choreographer's recognizable routine without license.**
3. **Teaching methods are ideas, not expression** (17 U.S.C. §102(b)). Progressions,
   drills, and pedagogical ordering learned from studying many courses are unprotectable
   methods. What we must not copy: another course's exact scripts, footage, distinctive
   named frameworks, or wording. Process rule: research notes → synthesized methodology →
   **original scripts and cues written fresh**, with provenance notes kept.
4. **Music is the expensive trap.** Peloton's unlicensed-sync lesson cost ~$49M. We launch
   with: commissioned original beats (work-for-hire, $100–500/track — breaking and salsa
   instrumentals are cheap to commission and we own them forever), subscription catalog
   tracks licensed at the correct *in-app* tier, counts/metronome training (pedagogically
   correct anyway), and a "play your own music locally" mode (no sync, no license needed).
5. **Mocap performers**: work-for-hire + explicit data/likeness terms (§2). Stylized
   avatars, credited performers.
6. **Cultural respect as policy, not vibe**: every style pack ships with history/context
   lessons and named, credited (and where possible, paid) culture-bearer consultants —
   especially for African dance packs (Doc 04).

---

## 7. System architecture

```
apps/
  mobile+web (React Native / Next.js PWA)
    ├─ Lesson Player  (three.js / react-three-fiber; expo-gl on native)
    ├─ Feedback       (on-device MoveNet/MediaPipe; Apple Vision on iOS)
    ├─ Session Runner (daily generated session, audio-first coaching)
    └─ Motivation UI  (streaks-with-repair, identity ledger, arcs — Doc 05)
services/
  api            (curriculum graph, mastery state, scheduling)
  scoring        (async Tier-2 clip analysis: heavy pose model + DTW)
  content        (GLB library + clip metadata, CDN)
data/
  skill graphs   (per-style JSON packs — versioned content, not code)
  mocap refs     (joint-angle reference series per move)
```

- **Offline-first is a retention feature**: sessions are tiny (GLB clips), pre-fetched,
  and fully functional with no connection — practice can never be blocked by wifi.
- **Privacy**: pose runs on-device by default; raw camera frames never leave the phone in
  Tier 1; Tier 2 uploads are explicit, user-initiated recordings.
- Existing repo stack (Next.js/Supabase/Prisma) is a viable v1 web backbone; the lesson
  player and skill-graph service are new, style-agnostic modules.

---

## 8. Build order (detail in Doc 07)

1. **Phase 0 — Paper + video protocol** (week 1): the training program works with zero
   code — curriculum doc + phone camera + existing free videos. The human (you) starts
   training *now*; the app grows around a live practice.
2. **Phase 1 — Skill graph + session generator** (web): the daily "what do I do today"
   engine over the breaking graph, self-attested mastery, streak-with-repair mechanics.
3. **Phase 2 — Animated instructor MVP**: 20 foundation moves via markerless capture,
   R3F player with orbit/slow-mo/loop/mirror.
4. **Phase 3 — Feedback Tier 1 + Tier 3**: live scoring on upright material, guided
   self-review for everything else.
5. **Phase 4 — Power-move capture day + Tier 2** async review; full 50+ move library.
6. **Phase 5 — Second style pack** (salsa or Afro) to prove the engine is style-agnostic.
