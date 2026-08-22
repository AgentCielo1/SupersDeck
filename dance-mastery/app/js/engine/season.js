// Seasons, not forever (Doc 05 Law 9): 7-week cycles — 6 on-season weeks
// building to a finale, then one deliberately light off-season week.

import { diffDays, addDays } from "./dates.js";

export const SEASON_WEEKS = 7; // 6 on + 1 off

export const SEASON_THEMES = [
  { theme: "Foundation Season", finale: "Film the mini-round (toprock → drop → 6-step → baby freeze, on beat) and send it to a witness." },
  { theme: "Foundation II Season", finale: "Film a 45-second round with every transition named — zero teleports." },
  { theme: "Vocabulary Season", finale: "Film a footwork-only round: 60 seconds, both directions, no repeats." },
  { theme: "Power & Freeze Season", finale: "Film your freeze chain and your best power progression rep." },
  { theme: "Style Season", finale: "Film a round built around one signature move of your own." },
  { theme: "Battle Season", finale: "Take a full round into a cypher, class, or session — or battle a crewmate on camera." },
];

export function seasonInfo(state, today) {
  const start = state.startDate;
  const day = Math.max(0, diffDays(start, today));
  const number = Math.floor(day / (SEASON_WEEKS * 7)) + 1;
  const dayInSeason = day % (SEASON_WEEKS * 7);
  const week = Math.floor(dayInSeason / 7) + 1; // 1..7
  const offSeason = week === SEASON_WEEKS;
  const t = SEASON_THEMES[(number - 1) % SEASON_THEMES.length];
  // Finale = last day of week 6 of the current season.
  const finaleDate = addDays(start, (number - 1) * SEASON_WEEKS * 7 + 6 * 7 - 1);
  return {
    number,
    week,
    offSeason,
    theme: t.theme,
    finale: t.finale,
    daysToFinale: offSeason ? 0 : Math.max(0, diffDays(today, finaleDate)),
  };
}
