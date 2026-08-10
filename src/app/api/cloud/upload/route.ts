import { NextResponse } from "next/server";
import { requireRole, WRITE_ASM } from "@/lib/authz";
import { DropboxProvider } from "@/lib/cloud/dropbox";
import { resolveCloudPath, denialResponse } from "@/lib/cloud/path-guard";

// POST /api/cloud/upload — multipart upload into the connected drive
// (admin/super/manager). Field `folder` = destination folder path.
export const maxDuration = 60;

const MAX_BYTES = 100 * 1024 * 1024; // Dropbox single-call upload limit ballpark

export async function POST(request: Request) {
  const auth = await requireRole(WRITE_ASM);
  if (auth.response) return auth.response;

  const provider = await DropboxProvider.connect();
  if (!provider) return NextResponse.json({ error: "Not connected" }, { status: 503 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  // The destination folder comes from the browser, so it gets the same
  // confinement as every read path. Without it this route is the write-side
  // twin of the H1 traversal: a caller could drop files anywhere in the
  // connected account, including folders SupersDeck will not show them.
  const resolved = resolveCloudPath(form.get("folder")?.toString());
  if (!resolved.ok) {
    const { status, error } = denialResponse(resolved.reason);
    return NextResponse.json({ error }, { status });
  }
  const folder = resolved.kind === "file" ? resolved.path : "";

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files attached." }, { status: 400 });
  }

  const uploaded: string[] = [];
  for (const f of files) {
    if (f.size === 0 || f.size > MAX_BYTES) continue;
    const safeName = f.name.replace(/[\\/]/g, "_");
    const dest = `${folder.replace(/\/+$/, "")}/${safeName}`;
    try {
      uploaded.push(await provider.upload(dest, await f.arrayBuffer()));
    } catch (e) {
      console.error("[cloud/upload]", f.name, e);
    }
  }
  if (uploaded.length === 0) {
    return NextResponse.json({ error: "Upload failed." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, uploaded });
}
