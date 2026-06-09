"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

// =============================================================================
//  MobileNav — fixed bottom nav for screens narrower than md (768px)
// =============================================================================
//  The desktop sidebar is `hidden md:flex`; without this component, mobile
//  users have no navigation at all. We surface the five highest-traffic
//  destinations as a thumb-friendly bottom bar.
// =============================================================================

const ITEMS = [
  { href: "/", label: "Home", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/work-orders", label: "Tickets", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { href: "/compliance", label: "Compliance", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/buildings", label: "Buildings", icon: "M3 21h18M5 21V7l7-4 7 4v14M9 9h1m-1 4h1m-1 4h1m4-8h1m-1 4h1m-1 4h1" },
  { href: "/heat-log", label: "Heat", icon: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" },
];

const PUBLIC_PATHS = ["/login", "/auth", "/intake", "/track"];

export default function MobileNav({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();

  // Hide on public routes (login, tenant intake, tenant track) and when not
  // signed in. Also hide on screens md and up — the sidebar covers those.
  if (
    !signedIn ||
    PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))
  ) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? path === "/"
              : path === item.href || path.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={clsx(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition",
                  active
                    ? "text-brand-800"
                    : "text-ink-400 hover:text-ink-900"
                )}
              >
                <svg
                  className="h-5 w-5"
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
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
