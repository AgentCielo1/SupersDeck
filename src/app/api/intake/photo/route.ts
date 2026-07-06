import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { getClientIp, isRateLimited } from "@/lib/ratelimit";
import { PHOTO_BUCKET } from "@/lib/storage";

// =============================================================================
//  POST /api/intake/photo — anonymous tenant photo upload for the QR intake
// =============================================================================
//  The public intake form (/intake/[buildingCode]) lets a tenant attach a photo
//  of the problem. Anonymous, so it can't hold the service-role key in the
//  browser — instead the browser posts the file here and we upload it server-
//  side (service role) to the private `work-orders` bucket, returning the
//  storage path. That path then rides along in the /api/work-orders payload
//  (photos: string[]) and displays super-side via lib/storage signing.
//  Public (see middleware allow-list) so it must defend itself: per-IP rate
//  limit + image-type + size caps.
// =============================================================================

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const OK_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

export const maxDuration = 30;

export async function POST(request: Request) {
  // Anonymous + writes to storage → rate-limit per IP before doing any work.
  if (isRateLimited(`intake-photo:${getClientIp(request)}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Photo upload isn't available right now." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo attached." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That photo looks empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is too large (max 10 MB)." }, { status: 413 });
  }
  if (!OK_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Please attach an image (JPG, PNG, HEIC…)." }, { status: 415 });
  }

  const ext =
    (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `intake/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("[intake/photo] upload:", error.message);
    return NextResponse.json({ error: "Couldn't save the photo. Try again." }, { status: 500 });
  }

  return NextResponse.json({ path });
}
