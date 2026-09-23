import { z } from "zod";
import { TIERS, type AlertTier } from "@/lib/alert-tiers";
import { reqStr, optStr } from "@/lib/validation";

// =============================================================================
//  Alert request-body schemas — PURE, shared by the alert write boundaries
// =============================================================================
//  Lives apart from lib/alerts.ts (which pulls in twilio / web-push / resend)
//  for the same reason alert-tiers.ts does: these are needed by route handlers
//  and by tests, and neither should drag the send engine in to get them.
//
//  POST /api/alerts and POST /api/alerts/preview MUST agree on targeting, or
//  the composer's "this will notify X residents" panel describes a different
//  audience from the one that actually gets the message. Sharing the schema is
//  what keeps them in lockstep.
// =============================================================================

// The tier enum derives from the tier table so there is one source of truth
// (the DB carries the same three values as a CHECK constraint on alerts.tier).
const TIER_VALUES = Object.keys(TIERS) as [AlertTier, ...AlertTier[]];

// Why these bounds — every one of them is an external limit, not a guess:
//   ids          a portfolio is tens of buildings and hundreds of units (FHMHA
//                is 3 buildings / 432 rentable units). The caps sit far above
//                any real selection while still bounding the PostgREST filter
//                an unbounded array would be interpolated into.
export const AlertTargetingSchema = z.object({
  tier: z.enum(TIER_VALUES),
  building_ids: z.array(reqStr(200)).max(500).optional().default([]),
  unit_ids: z.array(reqStr(200)).max(5000).optional().nullable(),
});

//   title    200  — becomes the push-notification title and the email subject;
//                   mail clients truncate a subject well before this.
//   message 1600  — the emergency tier sends the message verbatim over SMS, and
//                   1600 characters is Twilio's documented maximum body length,
//                   so anything longer could not be delivered anyway.
export const CreateAlertSchema = AlertTargetingSchema.extend({
  title: reqStr(200),
  message: reqStr(1600),
});

//   note    2000  — an acknowledgment note is a sentence or two ("on my way,
//                   20 min") shown in full on the alert detail page.
export const AckSchema = z.object({ note: optStr(2000) });
