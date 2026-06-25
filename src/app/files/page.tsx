import PageHeader from "@/components/PageHeader";
import FilesBrowser, { type FileRow } from "./FilesBrowser";
import { db } from "@/lib/db";

// =============================================================================
//  /files — document repository
// =============================================================================
//  Upload + categorize building/tenant/vendor documents (leases, COIs, notices,
//  permits…), tag them to a building/apartment, search, and download. Downloads
//  go through /api/documents/:id (short-lived signed URL) so nothing is public.
// =============================================================================

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const [docs, buildings, units] = await Promise.all([
    db.documents(),
    db.buildings(),
    db.units(),
  ]);
  const bName: Record<string, string> = Object.fromEntries(
    buildings.map((b) => [b.id, b.name])
  );
  const uLabel: Record<string, string> = Object.fromEntries(
    units.map((u) => [u.id, u.label])
  );

  const rows: FileRow[] = docs.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category ?? "Other",
    buildingId: d.building_id,
    building: d.building_id ? bName[d.building_id] ?? d.building_id : null,
    unitId: d.unit_id,
    apt: d.unit_id ? uLabel[d.unit_id] ?? null : null,
    createdAt: d.created_at,
  }));

  return (
    <>
      <PageHeader
        title="Files"
        subtitle="Building & tenant documents — upload, tag, search, download. Private (signed links)."
      />
      <FilesBrowser
        rows={rows}
        buildings={buildings.map((b) => ({ id: b.id, name: b.name }))}
        units={units.map((u) => ({
          id: u.id,
          building_id: u.building_id,
          label: u.label,
        }))}
      />
    </>
  );
}
