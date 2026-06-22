import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  PATCH /api/profiles/:id — change a user's role or name (admin only)
//  DELETE /api/profiles/:id — remove a user (deletes auth.users → cascades)
// =============================================================================

const ALLOWED_ROLES = new Set(["admin", "super", "manager", "porter", "read_only"]);

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentUserProfile();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (me.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can change roles" },
      { status: 403 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.full_name === "string") update.full_name = body.full_name.trim();
  if (typeof body.role === "string") {
    if (!ALLOWED_ROLES.has(body.role)) {
      return NextResponse.json(
        { error: `role must be one of: ${[...ALLOWED_ROLES].join(", ")}` },
        { status: 400 }
      );
    }
    update.role = body.role;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No editable fields in body" },
      { status: 400 }
    );
  }

  // Safety: an admin can't demote themselves below admin (otherwise the
  // org could end up with zero admins).
  if (me.id === params.id && update.role && update.role !== "admin") {
    const { count } = await createSupabaseServerClient()!
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        {
          error:
            "You're the only admin. Promote someone else to admin first, then change your own role.",
        },
        { status: 400 }
      );
    }
  }

  const supabase = createSupabaseServerClient()!;
  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", params.id)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "User not found" }, { status: 404 });

  revalidatePath("/people");
  revalidatePath("/", "layout");
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentUserProfile();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (me.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can remove users" },
      { status: 403 }
    );
  }
  if (me.id === params.id) {
    return NextResponse.json(
      { error: "Can't remove yourself. Ask another admin." },
      { status: 400 }
    );
  }

  // Org guard: only delete a user visible in MY org (RLS hides other orgs).
  const rls = createSupabaseServerClient()!;
  const { data: target } = await rls
    .from("profiles")
    .select("id, org_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!target) {
    return NextResponse.json(
      { error: "User not found in your organization" },
      { status: 404 }
    );
  }

  // Deleting from auth.users cascades to public.profiles via the FK.
  // auth.admin requires the service-role key.
  const admin = getServerSupabase();
  if (!admin)
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { error } = await admin.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/people");
  return NextResponse.json({ deleted: params.id });
}
