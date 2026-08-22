# 09 — Capture-Day Playbook: Your First Weekend in the Motion Factory

A runnable protocol for capturing your first move clips **this weekend** with gear you
already own. Follow it top to bottom. By Sunday night you'll have raw multi-angle footage
of the Phase 0–1 moves, a calibrated rig you can rebuild in 10 minutes, and your first
reconstruction attempt — and the whole day **counts as training sessions** in the app.

**Weekend 1 goal (deliberately modest):** rig built + calibrated, 6–10 moves captured
clean, 1 clip pushed through reconstruction end-to-end. Not 50 moves. The factory's first
day is about proving the line runs.

---

## 0. Gear checklist (gather Friday)

- [ ] **2–3 phone cameras** (your phone + any old/borrowed ones). One phone still works —
      see the single-camera fallback in §8.
- [ ] Mounts: tripods if you have them; otherwise **books, shelves, a chair + tape**.
      Stability matters more than height precision.
- [ ] **Calibration board**: print the ChArUco board from FreeMoCap's docs
      (freemocap.org → calibration) on A4/letter, tape it to **stiff cardboard** — it
      must stay perfectly flat.
- [ ] Computer with [FreeMoCap](https://freemocap.org) installed (free, open source:
      `pip install freemocap`). Do the install **Friday night**, not Saturday.
- [ ] **Wardrobe: tight-fitting clothes** — leggings/compression wear or slim shorts +
      fitted tee. Baggy pants are breaking's uniform and markerless tracking's kryptonite.
      Bright solid colors beat black. No reflective logos.
- [ ] Painter's tape (capture-zone marks), all phones charged + ≥10GB free each,
      power strip, water, your practice playlist.
- [ ] Print this playbook's §5 shot sheet (or copy it to your phone notes).

## 1. Friday night (60–90 min): prep so Saturday is pure capture

- [ ] Install & launch FreeMoCap once; run its sample session so surprises happen tonight.
- [ ] Print + mount the calibration board.
- [ ] Choose the room: you need a clear **2m × 2m floor zone** with ~1m of walking room
      around it, and enough light that fast hands don't blur (see §3).
- [ ] Charge everything. Set every phone: **1080p @ 60fps**, landscape, exposure/focus
      locked (tap-hold on the subject area), HDR **off**, video stabilization **off** if
      the phone allows, airplane mode **on**.
- [ ] Tape the floor: a 2×2m square, plus a small X at dead center.
- [ ] Tonight's app session: MVS. You're in prep week, not proving week.

## 2. Saturday morning: build the rig (once — then never touch it)

Three-camera geometry (fits any living room):

```
            C (high diagonal, ~2m, on a shelf/stack, looking down 30–45°)
             \
              \        ┌─────────────┐
               \       │  2m × 2m    │
                ●──────│  capture    │──────● A (front, chest height ~1.2m, 2.5–4m back)
                       │  zone       │
                       └─────────────┘
                              │
                              ● B (side, 90° from A, LOW: 0.3–0.5m — the floorwork camera)
```

- Every camera must see the **entire taped zone including the floor** — check each
  phone's preview while a helper (or you) walks the square and lies down in it.
- Camera B low and side-on is what makes footwork/freezes reconstructable.
- [ ] After aiming: **lock positions and never bump them.** A nudged camera = recalibrate.

### Calibrate (10 min)
1. Start recording on **all** phones.
2. Stand at center, count "3-2-1" aloud, and do **one big clap above your head**, visible
   to every camera (this is your sync mark — FreeMoCap aligns the videos by it).
3. Slowly move the calibration board through the whole volume for ~90 seconds — near the
   floor, at chest height, tilted at varied angles, shown to all cameras. Keep it flat,
   move it smooth.
4. Clap once more, stop all recordings. That's your calibration take — label it `CAL_01`.

## 3. Light rule (the one technical thing that decides quality)

More light beats everything. Motion blur — not resolution — is what kills fast-move
tracking. Open curtains, bring every lamp in the house, point them at the zone (not the
lenses). Quick test: film yourself doing fast arm swings; scrub frame by frame — if
hands are streaks, add light or slow the move variant down.

## 4. The take ritual (identical for every move, every time)

1. Say the slate **out loud to camera**: "Six-step, take two."
2. Hold a **T-pose for 2 full seconds** at center (gives reconstruction a clean anchor).
3. Perform: **two 8-counts** of the move (or 3–5 reps of a discrete move), staying
   inside the tape.
