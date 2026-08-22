# 10 — The Community Layer: Solo-First, Never Alone

Implements Doc 05 §5 (the relatedness layer) and Doc 02 §4's retention findings: the
community *is* the retention mechanism in every dance culture — cyphers, socials,
milongas, recitals. v1 is deliberately tiny-crew-scale (2–5 people, the size the
Motivation Engine prescribes), built as a **shared live board** rather than a social
network: no feeds, no followers, no comparison traps — just witnesses.

## v1: The Cypher (shared crew board)

A single shared page every crew member opens from one link. It is a *live document*:
each member's taps save as them and sync to everyone. Four surfaces, each mapped to an
evidence-backed mechanic:

| Surface | What it does | Why (evidence) |
|---|---|---|
| **Season finale card** | Editable season theme + finale + date; members post public commitments | Deadline + public commitment + fresh-start bundle (Doc 05 Law 9); recitals/battles are the strongest attendance drivers; 68% re-enroll after performing (Doc 02) |
| **Crew check-ins** | Join with your name; one tap logs today's session at its real size (⚡8min / 🔥30 / 💪60); everyone sees ✓ today + n/7 this week | Visible check-ins = implicit accountability; social-streak users are measurably more consistent (Strava ~15%+, Doc 05); MVS counts fully — the board never shames a small session |
| **Body-doubling** | Propose a session time + focus; others tap "I'm in" | Body-doubling / social facilitation + a scheduled "now" (Doc 05 §5) |
| **Clip wall** | Post progress-clip links; crew responds with ✊ hype | The monthly clip ritual (Law 7) with witnesses; variable social reward, White-Hat |

Design rules carried over from the app: the streak language bends ("never miss twice"
copy on the board itself), check-in sizes are honest (a repeated tap *upgrades* today's
chip, never double-counts), and read-only viewers get a clear banner instead of silent
failure.

### Operating it (the crew ritual)
1. Owner shares the board link with **edit access** to 1–4 people (even one friend works
   — the research says the loop matters more than the size).
2. Everyone bookmarks it next to their Today app; check-in happens right after
   completing the session (habit-stack the two taps).
3. Weekly: one body-doubling session minimum (cameras on, music synced, each drills
   their own tree).
4. Monthly: everyone posts a clip. Hype is mandatory culture — the wall is for
   witnessing, not judging.
5. Season finale date lives at the top; commitments are public by design.

Source of record: `community/crew-board.html` (published as a live-doc artifact with
`capabilities: {artifact: {}}`; republish from this file to update every crew's board
pattern). The Today app links to the crew board via a stored URL (footer → Crew).

## The real-world ladder (unchanged, unautomated — on purpose)

The board is scaffolding for the graduated exposure ladder from the research, which
happens off-screen: freestyle alone → filmed round to the crew (the clip wall) →
familiar cypher (a body-doubling session is exactly this) → unfamiliar cypher / class
drop-in → battle. Each Season finale (Doc 05 Law 9) advances one rung. Software's job
is to make the next rung visible and dated — never to substitute for it.

## v2+ (when the platform opens beyond one crew)

- Crews as first-class objects in the app (shared season state, synced finale dates).
- Cypher-finder: map of local sessions/jams; class drop-in bounties as season quests.
- Community capture jams feeding the Motion Factory (Doc 08 §4) — the clip wall grows
  a "submit for the library" lane with the release + credit flow.
- Battle-equivalents: async video battles with crew judging on the five criteria
  (Doc 03 §2) — the WDSF axes as a scoring rubric the community already speaks.
