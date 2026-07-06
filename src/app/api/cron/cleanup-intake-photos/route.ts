import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { PHOTO_BUCKET } from "@/lib/storage";

// =============================================================================
//  GET/POST /api/cron/cleanup-intake-photos
// =============================================================================
//  Reaps orphaned tenant-intake photos. The intake form uploads each photo the
//  moment it's picked (so the tenant sees a thumbnail) — BEFORE the work order
//  is submitted. If they abandon the form, those objects sit in the bucket with
//  no work_order referencing them: storage bloat + stray tenant PII.
//
//  Daily (Vercel Cron, see vercel.json) this lists everything under intake/**,
//  cross-references work_orders.photos, and deletes anything older than a 48h
//  grace window that no work order points at. The grace window protects photos
//  from an in-progress submission. Only ever touches the intake/ prefix, so
//  super-side WO photos (wo/…) and other buckets are never at risk.
// =============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PREFIX = "intake";
const GRACE_MS = 48 * 60 * 60 * 1000;
const PAGE = 100;

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

type Listed = { path: string; created_at: string | null; isFolder: boolean };

async function listDir(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  prefix: string,
): Promise<Listed[]> {
  const out: Listed[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error || !data || data.length === 0) break;
    for (const o of data) {
      // Supabase marks virtual folders with a null id.
      out.push({ path: `${prefix}/${o.name}`, created_at: o.created_at ?? null, isFolder: o.id === null });
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

async function handler(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // 1. Every file under intake/ — one level of building subfolders, plus any
  //    legacy flat files from the first release (intake/<uuid>.<ext>).
  const top = await listDir(supabase, PREFIX);
  const files: { path: string; created_at: string | null }[] = [];
  for (const item of top) {
    if (item.isFolder) {
      const sub = await listDir(supabase, item.path);
      for (const f of sub) if (!f.isFolder) files.push({ path: f.path, created_at: f.created_at });
    } else {
      files.push({ path: item.path, created_at: item.created_at });
    }
  }

  // 2. Paths referenced by an actual work order.
  const { data: rows, error: rowsErr } = await supabase
    .from("work_orders")
    .select("photos")
    .not("photos", "is", null);
  if (rowsErr) {
    return NextResponse.json({ ok: false, error: rowsErr.message }, { status: 500 });
  }
  const referenced = new Set<string>();
  for (const r of rows ?? []) {
    const ph = (r as { photos?: unknown }).photos;
    if (Array.isArray(ph)) {
      for (const p of ph) if (typeof p === "string") referenced.add(p);
    }
  }

  // 3. Delete old + unreferenced. A null/unparseable timestamp is treated as
  //    "unknown age" and kept (conservative — never delete what we can't date).
  const cutoff = Date.now() - GRACE_MS;
  const orphans = files
    .filter((f) => {
      if (referenced.has(f.path)) return false;
      const t = f.created_at ? Date.parse(f.created_at) : NaN;
      return Number.isFinite(t) && t < cutoff;
    })
    .map((f) => f.path);

  let deleted = 0;
  for (let i = 0; i < orphans.length; i += PAGE) {
    const batch = orphans.slice(i, i + PAGE);
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(batch);
    if (!error) deleted += batch.length;
    else console.error("[cleanup-intake-photos] remove:", error.message);
  }

  return NextResponse.json({
    ok: true,
    scanned: files.length,
    referenced: referenced.size,
    orphans: orphans.length,
    deleted,
  });
}

export const GET = handler;
export const POST = handler;
