import { NextResponse } from "next/server";
import { requireRole, CLOUD_ACCESS } from "@/lib/authz";
import { DropboxProvider } from "@/lib/cloud/dropbox";
import { resolveCloudPath, denialResponse } from "@/lib/cloud/path-guard";

// GET /api/cloud/thumb?path=&size= — image thumbnail proxy.
// Cached privately for an hour: thumbnails are stable and this keeps folder
// grids fast without hammering Dropbox.
//
// Role: admin/super/manager (CLOUD_ACCESS) — see /api/cloud/list for the reasoning.
// A thumbnail of a surrender agreement is still the document; this route is
// gated exactly like the full-size one.
export const maxDuration = 30;

const SIZES = ["small", "medium", "large"] as const;
type Size = (typeof SIZES)[number];

export async function GET(request: Request) {
  const auth = await requireRole(CLOUD_ACCESS);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const resolved = resolveCloudPath(url.searchParams.get("path"));
  if (!resolved.ok) {
    const { status, error } = denialResponse(resolved.reason);
    return NextResponse.json({ error }, { status });
  }
  const path = resolved.kind === "file" ? resolved.path : "";

  // Allowlist the size too — it lands in the JSON we send Dropbox.
  const requested = url.searchParams.get("size") ?? "medium";
  const size: Size = (SIZES as readonly string[]).includes(requested)
    ? (requested as Size)
    : "medium";

  const provider = await DropboxProvider.connect();
  if (!provider) return NextResponse.json({ error: "Not connected" }, { status: 503 });

  try {
    const { bytes, contentType } = await provider.thumbnail(path, size);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "no thumbnail" }, { status: 404 });
  }
}
