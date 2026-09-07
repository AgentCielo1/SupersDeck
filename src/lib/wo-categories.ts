// =============================================================================
//  Work-order categories — quick-tap grid + title seeding
// =============================================================================
//  The internal /work-orders/new form shows these as tappable buttons (same
//  pattern the tenant intake has used since July) instead of a dropdown, and
//  tapping one seeds the Title field. `titleText` matches the server's own
//  CATEGORY_LABELS in POST /api/work-orders — the phrases it uses when it
//  derives a title for a blank intake submission — so titles read the same
//  whether a tenant or a super filed the ticket.
//
//  Keys must stay aligned with ALLOWED_CATEGORIES in
//  src/app/api/work-orders/route.ts; the five HPD-risk categories (no-heat,
//  no-hot-water, leak, mold, lead-concern) are deliberately separate buttons
//  because the API derives the ticket's hpd_risk flag from them.
// =============================================================================

export type WoCategory = {
  key: string;
  /** Short label on the tap button. */
  label: string;
  /** Language-neutral emoji, mirroring the intake grid's icons. */
  icon: string;
  /** Seeded into the Title field on tap (server's derived-title phrasing). */
  titleText: string;
};

export const WO_CATEGORIES: WoCategory[] = [
  { key: "no-heat", label: "No heat", icon: "🔥", titleText: "No heat" },
  { key: "no-hot-water", label: "No hot water", icon: "🚿", titleText: "No hot water" },
  { key: "leak", label: "Leak / water", icon: "💧", titleText: "Leak" },
  { key: "electrical", label: "Electrical", icon: "💡", titleText: "Electrical issue" },
  { key: "appliance", label: "Appliance", icon: "🧺", titleText: "Broken appliance" },
  { key: "lock-key", label: "Lock / key", icon: "🔒", titleText: "Lock / key issue" },
  { key: "pest", label: "Pest", icon: "🐜", titleText: "Pest" },
  { key: "mold", label: "Mold", icon: "🦠", titleText: "Mold" },
  { key: "elevator", label: "Elevator", icon: "🛗", titleText: "Elevator" },
  { key: "intercom", label: "Intercom", icon: "🔔", titleText: "Intercom" },
  { key: "common-area", label: "Common area", icon: "🏢", titleText: "Common area issue" },
  { key: "lead-concern", label: "Lead concern", icon: "🎨", titleText: "Lead concern" },
  { key: "other", label: "Other", icon: "➕", titleText: "Repair request" },
];

/** The title a category tap seeds: "No heat" or "No heat — Apt 7C". */
export function categoryTitle(key: string, unitLabel: string): string {
  const c = WO_CATEGORIES.find((c) => c.key === key);
  if (!c) return "";
  const unit = unitLabel.trim();
  return unit ? `${c.titleText} — Apt ${unit}` : c.titleText;
}
