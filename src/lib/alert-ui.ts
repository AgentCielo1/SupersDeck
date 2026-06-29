// =============================================================================
//  Alert UI — client-safe style maps + label helpers
// =============================================================================
//  Pure module (no server imports) so both server and client components can
//  share one source of truth for tier colors and labels. The tier *behavior*
//  (channels, requiresAck, staffRoles) lives in src/lib/alerts.ts; this file
//  is only the presentational layer so every component agrees visually.
//
//    routine   → brand / blue
//    urgent    → warn  / yellow
//    emergency → danger / red
// =============================================================================

import type { AlertTier } from "@/lib/alerts";

/** Small inline badge (e.g. on a list row or detail header). */
export const TIER_BADGE: Record<AlertTier, string> = {
  routine: "border-brand-400/40 bg-brand-50 text-brand-800",
  urgent: "border-warn-600/40 bg-warn-50 text-warn-800",
  emergency: "border-danger-600/40 bg-danger-50 text-danger-800",
};

/** Full-width banner surface (bg + border + text). */
export const TIER_BANNER: Record<AlertTier, string> = {
  routine: "border-brand-400/40 bg-brand-50 text-brand-800",
  urgent: "border-warn-600/40 bg-warn-50 text-warn-800",
  emergency: "border-danger-600/40 bg-danger-50 text-danger-800",
};

/** Solid color block used for the selector card accent + dot. */
export const TIER_DOT: Record<AlertTier, string> = {
  routine: "bg-brand-600",
  urgent: "bg-warn-600",
  emergency: "bg-danger-600",
};

/** Selected-state ring/border for the composer's tier cards. */
export const TIER_SELECTED: Record<AlertTier, string> = {
  routine: "border-brand-600 ring-2 ring-brand-100 bg-brand-50/60",
  urgent: "border-warn-600 ring-2 ring-warn-50 bg-warn-50/60",
  emergency: "border-danger-600 ring-2 ring-danger-50 bg-danger-50/60",
};

const TIER_LABELS: Record<AlertTier, string> = {
  routine: "Routine",
  urgent: "Urgent",
  emergency: "Emergency",
};

export function tierLabel(tier: AlertTier): string {
  return TIER_LABELS[tier];
}

const CHANNEL_LABELS: Record<string, string> = {
  push: "Push",
  email: "Email",
  sms: "SMS",
};

/** ["push","email","sms"] -> "Push + Email + SMS". */
export function channelsLabel(channels: string[]): string {
  if (!channels || channels.length === 0) return "—";
  return channels.map((c) => CHANNEL_LABELS[c] ?? c).join(" + ");
}
