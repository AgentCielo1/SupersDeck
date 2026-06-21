import Link from "next/link";
import StatCard from "@/components/StatCard";
import { getServerSupabase } from "@/lib/supabase";
import {
  coiStatus,
  complianceStatusLabel,
  type ComplianceDocument,
  type ComplianceStatus,
} from "@workorder/kit/contractor/contract";
import type { ComplianceDocumentRow } from "@/types/contractors";

export const dynamic = "force-dynamic";

type Vendor = { id: string; name: string };

function rowToDoc(d: ComplianceDocumentRow): ComplianceDocument {
  return {
    docType: d.doc_type,
    expiryDate: d.expiry_date ?? undefined,
    glPerOccurrence: d.gl_per_occurrence ?? undefined,
    glAggregate: d.gl_aggregate ?? undefined,
  };
}

const STATUS_TONE: Record<ComplianceStatus, string> = {
  compliant: "bg-ok/10 text-ok",
  expiring: "bg-warn/10 text-warn",
  expired: "bg-danger/10 text-danger",
  missing: "bg-ink-100 text-ink-500",
};

export default async function ContractorsPage() {
  const supabase = getServerSupabase();

  let vendors: Vendor[] = [];
  let docs: ComplianceDocumentRow[] = [];

  if (supabase) {
    const [v, d] = await Promise.all([
      supabase.from("vendors").select("id,name").order("name"),
      supabase.from("compliance_documents").select("*"),
    ]);
    vendors = (v.data ?? []) as Vendor[];
    docs = (d.data ?? []) as ComplianceDocumentRow[];
  }

  const byCompany = vendors
    .map((vendor) => {
      const companyDocs = docs.filter((d) => d.company_id === vendor.id);
      const status = companyDocs.length
        ? coiStatus(companyDocs.map(rowToDoc))
        : ("missing" as ComplianceStatus);
      const gl = companyDocs.find((d) => d.doc_type === "gl_coi");
      return { vendor, status, glExpiry: gl?.expiry_date ?? null };
    })
    .sort((a, b) => {
      const order: Record<ComplianceStatus, number> = {
        expired: 0,
        missing: 1,
        expiring: 2,
        compliant: 3,
      };
      return order[a.status] - order[b.status];
    });

  const counts = {
    expired: byCompany.filter((c) => c.status === "expired").length,
    expiring: byCompany.filter((c) => c.status === "expiring").length,
    missing: byCompany.filter((c) => c.status === "missing").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contractor compliance</h1>
          <p className="mt-1 text-sm text-ink-400">
            Insurance status by company.{" "}
            <Link href="/contractors/logbook" className="text-brand underline">
              See who&apos;s on site →
            </Link>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Expired COI" value={counts.expired} tone={counts.expired ? "danger" : "default"} />
        <StatCard label="Expiring ≤30d" value={counts.expiring} tone={counts.expiring ? "warn" : "default"} />
        <StatCard label="No COI on file" value={counts.missing} />
      </div>

      <div className="rounded-xl2 border bg-white">
        <div className="border-b px-4 py-3 text-sm font-medium">Companies</div>
        {byCompany.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-400">
            {supabase ? "No vendors yet." : "Connect Supabase to track compliance."}
          </div>
        ) : (
          <ul className="divide-y">
            {byCompany.map(({ vendor, status, glExpiry }) => (
              <li key={vendor.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{vendor.name}</div>
                  <div className="text-sm text-ink-400">
                    {glExpiry ? `GL expires ${glExpiry}` : "No general-liability COI on file"}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[status]}`}
                >
                  {complianceStatusLabel(status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
