// =============================================================================
//  SupersDeck — contractor logbook DB types
// =============================================================================
//  Mirror supabase/migration-contractors.sql. The shared, display-ready shapes
//  live in @workorder/kit/contractor; these are the raw Supabase rows.
// =============================================================================

import type { ID } from "@/types";
import type { ComplianceDocType, VisitMethod, ComplianceStatus } from "@workorder/kit/contractor/contract";

export interface Contractor {
  id: ID;
  company_id?: string | null; // -> vendors.id
  full_name: string;
  phone?: string | null;
  email?: string | null;
  photo_url?: string | null;
  returning: boolean;
  notes?: string | null;
  created_at: string;
}

export interface ComplianceDocumentRow {
  id: ID;
  company_id?: string | null;
  contractor_id?: string | null;
  doc_type: ComplianceDocType;
  carrier?: string | null;
  policy_number?: string | null;
  gl_per_occurrence?: number | null;
  gl_aggregate?: number | null;
  issuing_agency?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  additional_insured: boolean;
  exemption_type?: string | null;
  file_url?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
}

export interface ContractorVisitRow {
  id: ID;
  contractor_id?: string | null;
  inline_name?: string | null;
  company_id?: string | null;
  building_id: string;
  unit_id?: string | null;
  work_order_id?: string | null;
  purpose?: string | null;
  method: VisitMethod;
  sign_in_at: string;
  sign_out_at?: string | null;
  photo_url?: string | null;
  signature_ref?: string | null;
  compliance_status_at_entry?: ComplianceStatus | null;
  created_at: string;
}

export interface ContractorBlockedAttemptRow {
  id: ID;
  company_id?: string | null;
  inline_name?: string | null;
  building_id?: string | null;
  reason?: string | null;
  attempted_at: string;
}
