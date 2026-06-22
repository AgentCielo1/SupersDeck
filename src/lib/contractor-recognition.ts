// =============================================================================
//  BoroDesk — returning-contractor recognition (org-scoped)
// =============================================================================
//  Find an existing contractor by phone (so repeat visitors are recognized and
//  their record reused), else create one. Shared by the public QR sign-in and
//  the staff-assisted sign-in endpoints — both run under the service role, so
//  org_id is set explicitly (the set_org_id trigger only stamps authenticated
//  inserts). Matching is scoped to the building's org so tenants never see each
//  other's contractors. Phone is matched on digits only, so formatting
//  differences ("(718) 555-0142" vs "7185550142") still match.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

const digitsOf = (p: string): string => p.replace(/\D/g, "");

export interface RecognitionInput {
  /** Tenant scope — required to match within and to create in the right org. */
  orgId: string;
  phone?: string | null;
  name?: string | null;
  companyId?: string | null;
  contractorId?: string | null;
}

export interface RecognitionResult {
  contractorId: string | null;
  isReturning: boolean;
}

export async function findOrCreateContractorByPhone(
  supabase: SupabaseClient,
  input: RecognitionInput
): Promise<RecognitionResult> {
  // Explicit contractor id wins (staff picked a saved contractor).
  if (input.contractorId) return { contractorId: input.contractorId, isReturning: true };

  const phone = (input.phone ?? "").trim();
  const d = digitsOf(phone);
  if (d.length < 7) return { contractorId: null, isReturning: false };

  const { data: rows } = await supabase
    .from("contractors")
    .select("id, phone")
    .eq("org_id", input.orgId)
    .limit(2000);
  const match = (rows ?? []).find(
    (c: { id: string; phone: string | null }) => c.phone && digitsOf(c.phone) === d
  ) as { id: string } | undefined;

  if (match) {
    const update: Record<string, unknown> = { is_returning: true };
    if (input.name) update.full_name = input.name;
    if (input.companyId) update.company_id = input.companyId;
    await supabase.from("contractors").update(update).eq("id", match.id);
    return { contractorId: match.id, isReturning: true };
  }

  const id = `ct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const { error } = await supabase.from("contractors").insert({
    id,
    org_id: input.orgId,
    full_name: input.name || "Contractor",
    phone,
    company_id: input.companyId || null,
    is_returning: false,
  });
  return { contractorId: error ? null : id, isReturning: false };
}
