# Dance Mastery — Phase B0: The Daily Session Engine

The "what do I do today" screen from the roadmap (Doc 07, Phase B0): a zero-dependency
web app implementing the skill-graph engine, daily session generator, streak system, and
relapse firewall over `../data/breaking-skill-tree.json`.

## Run it

```bash
cd dance-mastery/app
python3 -m http.server 4173     # or: npx serve .
# open http://localhost:4173
```

No build step, no npm install. State lives in your browser's localStorage
(Export/Import buttons move it between devices).

## Test it

```bash
cd dance-mastery/app
npm test          # = node --test test/  (22 tests, zero dependencies, Node 18+)
```

## What's implemented (mapped to the design docs)

| Feature | Doc |
|---|---|
| Skill graph: hard prereqs unlock at **Clean**, attribute (strength/mobility) gates, frontier & blockers | 06 §5, 01 P5 |
| Daily session generator: Ignition → interleaved SRS review → new material → body prep → **freestyle always last** | 05 §3, 03 §5 |
| Three sizes: Worst day (8 min MVS) / Normal (30) / Big (60); firewall can force MVS, never up | 05 Law 1 |
| Motor-adapted SRS: expanding intervals capped at 35d, rough regresses, family interleaving | 06 §5, 05 Law 8 |
| Learned → Clean → Fast → Styled ladders; stage-up suggested after 3 clean reviews, self-attested | 05 Law 7 |
| Rolling 5/7 weekly target, 2 monthly freezes, showing up after one miss auto-repairs yesterday | 05 Law 6 |
| Relapse firewall: normal → mvs_required → never_miss_twice → fresh_start (next Monday) → reentry | 05 §4 |
| Seasons: 6 on-weeks + finale + 1 off-season week (no new material off-season) | 05 Law 9 |
| Identity-first copy throughout ("every session is a vote") | 05 Law 10 |

## Architecture

```
js/engine/   pure ES modules, no DOM, fully unit-tested
  dates.js     date-key arithmetic (DST-proof)
  graph.js     skill-tree indexing, unlocks, frontier, body-prep queue
  srs.js       spaced review + interleaving + stage-up suggestion
  streak.js    rolling week, freezes, repair, relapse firewall
  season.js    season/week math + themes/finales
  session.js   the generator + completeSession reducer
  store.js     persistence (injectable storage)
js/data/     breaking.js — GENERATED from ../data/breaking-skill-tree.json
             (regenerate with: npm run sync-data)
js/app.js    UI wiring only
index.html   the Today screen
```

The engine is style-agnostic: point it at any skill-tree JSON in the same format
(Doc 04's packs) and everything works unchanged — that's the Phase B4 test.
