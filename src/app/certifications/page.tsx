import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { db } from "@/lib/db";
import { complianceTemplateById } from "@/data/compliance-templates";

const RECOMMENDED_FOR_SUPER = [
  "fdny-s12",
  "fdny-s13",
  "fdny-s95",
  "fdny-p99",
  "fdny-q99",
  "fdny-f80",
  "epa-rrp",
  "osha-30",
];

export default async function CertificationsPage() {
  const certs = await db.certifications();

  return (
    <>
      <PageHeader
        title="Certifications"
        subtitle="Track FDNY Certificates of Fitness, EPA RRP, OSHA, and other supervisor / staff credentials."
        actions={
          <Link
            href="/certifications/new"
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            + Add certification
          </Link>
        }
      />

      {certs.length === 0 ? (
        <EmptyState
          title="No certifications added yet"
          message="Add your own and your staff's certs so you get a heads-up before any expire."
          cta={
            <Link
              href="/certifications/new"
              className="inline-flex rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              + Add certification
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {certs.map((c) => (
            <div key={c.id} className="rounded-xl2 border border-ink-200 bg-white p-4">
              <div className="font-semibold">{c.type}</div>
              <div className="text-xs text-ink-400">
                {c.holder_name} · #{c.number}
              </div>
              <div className="mt-2 text-sm">
                Expires {new Date(c.expires_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-2 text-base font-semibold">
          Recommended certs for a NYC residential super
        </h2>
        <p className="mb-3 text-sm text-ink-400">
          These are the FDNY Certificates of Fitness and federal credentials
          most NYC residential supers either hold or oversee. Click any item to
          see the controlling rule.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {RECOMMENDED_FOR_SUPER.map((id) => {
            const t = complianceTemplateById(id);
            if (!t) return null;
            return (
              <div
                key={id}
                className="rounded-xl2 border border-ink-200 bg-white p-4"
              >
                <div className="font-semibold text-ink-900">{t.name}</div>
                <div className="text-xs text-ink-400">
                  {t.agency} · {t.statute}
                </div>
                <p className="mt-2 text-sm text-ink-600">{t.description}</p>
                {t.portal_url && (
                  <a
                    href={t.portal_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-brand-600 hover:underline"
                  >
                    Apply / renew at official site ↗
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
