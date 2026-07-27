import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { DropboxProvider } from "@/lib/cloud/dropbox";

// GET /api/cloud/preview?path= — PDF rendition of an Office doc (any staff).
// Dropbox converts docx/xlsx/pptx/rtf server-side (where the files already
// live — no third party sees them); we render the PDF with pdf.js in-app.
export const maxDuration = 60;

export async function GET(request: Request) {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const provider = await DropboxProvider.connect();
  if (!provider) return NextResponse.json({ error: "Not connected" }, { status: 503 });

  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });
  try {
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
