import type { SupabaseClient } from "@supabase/supabase-js";
import {
  coiStatus,
  isBlocked,
  type ComplianceDocument,
  type ComplianceStatus,
} from "@workorder/kit/contractor/contract";
import type { ComplianceDocumentRow } from "@/types/contractors";

// =============================================================================
//  Shared compliance-gate helpers
// =============================================================================
//  Single source of truth for the two sign-in routes (staff
//  /api/contractor-visits and the public QR /api/public/sign-in/*), which had
//  drifted apart. Server-only — takes a service-role Supabase client.
// =============================================================================

/** Map a compliance_documents row to the kit's ComplianceDocument shape. */
export function rowToDoc(d: ComplianceDocumentRow): ComplianceDocument {
  return {
    docType: d.doc_type,
    carrier: d.carrier ?? undefined,
    policyNumber: d.policy_number ?? undefined,
    glPerOccurrence: d.gl_per_occurrence ?? undefined,
    glAggregate: d.gl_aggregate ?? undefined,
    issuingAgency: d.issuing_agency ?? undefined,
    effectiveDate: d.effective_date ?? undefined,
    expiryDate: d.expiry_date ?? undefined,
    additionalInsured: d.additional_insured,
    exemptionType: d.exemption_type ?? undefined,
    fileUrl: d.file_url ?? undefined,
  };
}

/** Re-derive a company's compliance status from its documents (server-side —
 *  never trust a client claim of "compliant"). */
export async function deriveCompanyStatus(
  supabase: SupabaseClient,
  companyId: string
): Promise<ComplianceStatus> {
  const { data: docs } = await supabase
    .from("compliance_documents")
    .select("*")
    .eq("company_id", companyId);
  return coiStatus(((docs ?? []) as ComplianceDocumentRow[]).map(rowToDoc));
}

/**
 * The gate. `expired` always blocks (when enforced). `missing` additionally
 * blocks when GATE_BLOCK_MISSING_COI=true — opt-in, default OFF, so buildings
 * that haven't loaded their COI library yet aren't locked out on day one.
 */
export function gateBlocks(status: ComplianceStatus, gateEnforced: boolean): boolean {
  if (isBlocked(status, gateEnforced)) return true;
  return (
    gateEnforced &&
    status === "missing" &&
    process.env.GATE_BLOCK_MISSING_COI === "true"
  );
}

/** Audit-row reason for contractor_blocked_attempts. */
export function blockedReason(status: ComplianceStatus): string {
  return status === "missing"
    ? "No GL insurance on file (GATE_BLOCK_MISSING_COI)"
    : "GL insurance expired / not on file";
}

/** Human message shown to whoever is signing in. */
export function blockedMessage(status: ComplianceStatus): string {
  return status === "missing"
    ? "Company insurance is not on file."
    : "Company insurance is expired.";
}

/** Write the blocked-attempt audit row (best-effort; caller returns 403). */
export async function recordBlockedAttempt(
  supabase: SupabaseClient,
  attempt: {
    company_id?: string | null;
    inline_name?: string | null;
    building_id: string;
    reason: string;
  }
): Promise<void> {
  await supabase.from("contractor_blocked_attempts").insert({
    id: `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    company_id: attempt.company_id ?? null,
    inline_name: attempt.inline_name ?? null,
    building_id: attempt.building_id,
    reason: attempt.reason,
  });
}
