"use client";

import { useState } from "react";
import { clearOffline } from "@/lib/offline-files";

// =============================================================================
//  SignOutLink — sign out AND purge what's cached on this device
// =============================================================================
//  /auth/signout is a server route: it can clear the Supabase session cookie,
//  but it cannot touch IndexedDB, which is where "Make available offline"
//  stores document blobs (leases, notices, tenant correspondence). Before this
//  component, those survived sign-out — on a shared or lost phone the next
//  person to open the app still had them.
//
//  So the purge has to happen client-side, before we hand off to the server
//  route. It is best-effort by design: clearOffline() never throws, and if it
//  somehow stalls we still sign the user out rather than trapping them in a
//  session they asked to end. The server route remains the source of truth for
//  the session itself.
// =============================================================================

export default function SignOutLink({
  className,
  children,
}: {
  className?: string;
  /** Custom label/markup (the mobile sheet puts an icon beside the text).
   *  Omit for the plain "Sign out" label the sidebar and account page use. */
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  async function handle(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    await clearOffline();
    // Full navigation, not a router push: the server route sets cookies and
    // redirects, and we want the whole app state torn down with it.
    window.location.href = "/auth/signout";
  }

  return (
    <a href="/auth/signout" onClick={handle} className={className}>
      {children ?? (busy ? "Signing out…" : "Sign out")}
    </a>
  );
}
