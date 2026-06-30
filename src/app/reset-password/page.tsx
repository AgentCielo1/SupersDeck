"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// =============================================================================
//  /reset-password — set a new password
// =============================================================================
//  Reached after a password-reset email link runs through /auth/callback
//  (which establishes a session). The user picks a new password here.
// =============================================================================

export default function ResetPasswordPage() {
  const supabase = getBrowserSupabase();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don’t match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  const inputCls =
    "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="rounded-xl2 border border-ink-200 bg-white p-6">
        <h1 className="text-lg font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-ink-600">Choose a new password for your account.</p>

        <form onSubmit={submit} className="mt-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">New password</span>
            <input
              type={show ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
            />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Confirm password</span>
            <input
              type={show ? "text" : "password"}
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
            />
          </label>

          <label className="mt-2 flex items-center gap-2 text-xs text-ink-600">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            Show password
          </label>

          {error && (
            <div className="mt-3 rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