4. Return to T-pose 2 seconds. Done.
5. Mark the shot sheet: ✓ clean / ~ usable / ✗ redo. **Three ✓ takes → next move.**

Rules: one move per take (short takes reconstruct better and fail cheaper), stop-start
between takes (keeps files small and named), never chase a failed rep outside the zone.

## 5. Weekend-1 shot sheet (Phase 0–1 moves — capture what you can DO, not what you wish)

| # | Slate | Move id | Takes | Notes |
|---|---|---|---|---|
| 0 | CAL_01 | — | 1 | board sweep + claps |
| 1 | ROM | rom_check | 1 | joint circles, squat, arm swings — a body-audit clip |
| 2 | Groove | toprock.groove | ☐☐☐ | one 8-count bounce, your style |
| 3 | Two-step | toprock.two_step | ☐☐☐ | both directions |
| 4 | Indian step | toprock.indian_step | ☐☐☐ | |
| 5 | Kick step | toprock.kick_step | ☐☐☐ | |
| 6 | Corkscrew drop | getdown.corkscrew | ☐☐☐ | slow + tempo versions |
| 7 | Six-step | footwork.six_step | ☐☐☐ | 2 full rotations per take; do a **half-speed take too** |
| 8 | Baby freeze | freeze.baby | ☐☐☐ | entry + 3s hold; B camera is the money angle |
| 9 | Backspin | power.backspin | ☐☐☐ | only if currently safe for you |
| 10 | Freestyle | bonus | ☐ | one take, 60s — for the archive and the soul |

Between slates: this is a real training session — warm up first (Doc 03 §5 order), water
breaks, and stop while quality is still high. Two hours of capture max on day one.

## 6. Offload + naming (Saturday, before you're tired)

```
captures/2026-08-23_session01/
  raw/camA/  camB/  camC/          ← full card dumps, untouched
  CAL_01/  toprock.two_step_t1/ ...
```
File names: `{move_id}_t{take}_cam{A|B|C}.mp4`. Copy to the computer **and** one backup
(cloud or second drive) the same day. Raw footage is the factory's crude oil — never
lose it, never edit the originals.

Sign the release — yes, for yourself (Doc 08 §6): *"I, [name], captured on [date], grant
the Dance Mastery project all rights to the motion data derived from these recordings,
including retargeting to any character and use in scoring models."* One line, dated,
in the session folder. Future-you (and future contributors) will thank you.

## 7. Sunday evening: first reconstruction (90 min, one move)

1. Open FreeMoCap → new session → load `CAL_01` videos → run calibration. Target: it
   reports low reprojection error and shows all three camera poses sensibly placed.
2. Feed it the **best two-step take** (an upright move first — save six-step for round 2).
3. Inspect the output skeleton playback: does the timing look like you? Feet plant?
4. Export (BVH/CSV) and run it through our converter:
   `node dance-mastery/tools/bvh2json.mjs out.js "capture.toprock.two_step=Two-step (self):file.bvh"`
   — then it plays in `app/library.html` next to the CMU studio clips. **That
   side-by-side is your quality meter** from day one.
5. Log what failed in `captures/.../notes.md`. Failures on day one are data, not defeat.

## 8. Fallbacks & failure modes

- **Only one phone?** Capture anyway: camera A position, same take ritual. Single-view
  reconstruction (monocular lane, Doc 08) handles upright material; the footage stays
  valid forever and can be re-processed as the pipeline improves. Add cameras next weekend.
- **Tracking garbage on a move?** Check in order: clothing too loose → blur (add light) →
  left the zone → camera bumped since CAL (recalibrate). Floorwork failing on A/C but
  fine on B is normal — that's why B exists.
- **FreeMoCap fights your machine?** Record everything anyway this weekend; reconstruction
  can happen any time. Capture days and processing days don't have to be the same day.
- **A move hurts?** It's out of this weekend's scope. The shot list serves the curriculum,
  never the other way around (Doc 03 §6).

## 9. What "done" looks like Sunday night

- [ ] Rig photos taken (so you can rebuild the exact geometry next time)
- [ ] CAL_01 + 6–10 moves × 3 takes offloaded, named, backed up
- [ ] One move reconstructed and viewed in library.html next to the CMU clips
- [ ] notes.md: what worked, what to change, next weekend's shot list drafted
- [ ] Two app sessions logged (capture blocks count — you trained this weekend)

Next weekends: re-capture the wobbly ones, extend to Phase 2 moves as you learn them,
and start the Blender cleanup scripts (Station 4) on your best clips. The factory is
open.
