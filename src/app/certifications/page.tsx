import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { db } from "@/lib/db";
import { getServerSupabase } from "@/lib/supabase";
import { complianceTemplateById } from "@/data/compliance-templates";
import CertificationsClient, { type CertRow } from "./CertificationsClient";

export const dynamic = "force-dynamic";

// Where to renew, by credential. Falls back from the cert's template to a
// keyword match so imported + future-uploaded certs both get a renewal link.
const RENEW = {
  fdny: "https://fires.fdnycloud.org/CitizenAccess/Default.aspx",
  aha: "https://cpr.heart.org/en/course-catalog-search",
  sst: "https://www.nyc.gov/site/buildings/safety/sst-worker-information.page",
};
function renewUrlFor(certKey: string | null, agency: string | null, type: string, templateRenew?: string): string | null {
  if (templateRenew) return templateRenew;
  const hay = `${certKey ?? ""} ${agency ?? ""} ${type}`.toLowerCase();
  if (hay.includes("fdny")) return RENEW.fdny;
  if (/\b(aha|cpr|aed|heartsaver|american heart|bls)\b/.test(hay)) return RENEW.aha;
  if (/\bsst\b|site safety/.test(hay)) return RENEW.sst;
  return null;
}

const RECOMMENDED_FOR_SUPER = [
  "fdny-s12", "fdny-s13", "fdny-s95", "fdny-p99",
  "fdny-q99", "fdny-f80", "epa-rrp", "osha-30",
];

export default async function CertificationsPage() {
  const certs = await db.certifications();

  // Sign each cert's scanned photo (private `documents` bucket) server-side.
  const paths = certs.map((c) => c.photo_path).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length) {
    const supabase = getServerSupabase();
    if (supabase) {
      const { data } = await supabase.storage.from("documents").createSignedUrls(paths, 60 * 60);
      for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
    }
  }

  const rows: CertRow[] = certs.map((c) => {
    const t = c.cert_key ? complianceTemplateById(c.cert_key) : undefined;
    return {
      id: c.id,
      holder_name: c.holder_name,
      type: c.type,
      number: c.number ?? null,
      issued_at: c.issued_at ?? null,
      expires_at: c.expires_at ?? null,
      agency: c.agency ?? null,
      notes: c.notes ?? null,
      cert_key: c.cert_key ?? null,
      photoUrl: c.photo_path ? signed.get(c.photo_path) ?? null : null,
      renewUrl: renewUrlFor(c.cert_key ?? null, c.agency ?? null, c.type, t?.renew_url),
      infoUrl: t?.portal_url ?? null,
    };
  });

  // Expiring certs first (soonest first), then no-expiry credentials (newest first).
  const withExp = rows
    .filter((r) => r.expires_at)
    .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime());
  const noExp = rows
    .filter((r) => !r.expires_at)
    .sort((a, b) => (b.issued_at ?? "").localeCompare(a.issued_at ?? ""));
  const sorted = [...withExp, ...noExp];

  return (
    <>
      <PageHeader
        title="Certifications"
        subtitle="Track FDNY Certificates of Fitness, EPA, OSHA, and other supervisor / staff credentials — with the actual cards on file."
        actions={
          <Link href="/certifications/new" className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800">
            + Add certification
          </Link>
        }
      />

      <CertificationsClient certs={sorted} />

      <section className="mt-10">
        <h2 className="mb-2 text-base font-semibold">Recommended certs for a NYC residential super</h2>
        <p className="mb-3 text-sm text-ink-400">
          The FDNY Certificates of Fitness and federal credentials most NYC residential supers hold or oversee.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {RECOMMENDED_FOR_SUPER.map((id) => {
            const t = complianceTemplateById(id);
            if (!t) return null;
            return (
              <div key={id} className="rounded-xl2 border border-ink-200 bg-white p-4">
                <div className="font-semibold text-ink-900">{t.name}</div>
                <div className="text-xs text-ink-400">{t.agency} · {t.statute}</div>
                <p className="mt-2 text-sm text-ink-600">{t.description}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {t.renew_url && (
                    <a href={t.renew_url} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">Renew online ↗</a>
                  )}
                  {t.portal_url && (
                    <a href={t.portal_url} target="_blank" rel="noreferrer" className="text-ink-500 hover:underline">Official info ↗</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
