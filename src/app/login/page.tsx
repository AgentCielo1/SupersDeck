"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// =============================================================================
//  /login — email/password OR magic link
// =============================================================================
//  Two paths:
//    1. Email + password — works without SMTP (admin sets password via SQL or
//       the Supabase user editor). Recommended while SMTP is being configured.
//    2. Magic link — passwordless; requires working SMTP.
// =============================================================================

type Mode = "password" | "magic";

export default function LoginPage() {
  const supabase = getBrowserSupabase();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setBusy(false);
      if (error) {
        setError(error.message);
        return;
      }
      // Redirect back to wherever middleware tried to send us, or /.
      const params = new URLSearchParams(window.location.search);
      router.push(params.get("next") || "/");
      router.refresh();
      return;
    }

    // magic link
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMagicSent(true);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="rounded-xl2 border border-ink-200 bg-white p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 text-base font-semibold text-white">
            S
          </div>
          <div>
            <div className="text-base font-semibold leading-none">SupersDeck</div>
            <div className="text-xs text-ink-400">Building ops</div>
          </div>
        </div>

        {magicSent ? (
          <div>
            <h1 className="text-lg font-semibold">Check your email.</h1>
            <p className="mt-2 text-sm text-ink-600">
              We sent a sign-in link to <span className="font-medium">{email}</span>.
              Open it on the device you want to sign in on. The link works once
              and expires in an hour.
            </p>
            <button
              type="button"
              onClick={() => {
                setMagicSent(false);
                setEmail("");
              }}
              className="mt-4 text-xs text-brand-600 hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold">Sign in</h1>

            {/* Mode toggle */}
            <div className="mt-4 inline-flex rounded-md border border-ink-200 bg-ink-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode("password")}
                className={`rounded px-3 py-1.5 font-medium ${
                  mode === "password"
                    ? "bg-white text-ink-900 shadow-sm"
                    : "text-ink-400 hover:text-ink-600"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setMode("magic")}
                className={`rounded px-3 py-1.5 font-medium ${
                  mode === "magic"
                    ? "bg-white text-ink-900 shadow-sm"
                    : "text-ink-400 hover:text-ink-600"
                }`}
              >
                Magic link
              </button>
            </div>

            <form onSubmit={submit} className="mt-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-600">
                  Email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>

              {mode === "password" && (
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-medium text-ink-600">
                    Password
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </label>
              )}

              {error && (
                <div className="mt-3 rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !email.trim() || (mode === "password" && !password)}
                className="mt-4 w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {busy
                  ? mode === "password"
                    ? "Signing in…"
                    : "Sending link…"
                  : mode === "password"
                  ? "Sign in"
                  : "Send sign-in link"}
              </button>

              <p className="mt-4 text-xs text-ink-400">
                {mode === "password"
                  ? "Don't have a password yet? Ask an admin to set one for you (or use a magic link)."
                  : "First time? An admin needs to add your email in Supabase first. Once they do, enter the same email here."}
              </p>
            </form>
          </>
        )}

        <div className="mt-6 border-t border-ink-200 pt-4 text-center text-xs text-ink-400">
          <a href="/privacy" className="hover:text-brand-600 hover:underline">
            Privacy Policy
          </a>
          <span className="mx-2">·</span>
          <a href="/terms" className="hover:text-brand-600 hover:underline">
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}
