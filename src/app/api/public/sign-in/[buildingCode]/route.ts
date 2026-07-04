import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import {
  coiStatus,
  isBlocked,
  type ComplianceDocument,
  type ComplianceStatus,
} from "@workorder/kit/contractor/contract";
import type { ComplianceDocumentRow } from "@/types/contractors";

// =============================================================================
//  PUBLIC contractor sign-in (QR target) — no auth.
//   GET  /api/public/sign-in/:buildingCode  — building + companies + status
//   POST /api/public/sign-in/:buildingCode  — sign in (server-enforced gate)
//  Whitelisted in middleware. Mirrors the public tenant-intake pattern.
// =============================================================================

// Input bounds — this route is unauthenticated, so cap everything.
const MAX_NAME_LEN = 120;
const MAX_PHONE_LEN = 32;
const MAX_PURPOSE_LEN = 200;
const MAX_PHOTO_BYTES = 500 * 1024; // ~500KB decoded
const VISIT_METHODS = new Set(["qr", "kiosk", "phone", "staff"]);

// In-memory per-IP token bucket (~10 sign-ins/min). Fine for a single
// serverless instance; Upstash rate limiting is the production upgrade path.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

function rowToDoc(d: ComplianceDocumentRow): ComplianceDocument {
  return {
    docType: d.doc_type,
    expiryDate: d.expiry_date ?? undefined,
    glPerOccurrence: d.gl_per_occurrence ?? undefined,
    glAggregate: d.gl_aggregate ?? undefined,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { buildingCode: string } }
) {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const { data: building } = await supabase
    .from("buildings")
    .select("id,name,address")
    .eq("id", params.buildingCode)
    .maybeSingle();
  if (!building) return NextResponse.json({ error: "Building not found" }, { status: 404 });

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id,name")
    .eq("in_my_vendors", true)
    .order("name");
  const { data: docs } = await supabase.from("compliance_documents").select("*");
  const docRows = (docs ?? []) as ComplianceDocumentRow[];

  const companies = ((vendors ?? []) as { id: string; name: string }[]).map((v) => {
    const cdocs = docRows.filter((d) => d.company_id === v.id);
    const status: ComplianceStatus = cdocs.length
      ? coiStatus(cdocs.map(rowToDoc))
      : "missing";
    return { id: v.id, name: v.name, status };
  });

  return NextResponse.json({ building, companies });
}

export async function POST(
  request: Request,
  { params }: { params: { buildingCode: string } }
) {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.method != null && !VISIT_METHODS.has(body.method)) {
    return NextResponse.json({ error: "Invalid method" }, { status: 400 });
  }

  const inline_name =
    typeof body.inline_name === "string"
      ? body.inline_name.trim().slice(0, MAX_NAME_LEN) || null
      : null;
  if (!inline_name && !body.contractor_id) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const phone =
    typeof body.phone === "string" ? body.phone.trim().slice(0, MAX_PHONE_LEN) : null;
  const purpose =
    typeof body.purpose === "string"
      ? body.purpose.trim().slice(0, MAX_PURPOSE_LEN)
      : null;

  const building_id = params.buildingCode;
  const { data: building } = await supabase
    .from("buildings")
    .select("id")
    .eq("id", building_id)
    .maybeSingle();
  if (!building) return NextResponse.json({ error: "Building not found" }, { status: 404 });

  // This route is unauthenticated, so the gate is ALWAYS on — never trust a
  // client-supplied flag here. Staff can bypass via the authenticated route.
  const gateEnforced = true;

  let status: ComplianceStatus = "missing";
  if (body.company_id) {
    const { data: docs } = await supabase
      .from("compliance_documents")
      .select("*")
      .eq("company_id", body.company_id);
    status = coiStatus(((docs ?? []) as ComplianceDocumentRow[]).map(rowToDoc));
  }

  if (isBlocked(status, gateEnforced)) {
    await supabase.from("contractor_blocked_attempts").insert({
      id: `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      company_id: body.company_id ?? null,
      inline_name,
      building_id,
      reason: "GL insurance expired / not on file",
    });
    return NextResponse.json(
      { error: "blocked", reason: "Company insurance is expired.", status },
      { status: 403 }
    );
  }

  const visitId = `cv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  // Optional verification photo (data URL). Service role bypasses storage RLS,
  // mirroring the public-intake model. Upload failures are non-fatal. Rejects
  // anything that isn't a reasonably-sized JPEG/PNG (magic-byte check).
  let photoUrl: string | null = null;
  if (typeof body.photo_base64 === "string" && body.photo_base64.length > 0) {
    try {
      const b64 = body.photo_base64.replace(/^data:image\/\w+;base64,/, "");
      const bytes = Buffer.from(b64, "base64");
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
      const isPng =
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      if (bytes.length > 0 && bytes.length <= MAX_PHOTO_BYTES && (isJpeg || isPng)) {
        const path = `${building_id}/${visitId}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("contractor-photos")
          .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
        if (!upErr) photoUrl = path;
      }
    } catch {
      // proceed without a photo
    }
  }

  const row = {
    id: visitId,
    contractor_id: body.contractor_id ?? null,
    inline_name,
    phone,
    company_id: body.company_id ?? null,
    building_id,
    unit_id: body.unit_id ?? null,
    work_order_id: body.work_order_id ?? null,
    purpose,
    method: body.method ?? "qr",
    photo_url: photoUrl,
    compliance_status_at_entry: status,
  };

  const { data, error } = await supabase
    .from("contractor_visits")
    .insert(row)
    .select()
    .single();
  // Generic message — don't leak DB error details to an unauthenticated caller.
  if (error) return NextResponse.json({ error: "Could not sign in" }, { status: 500 });

  return NextResponse.json({ visit: data, status }, { status: 201 });
}
