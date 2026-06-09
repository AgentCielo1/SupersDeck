"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "admin", label: "Admin — full access including delete + role mgmt" },
  { value: "super", label: "Super — full access, no building delete" },
  { value: "manager", label: "Manager — full access, no delete" },
  { value: "porter", label: "Porter — read all, update work orders + heat log only" },
  { value: "read_only", label: "Read only — SELECT only" },
];

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

export default function PeopleList({
  me,
  profiles,
}: {
  me: { id: string; role: string };
  profiles: Profile[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateRole(p: Profile, newRole: string) {
    if (newRole === p.role) return;
    setBusy(p.id);
    setError(null);
    const res = await fetch(`/api/profiles/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error ?? "Update failed");
    setBusy(null);
    router.refresh();
  }

  async function remove(p: Profile) {
    if (!confirm(`Remove ${p.full_name || p.email}? They lose access immediately.`)) return;
    setBusy(p.id);
    setError(null);
    const res = await fetch(`/api/profiles/${p.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error ?? "Remove failed");
    setBusy(null);
    router.refresh();
  }

  return (
    <>
      {error && (
        <div className="mb-3 rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl2 border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-4 py-2 text-left">User</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Joined</th>
              <th className="px-4 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const isMe = p.id === me.id;
              return (
                <tr key={p.id} className="border-t border-ink-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-medium text-brand-800">
                        {(p.full_name || p.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-ink-900">
                          {p.full_name || "—"}
                          {isMe && (
                            <span className="ml-2 rounded-md border border-ink-200 bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-600">
                              you
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-ink-400">{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      onChange={(e) => updateRole(p, e.target.value)}
                      disabled={busy === p.id}
                      className="rounded-md border border-ink-200 bg-white px-2 py-1 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.value}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => remove(p)}
                        disabled={busy === p.id}
                        className="rounded-md border border-danger-600/40 bg-white px-2.5 py-1 text-xs font-medium text-danger-800 hover:bg-danger-50 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="mt-6 rounded-xl2 border border-ink-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Role meanings</h2>
        <ul className="mt-2 space-y-1 text-xs text-ink-600">
          {ROLES.map((r) => (
            <li key={r.value}>
              <span className="font-mono font-medium text-ink-900">{r.value}</span>
              {" — "}
              {r.label.split("—").slice(1).join("—").trim()}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
