// =============================================================================
//  BoroDesk → @workorder/kit contractor adapter
// =============================================================================
//  Maps a Supabase `contractor_visits` row to the shared ContractorVisit
//  contract. App-side glue — the kit never imports this. Mirrors wo-adapter.ts.
// =============================================================================

import type { ContractorVisit } from "@workorder/kit/contractor/contract";
import type { ContractorVisitRow } from "@/types/contractors";

export interface VisitContext {
  contractorName?: string | null;
  companyName?: string | null;
  trade?: string | null;
  buildingName?: string | null;
  unitLabel?: string | null;
  workOrderRef?: string | null;
}

export function toContractorVisit(
  v: ContractorVisitRow,
  ctx: VisitContext = {}
): ContractorVisit {
  return {
    referenceNumber: v.id,
    contractorName: ctx.contractorName || v.inline_name || "Contractor",
    companyName: ctx.companyName || "—",
    trade: ctx.trade || undefined,
    location: {
      buildingName: ctx.buildingName || "—",
      unitLabel: ctx.unitLabel || undefined,
    },
    workOrderRef: ctx.workOrderRef || v.work_order_id || undefined,
    purpose: v.purpose || undefined,
    method: v.method,
    signInAt: v.sign_in_at,
    signOutAt: v.sign_out_at || undefined,
    photoDataUrl: v.photo_url || undefined,
    complianceStatusAtEntry: v.compliance_status_at_entry || undefined,
  };
}
