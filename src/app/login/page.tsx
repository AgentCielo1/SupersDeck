"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// =============================================================================
//  /login — email/password, magic link, or password reset
// =============================================================================
//  Paths:
//    1. Email + password (with show/hide toggle + "Forgot password").
//    2. Magic link — passwordless.
//    3. Forgot password — emails a reset link → /reset-password.
//  Surfaces ?error= from /auth/callback so an expired link is never silent.
// =============================================================================

type Mode = "password" | "magic";

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function LoginPage() {
  const supabase = getBrowserSupabase();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Surface callback errors (expired/invalid link) instead of failing silently.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("error");
    if (p) {
      setError(
        p === "missing_code"
          ? "That link was invalid or expired. Request a new one below."
          : decodeURIComponent(p),
      );
    }
  }, []);

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
      const params = new URLSearchParams(window.location.search);
      router.push(params.get("next") || "/");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMagicSent(true);
  }

  async function forgotPassword() {
    if (!email.trim()) {
      setError("Enter your email first, then tap “Forgot password”.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResetSent(true);
  }

  const inputCls =
    "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

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

        {magicSent || resetSent ? (
          <div>
            <h1 className="text-lg font-semibold">Check your email.</h1>
            <p className="mt-2 text-sm text-ink-600">
              {resetSent
                ? "We sent a password-reset link to "
                : "We sent a sign-in link to "}
              <span className="font-medium">{email}</span>. Open it on this
              device. The link works once and expires in an hour.
            </p>
            <button
              type="button"
              onClick={() => {
                setMagicSent(false);
                setResetSent(false);
              }}
              className="mt-4 text-xs text-brand-600 hover:underline"
            >
              Back to sign in
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
                  className={inputCls}
                />
              </label>

              {mode === "password" && (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="block text-xs font-medium text-ink-600">
                      Password
                    </span>
                    <button
                      type="button"
                      onClick={forgotPassword}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      tabIndex={-1}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                    >
                      <EyeIcon off={showPw} />
                    </button>
                  </div>
                </div>
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
                  ? "No password yet? Use a magic link, or tap “Forgot password” to set one."
                  : "Enter your email and we’ll send a one-tap sign-in link."}
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
