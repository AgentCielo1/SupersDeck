import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import InstallPrompt from "@/components/InstallPrompt";
import AppShell from "@/components/AppShell";
import PushManagerClient from "@/components/PushManagerClient";
import { getCurrentUserProfile } from "@/lib/supabase-server";

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

  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-50 pb-16 text-ink-900 md:pb-0">
        {/* legacy-browser-banner: warns unsupported browsers instead of failing silently */}
        <script dangerouslySetInnerHTML={{__html:"window.addEventListener('load',function(){try{if(window.Promise&&window.fetch&&window.structuredClone&&''.replaceAll&&Object.fromEntries)return}catch(e){}var d=document.createElement('div');d.setAttribute('style','position:fixed;top:0;left:0;right:0;z-index:99999;background:#101F3C;color:#fff;font:14px/1.5 Arial,sans-serif;padding:10px 16px;text-align:center');d.innerHTML='This computer&#39;s browser is out of date and this app may not work correctly. Please update Google Chrome or Microsoft Edge. Requirements: borodesk.com';document.body.appendChild(d)});"}} />
        <AppShell user={user}>{children}</AppShell>
        <Sidebar user={user} />
        <MobileNav signedIn={Boolean(user)} isAdmin={user?.role === "admin"} />
        <InstallPrompt />
        <PushManagerClient signedIn={Boolean(user)} />
      </body>
    </html>
  );
}
