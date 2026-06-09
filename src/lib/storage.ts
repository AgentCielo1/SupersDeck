import { createSupabaseServerClient } from "@/lib/supabase-server";

// =============================================================================
//  Photo helpers
// =============================================================================
//  The work_orders.photos column is a jsonb string[]. Each entry is either:
//
//    - "data:image/..." → legacy base64 from phase 3 (≤250KB). Render directly.
//    - "wo-photos/{wo_id}/{timestamp-name}.{ext}" → object key in the private
//      `wo-photos` Supabase Storage bucket. Render via signed URL.
//
//  Backward compat is intentional: existing base64 photos keep working,
//  new uploads go to Storage.
// =============================================================================

export const PHOTO_BUCKET = "wo-photos";

export function isStoragePath(s: string): boolean {
  return !s.startsWith("data:");
}

/**
 * Resolves photo entries to viewable URLs.
 *   - data URLs come back unchanged
 *   - storage paths come back as short-lived signed URLs (1 hour)
 *
 * Server-component-friendly: uses the session-aware supabase client so RLS
 * sees the calling user.
 */
export async function resolvePhotoUrls(photos: string[]): Promise<string[]> {
  if (!photos || photos.length === 0) return [];

  const supabase = createSupabaseServerClient();
  if (!supabase) return photos; // dev/seed fallback — return as-is

  const storagePaths = photos.filter(isStoragePath);
  if (storagePaths.length === 0) return photos;

  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(storagePaths, 3600);

  if (error || !data) {
    console.error("[storage] createSignedUrls:", error?.message);
    // Fall back to whatever Supabase gave us, leaving data URLs intact.
    return photos;
  }

  const byPath = new Map<string, string>();
  data.forEach((d, i) => {
    if (d.signedUrl) byPath.set(storagePaths[i], d.signedUrl);
  });

  return photos.map((p) =>
    isStoragePath(p) ? byPath.get(p) ?? p : p
  );
}
