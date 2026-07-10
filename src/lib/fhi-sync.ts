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
  const sig = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
  try {
    const res = await fetch(INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
