import PageHeader from "@/components/PageHeader";
import { db } from "@/lib/db";

export default function VendorDirectoryPage() {
  const cats = db.vendorCategories();
  const sources = db.vendorDiscoverySources();
  const topLevel = cats.filter((c) => !c.parent_id);

  return (
    <>
      <PageHeader
        title="Vendor directory"
        subtitle="Every trade a NYC residential super needs. Click out to official city lookups to find licensed vendors near you."
      />

      <div className="mb-6 rounded-xl2 border border-brand-400/30 bg-brand-50 p-4 text-sm text-brand-800">
        <div className="font-semibold">How this works</div>
        <p className="mt-1">
          The directory categorizes every trade you'll need. To find actual
          licensed vendors, use the <strong>official city lookups</strong>{" "}
          below — DOB for plumbers/electricians, FDNY for fire-safety
          contractors, DEP for backflow, etc. Add vendors you trust to{" "}
          <em>My vendors</em> as you go so they're one tap away next time.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">
          Official city licensee lookups
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sources.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl2 border border-ink-200 bg-white p-4 transition hover:border-brand-400/50 hover:bg-brand-50/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-ink-900">{s.name}</div>
                  <div className="text-xs text-ink-400">{s.agency}</div>
                </div>
                <span className="text-brand-600">↗</span>
              </div>
              <p className="mt-2 text-sm text-ink-600">{s.description}</p>
            </a>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">All trades</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {topLevel.map((parent) => {
            const subs = cats.filter((c) => c.parent_id === parent.id);
            return (
              <div
                key={parent.id}
                className="rounded-xl2 border border-ink-200 bg-white p-4"
              >
                <div className="font-semibold text-ink-900">{parent.name}</div>
                {subs.length > 0 && (
                  <ul className="mt-2 grid grid-cols-1 gap-1 text-sm text-ink-600">
                    {subs.map((s) => (
                      <li key={s.id} className="flex items-center gap-2">
                        <span className="text-ink-400">·</span>
                        {s.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
