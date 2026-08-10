import { NextResponse } from "next/server";
import { requireRole, CLOUD_ACCESS } from "@/lib/authz";
import { DropboxProvider } from "@/lib/cloud/dropbox";
import { resolveCloudPath, denialResponse } from "@/lib/cloud/path-guard";
import type { CloudEntry } from "@/lib/cloud/provider";

// GET /api/cloud/list?path=<folder> — folder listing.
//
// Role: admin/super/manager (CLOUD_ACCESS). This route used to accept "any signed-in
// user", which handed porters and read_only accounts the tenant correspondence,
// household-composition letters and surrender agreements in the drive. The same
// tier already gates /api/cloud/upload and work-orders/:id/file-to-cloud, so the
// whole cloud subsystem now sits behind ONE boundary rather than a read/write
// split that would drift.
export const maxDuration = 30;

export async function GET(request: Request) {
  const auth = await requireRole(CLOUD_ACCESS);
  if (auth.response) return auth.response;

  const resolved = resolveCloudPath(
    new URL(request.url).searchParams.get("path"),
    { allowVirtualRoot: true },
  );
  if (!resolved.ok) {
    const { status, error } = denialResponse(resolved.reason);
    return NextResponse.json({ error }, { status });
  }

  // The account root is off-limits, so "" lists the allowed roots themselves.
  // The browser gets a normal-looking top level and never sees a path we
  // wouldn't have served anyway.
  if (resolved.kind === "virtual-root") {
    const entries: CloudEntry[] = resolved.roots.map((p) => ({
      kind: "folder",
      path: p,
      name: p.replace(/^\//, ""),
    }));
    return NextResponse.json({ path: "", entries });
  }

  const provider = await DropboxProvider.connect();
  if (!provider) {
    return NextResponse.json({ error: "No cloud drive connected." }, { status: 503 });
  }
  try {
    const entries = await provider.list(resolved.path);
    return NextResponse.json({ path: resolved.path, entries });
  } catch (e) {
    console.error("[cloud/list]", e);
    return NextResponse.json({ error: "Couldn't list that folder." }, { status: 502 });
  }
}
