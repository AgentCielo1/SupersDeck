// =============================================================================
//  @workorder/kit — canonical, backend-agnostic work-order contract
// =============================================================================
//  The single shared shape every app in the suite normalizes to. Imports
//  NOTHING but TypeScript — no ORM (@prisma/client / @supabase/*), no React,
//  no Next. Each app keeps a thin adapter that maps its own DB rows to/from
//  this contract.
//
//  Rule: `title` / `description` are ALWAYS English (display-ready). The
//  resident's words in their own language live under `original`.
// =============================================================================

export type WorkOrderStatus =
  | "new"
  | "triaged"
  | "assigned"
  | "in_progress"
  | "waiting_vendor"
  | "waiting_parts"
  | "deferred"
  | "completed"
  | "cancelled";

export type WorkOrderPriority = "emergency" | "high" | "normal" | "low";

export type WorkOrderSource = "typed" | "voice" | "scan" | "email" | "manual";

export interface WorkOrderLocation {
  buildingName: string;
  unitLabel?: string;
  /** Free-text area, e.g. "Apartment", "Hallway", "Boiler room". Optional —
   *  apps without a zone concept (BoroDesk) just leave it undefined. */
  zone?: string;
  zoneDetail?: string;
  address?: string;
}

export interface WorkOrderReporter {
  name: string;
  phone?: string;
  email?: string;
  altPhone?: string;
}

export interface WorkOrderOriginal {
  title: string;
  description?: string;
  /** ISO 639-1, e.g. "es", "zh", "ru". */
  language: string;
}

export interface WorkOrderCompletion {
  notes?: string;
  doneBy?: string;
  signatureDataUrl?: string;
  startedAt?: string;
  completedAt?: string;
  signedByName?: string;
  signedAt?: string;
}

export interface WorkOrderOrg {
  /** Entity printed in the work-order header, e.g. "FOREST HILLS MHA HDFC". */
  name: string;
  /** Short badge/monogram, e.g. "FH". */
  mark?: string;
  /** e.g. "Building Operations". */
  subtitle?: string;
}

export interface NormalizedWorkOrder {
  /** Opaque human reference; each app keeps its own format ("WO-1024" vs
   *  "WO-2026-0001"). Never parsed by the kit. */
  referenceNumber: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;

  /** ALWAYS English. */
  title: string;
  description?: string;
  /** Resident's words in their own language, when the intake wasn't English. */
  original?: WorkOrderOriginal;

  location: WorkOrderLocation;
  reporter: WorkOrderReporter;
  /** Label-first so UI never needs an app-specific category enum. */
  category?: { label: string; slug?: string };
  source?: WorkOrderSource;
  completion?: WorkOrderCompletion;
  org: WorkOrderOrg;

  /** ISO timestamps. */
  createdAt?: string;
  /** Operator / super who logged it. */
  takenBy?: string;
  hpdRisk?: boolean;
  photos?: string[];
}

// ---------------------------------------------------------------------------
//  Display helpers — apps should use these instead of local label maps.
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  new: "New",
  triaged: "Triaged",
  assigned: "Assigned",
  in_progress: "In progress",
  waiting_vendor: "Waiting on vendor",
  waiting_parts: "Waiting on parts",
  deferred: "Deferred",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  emergency: "Emergency",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export function statusLabel(s: WorkOrderStatus): string {
  return STATUS_LABELS[s] ?? s;
}

export function priorityLabel(p: WorkOrderPriority): string {
  return PRIORITY_LABELS[p] ?? p;
}
