import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  POST /api/vendors  — add a vendor to My Vendors
// =============================================================================
//  Body: Vendor-shaped object (id is generated server-side from name).
// =============================================================================

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
