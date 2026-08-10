import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import WorkOrderSearch from "@/components/WorkOrderSearch";
import { db } from "@/lib/db";

export default async function WorkOrdersPage() {
  const all = await db.workOrders();

  return (
    <>
      <PageHeader
        title="Work orders"
        subtitle="Tenant tickets, internal requests, and vendor jobs in one place."
        actions={
          <div className="flex gap-2">
            <a
              href="/api/work-orders/export"
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
              download
            >
              Export CSV
            </a>
            <Link
              href="/work-orders/new"
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              New work order
            </Link>
          </div>
        }
      />

      <WorkOrderSearch all={all} />
    </>
  );
}
