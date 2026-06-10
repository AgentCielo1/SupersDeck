"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

// =============================================================================
//  MobileNav — fixed bottom nav for screens narrower than md (768px)
// =============================================================================
//  The desktop sidebar is `hidden md:flex`; without this component, mobile
//  users have no navigation at all.
//
//  Layout: 4 highest-traffic destinations + a "More" button that opens a
//  bottom sheet listing everything else (lead-paint tracker, HPD violations,
//  vendors, certifications, People admin, sign out). Sized for thumbs.
// =============================================================================

const PRIMARY = [
  { href: "/", label: "Home", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/work-orders", label: "Tickets", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { href: "/compliance", label: "Compliance", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/buildings", label: "Buildings", icon: "M3 21h18M5 21V7l7-4 7 4v14M9 9h1m-1 4h1m-1 4h1m4-8h1m-1 4h1m-1 4h1" },
];

// Routes that live in the "More" sheet. Order matters — same as desktop
// sidebar where possible so the mental model stays consistent.
const MORE = [
  { href: "/lead-paint", label: "Lead paint (LL31)", icon: "M12 2L2 22h20L12 2zm0 6l6.5 11h-13L12 8z" },
  { href: "/violations", label: "HPD violations", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { href: "/heat-log", label: "Heat log", icon: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" },
  { href: "/leases", label: "Leases & CO", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/owner-report/preview", label: "Owner report", icon: "M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6m-6 0H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-4" },
  { href: "/vendors", label: "My vendors", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { href: "/vendors/directory", label: "Vendor directory", icon: "M3 7h18M3 12h18M3 17h18" },
  { href: "/certifications", label: "Certifications", icon: "M9 12l2 2 4-4m-9 9a9 9 0 1118 0 9 9 0 01-18 0z" },
];

const ADMIN_MORE = [
  { href: "/people", label: "People", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
];

const PUBLIC_PATHS = ["/login", "/auth", "/intake", "/track"];

export default function MobileNav({
  signedIn,
  isAdmin = false,
}: {
  signedIn: boolean;
  isAdmin?: boolean;
}) {
  const path = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (
    !signedIn ||
    PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))
  ) {
    return null;
  }

  const moreItems = isAdmin ? [...MORE, ...ADMIN_MORE] : MORE;

  // Highlight the More button if any route in the sheet is currently active.
  const moreActive = moreItems.some(
    (item) => path === item.href || path.startsWith(item.href + "/")
  );

  return (
    <>
      {/* Bottom-sheet overlay */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSheetOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Bottom sheet */}
      <div
        className={clsx(
          "fixed inset-x-0 bottom-0 z-50 transform border-t border-ink-200 bg-white shadow-2xl transition-transform duration-200 md:hidden",
          sheetOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        role="dialog"
        aria-label="More navigation"
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2">
          <span className="text-sm font-semibold text-ink-900">More</span>
          <button
            onClick={() => setSheetOpen(false)}
            className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-900"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto px-2 py-2">
          {moreItems.map((item) => {
            const active =
              path === item.href || path.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSheetOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium",
                    active
                      ? "bg-brand-50 text-brand-800"
                      : "text-ink-900 hover:bg-ink-100"
                  )}
                >
                  <svg
                    className="h-5 w-5 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="mt-2 border-t border-ink-100 pt-2">
            <a
              href="/auth/signout"
              onClick={() => setSheetOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              <svg
                className="h-5 w-5 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </a>
          </li>
        </ul>
      </div>

      {/* Bottom nav itself */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="grid grid-cols-5">
          {PRIMARY.map((item) => {
            const active =
              item.href === "/"
                ? path === "/"
                : path === item.href || path.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSheetOpen(false)}
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
          <li>
            <button
              onClick={() => setSheetOpen((v) => !v)}
              className={clsx(
                "flex w-full flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition",
                moreActive || sheetOpen
                  ? "text-brand-800"
                  : "text-ink-400 hover:text-ink-900"
              )}
              aria-expanded={sheetOpen}
              aria-label="More"
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
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
