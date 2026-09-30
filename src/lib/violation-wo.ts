import type { Building } from "@/types";
import { cureDeadline, violationClass, type HpdViolation } from "@/lib/hpd";

// =============================================================================
//  Violation → work order — the loop that turns the red wall into a queue
// =============================================================================
//  A "+ Create WO" tap on an HPD violation opens /work-orders/new with
//  everything prefilled: building, apartment, a scannable title, the
//  violation's full legal text as the description, the category mapped from
//  the violation wording (which drives the WO's hpd_risk flag downstream),
//  and priority from the violation class. The created work order carries
//  source_violation_id, and the violations page uses that to show which
//  violations already have a ticket.
//
//  Category mapping is keyword-based over HPD's NOV text. HPD's phrasing is
//  formulaic ("ABATE THE INFESTATION CONSISTING OF MICE…", "PROVIDE AN
//  ADEQUATE SUPPLY OF HOT WATER…"), so keywords are reliable; anything
//  unmatched falls to "other", which is safe — category only aids triage.
// =============================================================================

/** Order matters: first match wins, specific before general ("HOT WATER"
 *  must be tested before "WATER"/leak). */
const CATEGORY_RULES: Array<[RegExp, string]> = [
  [/HOT WATER/i, "no-hot-water"],
  [/\bHEAT\b|HEATING SEASON/i, "no-heat"],
  [/MICE|MOUSE|RAT\b|RATS\b|RODENT|ROACH|VERMIN|PEST|INSECT|BEDBUG|BED BUG/i, "pest"],
  [/MOLD|MILDEW/i, "mold"],
  [/LEAD[- ]BASED PAINT|XRF|\bLEAD\b/i, "lead-concern"],
  [/LEAK|WATER DAMAGE|WATER PENETRATION|PLUMBING|WASTE LINE|WATER CLOSET|FAUCET|SHOWER|BASIN|TOILET/i, "leak"],
  [/ELECTRIC|WIRING|OUTLET|LIGHT FIXTURE|LIGHTING FIXTURE/i, "electrical"],
  [/ELEVATOR/i, "elevator"],
  [/INTERCOM|DOORBELL|BELL-BUZZER/i, "intercom"],
  [/REFRIGERAT|STOVE|RANGE\b|OVEN|APPLIANCE/i, "appliance"],
  [/\bLOCK\b|LOCKS\b|KEY\b/i, "lock-key"],
  [/PUBLIC HALL|STAIR|LOBBY|CELLAR|ROOF|COURTYARD|COMPACTOR|MAILBOX|FIRE ESCAPE/i, "common-area"],
];

export function categoryFromViolation(v: HpdViolation): string {
  const text = v.novdescription ?? "";
  for (const [re, cat] of CATEGORY_RULES) {
    if (re.test(text)) return cat;
  }
  return "other";
}

/** Class C is immediately hazardous (24h cure) → high. B (30d) → normal.
 *  A / I / unknown → low-stakes paperwork pace. "Emergency" stays reserved
 *  for the super's own judgement (gas, flood, lockout — not an NOV). */
export function priorityFromViolation(v: HpdViolation): string {
  switch (violationClass(v)) {
    case "C":
      return "high";
    case "B":
      return "normal";
    default:
      return "low";
  }
}

/** "HPD C · Apt 10K · abate the infestation consisting of mice…" — scannable
 *  in the work-orders list, capped so it never becomes a paragraph. */
export function titleFromViolation(v: HpdViolation): string {
  const cls = violationClass(v) ?? "?";
  const where = v.apartment ? `Apt ${v.apartment}` : "common area";
  // HPD NOVs open with a statute cite in several shapes — "HMC ADM CODE:
  // § 27-2017.4 ABATE…", "§ 27-2005 ADM CODE PROPERLY REPAIR…", even
  // "§ 27-2046.1, 27-2005; § 107 (2) ( c) MDL AND 28 RCNY §25-171: REPLACE…".
  // All noise in a work-order list; strip any leading mix of code names,
  // §-numbers, subsection letters and separators.
  const raw = (v.novdescription ?? "")
    .replace(
      /^(?:(?:HMC|ADM CODE|MDL|RCNY|AND)\b[:,\s]*|\(\s*[a-z]\s*\)\s*|[a-z]\s*\)\s*|[§\d.,()\-;\s]+|:\s*)+/i,
      "",
    )
    .trim();
  const gist = raw.length > 70 ? `${raw.slice(0, 67)}…` : raw;
  return `HPD ${cls} · ${where}${gist ? ` · ${gist.toLowerCase()}` : ""}`.slice(0, 200);
}

/** Full legal text + the provenance a vendor or a hearing needs. */
export function descriptionFromViolation(v: HpdViolation): string {
  const cls = violationClass(v) ?? "unknown";
  const issued = v.novissueddate
    ? new Date(v.novissueddate).toLocaleDateString("en-US")
    : "unknown date";
  return (
    `${v.novdescription ?? "(no description on the NOV)"}\n\n` +
    `— From HPD violation ${v.violationid} · Class ${cls} · issued ${issued} · ` +
    `cure status: ${cureDeadline(v).label}.`
  );
}

/** The prefilled /work-orders/new link for one violation. */
export function workOrderUrlFromViolation(b: Building, v: HpdViolation): string {
  const q = new URLSearchParams({
    building_id: b.id,
    building: b.name,
    title: titleFromViolation(v),
    description: descriptionFromViolation(v),
    category: categoryFromViolation(v),
    priority: priorityFromViolation(v),
    source_violation_id: v.violationid,
  });
  if (v.apartment) q.set("unit_label", v.apartment);
  return `/work-orders/new?${q.toString()}`;
}
