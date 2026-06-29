import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { db } from "@/lib/db";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import AlertComposer, {
  type ComposerBuilding,
  type ComposerUnit,
} from "../AlertComposer";

export const dynamic = "force-dynamic";

const SENDER_ROLES = new Set(["admin", "super", "manager"]);

export default async function NewAlertPage() {
  const profile = await getCurrentUserProfile();

  if (!profile || !SENDER_ROLES.has(profile.role)) {
    return (
      <>
        <PageHeader title="New alert" />
        <EmptyState
          title="You don't have permission to send alerts"
          message="Only admins, supers, and managers can send building alerts. Ask your manager if you need access."
          cta={
            <Link
              href="/alerts"
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-900 hover:bg-ink-100"
            >
              Back to alerts
            </Link>
          }
        />
      </>
    );
  }

  const [buildings, units] = await Promise.all([db.buildings(), db.units()]);

  const composerBuildings: ComposerBuilding[] = buildings.map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    num_units: b.num_units,
  }));
  const composerUnits: ComposerUnit[] = units.map((u) => ({
    id: u.id,
    building_id: u.building_id,
    label: u.label,
    occupied: u.occupied,
  }));

  return (
    <>
      <div className="mb-3">
        <Link href="/alerts" className="text-sm text-brand-600 hover:underline">
          ← Back to alerts
        </Link>
      </div>
      <PageHeader
        title="New alert"
        subtitle="Pick a tier, choose who it reaches, and review the preview before sending."
      />
      <AlertComposer buildings={composerBuildings} units={composerUnits} />
    </>
  );
}
