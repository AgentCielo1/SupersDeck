// =============================================================================
//  Alert tier table — PURE, client-safe (no server-only imports)
// =============================================================================
//  Lives apart from lib/alerts.ts (which pulls in twilio / web-push / resend /
//  supabase) so client components can import the tier metadata + AlertTier type
//  WITHOUT dragging Node-only server code into the browser bundle.
// =============================================================================

export type AlertTier = "routine" | "urgent" | "emergency";

export interface TierConfig {
  tier: AlertTier;
  label: string;
  color: string; // tailwind-ish token name used by the UI
  channels: Array<"push" | "email" | "sms">;
  requiresAck: boolean;
  /** Roles targeted for staff notification. */
  staffRoles: string[];
  description: string;
}

const ALL_STAFF_ROLES = ["admin", "super", "manager", "porter", "read_only"];

export const TIERS: Record<AlertTier, TierConfig> = {
  routine: {
    tier: "routine",
    label: "Routine",
    color: "blue",
    channels: ["push"],
    requiresAck: false,
    staffRoles: ALL_STAFF_ROLES,
    description: "Informational. Push only, no acknowledgment required.",
  },
  urgent: {
    tier: "urgent",
    label: "Urgent",
    color: "yellow",
    channels: ["push", "email"],
    requiresAck: true,
    // "management + affected building supers"
    staffRoles: ["admin", "manager", "super"],
    description: "Needs attention within hours. Push + email. Supers acknowledge.",
  },
  emergency: {
    tier: "emergency",
    label: "Emergency",
    color: "red",
    channels: ["push", "email", "sms"],
    requiresAck: true,
    staffRoles: ALL_STAFF_ROLES,
    description:
      "Immediate danger. Push + email + SMS to all staff and all tenants in affected buildings. Every super must acknowledge.",
  },
};
