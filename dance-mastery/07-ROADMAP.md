# 07 — The Roadmap: From Tomorrow Morning to the Platform

Two tracks run in parallel by design: **Track A — you start training now** (the program
works with zero code), and **Track B — the platform gets built around a live practice**.
Track A is the point; Track B multiplies it. Never block A on B.

---

## Track A — The personal protocol (starts tomorrow)

### Week 0 setup (one evening, ~1 hour)
1. Pick the **anchor**: the single daily moment practice attaches to (recommended: the
   moment you close the work laptop — the commute-home transition is the most reliable
   9–5 anchor).
2. Write the three **if-then coping plans** on paper (Doc 05 Law 2), including the
   non-negotiable: *if I skipped yesterday, today is MVS-minimum.*
3. Build the **practice corner**: clear floor spot, speaker, phone tripod (feedback loop),
   beanie (future headspins), knee pads optional.
4. Create the **locked practice playlist** and seed it with the breaks canon: Apache,
   It's Just Begun, The Champ, Give It Up or Turnit a Loose, The Mexican.
5. Do the **body audit** (Doc 03 Phase 0): wrist, shoulder, neck, hip baselines.

### Weeks 1–2 — Phase 0 (deliberately un-failable)
- Only the 8-minute MVS: groove to one song + counting 8s + wrist circles.
- Goal: **5 sessions in week one** (the activation number), 10 by end of week two.
- Nothing harder is allowed yet, even on good days: the surplus energy goes to freestyle,
  not to new moves. Week two is the historical failure point; this time it's priced in.

### Months 1–3 — Phase 1 (Foundation I, per Doc 03)
- Season 1 (6–8 weeks): "Foundation Season" — two-step, Indian step, corkscrew drop,
  6-step, baby freeze, backspin, wrist/core ramps.
- **Season finale (the deadline event):** film the mini-round (toprock → drop → 6-step →
  baby freeze on beat) and send it to at least one witness.
- Off-season week, then Season 2 opens Phase 2 material.

### The free-resource map for Track A (until our animated content exists)
- **VincaniTV** (YouTube) — the free curriculum backbone: toprock basics, footwork 101,
  freeze basics, beginner windmills, conditioning series.
- **BreakDance Decoded** (Medium/Patreon) — the written methodology: beginner guide,
  three-year roadmap, Lone Bboy solo-practice manual.
- **B-Boy Dojo free beginner track**; **STEEZY trial** for player-feature experience.
- **GMB wrist routine** for the wrist ramp; Breakalign articles for body care.
- The app's job (Track B) is to replace the *ordering, feedback, and motivation* these
  can't give — not to be a prerequisite for starting.

---

## Track B — Platform build phases

### Phase B0 (weeks 1–4): Curriculum-as-data + daily engine (web, in this repo or fresh)
- Implement the skill-graph engine over `data/breaking-skill-tree.json`.
- Daily session generator (MVS/normal/big variants), Learned/Clean/Fast/Styled ladders,
  self-attested checkoffs, rolling 5/7 streak with freezes + repair, relapse firewall
  state machine, season scheduler.
- Deliverable: the "what do I do today" screen — the single highest-value feature, and
  Track A's daily driver from month 2.

### Phase B1 (months 2–4): Animated instructor MVP
- Capture 20 Phase-0/1/2 moves via markerless mocap (Move.ai/Rokoko Vision tier).
- three.js/react-three-fiber player: orbit, slow-mo, mirror, A/B loop, skeleton overlay.
- Checkpoint system per move (tap a checkpoint → highlighted on the body).

### Phase B2 (months 4–6): Feedback tiers 1 & 3
- On-device pose (MoveNet/MediaPipe): live checks for toprock tempo, footwork rhythm,
  freeze hold detection.
- Guided video self-review flow for everything CV can't honestly judge (side-by-side
  with reference, checkpoint walkthrough).
- Monthly auto-compiled progress reel.

### Phase B3 (months 6–9): Full breaking library + Tier 2
- One rented optical-mocap day for the power-move library (windmill family, swipes,
  headspin, flare progressions) with a credited, work-for-hire bboy performer.
- Async clip analysis service (server-side heavy pose model + DTW scoring).
- Community layer v1: crews, body-doubling scheduler, season finales.

### Phase B4 (months 9–12): Second style pack proves the engine
- Recommended: **Hip Hop** (largest Core overlap, no partner dependency) or **Afrobeats**
  (the biggest open content gap found in research — with an originator-partnership model
  from day one per Doc 02 §3).
- Success criterion: the new pack ships as data + clips only — zero engine changes.

### Phase B5 (year 2+): The platform vision
- Salsa (solo-first shines model), Ballet (technique spine), Tango (with built-in scene
  bridges), West African (rhythm-literacy pedagogy with lineage teachers), amapiano /
  pantsula / ndombolo creator partnerships.
- Business model when opened to others: ~$99/yr industry-standard price point, free
  top-of-funnel content, annual-first billing, week-one activation onboarding.

---

## What "success" means at each horizon

| Horizon | Track A (you) | Track B (platform) |
|---|---|---|
| 2 weeks | 10 sessions logged, zero-guilt system running | — |
| 3 months | Mini-round on film; 66-day automaticity horizon crossed | Daily engine live |
| 9 months | Windmill ugly-but-real; CC both ways; first cypher-ladder step | Animated player + feedback shipped |
| 2 years | Battle-ready rounds; two signature moves; a second style opened | Two style packs, community layer |
| 5 years | Cypher-respected master trajectory (Doc 03 Phase 5); several dances lived in | The new-age dance school, open to everyone |

---

## Open decisions (flagged, not blocking)

1. Whether the platform lives in this repo (SupersDeck currently hosts an unrelated
   property-management app) or a fresh repo — recommendation: **fresh repo**, this
   design package moves with it.
2. Capture performer(s) and consultant roster per style pack (respect architecture).
3. Native app vs PWA-first (recommendation: PWA-first; camera + WebGL are sufficient
   until Tier-1 feedback demands native pose performance).
