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
//
//  BUG-351 (2026-11-20): the prefilled phone was saved as if the reporter had
//  typed it, and POST /api/work-orders then wrote every work order's phone back
//  into units.tenant_phone ("latest WO wins") without checking who reported it.
//  A stale directory number therefore looked confirmed, rode along on a new
//  tenant's work orders, and a relative's or neighbour's number could replace
//  the tenant's. Now:
//    • the form shows when the phone is only the number on file, and tells the
//      API (reporterPhoneSource);
//    • work orders never update the directory on their own. A signed-in admin
//      or super can tick "save this number to the Tenant Directory"; the API
//      then updates the phone of an occupied unit only, and never the name
//      (directoryPhoneUpdate).
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

// -----------------------------------------------------------------------------
//  Where did the reporter phone come from? (BUG-351)
// -----------------------------------------------------------------------------
export type ReporterPhoneSource = "directory" | "typed";

const phoneDigits = (s: string | null | undefined) =>
  (s ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");

/**
 * "directory" when the phone is still exactly the number the tenant-directory
 * link prefilled (formatting aside); "typed" when the user entered or changed
 * it; null when there is no phone.
 */
export function reporterPhoneSource(
  prefillPhone: string | null | undefined,
  currentPhone: string | null | undefined,
): ReporterPhoneSource | null {
  const cur = phoneDigits(currentPhone);
  if (!cur) return null;
  const pre = phoneDigits(prefillPhone);
  return pre && pre === cur ? "directory" : "typed";
}

export type DirectoryPhoneUpdate = {
  update: boolean;
  reason:
    | "not-requested"
    | "not-allowed"
    | "no-unit"
    | "vacant-unit"
    | "no-phone"
    | "test-or-short-number"
    | "same-as-on-file"
    | "already-on-file-as-second"
    | "emergency-contact-number"
    | "on-file-for-another-unit"
    | "update";
  /** keep the old primary number by moving it into the empty second slot */
  moveOldToSecond?: boolean;
};

/**
 * May this work order change units.tenant_phone? Only when a signed-in admin or
 * super explicitly asked for it, for an occupied unit, with a real number that
 * is not already on file here, is not this apartment's emergency contact, and
 * is not on file for another apartment. Work orders never touch the name.
 */
export function directoryPhoneUpdate(input: {
  requested: boolean;
  staffMayEditDirectory: boolean;
  unitFound: boolean;
  unitOccupied: boolean | null | undefined;
  currentPhone: string | null | undefined;
  secondPhone?: string | null;
  emergencyContactPhone?: string | null;
  /** tenant_phone / tenant_phone2 of every OTHER unit */
  otherUnitPhones?: Iterable<string | null | undefined>;
  newPhone: string | null | undefined;
}): DirectoryPhoneUpdate {
  if (!input.requested) return { update: false, reason: "not-requested" };
  if (!input.staffMayEditDirectory) return { update: false, reason: "not-allowed" };
  if (!input.unitFound) return { update: false, reason: "no-unit" };
  if (input.unitOccupied !== true) return { update: false, reason: "vacant-unit" };
  const d = phoneDigits(input.newPhone);
  if (!d) return { update: false, reason: "no-phone" };
  if (d.length !== 10 || /555\d{4}$/.test(d)) return { update: false, reason: "test-or-short-number" };
  if (d === phoneDigits(input.currentPhone)) return { update: false, reason: "same-as-on-file" };
  if (d === phoneDigits(input.secondPhone)) return { update: false, reason: "already-on-file-as-second" };
  if (d === phoneDigits(input.emergencyContactPhone)) return { update: false, reason: "emergency-contact-number" };
  for (const other of input.otherUnitPhones ?? []) {
    if (d === phoneDigits(other)) return { update: false, reason: "on-file-for-another-unit" };
  }
  const moveOldToSecond = Boolean(phoneDigits(input.currentPhone)) && !phoneDigits(input.secondPhone);
  return { update: true, reason: "update", moveOldToSecond };
}

/** What the super is told when the Tenant Directory was NOT changed (null = say nothing). */
export function directoryOutcomeMessage(reason: DirectoryPhoneUpdate["reason"] | "error"): string | null {
  switch (reason) {
    case "update":
    case "not-requested":
    case "same-as-on-file":
      return null;
    case "not-allowed":
      return "Only an admin or super can change the Tenant Directory, so it was not changed.";
    case "no-unit":
      return "That apartment wasn't found, so the Tenant Directory was not changed.";
    case "vacant-unit":
      return "That apartment is marked vacant in the Tenant Directory, so its phone was not changed. Update the directory first.";
    case "no-phone":
    case "test-or-short-number":
      return "That isn't a full 10-digit phone number, so the Tenant Directory was not changed.";
    case "already-on-file-as-second":
      return "That number is already on file as the tenant's second number, so nothing was changed.";
    case "emergency-contact-number":
      return "That number is this apartment's emergency contact, so it was not saved as the tenant's phone.";
    case "on-file-for-another-unit":
      return "That number is on file for another apartment, so it was not saved here. Check the number with the tenant.";
    case "error":
      return "The Tenant Directory could not be updated. Change it from the Tenants page.";
  }
}
