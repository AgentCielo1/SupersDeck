"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Authed management page: add a contractor, or file a company's insurance so
// the sign-in gate clears them. Posts to /api/contractors and
// /api/compliance-documents. Company list comes from /api/vendors.

type Vendor = { id: string; name: string };

const DOC_TYPES = [
  { value: "gl_coi", label: "General liability (COI)" },
  { value: "workers_comp", label: "Workers' comp" },
  { value: "disability", label: "Disability" },
  { value: "dcwp_hic", label: "DCWP home-improvement license" },
  { value: "trade_license", label: "Trade license" },
  { value: "w9", label: "W-9" },
];

export default function NewContractorPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  useEffect(() => {
    fetch("/api/vendors")
      .then((r) => r.json())
      .then((j) => setVendors(Array.isArray(j) ? j : []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add to the logbook</h1>
        <p className="mt-1 text-sm text-ink-400">
          Register a contractor, or file a company&apos;s insurance so the sign-in gate clears them.{" "}
          <Link href="/contractors" className="text-brand underline">
            Back to compliance
          </Link>
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <AddContractorForm vendors={vendors} />
        <AddCoiForm vendors={vendors} />
      </div>
    </div>
  );
}

function AddContractorForm({ vendors }: { vendors: Vendor[] }) {
  const [fullName, setFullName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, company_id: companyId || null, phone, email }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: d.error || "Couldn't add contractor." });
        return;
      }
      setMsg({ ok: true, text: `Added ${d.full_name}.` });
      setFullName("");
      setCompanyId("");
      setPhone("");
      setEmail("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl2 border bg-white p-5">
      <h2 className="text-sm font-semibold">Add contractor</h2>
      <p className="mt-0.5 text-xs text-ink-400">An individual who works your buildings.</p>
      <div className="mt-4 space-y-3">
        <Input label="Full name" value={fullName} onChange={setFullName} required />
        <Select
          label="Company"
          value={companyId}
          onChange={setCompanyId}
          options={vendors.map((v) => ({ value: v.id, label: v.name }))}
          placeholder="— none —"
        />
        <Input label="Mobile" value={phone} onChange={setPhone} type="tel" />
        <Input label="Email" value={email} onChange={setEmail} type="email" />
      </div>
      <button
        disabled={busy || !fullName.trim()}
        className="mt-4 w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add contractor"}
      </button>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
    </form>
  );
}

function AddCoiForm({ vendors }: { vendors: Vendor[] }) {
  const [companyId, setCompanyId] = useState("");
  const [docType, setDocType] = useState("gl_coi");
  const [carrier, setCarrier] = useState("");
  const [policy, setPolicy] = useState("");
  const [occ, setOcc] = useState("");
  const [agg, setAgg] = useState("");
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/compliance-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          doc_type: docType,
          carrier,
          policy_number: policy,
          gl_per_occurrence: occ ? Number(occ) : null,
          gl_aggregate: agg ? Number(agg) : null,
          expiry_date: expiry || null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: d.error || "Couldn't file document." });
        return;
      }
      setMsg({ ok: true, text: "Filed — vendor compliance updated." });
      setCarrier("");
      setPolicy("");
      setOcc("");
      setAgg("");
      setExpiry("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl2 border bg-white p-5">
      <h2 className="text-sm font-semibold">File insurance / license</h2>
      <p className="mt-0.5 text-xs text-ink-400">A current GL COI clears the company at sign-in.</p>
      <div className="mt-4 space-y-3">
        <Select
          label="Company"
          value={companyId}
          onChange={setCompanyId}
          options={vendors.map((v) => ({ value: v.id, label: v.name }))}
          placeholder="Select…"
          required
        />
        <Select label="Document" value={docType} onChange={setDocType} options={DOC_TYPES} />
        <Input label="Carrier / issuer" value={carrier} onChange={setCarrier} />
        <Input label="Policy / license #" value={policy} onChange={setPolicy} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="GL per-occurrence" value={occ} onChange={setOcc} type="number" />
          <Input label="GL aggregate" value={agg} onChange={setAgg} type="number" />
        </div>
        <Input label="Expiry date" value={expiry} onChange={setExpiry} type="date" />
      </div>
      <button
        disabled={busy || !companyId || !expiry}
        className="mt-4 w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {busy ? "Filing…" : "File document"}
      </button>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">
        {label}
        {required && " *"}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">
        {label}
        {required && " *"}
      </span>
      <select
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
