import type {
  Building,
  ComplianceItem,
  ComplianceStatus,
  ComplianceTemplate,
} from "@/types";
import { COMPLIANCE_TEMPLATES } from "@/data/compliance-templates";

// =============================================================================
//  Compliance generator
// =============================================================================
//  Produces a ComplianceItem per (building × applicable template). Unlike the
//  earlier synthetic version, every next_due here is REAL — computed from the
//  template's `due_rule`:
//
//    fixed-date:MM-DD     → next calendar occurrence of MM-DD
//    anniversary:Ny       → last_completed + N years; if no last_completed,
//                            status = "needs-scheduling" and no next_due
//    seasonal:MM-DD:MM-DD → in-progress during the window, ok otherwise
//    one-time:YYYY-MM-DD  → that specific date
//    one-time             → lifetime credential, no recurring deadline
//    trigger              → only created when an event triggers it — we skip
//                            generation entirely so the dashboard isn't
//                            polluted by fake overdue "HPD violation cure"s
//
//  Anniversary templates need real last_completed input from the super (via
//  the upcoming /compliance/[id]/complete flow) before they get a date.
// =============================================================================

// ---------- Building applicability ----------
function templateApplies(t: ComplianceTemplate, b: Building): boolean {
  if (t.id === "cooling-tower-annual-cert") return b.has_cooling_tower;
  if (t.id === "pbs-oil-tank-renew" || t.id === "fdny-q99") return b.has_oil_heat;
  if (t.id === "sprinkler-standpipe-annual" || t.id === "sprinkler-standpipe-5yr")
    return b.has_sprinkler;
  if (t.id === "section-8-nspire") return b.has_section8;
  if (t.id === "ll11-fisp") return b.num_floors > 6;
  if (
    t.id === "ll84-benchmarking" ||
    t.id === "ll87-energy-audit" ||
    t.id === "ll97-emissions-report"
  ) {
    return (b.square_footage ?? 0) > 25000;
  }
  if (
    t.id === "lead-paint-annual-notice" ||
    t.id === "lead-paint-annual-inspection" ||
    t.id === "ll31-lead-xrf"
  ) {
    return b.year_built < 1960 || b.has_known_lead === true;
  }
  return true;
}

// ---------- Date math ----------
function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function isoDate(y: number, m1: number, d: number): string {
  return `${y}-${pad(m1)}-${pad(d)}T00:00:00.000Z`;
}

/** Returns the next occurrence of MM-DD in the future (or today). */
function nextOccurrenceOfMMDD(mmdd: string): string {
  const [m, d] = mmdd.split("-").map(Number);
  const now = new Date();
  const year = now.getFullYear();
  const candidateThisYear = new Date(year, m - 1, d);
  // If today is past this year's date, use next year.
  if (candidateThisYear.getTime() < now.getTime() - 86_400_000) {
    return isoDate(year + 1, m, d);
  }
  return isoDate(year, m, d);
}

/** End of the current heat season we're inside, or next start if outside. */
function nextHeatSeasonBoundary(): { status: "in-progress" | "ok"; next_due: string } {
  const now = new Date();
  const m1 = now.getMonth() + 1;
  // Heat season: Oct 1 – May 31
  const inSeason = m1 >= 10 || m1 <= 5;
  if (inSeason) {
    // We're in heat season; "due" date is end of season (May 31 of next year if Oct-Dec, this year if Jan-May)
    const seasonEndYear = m1 >= 10 ? now.getFullYear() + 1 : now.getFullYear();
    return { status: "in-progress", next_due: isoDate(seasonEndYear, 5, 31) };
  }
  // Off-season, next start is Oct 1 of current year
  return { status: "ok", next_due: isoDate(now.getFullYear(), 10, 1) };
}

function statusForDate(iso: string): ComplianceStatus {
  const days = daysUntil(iso);
  if (days < 0) return "overdue";
  if (days < 30) return "due-soon";
  return "ok";
}

// ---------- Per-rule computation ----------
function computeFromRule(
  t: ComplianceTemplate,
  last_completed?: string
): { status: ComplianceStatus; next_due?: string } | null {
  const rule = t.due_rule;
  if (!rule || rule === "trigger") return null; // never generate

  if (rule.startsWith("fixed-date:")) {
    const mmdd = rule.slice("fixed-date:".length);
    const next_due = nextOccurrenceOfMMDD(mmdd);
    return { status: statusForDate(next_due), next_due };
  }

  if (rule.startsWith("anniversary:")) {
    if (!last_completed) {
      return { status: "needs-scheduling" };
    }
    const years = parseInt(rule.slice("anniversary:".length), 10);
    const last = new Date(last_completed);
    const next = new Date(last);
    next.setFullYear(next.getFullYear() + years);
    const next_due = next.toISOString();
    return { status: statusForDate(next_due), next_due };
  }

  if (rule.startsWith("seasonal:")) {
    // For now we only support the heat-season rule; generalize later.
    return nextHeatSeasonBoundary();
  }

  if (rule.startsWith("one-time:")) {
    const dateStr = rule.slice("one-time:".length); // YYYY-MM-DD
    const next_due = `${dateStr}T00:00:00.000Z`;
    return { status: statusForDate(next_due), next_due };
  }

  if (rule === "one-time") {
    // Lifetime credential (OSHA-30). Not relevant on the recurring calendar.
    return { status: "not-applicable" };
  }

  return { status: "needs-scheduling" };
}

// ---------- Public API ----------
export interface LastCompletedRow {
  building_id: string;
  template_id: string;
  last_completed: string;
  vendor_id?: string | null;
  notes?: string | null;
}

/**
 * Generates one compliance item per (building × applicable template).
 *
 * @param buildings  Buildings to generate for.
 * @param lastCompletedRows  Optional DB rows of completed work. When present,
 *   the next_due for anniversary/cyclical items is computed from the row's
 *   last_completed instead of being "needs-scheduling".
 */
export function generateComplianceItems(
  buildings: Building[],
  lastCompletedRows: LastCompletedRow[] = []
): ComplianceItem[] {
  const byKey = new Map<string, LastCompletedRow>();
  for (const row of lastCompletedRows) {
    byKey.set(`${row.building_id}-${row.template_id}`, row);
  }

  const items: ComplianceItem[] = [];
  buildings.forEach((b) => {
    COMPLIANCE_TEMPLATES.forEach((t) => {
      if (!templateApplies(t, b)) return;
      const key = `${b.id}-${t.id}`;
      const dbRow = byKey.get(key);
      const computed = computeFromRule(t, dbRow?.last_completed);
      if (!computed) return; // trigger-based, skip
      items.push({
        id: key,
        building_id: b.id,
        template_id: t.id,
        status: computed.status,
        next_due: computed.next_due,
        last_completed: dbRow?.last_completed,
        vendor_id: dbRow?.vendor_id ?? undefined,
        notes: dbRow?.notes ?? undefined,
      });
    });
  });
  return items;
}

// Helpers used by UI
export function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export function formatDueLabel(iso?: string): string {
  if (!iso) return "Not scheduled";
  const d = daysUntil(iso);
  if (d < 0) return `${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} overdue`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  if (d < 30) return `Due in ${d} days`;
  if (d < 365) {
    const months = Math.round(d / 30);
    return `Due in ${months} month${months === 1 ? "" : "s"}`;
  }
  const years = Math.round(d / 365);
  return `Due in ${years} year${years === 1 ? "" : "s"}`;
}
