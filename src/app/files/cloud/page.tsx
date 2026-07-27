import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import CloudBrowser from "@/components/cloud/CloudBrowser";

// =============================================================================
//  /files/cloud — the org's connected cloud drive (Dropbox), browsed live
// =============================================================================
//  Optional feature: files stay in the cloud account, stream on view, and the
//  gallery viewer scrolls through a whole folder without re-opening files.
// =============================================================================

export const dynamic = "force-dynamic";

export default function CloudFilesPage() {
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
