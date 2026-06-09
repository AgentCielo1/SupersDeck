"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

const ROLES = [
  { value: "admin", label: "Admin — full access + role mgmt" },
  { value: "super", label: "Super — full access (no building delete)" },
  { value: "manager", label: "Manager — full access (no delete)" },
  { value: "porter", label: "Porter — update WOs + heat log only" },
  { value: "read_only", label: "Read only — SELECT only" },
];

export default function InviteUserPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("super");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, full_name: fullName, role }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(data.error ?? "Invite failed");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/people"), 1200);
  }

  return (
    <>
      <PageHeader
        title="Invite a user"
        subtitle="Sends a magic-link email. They click it, sign in, and they're on the team with the role you pick here."
        actions={
          <Link
            href="/people"
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            ← People
          </Link>
        }
      />

      {done ? (
        <div className="rounded-xl2 border border-ok-600/40 bg-ok-50 p-6 text-center">
          <div className="text-base font-semibold text-ok-800">Invite sent.</div>
          <div className="mt-1 text-sm text-ok-800">
            We sent a sign-in link to <span className="font-medium">{email}</span>.
            They show up in the People list as soon as they click it.
          </div>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl2 border border-ink-200 bg-white p-5"
        >
          <Field label="Full name (optional, prefills their profile)">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Adam Nunez"
              className={input}
            />
          </Field>
          <Field label="Email *">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="them@example.com"
              className={input}
            />
          </Field>
          <Field label="Role">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={input}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>

          {error && (
            <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send invite"}
          </button>
        </form>
      )}
    </>
  );
}

const input =
  "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}
