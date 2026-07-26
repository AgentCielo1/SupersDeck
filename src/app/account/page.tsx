import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import ChangePassword from "@/components/ChangePassword";

// =============================================================================
//  /account — the signed-in user's self-service home (Production Standard §2.5d)
// =============================================================================
//  A discoverable place (linked from the sidebar and the mobile "More" sheet)
//  where a super manages their own credentials in-app instead of asking an
//  admin or waiting on a reset email. Auth-gated: signed-out users bounce to
//  /login.
// =============================================================================

export const metadata: Metadata = { title: "Account · SupersDeck" };

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  super: "Superintendent",
  viewer: "Viewer",
};

export default async function AccountPage() {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24 md:px-8 md:pb-8">
      <h1 className="text-xl font-semibold text-ink-900">Account</h1>
      <p className="mt-1 text-sm text-ink-600">Manage your sign-in and profile.</p>

      {/* Identity */}
      <section className="mt-5 rounded-xl2 border border-ink-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">Signed in as</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Name</dt>
            <dd className="text-ink-900">{me.full_name || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Email</dt>
            <dd className="truncate text-ink-900">{me.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Role</dt>
            <dd className="text-ink-900">{ROLE_LABELS[me.role] ?? me.role}</dd>
          </div>
        </dl>
      </section>

      {/* Security — self-service password change */}
      <section className="mt-4 rounded-xl2 border border-ink-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">Password</h2>
        <p className="mt-1 mb-3 text-xs text-ink-600">
          Choose a new password for this account. You stay signed in on this device.
        </p>
        <ChangePassword />
      </section>

      {/* Sign out */}
      <section className="mt-4 rounded-xl2 border border-ink-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">Session</h2>
        <a
          href="/auth/signout"
          className="mt-3 inline-block rounded-md border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100"
        >
          Sign out
        </a>
      </section>
    </div>
  );
}
