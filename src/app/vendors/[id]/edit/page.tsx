"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { VENDOR_CATEGORIES } from "@/data/vendor-categories";
import type { Vendor, VendorCategory } from "@/types";

// =============================================================================
//  /vendors/[id]/edit — update or delete a vendor
// =============================================================================

const topLevel = VENDOR_CATEGORIES.filter((c) => !c.parent_id);

export default function EditVendorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state mirrors Vendor fields. We initialize once vendor loads.
  const [name, setName] = useState("");
  const [parent, setParent] = useState<string>("plumbing");
  const [sub, setSub] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpires, setLicenseExpires] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the vendor on mount via a small API call (avoids server-only db).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/vendors/${id}/lookup`);
        if (!res.ok) {
          setLoadError(`Vendor not found (${res.status})`);
          return;
        }
        const v: Vendor = await res.json();
        if (cancelled) return;
        setVendor(v);
        setName(v.name ?? "");
        // Find category's parent if it's a sub
        const c = VENDOR_CATEGORIES.find((cc) => cc.id === v.category_id);
        if (c?.parent_id) {
          setParent(c.parent_id);
          setSub(c.id);
        } else {
          setParent(v.category_id);
          setSub("");
        }
        setContactName(v.contact_name ?? "");
        setPhone(v.phone ?? "");
        setEmail(v.email ?? "");
        setAddress(v.address ?? "");
        setLicenseType(v.license_type ?? "");
        setLicenseNumber(v.license_number ?? "");
        setLicenseExpires(v.license_expires ?? "");
        setNotes(v.notes ?? "");
        setRating(v.rating ? String(v.rating) : "");
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load");
      }
    }
    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const subs: VendorCategory[] = VENDOR_CATEGORIES.filter((c) => c.parent_id === parent);
  const category_id = sub || parent;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/vendors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category_id,
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        license_type: licenseType.trim() || null,
        license_number: licenseNumber.trim() || null,
        license_expires: licenseExpires || null,
        notes: notes.trim() || null,
        rating: rating ? Number(rating) : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      setSaving(false);
      return;
    }
    router.push("/vendors");
    router.refresh();
  }

  async function onDelete() {
    if (!confirm(`Delete ${name}? This can't be undone.`)) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Delete failed");
      setDeleting(false);
      return;
    }
    router.push("/vendors");
    router.refresh();
  }

  if (loadError) {
    return (
      <>
        <PageHeader title="Vendor" />
        <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
          {loadError}{" "}
          <Link href="/vendors" className="underline">
            Back
          </Link>
        </div>
      </>
    );
  }

  if (!vendor) {
    return (
      <>
        <PageHeader title="Loading vendor…" />
        <div className="rounded-md border border-ink-200 bg-white p-4 text-sm text-ink-400">
          Loading…
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Edit vendor`}
        subtitle={vendor.name}
        actions={
          <Link
            href="/vendors"
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            ← My vendors
          </Link>
        }
      />

      <form onSubmit={submit} className="space-y-5 rounded-xl2 border border-ink-200 bg-white p-5">
        <Field label="Vendor name *">
          <input value={name} onChange={(e) => setName(e.target.value)} required className={input} />
        </Field>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Trade">
            <select value={parent} onChange={(e) => { setParent(e.target.value); setSub(""); }} className={input}>
              {topLevel.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Specialty (optional)">
            <select value={sub} onChange={(e) => setSub(e.target.value)} className={input}>
              <option value="">— (general)</option>
              {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Contact name"><input value={contactName} onChange={(e) => setContactName(e.target.value)} className={input} /></Field>
          <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className={input} /></Field>
          <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={input} /></Field>
          <Field label="Address"><input value={address} onChange={(e) => setAddress(e.target.value)} className={input} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="License type"><input value={licenseType} onChange={(e) => setLicenseType(e.target.value)} className={input} placeholder="LMP" /></Field>
          <Field label="License #"><input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className={input} /></Field>
          <Field label="Expires"><input value={licenseExpires} onChange={(e) => setLicenseExpires(e.target.value)} type="date" className={input} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={input} /></Field>
          <Field label="Rating">
            <select value={rating} onChange={(e) => setRating(e.target.value)} className={input}>
              <option value="">— not rated yet —</option>
              <option value="5">★★★★★</option>
              <option value="4">★★★★</option>
              <option value="3">★★★</option>
              <option value="2">★★</option>
              <option value="1">★</option>
            </select>
          </Field>
        </div>

        {error && (
          <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">{error}</div>
        )}

        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
              {saving ? "Saving…" : "Save changes"}
            </button>
            <Link href="/vendors" className="rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100">
              Cancel
            </Link>
          </div>
          <button type="button" onClick={onDelete} disabled={deleting} className="rounded-md border border-danger-600/40 bg-white px-4 py-2 text-sm font-medium text-danger-800 hover:bg-danger-50 disabled:opacity-60">
            {deleting ? "Deleting…" : "Delete vendor"}
          </button>
        </div>
      </form>
    </>
  );
}

const input = "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}
