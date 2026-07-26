"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// =============================================================================
//  ChangePassword — in-app self-service password change (Production Standard
//  §2.5c). The signed-in session already proves identity, so we call
//  supabase.auth.updateUser({ password }) directly — same primitive as the
//  post-reset-link /reset-password page, just reachable from /account.
// =============================================================================

export default function ChangePassword() {
  const supabase = getBrowserSupabase();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don’t match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    setDone(true);
  }

  const inputCls =
    "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-600">New password</span>
        <input
          type={show ? "text" : "password"}
          required
          minLength={8}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setDone(false);
          }}
          autoComplete="new-password"
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-600">Confirm new password</span>
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

      <label className="flex items-center gap-2 text-xs text-ink-600">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        Show password
      </label>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-700" role="status">
          Password updated. Use it next time you sign in.
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
