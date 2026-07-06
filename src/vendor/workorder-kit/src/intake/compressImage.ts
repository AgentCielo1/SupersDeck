// =============================================================================
//  compressImage — client-side downscale + re-encode (runs in the browser)
// =============================================================================
//  Runs on each picked photo BEFORE upload. Two jobs:
//
//    1. Privacy — re-drawing through a <canvas> and re-exporting drops ALL
//       embedded metadata, including the EXIF GPS coordinates a phone camera
//       stamps into every JPEG/HEIC. Tenants shouldn't be leaking their exact
//       location with a leak photo.
//    2. Size — a 12-MP phone photo is 3–9 MB; serverless request bodies are
//       capped (~4.5 MB on Vercel). Downscaling the longest edge to 1600px and
//       re-encoding at ~0.82 quality brings a typical photo to a few hundred KB,
//       so it comfortably fits the upload endpoint AND costs less to store.
//
//  `imageOrientation: "from-image"` bakes the EXIF rotation into the pixels, so
//  dropping the EXIF orientation tag can't leave the photo sideways.
//
//  Best-effort: on ANY failure (a format the browser can't decode — e.g. HEIC
//  on desktop Chrome — a missing canvas, etc.) it returns the ORIGINAL file so
//  the upload still proceeds. The server re-validates by magic bytes regardless.
// =============================================================================

const MAX_DIM = 1600; // longest edge, px
const JPEG_QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file; // SSR guard
  if (!file.type.startsWith("image/")) return file;
  // A GIF may be animated; re-encoding would flatten it to one frame. Leave it.
  if (file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    // Keep PNG (transparency) as PNG; everything else becomes JPEG.
    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(
        (b) => resolve(b),
        outType,
        outType === "image/jpeg" ? JPEG_QUALITY : undefined,
      ),
    );
    if (!blob) return file;

    const ext = outType === "image/png" ? "png" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.${ext}`, {
      type: outType,
      lastModified: file.lastModified,
    });
  } catch {
    return file; // undecodable (e.g. HEIC on Chrome) → upload original as-is
  }
}
