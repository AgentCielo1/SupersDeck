// =============================================================================
//  SupersDeck → @workorder/kit adapter
// =============================================================================
//  Maps SupersDeck's Supabase `work_orders` row (src/types WorkOrder) to the
//  shared NormalizedWorkOrder contract. App-side glue — the kit never imports
//  this. (Phase 0: defined, not yet wired into pages.)
// =============================================================================

import type {
  NormalizedWorkOrder,
  WorkOrderStatus,
} from "@workorder/kit/contract";
import type { WorkOrder, Building, Unit } from "@/types";

const STATUS_MAP: Record<WorkOrder["status"], WorkOrderStatus> = {
  new: "new",
  triaged: "triaged",
  assigned: "assigned",
  "in-progress": "in_progress",
  "waiting-on-vendor": "waiting_vendor",
  "waiting-on-parts": "waiting_parts",
  completed: "completed",
  cancelled: "cancelled",
};

const CATEGORY_LABELS: Record<string, string> = {
  "no-heat": "No heat",
  "no-hot-water": "No hot water",
  leak: "Leak / water damage",
  electrical: "Electrical",
  appliance: "Appliance",
  "lock-key": "Lock / key",
  pest: "Pest",
  mold: "Mold",
  elevator: "Elevator",
  intercom: "Intercom",
  "common-area": "Common area",
  "lead-concern": "Lead concern",
  other: "Other",
};

export interface WoContext {
  building?: Pick<Building, "name" | "address" | "legal_entity"> | null;
  unit?: Pick<Unit, "label"> | null;
}

export function toNormalized(
  wo: WorkOrder,
  ctx: WoContext = {}
): NormalizedWorkOrder {
  const translated = !!wo.source_language && wo.source_language !== "en";
  return {
    referenceNumber: wo.ticket_number,
    status: STATUS_MAP[wo.status] ?? "new",
    priority: wo.priority, // already emergency | high | normal | low
    title: wo.title_en || wo.title,
    description: wo.description_en || wo.description || undefined,
    original: translated
      ? {
          title: wo.title,
          description: wo.description || undefined,
          language: wo.source_language as string,
        }
      : undefined,
    location: {
      buildingName: ctx.building?.name ?? "—",
      unitLabel: ctx.unit?.label ?? undefined,
      address: ctx.building?.address ?? undefined,
    },
    reporter: {
      name: wo.reporter_name,
      phone: wo.reporter_phone || undefined,
      email: wo.reporter_email || undefined,
    },
    category: {
      label: CATEGORY_LABELS[wo.category] ?? wo.category,
      slug: wo.category,
    },
    source: "typed",
    completion: {
      signatureDataUrl: wo.completion_signature || undefined,
      signedByName: wo.signed_by_name || undefined,
      signedAt: wo.signed_at || undefined,
      completedAt: wo.resolved_at || undefined,
    },
    org: { name: ctx.building?.legal_entity || "FOREST HILLS MHA" },
    createdAt: wo.reported_at,
    hpdRisk: wo.hpd_risk,
    photos: wo.photos,
  };
}
