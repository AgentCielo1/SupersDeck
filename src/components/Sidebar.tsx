"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV: { href: string; label: string; icon: string }[] = [
  { href: "/", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/compliance", label: "Compliance", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/lead-paint", label: "Lead paint (LL31)", icon: "M12 2L2 22h20L12 2zm0 6l6.5 11h-13L12 8z" },
  { href: "/violations", label: "HPD violations", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { href: "/work-orders", label: "Work orders", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { href: "/backlog", label: "Work Orders: Pending", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { href: "/contractors", label: "Contractors", icon: "M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2zM10 4h4v2h-4zM9 12h6m-6 4h4" },
  { href: "/buildings", label: "Buildings", icon: "M3 21h18M5 21V7l7-4 7 4v14M9 9h1m-1 4h1m-1 4h1m4-8h1m-1 4h1m-1 4h1" },
  { href: "/tenants", label: "Tenant directory", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { href: "/files", label: "Files", icon: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" },
  { href: "/vendors", label: "My vendors", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { href: "/vendors/directory", label: "Vendor directory", icon: "M3 7h18M3 12h18M3 17h18" },
  { href: "/heat-log", label: "Heat log", icon: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" },
  { href: "/certifications", label: "Certifications", icon: "M9 12l2 2 4-4m-9 9a9 9 0 1118 0 9 9 0 01-18 0z" },
  { href: "/leases", label: "Leases & CO", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/owner-report/preview", label: "Owner report", icon: "M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6m-6 0H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-4" },
];

// Admin-only nav items.
const ADMIN_NAV: { href: string; label: string; icon: string }[] = [
  { href: "/people", label: "People", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
];

const PUBLIC_PATHS = ["/login", "/auth", "/intake", "/track", "/sign-in"];

const ROLE_LABELS: Record<string, string> = {
  super: "Super",
  porter: "Porter",
  manager: "Manager",
  admin: "Admin",
  read_only: "Read only",
};

export interface SidebarUser {
  email: string;
  full_name: string | null;
  role: string;
}

export default function Sidebar({ user }: { user: SidebarUser | null }) {
  const path = usePathname();

  // Public routes (login, intake) skip the sidebar entirely.
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
    return null;
  }

  const initials = user
    ? (user.full_name || user.email).slice(0, 2).toUpperCase()
    : "??";

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-ink-200 bg-white md:flex">
      <div className="border-b border-ink-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white font-semibold">
            S
          </div>
          <div>
            <div className="text-base font-semibold leading-none">SupersDeck</div>
            <div className="text-xs text-ink-400">Building ops</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {[
          ...NAV,
          ...(user?.role === "admin" ? ADMIN_NAV : []),
        ].map((item) => {
          const active =
            item.href === "/"
              ? path === "/"
              : path === item.href || path.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand-50 text-brand-800"
                  : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
              )}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-ink-200 px-3 py-3">
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-medium text-brand-800">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-ink-900">
                {user.full_name || user.email}
              </div>
              <div className="text-[10px] text-ink-400">
                {ROLE_LABELS[user.role] ?? user.role}
              </div>
            </div>
          </div>
          <a
            href="/auth/signout"
            className="mt-1 block rounded-md px-3 py-1.5 text-xs text-ink-400 hover:bg-ink-100 hover:text-ink-900"
          >
            Sign out
          </a>
        </div>
      )}

      {!user && (
        <div className="border-t border-ink-200 px-5 py-3 text-xs text-ink-400">
          v0.3 · auth ready
        </div>
      )}
    </aside>
  );
}
