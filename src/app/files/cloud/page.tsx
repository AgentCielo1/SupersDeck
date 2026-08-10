import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import CloudBrowser from "@/components/cloud/CloudBrowser";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { CLOUD_ACCESS, type Role } from "@/lib/authz";

// =============================================================================
//  /files/cloud — the org's connected cloud drive (Dropbox), browsed live
// =============================================================================
//  Optional feature: files stay in the cloud account, stream on view, and the
//  gallery viewer scrolls through a whole folder without re-opening files.
//
//  Gated to CLOUD_ACCESS (admin/super/manager). The API routes enforce this
//  independently — this check exists so a porter gets a sentence instead of a
//  browser that answers 403 to everything. Never rely on the page check alone.
// =============================================================================

export const dynamic = "force-dynamic";

export default async function CloudFilesPage() {
  const me = await getCurrentUserProfile();
  if (!me) redirect("/login");
  if (!CLOUD_ACCESS.includes(me.role as Role)) {
    return (
      <>
        <PageHeader title="Cloud drive" subtitle="Connected Dropbox" />
        <EmptyState
          title="Not available for your role"
          message={`You're signed in as "${me.role}". The cloud drive holds tenant records, so it's limited to admins, supers, and managers. Ask an admin if you need a document from it.`}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Cloud drive"
        subtitle="Browse the connected Dropbox — view photos, PDFs, and Office docs in-app; nothing is downloaded to the device."
        actions={
          <Link
            href="/files"
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            🗄 App repository
          </Link>
        }
      />
      <CloudBrowser />
    </>
  );
}
