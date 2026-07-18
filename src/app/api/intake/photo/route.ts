import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { getClientIp, isRateLimitedDurable } from "@/lib/ratelimit-durable";
import { PHOTO_BUCKET } from "@/lib/storage";
import { intakeTokensEnabled, verifyIntakeToken } from "@/lib/intake-token";

// =============================================================================
//  POST /api/intake/photo — anonymous tenant photo upload for the QR intake
// =============================================================================
//  The public intake form (/intake/[buildingCode]) lets a tenant attach a photo
//  of the problem. Anonymous, so it can't hold the service-role key in the
//  browser — the browser posts the file here and we upload it server-side
//  (service role) to the private `work-orders` bucket, returning the storage
//  path. That path rides along in the /api/work-orders payload (photos: string[])
//  and displays super-side via lib/storage signing.
//
//  Public (see middleware allow-list), so it defends itself:
//    • per-IP rate limit (durable via Upstash when provisioned)
//    • authoritative MAGIC-BYTE type check — never trust the client Content-Type
//    • size cap; files arrive already downscaled by the client (compressImage)
//    • building-scoped, UUID-named path (no traversal, no enumeration)
// =============================================================================

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB hard cap (client pre-compresses well under this)

export const maxDuration = 30;

// Authoritative type from the file's own header bytes, not the spoofable
// client-declared Content-Type. Returns the canonical extension, or null if the
// bytes aren't one of our accepted image formats.
async function sniffImage(file: File): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (b.length < 12) return null;
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  // GIF: 47 49 46 38
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "gif";
  // WEBP: "RIFF"...."WEBP"
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "webp";
  }
  // HEIC/HEIF: "ftyp" at offset 4, then a known brand.
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (
      ["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis", "hevm", "hevs"].includes(brand)
    ) {
      return "heic";
    }
  }
  return null;
}

function mimeFor(ext: string): string {
  if (ext === "jpg") return "image/jpeg";
  if (ext === "heic") return "image/heic";
  return `image/${ext}`;
}

// Sanitize the caller-supplied building id into a safe path segment. Never
// interpolate raw input into a storage key.
function safeBuilding(v: FormDataEntryValue | null): string {
  const s = String(v ?? "").toLowerCase();
  return /^[a-z0-9-]{1,64}$/.test(s) ? s : "unknown";
}

export async function POST(request: Request) {
  // Anonymous + writes to storage → rate-limit per IP before doing any work.
  if (await isRateLimitedDurable(`intake-photo:${getClientIp(request)}`, 20, 60_000)) {
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

  // Authoritative type check — reject anything whose bytes aren't a real image.
  const ext = await sniffImage(file);
  if (!ext) {
    return NextResponse.json(
      { error: "Please attach a real image (JPG, PNG, HEIC…)." },
      { status: 415 },
    );
  }

  const building = safeBuilding(form.get("building"));

  // Same guard as POST /api/work-orders: anonymous uploads must carry the
  // building-scoped intake token minted by the intake page. Dormant until
  // INTAKE_TOKEN_SECRET is set (src/lib/intake-token.ts).
  if (intakeTokensEnabled()) {
    const token = request.headers.get("x-intake-token");
    if (!verifyIntakeToken(token, building)) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid intake token. Please reopen the intake page and try again.",
        },
        { status: 401 },
      );
    }
  }

  const path = `intake/${building}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: mimeFor(ext), upsert: false });

  if (error) {
    console.error("[intake/photo] upload:", error.message);
    return NextResponse.json({ error: "Couldn't save the photo. Try again." }, { status: 500 });
  }

  return NextResponse.json({ path });
}
