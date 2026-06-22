import PageHeader from "@/components/PageHeader";
import BacklogBoard from "./BacklogBoard";
import { db } from "@/lib/db";
import { signedUrlsFor, TASK_BUCKET } from "@/lib/storage";

// =============================================================================
//  /backlog — discretionary jobs to hand handymen on slow days
// =============================================================================
//  A queue separate from Work orders (tenant tickets). Add notes + files, drop
//  them in a folder (Cabinets, Painting, …), assign when you're ready. Items
//  can sit Pending indefinitely.
// =============================================================================

export const dynamic = "force-dynamic";

export default async function BacklogPage() {
  const [tasks, buildings, vendors] = await Promise.all([
    db.tasks(),
    db.buildings(),
    db.myVendors(),
  ]);

  // Pre-sign every attachment path (1h URLs) so the client renders links.
  const allPaths = tasks.flatMap((t) => (t.files ?? []).map((f) => f.path));
  const urlByPath = await signedUrlsFor(allPaths, TASK_BUCKET);

  return (
    <>
      <PageHeader
        title="Backlog"
        subtitle="Pending jobs to hand out when it's slow. Add a note + files, drop it in a folder, assign a handyman when you're ready."
      />
      <BacklogBoard
        initialTasks={tasks}
        buildings={buildings.map((b) => ({ id: b.id, name: b.name }))}
        vendors={vendors.map((v) => ({ id: v.id, name: v.name }))}
        urlByPath={urlByPath}
      />
    </>
  );
}
