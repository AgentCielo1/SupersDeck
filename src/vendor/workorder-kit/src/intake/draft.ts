// =============================================================================
//  Tenant intake draft autosave
// =============================================================================
//  A tenant filling out the QR intake on their phone loses everything typed
//  when the OS kills the backgrounded tab (switching apps to take a photo or
//  answer a call). When the host app passes `draftKey` to
//  MultilingualIntakeForm, the form autosaves its text fields to localStorage
//  as they change, restores them on the next load behind a visible banner
//  (translated, with a clear button), and clears the draft once the ticket
//  submits successfully.
//
//  Unlike the super-side form there is no prefill here — every field is tenant
//  effort — so a draft is worth keeping as soon as ANY field has content.
//  Drafts expire after 48h (matching the intake-photo orphan grace window);
//  photos are not persisted (picked files can't be stashed, and their uploads
//  are reaped server-side on the same clock).
//
//  Storage access is parameterized so the logic is unit-testable in Node, and
//  the module stays backend-agnostic like the rest of the kit.
// =============================================================================

export const INTAKE_DRAFT_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export type IntakeDraftFields = {
  name: string;
  apt: string;
  phone: string;
  email: string;
  category: string;
  description: string;
};

export type IntakeDraft = IntakeDraftFields & { savedAt: number };

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function intakeDraftWorthKeeping(f: IntakeDraftFields): boolean {
  return Boolean(
    f.name.trim() ||
      f.apt.trim() ||
      f.phone.trim() ||
      f.email.trim() ||
      f.category ||
      f.description.trim(),
  );
}

export function saveIntakeDraft(
  storage: DraftStorage,
  key: string,
  fields: IntakeDraftFields,
  now = Date.now(),
): void {
  if (!intakeDraftWorthKeeping(fields)) {
    // The tenant emptied the form again — don't resurrect it next visit.
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, JSON.stringify({ ...fields, savedAt: now }));
}

export function loadIntakeDraft(
  storage: DraftStorage,
  key: string,
  now = Date.now(),
): IntakeDraft | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.removeItem(key);
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    storage.removeItem(key);
    return null;
  }
  const d = parsed as Record<string, unknown>;
  if (typeof d.savedAt !== "number" || now - d.savedAt > INTAKE_DRAFT_MAX_AGE_MS) {
    storage.removeItem(key);
    return null;
  }
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const draft: IntakeDraft = {
    name: str(d.name),
    apt: str(d.apt),
    phone: str(d.phone),
    email: str(d.email),
    category: str(d.category),
    description: str(d.description),
    savedAt: d.savedAt,
  };
  if (!intakeDraftWorthKeeping(draft)) {
    storage.removeItem(key);
    return null;
  }
  return draft;
}

export function clearIntakeDraft(storage: DraftStorage, key: string): void {
  storage.removeItem(key);
}
