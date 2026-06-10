import PageHeader from "@/components/PageHeader";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  gatherOwnerReportData,
  buildingsByManager,
  renderOwnerReportHtml,
} from "@/lib/owner-report";

// =============================================================================
//  /owner-report/preview — what the management company will get on the 1st
// =============================================================================
//  Renders the exact HTML each manager_email will receive when the cron
//  fires (see /api/cron/owner-report). One section per manager_email,
//  rendered in a sandboxed iframe so the email's inline styling doesn't
//  bleed into the app shell.
//
//  Buildings without manager_email don't appear here — the cron skips them.
//  Set one in /buildings → Edit → Management contact.
// =============================================================================

export const dynamic = "force-dynamic";

export default async function OwnerReportPreviewPage() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return (
      <>
        <PageHeader title="Owner report preview" />
        <div className="rounded-md border border-warn-600/40 bg-warn-50 px-4 py-3 text-sm text-warn-800">
          Supabase isn't configured — the report can only render against
          live data.
        </div>
      </>
    );
  }

  const data = await gatherOwnerReportData(supabase, 30);
  const groups = buildingsByManager(data.buildings);

  return (
    <>
      <PageHeader
        title="Owner report preview"
        subtitle={`${data.periodLabel} · This is exactly what each manager will receive on the 1st of the month.`}
      />

      {groups.length === 0 ? (
        <div className="rounded-xl2 border border-warn-600/40 bg-warn-50 p-6">
          <h2 className="text-sm font-semibold text-warn-800">
            No reports would send
          </h2>
          <p className="mt-1 text-sm text-warn-800">
            None of your buildings have a <strong>Manager email</strong> set.
            The cron will skip every building until at least one is set. Go
            to <code className="rounded bg-white px-1">/buildings</code>, edit
            a building, scroll to <em>Management contact</em>, and add an
            email.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ email, buildings: bldgs }) => {
            const buildingIds = new Set(bldgs.map((b) => b.id));
            const html = renderOwnerReportHtml({
              managerName: bldgs[0].manager_name ?? null,
              periodLabel: data.periodLabel,
              buildings: bldgs,
              wos: data.wos.filter((w) => buildingIds.has(w.building_id)),
              violations: data.violations.filter((v) =>
                buildingIds.has(v.building_id)
              ),
              compliance: data.compliance.filter((c) =>
                buildingIds.has(c.building_id)
              ),
              certs: data.certs,
            });
            const subject = `SupersDeck monthly report: ${bldgs
              .map((b) => b.name)
              .join(", ")} — ${data.periodLabel}`;

            return (
              <div
                key={email}
                className="overflow-hidden rounded-xl2 border border-ink-200 bg-white"
              >
                <div className="border-b border-ink-200 bg-ink-50 px-4 py-3 text-xs">
                  <div className="font-medium text-ink-900">
                    To: <span className="font-mono">{email}</span>
                    {bldgs[0].manager_name && (
                      <span className="ml-2 text-ink-400">
                        ({bldgs[0].manager_name})
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-ink-600">
                    Subject: <span className="italic">{subject}</span>
                  </div>
                  <div className="mt-1 text-ink-400">
                    Building{bldgs.length === 1 ? "" : "s"}:{" "}
                    {bldgs.map((b) => b.name).join(", ")}
                  </div>
                </div>
                <iframe
                  srcDoc={html}
                  title={`Preview for ${email}`}
                  className="h-[700px] w-full"
                  sandbox=""
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
