import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import BuildingEditForm from "@/components/BuildingEditForm";
import { db } from "@/lib/db";

export default async function EditBuildingPage({
  params,
}: {
  params: { id: string };
}) {
  const building = await db.building(params.id);
  if (!building) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${building.name}`}
        subtitle={building.address}
        actions={
          <Link
            href="/buildings"
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            ← Buildings
          </Link>
        }
      />
      <BuildingEditForm building={building} />
    </>
  );
}
