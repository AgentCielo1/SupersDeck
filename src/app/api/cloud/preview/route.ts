import { NextResponse } from "next/server";
import { requireRole, CLOUD_ACCESS } from "@/lib/authz";
import { DropboxProvider } from "@/lib/cloud/dropbox";
import { resolveCloudPath, denialResponse } from "@/lib/cloud/path-guard";

// GET /api/cloud/preview?path= — PDF rendition of an Office doc.
// Dropbox converts docx/xlsx/pptx/rtf server-side (where the files already
// live — no third party sees them); we render the PDF with pdf.js in-app.
//
// Role: admin/super/manager (CLOUD_ACCESS) — see /api/cloud/list for the reasoning.
// Path is confined to CLOUD_ALLOWED_ROOTS; treat `path` as hostile input.
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireRole(CLOUD_ACCESS);
  if (auth.response) return auth.response;

  const resolved = resolveCloudPath(new URL(request.url).searchParams.get("path"));
  if (!resolved.ok) {
    const { status, error } = denialResponse(resolved.reason);
    return NextResponse.json({ error }, { status });
  }
  const path = resolved.kind === "file" ? resolved.path : "";

  const provider = await DropboxProvider.connect();
  if (!provider) return NextResponse.json({ error: "Not connected" }, { status: 503 });

  try {
    // Real PDFs: stream the raw bytes same-origin (no CORS, no attachment
    // disposition, no size buffering) — see DropboxProvider.downloadStream.
    if (path.toLowerCase().endsWith(".pdf")) {
      const upstream = await provider.downloadStream(path);
      return new NextResponse(upstream.body, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline",
          "Cache-Control": "private, max-age=600",
        },
      });
    }
    const bytes = await provider.pdfPreview(path);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch {
    return NextResponse.json({ error: "No preview available for this file." }, { status: 404 });
  }
}
