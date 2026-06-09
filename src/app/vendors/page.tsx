import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { db } from "@/lib/db";

export default async function MyVendorsPage() {
  const myVendors = await db.myVendors();
  const cats = db.vendorCategories();
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));

  return (
    <>
      <PageHeader
        title="My vendors"
        subtitle="The vendors you actually use. Day 1: empty — add as you go."
        actions={
          <div className="flex gap-2">
            <Link
              href="/vendors/directory"
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              Browse directory →
            </Link>
            <Link
              href="/vendors/new"
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              + Add vendor
            </Link>
          </div>
        }
      />

      {myVendors.length === 0 ? (
        <EmptyState
          title="No vendors yet"
          message="You'll build this list as you do work. Browse the directory to find licensed NYC vendors by trade, or add one you already trust."
          cta={
            <Link
              href="/vendors/directory"
              className="inline-flex rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Find a vendor
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {myVendors.map((v) => (
            <div
              key={v.id}
              className="rounded-xl2 border border-ink-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{v.name}</div>
                  <div className="text-xs text-ink-400">
                    {catById[v.category_id]?.name}
                  </div>
                </div>
                {v.rating && (
                  <span className="text-sm text-warn-800">
                    {"★".repeat(v.rating)}
                  </span>
                )}
              </div>
              {v.phone && (
                <div className="mt-2 text-sm">📞 {v.phone}</div>
              )}
              {v.license_number && (
                <div className="mt-1 text-xs text-ink-400">
                  {v.license_type} #{v.license_number}
                </div>
              )}
              {v.notes && (
                <div className="mt-2 text-xs text-ink-600">{v.notes}</div>
              )}
              <div className="mt-3 flex justify-end">
                <Link
                  href={`/vendors/${v.id}/edit`}
                  className="rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-600 hover:bg-ink-100"
                >
                  ✎ Edit / delete
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
