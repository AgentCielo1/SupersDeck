// =============================================================================
//  buckets — the ONE place a Supabase Storage bucket is named
// =============================================================================
//  WHY THIS FILE EXISTS
//
//  The bucket name was written down in three places and they disagreed:
//
//    src/lib/storage.ts            "work-orders"   ← what the server reads/writes
//    work-orders/[id]/edit/page.tsx "wo-photos"    ← what the edit page uploaded to
//    supabase/storage-setup.sql     "wo-photos"    ← what the RLS policies governed
//
//  So photos attached from the work-order EDIT screen landed in a different
//  bucket from every other upload, and the hardening SQL protected a bucket the
//  product had stopped using. Nothing failed loudly: uploads succeeded, the
//  policies applied cleanly, and the mismatch was invisible from inside the app.
//
//  Deliberately dependency-free — no next/headers, no supabase client — so
//  client components, server routes, and the CI parity check can all import it.
//  ci/check-bucket-parity.mjs asserts the names below equal the ones the SQL
//  creates policies for; that check is what stops this drifting apart again.
// =============================================================================

/** Work-order photos, voice memos and attachments (private). */
export const PHOTO_BUCKET = "work-orders";

/** Backlog task attachments (private). */
export const TASK_BUCKET = "task-files";

/** Building/tenant/vendor documents behind /api/documents/:id (private). */
export const DOC_BUCKET = "documents";

/** Contractor sign-in photos from the lobby QR flow (private). */
export const CONTRACTOR_PHOTO_BUCKET = "contractor-photos";

/** Every bucket the app uses. The CI check reads this list.
 *  Adding a bucket to the app without adding it here fails CI — which is the
 *  point: the inventory has to be complete to be worth anything. Two of these
 *  four were found only when the check was first run. */
export const ALL_BUCKETS = [
  PHOTO_BUCKET,
  TASK_BUCKET,
  DOC_BUCKET,
  CONTRACTOR_PHOTO_BUCKET,
] as const;
