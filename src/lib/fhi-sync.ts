import crypto from "crypto";

// =============================================================================
//  fhi-sync — push work orders from SupersDeck (master) to the FHI mirror
// =============================================================================
//  SupersDeck owns work orders; FHI mirrors them. On every create / update /
//  delete we POST the row to FHI's ingest endpoint, signed with a shared HMAC
//  secret. Fire-and-forget: failures are logged but NEVER fail the SupersDeck
//  operation. Dormant until both env vars are set, so this is safe to ship now
//  and "turns on" the moment the sync is wired (same pattern as the rate limiter).
//
//    FHI_INGEST_URL          e.g. https://<fhi-host>/api/integrations/supersdeck/ingest
//    SUPERSDECK_SYNC_SECRET  shared HMAC secret (identical value on both apps)
// =============================================================================

const SECRET = process.env.SUPERSDECK_SYNC_SECRET;
const INGEST_URL = process.env.FHI_INGEST_URL;

export function fhiSyncEnabled(): boolean {
  return Boolean(SECRET && INGEST_URL);
}

// -----------------------------------------------------------------------------
//  Replay protection (2026-08-09)
// -----------------------------------------------------------------------------
//  The signature used to cover the raw body and nothing else. A correct HMAC
//  over a constant payload is a constant string: anyone who captured one
//  request — a proxy log, a browser devtools export, an FHI access log — could
//  POST it again, unchanged, forever. The payload carries reporter_name and
//  reporter_phone, so a replay re-injects a tenant's name and number into the
//  mirror, and a replayed `delete` re-deletes a work order that was restored.
//
//  The signed material is now  `${timestamp}.${nonce}.${body}`, and both values
//  travel in their own headers so the receiver can check them BEFORE parsing:
//
//    x-supersdeck-timestamp   epoch ms, must be within SIGNATURE_TTL_MS
//    x-supersdeck-nonce       128 bits of randomness, must not have been seen
//    x-supersdeck-signature   hex HMAC-SHA256 over the string above
//
//  The window is the trade: too tight and ordinary clock skew between Vercel
//  regions drops real work orders; too loose and the replay window reopens.
//  Five minutes is the same bound AWS SigV4 uses for exactly this decision, and
//  it is far wider than any skew between two Vercel deployments.
// -----------------------------------------------------------------------------

export const SIGNATURE_TTL_MS = 5 * 60 * 1000;

/** The exact bytes both sides sign. Exported so the receiver's implementation
 *  (and its tests) can be written against one definition, not a description. */
export function signingString(timestamp: number, nonce: string, body: string): string {
  return `${timestamp}.${nonce}.${body}`;
}

export function signPayload(
  secret: string,
  timestamp: number,
  nonce: string,
  body: string
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(signingString(timestamp, nonce, body))
    .digest("hex");
}

type WoRow = {
  id: string;
  ticket_number?: string | null;
  building_id?: string | null;
  unit_id?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  title?: string | null;
  title_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  reporter_name?: string | null;
  reporter_phone?: string | null;
  photos?: unknown;
  reported_at?: string | null;
  resolved_at?: string | null;
};

// SupersDeck unit ids are `u-<bldg#>-<label lowercased>` (see /api/work-orders),
// so the label is recoverable without a DB lookup. Returns undefined for a
// common-area WO (no unit) or an unrecognized id.
function unitLabelFromId(unitId?: string | null): string | undefined {
  if (!unitId) return undefined;
  const m = unitId.match(/^u-\d+-(.+)$/);
  return m ? m[1].toUpperCase() : undefined;
}

/** Build the ingest payload from a SupersDeck work_orders row. */
export function toFhiPayload(action: "upsert" | "delete", wo: WoRow) {
  if (action === "delete") return { action, id: wo.id };
  return {
    action,
    id: wo.id,
    ticket_number: wo.ticket_number ?? undefined,
    building_id: wo.building_id ?? undefined,
    unit_label: unitLabelFromId(wo.unit_id),
    category: wo.category ?? undefined,
    priority: wo.priority ?? undefined,
    status: wo.status ?? undefined,
    title: wo.title ?? undefined,
    title_en: wo.title_en ?? undefined,
    description: wo.description ?? undefined,
    description_en: wo.description_en ?? undefined,
    reporter_name: wo.reporter_name ?? undefined,
    reporter_phone: wo.reporter_phone ?? undefined,
    photos: Array.isArray(wo.photos) ? wo.photos : [],
    reported_at: wo.reported_at ?? undefined,
    resolved_at: wo.resolved_at ?? undefined,
  };
}

/**
 * Push a work order to the FHI mirror. `wo` need only carry `id` for a delete.
 * Never throws — logs and returns on any failure.
 */
export async function pushWorkOrderToFHI(
  action: "upsert" | "delete",
  wo: WoRow
): Promise<void> {
  if (!SECRET || !INGEST_URL) return; // not wired up yet — no-op

  const raw = JSON.stringify(toFhiPayload(action, wo));
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString("hex");
  const sig = signPayload(SECRET, timestamp, nonce, raw);
  try {
    const res = await fetch(INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-supersdeck-timestamp": String(timestamp),
        "x-supersdeck-nonce": nonce,
        "x-supersdeck-signature": sig,
      },
      body: raw,
    });
    if (!res.ok) {
      console.error(`[fhi-sync] ${action} ${wo.id} -> HTTP ${res.status}`);
    }
  } catch (e) {
    console.error(`[fhi-sync] ${action} ${wo.id} failed:`, e);
  }
}
