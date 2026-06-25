import PageHeader from "@/components/PageHeader";
import TenantDirectory, { type DirRow } from "./TenantDirectory";
import { db } from "@/lib/db";

// =============================================================================
//  /tenants — searchable tenant directory
// =============================================================================
//  Look up by name → get the apartment, or by building + apartment → get the
//  tenant + contact. Reads the units the buildings already hold (tenant_name,
//  phone, lease dates). Rent figures are NOT shown here (owner-only elsewhere).
// =============================================================================

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const [units, buildings] = await Promise.all([db.units(), db.buildings()]);
  const nameById: Record<string, string> = Object.fromEntries(
    buildings.map((b) => [b.id, b.name])
  );

  const rows: DirRow[] = units.map((u) => ({
    buildingId: u.building_id,
    building: nameById[u.building_id] ?? u.building_id,
    apt: u.label,
    tenant: u.tenant_name ?? null,
    phone: u.tenant_phone ?? null,
    leaseEnd: u.lease_end ?? null,
    occupied: u.occupied,
  }));

  return (
    <>
      <PageHeader
        title="Tenant directory"
        subtitle="Search a name to find the apartment, or a building + apartment to find the tenant."
      />
      <TenantDirectory rows={rows} />
    </>
  );
}
