import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import InstallPrompt from "@/components/InstallPrompt";
import AppShell from "@/components/AppShell";
import PushManagerClient from "@/components/PushManagerClient";
import Footer from "@/components/Footer";
import ActiveAlertsBanner from "@/components/ActiveAlertsBanner";
import AlertsUnavailableNotice from "@/components/AlertsUnavailableNotice";
import EmergencyOverlay from "@/components/EmergencyOverlay";
import ConsentModal from "@/components/ConsentModal";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { getAlertsLayerData, type AlertsLayerData } from "@/lib/alerts-layer";

export const metadata: Metadata = {
  title: "SupersDeck",
  description:
    "Compliance, work orders, and vendor management for residential building superintendents.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1a3a8c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch the user once per request and pass it down. AppShell decides
  // whether to render the sidebar + adjust the main padding based on the
  // current pathname (public routes like /login skip the chrome).
  const user = await getCurrentUserProfile().catch(() => null);

  // Always-on alerts layer (banner + emergency overlay) for signed-in users.
  // A thrown read is NOT "no alerts" — it is an unknown emergency state, and
  // it renders as its own notice. Swallowing it here to an empty layer is how
  // a live Tier-1 emergency used to render as a calm app (BUG-001 shape).
  const layer: AlertsLayerData = user
    ? await getAlertsLayerData(user.id, user.org_id).catch((e) => ({
        ok: false as const,
        failure: {
          kind: "unexpected" as const,
          detail: e instanceof Error ? e.message : String(e),
        },
      }))
    : { ok: true, banner: [], overlay: [] };

  // First-login consent gate: shown once the migration has added the column
  // (=== null) and the user hasn't chosen yet. Pre-migration the field is
  // absent (undefined) so the modal stays hidden.
  const needsConsent = Boolean(user) && user?.notification_consented_at === null;

  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-50 pb-16 text-ink-900 md:pb-0">
        {/* legacy-browser-banner: warns unsupported browsers instead of failing silently */}
        <script dangerouslySetInnerHTML={{__html:"window.addEventListener('load',function(){try{if(window.Promise&&window.fetch&&window.structuredClone&&''.replaceAll&&Object.fromEntries)return}catch(e){}var d=document.createElement('div');d.setAttribute('style','position:fixed;top:0;left:0;right:0;z-index:99999;background:#101F3C;color:#fff;font:14px/1.5 Arial,sans-serif;padding:10px 16px;text-align:center');d.innerHTML='This computer&#39;s browser is out of date and this app may not work correctly. Please update Google Chrome or Microsoft Edge. Requirements: borodesk.com';document.body.appendChild(d)});"}} />
        <AppShell user={user}>
          {user && !layer.ok && (
            <AlertsUnavailableNotice failure={layer.failure} />
          )}
          {user && layer.ok && layer.banner.length > 0 && (
            <ActiveAlertsBanner alerts={layer.banner} userRole={user.role} />
          )}
          {children}
          <Footer />
        </AppShell>
        <Sidebar user={user} />
        <MobileNav signedIn={Boolean(user)} isAdmin={user?.role === "admin"} />
        <InstallPrompt />
        <PushManagerClient signedIn={Boolean(user)} />
        {user && <ConsentModal open={needsConsent} />}
        {user && layer.ok && layer.overlay.length > 0 && (
          <EmergencyOverlay alerts={layer.overlay} />
        )}
      </body>
    </html>
  );
}
