import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import TenantDirectory, { type DirRow } from "./TenantDirectory";
import { db } from "@/lib/db";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { TENANT_PII, type Role } from "@/lib/authz";

// =============================================================================
//  /tenants — searchable tenant directory
// =============================================================================
//  Look up by name → get the apartment, or by building + apartment → get the
//  tenant + contact. Reads the units the buildings already hold (tenant_name,
//  phone, lease dates). Rent figures are NOT shown here (owner-only elsewhere).
//
//  ROLE GATE (2026-08-09). This page had no check at all: every signed-in role,
//  including read_only, got names, two phone numbers, emergency contact name +
//  relation + phone, and lease end for all 432 units. Now TENANT_PII
//  (admin/super), matching the admin gate that /people has always had.
//
//  This is deliberately the tightest defensible setting, not a considered
//  operational answer — porters may well need SOME contact access to do their
//  jobs. Widening it is one name in TENANT_PII (src/lib/authz.ts) plus the
//  matching RLS change in supabase/migration-tenant-pii-policies.sql. Change
//  both or the page and the database will disagree.
// =============================================================================

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const me = await getCurrentUserProfile();
  if (!me) redirect("/login");
  if (!TENANT_PII.includes(me.role as Role)) {
    return (
      <>
        <PageHeader title="Tenant directory" subtitle="Tenant contact information" />
        <EmptyState
          title="Not available for your role"
          message={`You're signed in as "${me.role}". Tenant contact details are limited to admins and supers. Ask one of them if you need to reach a resident.`}
        />
      </>
    );
  }

  const [units, buildings] = await Promise.all([db.units(), db.buildings()]);
  const nameById: Record<string, string> = Object.fromEntries(
    buildings.map((b) => [b.id, b.name])
  );

  const rows: DirRow[] = units.map((u) => ({
    id: u.id,
    buildingId: u.building_id,
    building: nameById[u.building_id] ?? u.building_id,
    apt: u.label,
    tenant: u.tenant_name ?? null,
    phone: u.tenant_phone ?? null,
    phone2: u.tenant_phone2 ?? null,
    ecName: u.emergency_contact_name ?? null,
    ecRelation: u.emergency_contact_relation ?? null,
    ecPhone: u.emergency_contact_phone ?? null,
    leaseEnd: u.lease_end ?? null,
    occupied: u.occupied,
  }));

  return (
    <>
      <PageHeader
        title="Tenant directory"
        subtitle="Search a name to find the apartment, or a building + apartment to find the tenant. Add, edit, or vacate apartments inline."
      />
      <TenantDirectory
        rows={rows}
        buildings={buildings.map((b) => ({ id: b.id, name: b.name }))}
      />
    </>
  );
}
