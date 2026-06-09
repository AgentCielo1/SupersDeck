import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import WorkOrderCard from "@/components/WorkOrderCard";
import { db } from "@/lib/db";

export default async function WorkOrdersPage() {
  const all = await db.workOrders();
  const open = all.filter((w) => w.status !== "completed" && w.status !== "cancelled");
  const closed = all.filter((w) => w.status === "completed");

  return (
    <>
      <PageHeader
        title="Work orders"
        subtitle="Tenant tickets, internal requests, and vendor jobs in one place."
        actions={
          <Link
            href="/work-orders/new"
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            New work order
          </Link>
        }
      />

      <section>
        <h2 className="mb-2 text-base font-semibold">Open ({open.length})</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {open.map((wo) => (
            <WorkOrderCard key={wo.id} wo={wo} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-base font-semibold">
          Recently closed ({closed.length})
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {closed.map((wo) => (
            <WorkOrderCard key={wo.id} wo={wo} />
          ))}
        </div>
      </section>
    </>
  );
}
