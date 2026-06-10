import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  GET  /api/vendors  — list "my vendors" (used by the WO edit dropdown)
//  POST /api/vendors  — add a vendor to My Vendors
// =============================================================================
//  GET returns only in_my_vendors=true rows because that's the realistic
//  pool a super would actually assign work to (not the full discovery
//  directory). Ordered by name.
//
//  POST body: Vendor-shaped object (id is generated server-side from name).
// =============================================================================

export async function GET() {
  const supabase = getServerSupabase();
  if (!supabase) {
    // Seed-only mode: respond with empty list so the dropdown renders without
    // crashing. Real vendor assignment only matters with a live DB anyway.
    return NextResponse.json([]);
  }
  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, category_id, phone, email")
    .eq("in_my_vendors", true)
    .order("name");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Add vendors after wiring up env vars.",
      },
      { status: 503 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name || !body.category_id) {
    return NextResponse.json(
      { error: "name and category_id are required" },
      { status: 400 }
    );
  }

  const row = {
    id: `vendor-${slug(body.name)}-${Date.now().toString(36)}`,
    name: String(body.name).trim(),
    category_id: String(body.category_id),
    contact_name: body.contact_name || null,
    phone: body.phone || null,
    email: body.email || null,
    address: body.address || null,
    license_type: body.license_type || null,
    license_number: body.license_number || null,
    license_expires: body.license_expires || null,
    in_my_vendors: body.in_my_vendors ?? true,
    notes: body.notes || null,
    rating: body.rating ? Math.min(5, Math.max(1, Number(body.rating))) : null,
  };

  const { data, error } = await supabase
    .from("vendors")
    .insert(row)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/vendors");
  revalidatePath("/", "layout");

  return NextResponse.json(data, { status: 201 });
}
