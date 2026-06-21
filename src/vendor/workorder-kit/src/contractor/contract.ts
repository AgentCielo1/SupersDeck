// =============================================================================
//  @workorder/kit — contractor presence + compliance contract
// =============================================================================
//  The shared, backend-agnostic shape for "a contractor showed up to a
//  building" + "is their company cleared to be here". Imports NOTHING but
//  TypeScript (no ORM, React, or Next) — each app maps its own DB rows to this
//  via a thin adapter, exactly like the work-order contract.
//
//  Design principle (from research): keep a COMPLIANCE layer (documents +
//  derived status) separate from a SIGN-IN layer (visits), and let compliance
//  status GATE the sign-in. `coiStatus()` + `isBlocked()` are that gate.
// =============================================================================

export type ComplianceDocType =
  | "gl_coi" // general liability certificate of insurance
  | "workers_comp"
  | "disability"
  | "dcwp_hic" // NYC DCWP Home Improvement Contractor license
  | "trade_license"
  | "w9"
  | "induction_cert"; // signed safety / building induction

export type ComplianceStatus = "compliant" | "expiring" | "expired" | "missing";

export type VisitMethod = "qr" | "kiosk" | "phone" | "staff";

export interface ComplianceDocument {
  docType: ComplianceDocType;
  carrier?: string;
  policyNumber?: string;
  /** Store BOTH — NYC GL is commonly $1M/occurrence, $2M aggregate. */
  glPerOccurrence?: number;
  glAggregate?: number;
  /** "DOB" | "DCWP" | carrier name. */
  issuingAgency?: string;
  /** ISO dates. */
  effectiveDate?: string;
  expiryDate?: string;
  /** e.g. per-project permit COIs name the City of NY. */
  additionalInsured?: boolean;
  /** e.g. "CE-200" no-employees disability waiver. */
  exemptionType?: string;
  fileUrl?: string;
}

export interface ContractorVisit {
  /** Opaque human reference; each app keeps its own format. Never parsed. */
  referenceNumber: string;
  contractorName: string;
  companyName: string;
  trade?: string;
  location: { buildingName: string; unitLabel?: string };
  /** THE differentiator vs generic visitor management — the job this was for. */
  workOrderRef?: string;
  purpose?: string;
  method: VisitMethod;
  /** ISO timestamps. */
  signInAt: string;
  signOutAt?: string;
  photoDataUrl?: string;
  /** Snapshot of compliance at the moment of entry (audit). */
  complianceStatusAtEntry?: ComplianceStatus;
}

// ---------------------------------------------------------------------------
//  Compliance gate
// ---------------------------------------------------------------------------

/** Days before expiry to start warning. Mirrors the reminder cadence below. */
export const DEFAULT_EXPIRY_WARN_DAYS = 30;
/** Pre-expiry reminder cadence (days before), copied from WhosOnLocation. */
export const DEFAULT_REMINDER_DAYS = [90, 60, 30, 10];
/** Documents required for a company to be "compliant" by default. */
export const DEFAULT_REQUIRED_DOCS: ComplianceDocType[] = ["gl_coi"];

export function daysUntil(iso: string, now: Date = new Date()): number {
  return Math.floor((new Date(iso).getTime() - now.getTime()) / 86_400_000);
}

/**
 * Derive a single compliance status from a set of documents.
 * `missing` if any required doc type is absent (or has no expiry); otherwise
 * the status of the soonest-expiring required document.
 */
export function coiStatus(
  docs: ComplianceDocument[],
  opts: { warnDays?: number; now?: Date; required?: ComplianceDocType[] } = {}
): ComplianceStatus {
  const warn = opts.warnDays ?? DEFAULT_EXPIRY_WARN_DAYS;
  const now = opts.now ?? new Date();
  const required = opts.required ?? DEFAULT_REQUIRED_DOCS;

  const hasAllRequired = required.every((r) =>
    docs.some((d) => d.docType === r && !!d.expiryDate)
  );
  if (!hasAllRequired) return "missing";

  const expiries = docs
    .filter((d) => required.includes(d.docType) && d.expiryDate)
    .map((d) => daysUntil(d.expiryDate as string, now));
  if (expiries.length === 0) return "missing";

  const min = Math.min(...expiries);
  if (min < 0) return "expired";
  if (min <= warn) return "expiring";
  return "compliant";
}

/** The gate: should a sign-in be blocked given a status + enforcement flag? */
export function isBlocked(status: ComplianceStatus, gateEnforced: boolean): boolean {
  return gateEnforced && status === "expired";
}

// ---------------------------------------------------------------------------
//  Display helpers — apps use these instead of local label maps.
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  compliant: "Insured",
  expiring: "Expiring soon",
  expired: "Expired",
  missing: "No COI on file",
};
export function complianceStatusLabel(s: ComplianceStatus): string {
  return STATUS_LABELS[s] ?? s;
}

const DOC_LABELS: Record<ComplianceDocType, string> = {
  gl_coi: "General liability (COI)",
  workers_comp: "Workers' comp",
  disability: "Disability",
  dcwp_hic: "DCWP home-improvement license",
  trade_license: "Trade license",
  w9: "W-9",
  induction_cert: "Induction / safety cert",
};
export function complianceDocLabel(t: ComplianceDocType): string {
  return DOC_LABELS[t] ?? t;
}

const METHOD_LABELS: Record<VisitMethod, string> = {
  qr: "QR",
  kiosk: "Kiosk",
  phone: "Phone",
  staff: "Staff",
};
export function visitMethodLabel(m: VisitMethod): string {
  return METHOD_LABELS[m] ?? m;
}
