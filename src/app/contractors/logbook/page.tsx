import StatCard from "@/components/StatCard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { visitMethodLabel } from "@workorder/kit/contractor/contract";
import type { ContractorVisitRow } from "@/types/contractors";

export const dynamic = "force-dynamic";

type NameRow = { id: string; name?: string; full_name?: string };

function minutesOnSite(signInAt: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(signInAt).getTime()) / 60000));
}
function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  return h ? `${h}h ${mins % 60}m` : `${mins}m`;
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default async function ContractorLogbookPage() {
  const supabase = createSupabaseServerClient();

  let visits: ContractorVisitRow[] = [];
  let buildings: NameRow[] = [];
  let vendors: NameRow[] = [];
  let contractors: NameRow[] = [];
  const photoUrls: Record<string, string> = {};

  if (supabase) {
    const [v, b, ve, c] = await Promise.all([
      supabase
        .from("contractor_visits")
        .select("*")
        .is("sign_out_at", null)
        .order("sign_in_at", { ascending: false }),
      supabase.from("buildings").select("id,name"),
      supabase.from("vendors").select("id,name"),
      supabase.from("contractors").select("id,full_name"),
    ]);
    visits = (v.data ?? []) as ContractorVisitRow[];
    buildings = (b.data ?? []) as NameRow[];
    vendors = (ve.data ?? []) as NameRow[];
    contractors = (c.data ?? []) as NameRow[];

    // Verification photos live in a private bucket — mint short-lived signed URLs.
    const paths = visits.map((x) => x.photo_url).filter(Boolean) as string[];
    if (paths.length) {
      const { data: signed } = await supabase.storage
        .from("contractor-photos")
        .createSignedUrls(paths, 3600);
      (signed ?? []).forEach((s: { path?: string | null; signedUrl?: string | null }) => {
        if (s.path && s.signedUrl) photoUrls[s.path] = s.signedUrl;
      });
    }
  }

  const bName = (id: string) => buildings.find((x) => x.id === id)?.name ?? "—";
  const coName = (id?: string | null) =>
    (id && vendors.find((x) => x.id === id)?.name) || "—";
  const personName = (v: ContractorVisitRow) =>
    (v.contractor_id && contractors.find((x) => x.id === v.contractor_id)?.full_name) ||
    v.inline_name ||
    "Contractor";

  const buildingsWithPeople = new Set(visits.map((v) => v.building_id)).size;
  const longStays = visits.filter((v) => minutesOnSite(v.sign_in_at) > 180).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">On-site logbook</h1>
        <p className="mt-1 text-sm text-ink-400">
          Contractors currently signed in across your buildings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="On site now" value={visits.length} />
        <StatCard label="Buildings active" value={buildingsWithPeople} />
        <StatCard
          label="On site > 3h"
          value={longStays}
          tone={longStays ? "warn" : "default"}
          hint="not signed out"
        />
      </div>

      <div className="rounded-xl2 border bg-white">
        <div className="border-b px-4 py-3 text-sm font-medium">On site now</div>
        {visits.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-400">
            {supabase
              ? "No contractors signed in right now."
              : "Connect Supabase to see live sign-ins."}
          </div>
        ) : (
          <ul className="divide-y">
            {visits.map((v) => {
              const mins = minutesOnSite(v.sign_in_at);
              const photo = v.photo_url ? photoUrls[v.photo_url] : undefined;
              return (
                <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-xs font-semibold text-brand-800">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(personName(v))
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      {personName(v)}
                      {mins > 180 && (
                        <span className="rounded-full bg-warn/10 px-2 py-0.5 text-xs font-medium text-warn">
                          not signed out
                        </span>
                      )}
                    </div>
                    <div className="truncate text-sm text-ink-400">
                      {coName(v.company_id)} · {bName(v.building_id)}
                      {v.work_order_id ? ` · ${v.work_order_id}` : ""}
                    </div>
                  </div>
                  <div className="text-right text-xs text-ink-400">
                    <div className="text-sm font-semibold text-ink-900">{fmtDuration(mins)}</div>
                    <div>
                      in {fmtTime(v.sign_in_at)} · {visitMethodLabel(v.method)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
