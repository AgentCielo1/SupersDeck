# 08 — The Motion Factory: The 50-Move Library at ~$0 Cash

Doc 06 priced the mocap library at $8–15k *if you buy it the industry's way* (rented
optical stage + paid performer + paid cleanup). This document designs the system that
replaces every paid station with an owned one. The honest trade: **cash is replaced by
hours and process** — the factory's currency is sweat equity, and its output improves
with every pass because clips are data the app can swap invisibly.

---

## 1. The core insight: we control every variable the studio charges for

| What the $8–15k buys | Why it can be $0 for us |
|---|---|
| Optical capture volume | Multi-phone markerless capture (open source) is now good enough for a **stylized avatar** — we don't need film-VFX fidelity |
| Professional performer | **You are the performer.** The library grows exactly as your curriculum progresses — and that's a feature (see §7) |
| Animator cleanup hours | Scripted cleanup (Blender headless) + a stylized character that hides millimeter noise + our own hours |
| Retargeting fees | Free tooling end-to-end (Blender, free retarget plugins, glTF export) |

The stylized-avatar decision from Doc 06 is what makes this possible: a stylized 3D
character (which we wanted anyway, for likeness/legal reasons) has a *much* lower
fidelity bar than photoreal. Small joint jitter that would ruin a realistic human reads
as nothing on a toon-proportioned breaker.

## 2. Factory architecture: six stations, all free software

```
CAPTURE ──► RECONSTRUCT ──► RETARGET ──► CLEAN ──► QC ──► PUBLISH
 phones      video → 3D      onto our     scripted   check    GLB clip +
 on tripods  skeleton        rig          filters    list     metadata → app
```

### Station 1 — Capture rig (~$0: hardware you own or borrow)
- **2–4 phone cameras** (old phones work; every crew has drawers of them) on cheap
  tripods or shelf mounts, plus good room light.
- Multi-camera calibration with a **printed checker/ChArUco board** — the open-source
  tools below walk you through it.
- Breaking-specific capture rules (from the pose-estimation failure research in Doc 06):
  60fps minimum (120fps slow-mo for power moves), tight-fitting clothing (baggy pants
  destroy markerless tracking), one camera low at floor level + one high, short
  one-move-per-clip takes, 3–5 takes per move, T-pose at the start of every take.

