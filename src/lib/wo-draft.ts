// =============================================================================
//  New-work-order draft autosave
// =============================================================================
//  A super filling out a ticket in the field loses everything typed when the
//  phone OS kills the backgrounded PWA tab (or on an accidental refresh). The
//  form autosaves its text fields to localStorage as they change, restores
//  them on the next load behind a visible "draft restored" banner, and clears
//  the draft the moment a work order saves successfully.
//
//  Rules:
//  • A draft is only worth keeping once the super has typed a title or
//    description — prefilled reporter fields alone (from the tenant
//    directory's "+ New WO" link) never create a draft.
//  • On restore, prefill query params win for the fields they carry
//    (building/unit/reporter); the draft fills everything else.
//  • Drafts expire after 48h so a stale half-ticket doesn't resurface weeks
//    later. Photos and voice memos cannot be persisted (browsers don't allow
//    stashing picked files) — text is the thing protected here.
//
//  Storage access is parameterized so the logic is unit-testable in Node.
// =============================================================================

export const WO_DRAFT_KEY = "supersdeck:wo-draft:v1";
export const WO_DRAFT_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export type WoDraftFields = {
  building_id: string;
  unit_label: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  reporter_name: string;
  reporter_phone: string;
};

export type WoDraft = WoDraftFields & { savedAt: number };

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function draftWorthKeeping(f: WoDraftFields): boolean {
  return Boolean(f.title.trim() || f.description.trim());
}

export function saveWoDraft(
  storage: DraftStorage,
  fields: WoDraftFields,
  now = Date.now(),
): void {
  if (!draftWorthKeeping(fields)) {
    // Typed text was deleted again — don't resurrect it on the next visit.
    storage.removeItem(WO_DRAFT_KEY);
    return;
  }
  storage.setItem(WO_DRAFT_KEY, JSON.stringify({ ...fields, savedAt: now }));
}

export function loadWoDraft(
  storage: DraftStorage,
  now = Date.now(),
): WoDraft | null {
  const raw = storage.getItem(WO_DRAFT_KEY);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.removeItem(WO_DRAFT_KEY);
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    storage.removeItem(WO_DRAFT_KEY);
    return null;
  }
  const d = parsed as Record<string, unknown>;
  if (typeof d.savedAt !== "number" || now - d.savedAt > WO_DRAFT_MAX_AGE_MS) {
    storage.removeItem(WO_DRAFT_KEY);
    return null;
  }
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const draft: WoDraft = {
    building_id: str(d.building_id),
    unit_label: str(d.unit_label),
    title: str(d.title),
    description: str(d.description),
    category: str(d.category),
    priority: str(d.priority),
    reporter_name: str(d.reporter_name),
    reporter_phone: str(d.reporter_phone),
    savedAt: d.savedAt,
  };
  if (!draftWorthKeeping(draft)) {
    storage.removeItem(WO_DRAFT_KEY);
    return null;
  }
  return draft;
}

export function clearWoDraft(storage: DraftStorage): void {
  storage.removeItem(WO_DRAFT_KEY);
}

/** Prefill (the "+ New WO" link) wins for the fields it carries; the draft
 *  fills everything else. A draft building that no longer matches an option
 *  is dropped rather than mis-selecting. */
export function mergeDraftWithPrefill(
  draft: WoDraft,
  prefill: {
    building_id?: string;
    unit_label: string;
    reporter_name: string;
    reporter_phone: string;
  },
  validBuildingIds: string[],
): WoDraftFields {
  const draftBuilding = validBuildingIds.includes(draft.building_id)
    ? draft.building_id
    : "";
  return {
    building_id: prefill.building_id || draftBuilding,
    unit_label: prefill.unit_label || draft.unit_label,
    reporter_name: prefill.reporter_name || draft.reporter_name,
    reporter_phone: prefill.reporter_phone || draft.reporter_phone,
    title: draft.title,
    description: draft.description,
    category: draft.category,
    priority: draft.priority,
  };
}
