"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type DirRow = {
  id: string;
  buildingId: string;
  building: string;
  apt: string;
  tenant: string | null;
  phone: string | null;
  leaseEnd: string | null;
  occupied: boolean;
};
type Ref = { id: string; name: string };

function aptKey(label: string): [number, string] {
  const m = label.match(/^(\d+)\s*(.*)$/);
  return m ? [parseInt(m[1], 10), m[2]] : [9999, label];
}

const inputCls =
  "w-full rounded-md border border-ink-200 px-2 py-1 text-sm focus:border-brand-400 focus:outline-none";

export default function TenantDirectory({
  rows,
  buildings,
}: {
  rows: DirRow[];
  buildings: Ref[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ tenant: "", phone: "", occupied: false, leaseEnd: "" });

  const [adding, setAdding] = useState(false);
  const blankAdd = { buildingId: buildings[0]?.id ?? "", apt: "", tenant: "", phone: "" };
  const [add, setAdd] = useState(blankAdd);

  function startEdit(r: DirRow) {
    setErr("");
    setEditId(r.id);
    setDraft({ tenant: r.tenant ?? "", phone: r.phone ?? "", occupied: r.occupied, leaseEnd: r.leaseEnd ?? "" });
  }

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `${method} failed`);
      }
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    const ok = await call(`/api/units/${id}`, "PATCH", {
      tenant_name: draft.tenant.trim() || null,
      tenant_phone: draft.phone.trim() || null,
      occupied: draft.occupied,
      lease_end: draft.leaseEnd || null,
    });
    if (ok) {
      setEditId(null);
      router.refresh();
    }
  }

  async function vacate(r: DirRow) {
    if (!confirm(`Vacate ${r.building} ${r.apt}? Clears the tenant + marks it vacant.`)) return;
    if (await call(`/api/units/${r.id}`, "PATCH", { tenant_name: null, tenant_phone: null, occupied: false }))
      router.refresh();
  }

  async function del(r: DirRow) {
    if (!confirm(`Delete apartment ${r.building} ${r.apt} entirely? (Use Vacate if it just turned over.)`)) return;
    if (await call(`/api/units/${r.id}`, "DELETE")) router.refresh();
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call("/api/units", "POST", {
      building_id: add.buildingId,
      label: add.apt.trim(),
      tenant_name: add.tenant.trim() || null,
      tenant_phone: add.phone.trim() || null,
    });
    if (ok) {
      setAdding(false);
      setAdd(blankAdd);
      router.refresh();
    }
  }

  const indexed = useMemo(
    () =>
      rows
        .map((r) => ({ r, s: `${r.building} ${r.apt} ${r.tenant ?? ""} ${r.phone ?? ""}`.toLowerCase() }))
        .sort((a, b) => {
          if (a.r.building !== b.r.building) return a.r.building.localeCompare(b.r.building);
          const [af, al] = aptKey(a.r.apt);
          const [bf, bl] = aptKey(b.r.apt);
          return af - bf || al.localeCompare(bl);
        }),
    [rows]
  );
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = words.length ? indexed.filter(({ s }) => words.every((w) => s.includes(w))) : indexed;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a name, or a building + apartment (e.g. “Building 1 5B” or “Watson”)"
          className="min-w-[260px] flex-1 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="button"
          onClick={() => { setAdding((v) => !v); setErr(""); }}
          className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          + Add apartment
        </button>
        <span className="text-xs text-ink-400">{matches.length} of {rows.length}</span>
      </div>

      {adding && (
        <form onSubmit={submitAdd} className="flex flex-wrap items-end gap-2 rounded-xl2 border border-ink-200 bg-ink-50 p-3">
          <label className="text-xs text-ink-500">
            <span className="mb-1 block">Building</span>
            <select value={add.buildingId} onChange={(e) => setAdd({ ...add, buildingId: e.target.value })} className="rounded-md border border-ink-200 px-2 py-1.5 text-sm">
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-ink-500"><span className="mb-1 block">Apartment</span>
            <input value={add.apt} onChange={(e) => setAdd({ ...add, apt: e.target.value })} placeholder="5B" className="w-24 rounded-md border border-ink-200 px-2 py-1.5 text-sm" /></label>
          <label className="text-xs text-ink-500"><span className="mb-1 block">Tenant (optional)</span>
            <input value={add.tenant} onChange={(e) => setAdd({ ...add, tenant: e.target.value })} className="rounded-md border border-ink-200 px-2 py-1.5 text-sm" /></label>
          <label className="text-xs text-ink-500"><span className="mb-1 block">Phone (optional)</span>
            <input value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} className="rounded-md border border-ink-200 px-2 py-1.5 text-sm" /></label>
          <button type="submit" disabled={busy || !add.apt.trim()} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Add</button>
          <button type="button" onClick={() => setAdding(false)} className="px-2 py-1.5 text-sm text-ink-400">Cancel</button>
        </form>
      )}
      {err && <p className="text-xs text-danger-800">{err}</p>}

      <div className="overflow-hidden rounded-xl2 border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-3 py-2">Building</th>
              <th className="px-3 py-2">Apt</th>
              <th className="px-3 py-2">Tenant</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Lease ends</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-ink-400">No matches.</td></tr>
            )}
            {matches.map(({ r }) =>
              editId === r.id ? (
                <tr key={r.id} className="border-b border-ink-100 bg-brand-50/40 align-middle last:border-0">
                  <td className="px-3 py-2 text-xs text-ink-600">{r.building}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.apt}</td>
                  <td className="px-3 py-2"><input autoFocus value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant name" className={inputCls} /></td>
                  <td className="px-3 py-2"><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="Phone" className={inputCls} /></td>
                  <td className="px-3 py-2">
                    <input type="date" value={draft.leaseEnd} onChange={(e) => setDraft({ ...draft, leaseEnd: e.target.value })} className={inputCls} />
                    <label className="mt-1 flex items-center gap-1 text-xs text-ink-500"><input type="checkbox" checked={draft.occupied} onChange={(e) => setDraft({ ...draft, occupied: e.target.checked })} /> occupied</label>
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    <button type="button" onClick={() => saveEdit(r.id)} disabled={busy} className="rounded-md bg-brand-600 px-2 py-1 font-medium text-white disabled:opacity-50">Save</button>
                    <button type="button" onClick={() => setEditId(null)} className="ml-2 text-ink-400">Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={r.id} className="border-b border-ink-100 align-middle last:border-0 hover:bg-ink-50/50">
                  <td className="px-3 py-2 text-xs text-ink-600">{r.building}</td>
                  <td className="px-3 py-2 font-mono text-xs font-medium text-ink-900">{r.apt}</td>
                  <td className="px-3 py-2 text-ink-900">{r.tenant ?? <span className="text-ink-300">{r.occupied ? "(occupied)" : "(vacant)"}</span>}</td>
                  <td className="px-3 py-2 text-xs">{r.phone ? <a href={`tel:${r.phone}`} className="text-brand hover:underline">{r.phone}</a> : <span className="text-ink-300">—</span>}</td>
                  <td className="px-3 py-2 text-xs text-ink-600">{r.leaseEnd ? new Date(r.leaseEnd).toLocaleDateString() : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs">
                    <button type="button" onClick={() => startEdit(r)} className="text-brand hover:underline">Edit</button>
                    {(r.tenant || r.occupied) && (
                      <button type="button" onClick={() => vacate(r)} disabled={busy} className="ml-3 text-ink-400 hover:text-warn-800">Vacate</button>
                    )}
                    <button type="button" onClick={() => del(r)} disabled={busy} className="ml-3 text-ink-400 hover:text-danger-800">Delete</button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
