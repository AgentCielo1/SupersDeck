"use client";

import { usePathname } from "next/navigation";
import type { SidebarUser } from "@/components/Sidebar";

// =============================================================================
//  AppShell — wraps the main content area, hiding the sidebar margin on
//  public pages (login, auth callbacks, tenant intake).
// =============================================================================

const PUBLIC_PATHS = ["/login", "/auth", "/intake", "/track"];

export default function AppShell({
  user,
  children,
}: {
  user: SidebarUser | null;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(p + "/")
  );

  return (
    <div className="flex min-h-screen">
      <main className={isPublic ? "flex-1" : "flex-1 md:ml-60"}>
        <div
          className={
            isPublic
              ? "min-h-screen"
              : "mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8"
          }
        >
          {children}
        </div>
      </main>
    </div>
  );
}
