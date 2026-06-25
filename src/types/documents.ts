// =============================================================================
//  Files / documents types (shared client + server)
// =============================================================================

// Private Supabase Storage bucket for documents. Declared here (not in the
// server-only storage.ts) so client components can import it safely.
export const DOC_BUCKET = "documents";

export const DOC_CATEGORIES = [
  "Lease",
  "Insurance/COI",
  "Notice",
  "Permit",
  "Inspection",
  "Building doc",
  "Tenant doc",
  "Other",
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number];

export type Document = {
  id: string;
  name: string;
  category: string | null;
  building_id: string | null;
  unit_id: string | null;
  path: string;
  mime: string | null;
  size: number | null;
  uploaded_by: string | null;
  created_at: string;
};
