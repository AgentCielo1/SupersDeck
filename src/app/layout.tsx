import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import InstallPrompt from "@/components/InstallPrompt";
import AppShell from "@/components/AppShell";
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
        <AppShell user={user}>{children}</AppShell>
        <Sidebar user={user} />
        <MobileNav signedIn={Boolean(user)} />
        <InstallPrompt />
      </body>
    </html>
  );
}