### Station 2 — Reconstruction (open source, pick per move difficulty)
- **Multi-camera lane (power moves, floorwork):** [FreeMoCap](https://freemocap.org) —
  free, open-source, built exactly for "mocap studio from phones"; or
  [Pose2Sim](https://github.com/perfanalytics/pose2sim) for a more research-grade
  multi-view pipeline. Multiple views are what defeat the inversion/self-occlusion
  failures that kill single-camera tracking on windmills.
- **Single-camera lane (toprock, grooves, upright material):** monocular
  video-to-3D research models — GVHMR / WHAM / HMR-family — or MediaPipe-based lifting;
  quality is genuinely good for upright movement.
- **Free-tier commercial fallback** when a clip fights us: Rokoko Vision, Plask, and
  DeepMotion free tiers (per Doc 06 research) — still $0 at our volume.

### Station 3 — Retarget (Blender, free)
- One canonical rig for the stylized instructor (Mixamo auto-rig to start; custom rig
  later). Free retarget paths: Rokoko's Blender add-on, or bone-mapping in vanilla
  Blender. Output skeleton is **the same for every clip forever** — that's what lets
  the app treat animation as tiny interchangeable data files.

### Station 4 — Clean (scripted, then human touch-up)
The industry's "2–4 hours per minute" is mostly repetitive labor a script can do:
- **Batch filters in headless Blender (Python):** Butterworth smoothing on joint curves,
  foot/hand **contact locking** (the #1 breaking cleanup task — detect near-floor +
  low-velocity, pin the contact), root-drift removal, loop-point blending for cyclic
  moves (6-step, windmills), T-pose trim.
- Human pass only for what survives the script — on a stylized avatar this is minutes
  per clip, not hours. Our factory scripts live in `dance-mastery/tools/` (Phase B1).

### Station 5 — QC (a checklist, not a vibe)
Per clip before publish: feet/hands never penetrate or float off the floor at contact ·
timing snapped to an 8-count at a stated BPM · loop point invisible for cyclic moves ·
mirror version generated and eyeballed · silhouette readable from the 3 teaching angles ·
entry/exit poses match the graph's transition edges (so the session generator can chain
clips into combos).

### Station 6 — Publish (automated)
glTF/GLB export → meshopt/Draco compression → clip metadata (move id, BPM, checkpoint
timestamps, entry/exit pose tags) → drops into the app's data folder. The clip **is**
the DTW scoring reference for the feedback system later — captured once, used twice.

## 3. The three production lanes (not everything needs mocap)

1. **Procedural/hand-keyed lane — $0, available today.** Foundation moves are rhythmic
   and structural; a hand-keyed or code-driven animation on the stylized rig teaches the
   *shape and count* perfectly well for v1. **Proof shipped with this doc:**
   `app/library.html` — a zero-dependency 3D move-library simulation with a procedurally
   animated breaker performing representative moves from all five pillars. That page cost
   exactly $0.
2. **Self-capture lane — the factory above.** You + the phone rig, capturing each move
   *as you master it* (§7), plus crew capture jams.
3. **AI-assist lane — accelerant, not authority.** Open text-to-motion models (MDM,
   MoMask family) can rough out a motion for the hand-key lane to fix; treat output as a
   draft that must pass the same QC gate. Never shipped raw.

Every move in the library carries a `fidelity` tag: `procedural → self_capture →
refined`. The app doesn't care — upgrading a clip is a data swap users just see as
"the animation got better." **Ship stylized v1 now, upgrade forever.**

## 4. The performer problem, solved three ways

- **You** capture everything you can already do — and the capture session doubles as
  practice + the video self-review loop (Doc 05 Law 7). The library literally grows at
  the speed of your own mastery.
- **Capture jams:** local breakers perform the moves you can't yet, for credit +
  founding-member status + eventual revenue share (the STEEZY credit model, Doc 02) —
  each signs the release from Doc 06 §2 (motion data ownership, stylized-avatar
  retargeting, credit). Cash cost: pizza.
- **The community flywheel (later):** once the app has users, the "submit a capture"
  path + QC gate turns the user base into the factory's second shift — with the same
  credit-and-release architecture, and originator credit rules for culture-specific
  moves (Doc 02 §3).

## 5. The real budget (hours, not dollars)

| Lane | Per move | 50-move library |
|---|---|---|
| Procedural/hand-keyed | 1–3 h | ~40 h for the ~20 foundation moves |
| Self-capture (after rig setup ~8 h once) | 1–2 h capture-to-publish | ~50 h for ~25 mid-tier moves |
| Hard captures (power tier, multi-take) | 3–5 h | ~20 h for the last ~5 |
| **Cash** | **~$0** | tripods/board printing if not owned: < $100 |

~110 factory hours total, spreadable across months, much of it *is* your training time.
The only thing left that money genuinely buys better is airflare-tier capture on an
optical stage — deferred to the end of the roadmap, optional, and by then possibly
community- or revenue-funded.

## 6. What stays non-negotiable even at $0

Releases for every captured human (even friends, even you — future-proofing the data),
originator credit for culture-specific moves, the QC gate for anything AI-assisted, and
honest fidelity tags. Free must never mean careless.

## 7. Why this beats the $8–15k version even if we had the cash

The factory couples content production to the founder's own curriculum: every move you
learn produces a clip; every clip you capture is a self-review rep; every self-review
rep feeds the motivation engine's visible-progress loop. The studio version buys a
static library; the factory version builds a **living one** — and builds the discipline
habit at the same time. This is Doc 01's principle 10 applied to production itself.
