// =============================================================================
//  Tenant directory → new work order prefill
// =============================================================================
//  A directory row knows the building, apartment, tenant name, and phone —
//  everything the reporter section of a work order asks for. The directory
//  links to /work-orders/new with these as query params; the form reads them
//  back as field defaults. The unit itself is re-resolved server-side from
//  building_id + unit_label (POST /api/work-orders already does this), so a
//  super who edits the apartment before saving never files against a stale
//  unit id.
// =============================================================================

export type WoPrefillSource = {
  buildingId: string;
  building: string;
  apt: string;
  tenant: string | null;
  phone: string | null;
};

export function newWorkOrderUrl(row: WoPrefillSource): string {
  const q = new URLSearchParams({
    building_id: row.buildingId,
    building: row.building,
    unit_label: row.apt,
  });
  if (row.tenant) q.set("reporter_name", row.tenant);
  if (row.phone) q.set("reporter_phone", row.phone);
  return `/work-orders/new?${q.toString()}`;
}

// The form's building <select> is populated from the bundled seed, whose ids
// normally match the live database (the seed is this portfolio's real data).
// Match by id first; fall back to exact name so an install whose db ids
// diverged from the seed still lands on the right building instead of
// silently defaulting to the first option.
export function resolvePrefillBuilding(
  options: Array<{ id: string; name: string }>,
  id: string | null,
  name: string | null,
): string | undefined {
  if (id) {
    const byId = options.find((b) => b.id === id);
    if (byId) return byId.id;
  }
  if (name) {
    const byName = options.find((b) => b.name === name);
    if (byName) return byName.id;
  }
  return undefined;
}
