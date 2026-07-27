import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { DropboxProvider } from "@/lib/cloud/dropbox";

// GET /api/cloud/thumb?path=&size= — image thumbnail proxy (any signed-in staff).
// Cached privately for an hour: thumbnails are stable and this keeps folder
// grids fast without hammering Dropbox.
export const maxDuration = 30;

export async function GET(request: Request) {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const provider = await DropboxProvider.connect();
  if (!provider) return NextResponse.json({ error: "Not connected" }, { status: 503 });

  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "";
  const size = (url.searchParams.get("size") ?? "medium") as "small" | "medium" | "large";
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });
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
