import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import CompleteComplianceForm from "@/components/CompleteComplianceForm";
import { db } from "@/lib/db";
import { complianceTemplateById } from "@/data/compliance-templates";

// =============================================================================
//  /compliance/[itemId]/complete
// =============================================================================
//  itemId is a composite `${building_id}-${template_id}` (the same id the
//  generator uses). We split it back, look up the building and template, and
//  render the mark-complete form pre-filled with today's date.
// =============================================================================

function splitItemId(itemId: string): { buildingId: string; templateId: string } | null {
  // The bldg- prefix and template ids both contain hyphens, so we can't just
  // split on '-'. Convention: building id always starts with "bldg-" plus a
  // segment. Take the first two hyphen-separated parts as building id.
  const parts = itemId.split("-");
  if (parts.length < 3 || parts[0] !== "bldg") return null;
  return {
    buildingId: `${parts[0]}-${parts[1]}`,
    templateId: parts.slice(2).join("-"),
  };
}

export default async function MarkCompleteCompliancePage({
  params,
}: {
  params: { itemId: string };
}) {
  const split = splitItemId(params.itemId);
  if (!split) notFound();
  const building = await db.building(split.buildingId);
  const template = complianceTemplateById(split.templateId);
  if (!building || !template) notFound();

  return (
    <>
      <PageHeader
        title="Mark compliance item complete"
        subtitle={`${template.name} · ${building.name}`}
        actions={
          <Link
            href="/compliance"
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            ← Compliance
          </Link>
        }
      />

      <div className="mb-4 rounded-xl2 border border-brand-400/30 bg-brand-50 p-4 text-sm text-brand-800">
        <div className="font-semibold">{template.name}</div>
        <p className="mt-1 text-xs">
          {template.description}
        </p>
        <div className="mt-2 text-xs">
          <span className="font-medium">Frequency:</span> {template.frequency}
          {template.due_window && <> · <span className="font-medium">Window:</span> {template.due_window}</>}
          {template.vendor_type_required && <> · <span className="font-medium">Vendor type:</span> {template.vendor_type_required}</>}
        </div>
        <div className="mt-1 text-xs">
          <span className="font-medium">Statute:</span> {template.statute}
        </div>
      </div>

      <CompleteComplianceForm
        building_id={building.id}
        template_id={template.id}
      />
    </>
  );
}
