"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { VENDOR_CATEGORIES } from "@/data/vendor-categories";

// =============================================================================
//  Add a vendor to My Vendors
// =============================================================================
//  Two-level category picker (top-level + sub) makes finding the right bucket
//  easier than a 68-row flat dropdown.
// =============================================================================

const topLevel = VENDOR_CATEGORIES.filter((c) => !c.parent_id);

export default function NewVendorPage() {
  const router = useRouter();
  const [parent, setParent] = useState<string>("plumbing");
  const [sub, setSub] = useState<string>("");
  const subs = VENDOR_CATEGORIES.filter((c) => c.parent_id === parent);
  const category_id = sub || parent;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      category_id,
      contact_name: fd.get("contact_name"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      address: fd.get("address"),
      license_type: fd.get("license_type"),
      license_number: fd.get("license_number"),
      license_expires: fd.get("license_expires") || null,
      notes: fd.get("notes"),
      rating: fd.get("rating") ? Number(fd.get("rating")) : null,
      in_my_vendors: true,
    };
    const res = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  return (
    <>
      <PageHeader
        title="Add a vendor"
        subtitle="A vendor you actually use. Goes straight to My Vendors."
        actions={
          <Link
            href="/vendors"
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            ← My vendors
          </Link>
        }
      />

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-xl2 border border-ink-200 bg-white p-5"
      >
        <Field label="Vendor name *">
          <input name="name" required className={input} />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Trade">
            <select
              value={parent}
              onChange={(e) => {
                setParent(e.target.value);
                setSub("");
              }}
              className={input}
            >
              {topLevel.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Specialty (optional)">
            <select
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              className={input}
            >
              <option value="">— (general)</option>
              {subs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Contact</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Contact name"><input name="contact_name" className={input} /></Field>
            <Field label="Phone"><input name="phone" type="tel" className={input} /></Field>
            <Field label="Email"><input name="email" type="email" className={input} /></Field>
            <Field label="Address"><input name="address" className={input} /></Field>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">License</h2>
          <p className="mb-3 text-xs text-ink-400">
            For licensed trades (LMP, master electrician, FDNY cert holders, mold remediator, etc.). Keeping these tracked means you can prove the vendor was current when work was done.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="License type">
              <input name="license_type" placeholder="e.g. LMP" className={input} />
            </Field>
            <Field label="License #">
              <input name="license_number" className={input} />
            </Field>
            <Field label="Expires">
              <input name="license_expires" type="date" className={input} />
            </Field>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Notes">
            <textarea
              name="notes"
              rows={2}
              placeholder="e.g. Reliable on weekends, fair pricing on emergencies."
              className={input}
            />
          </Field>
          <Field label="Rating (1–5)">
            <select name="rating" defaultValue="" className={input}>
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
          <div className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add vendor"}
          </button>
          <Link
            href="/vendors"
            className="rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            Cancel
          </Link>
        </div>
      </form>
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
