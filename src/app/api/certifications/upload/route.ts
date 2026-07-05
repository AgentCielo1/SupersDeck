import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";
import { classifyCert } from "@/lib/classify-cert";
import { requireRole, WRITE_ASM } from "@/lib/authz";
import { parseJson, reqStr, optStr } from "@/lib/validation";

const CertUploadSchema = z.object({
  path: reqStr(500),
  mime: optStr(100),
  holder_name: optStr(300),
});

// =============================================================================
//  POST /api/certifications/upload — classify an uploaded certificate photo
// =============================================================================
//  The client uploads the image to the `documents` bucket, then posts its
//  { path, name, mime }. We download it, run Claude vision to read the card,
//  and insert a certification row pre-filled with the extracted details (the
//  user reviews / edits afterward). Classification is best-effort: if it fails
//  the file is still saved as an "Unclassified certificate" to fill in by hand.
// =============================================================================

export const maxDuration = 60; // Opus vision can take a while

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

export async function POST(request: Request) {
  const auth = await requireRole(WRITE_ASM);
  if (auth.response) return auth.response;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const parsed = await parseJson(request, CertUploadSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const path = body.path;
  const mime = String(body.mime ?? "image/jpeg");

  // Best-effort classification (images only — Claude vision).
  let cls: Awaited<ReturnType<typeof classifyCert>> | null = null;
  if (/^image\//.test(mime)) {
    const dl = await supabase.storage.from("documents").download(path);
    if (dl.data) {
      const buf = Buffer.from(await dl.data.arrayBuffer());
      cls = await classifyCert(buf.toString("base64"), mime, {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: "claude-opus-4-8",
      });
    }
  }

  const type = cls?.type || "Unclassified certificate";
  const row = {
    id: `cert-${slug(type)}-${Date.now().toString(36)}`,
    holder_name: cls?.holder_name || String(body.holder_name ?? "") || "Candiany Rodriguez",
    type,
    number: cls?.number ?? null,
    issued_at: cls?.issued_at ?? null,
    expires_at: cls?.expires_at ?? null,
    agency: cls?.agency ?? null,
    cert_key: cls?.cert_key ?? null,
    photo_path: path,
    notes: cls?.type
      ? `Auto-classified on upload (confidence: ${cls.confidence ?? "n/a"}). Verify details.`
      : "Couldn't auto-read this one — please fill in the details.",
  };

  const { data, error } = await supabase.from("certifications").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/certifications");
  return NextResponse.json({ cert: data, classified: !!cls?.type }, { status: 201 });
}
