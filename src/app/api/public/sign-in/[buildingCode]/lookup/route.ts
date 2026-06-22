import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  GET /api/public/sign-in/:buildingCode/lookup?phone=...
// =============================================================================
//  Returning-contractor recognition for the public form: match a prior
//  contractor by phone (digits only) so we can greet them + pre-fill their
//  name. Scoped to the building's org so tenants can't probe each other's
//  contractors. Public — covered by the /api/public/sign-in middleware
//  whitelist.
// =============================================================================

const digits = (p: string) => p.replace(/\D/g, "");

export async function GET(
  request: Request,
  { params }: { params: { buildingCode: string } }
) {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ found: false });

  const phone = (new URL(request.url).searchParams.get("phone") || "").trim();
  const d = digits(phone);
  if (d.length < 7) return NextResponse.json({ found: false });

  // Scope to the building's org so we never match another tenant's contractor.
  const { data: building } = await supabase
    .from("buildings")
    .select("org_id")
    .eq("id", params.buildingCode)
    .maybeSingle();
  if (!building) return NextResponse.json({ found: false });
  const orgId = (building as any).org_id as string;

  const { data } = await supabase
    .from("contractors")
    .select("id, full_name, company_id, phone")
    .eq("org_id", orgId)
    .limit(2000);
  const match = (data ?? []).find(
    (c: { phone: string | null }) => c.phone && digits(c.phone) === d
  ) as { id: string; full_name: string; company_id: string | null } | undefined;

  if (!match) return NextResponse.json({ found: false });
  return NextResponse.json({
    found: true,
    name: match.full_name,
    contractor_id: match.id,
    company_id: match.company_id,
  });
}
