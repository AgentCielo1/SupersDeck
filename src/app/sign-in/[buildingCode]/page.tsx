"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  complianceStatusLabel,
  type ComplianceStatus,
} from "@workorder/kit/contractor/contract";
import { enqueueSignIn, flushQueue } from "@/lib/offline-queue";

// PUBLIC contractor self sign-in (QR target). Resolves the building, verifies
// the company's insurance, recognizes returning contractors by phone, captures
// a photo, posts to the public sign-in API (server gate). Queues offline and
// syncs when signal returns.

type Company = { id: string; name: string; status: ComplianceStatus };
type Building = { id: string; name: string; address: string };
type Step = "start" | "form" | "photo" | "blocked" | "done";

const STATUS_TONE: Record<ComplianceStatus, string> = {
  compliant: "bg-ok/10 text-ok",
  expiring: "bg-warn/10 text-warn",
  expired: "bg-danger/10 text-danger",
  missing: "bg-ink-100 text-ink-500",
};

export default function ContractorSignInPage() {
  const params = useParams<{ buildingCode: string }>();
  const code = params?.buildingCode ?? "";

  const [building, setBuilding] = useState<Building | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadError, setLoadError] = useState(false);

  const [step, setStep] = useState<Step>("start");
  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [photo, setPhoto] = useState("");
  const [camError, setCamError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [recognized, setRecognized] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Resolve building + companies.
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    fetch(`/api/public/sign-in/${code}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        setBuilding(d.building);
        setCompanies(d.companies ?? []);
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Replay any queued sign-ins now and whenever the device comes back online.
  useEffect(() => {
    flushQueue();
    const onOnline = () => flushQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  // Camera lifecycle — only while on the photo step with no shot captured.
  useEffect(() => {
    if (step !== "photo" || photo) {
      stopCam();
      return;
    }
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setCamError(true));
    return () => {
      active = false;
      stopCam();
    };
  }, [step, photo]);

  function stopCam() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = 300;
    c.height = 400;
    const x = c.getContext("2d");
    if (!x) return;
    const tr = 0.75;
    const r = v.videoWidth / v.videoHeight;
    let sw = v.videoWidth;
    let sh = v.videoHeight;
    let sx = 0;
    let sy = 0;
    if (r > tr) {
      sw = sh * tr;
      sx = (v.videoWidth - sw) / 2;
    } else {
      sh = sw / tr;
      sy = (v.videoHeight - sh) / 2;
    }
    x.drawImage(v, sx, sy, sw, sh, 0, 0, 300, 400);
    setPhoto(c.toDataURL("image/jpeg", 0.7));
    stopCam();
  }

  // Returning-contractor recognition — look up by phone, greet + pre-fill.
  async function lookupPhone() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) {
      setRecognized(null);
      return;
    }
    try {
      const r = await fetch(`/api/public/sign-in/${code}/lookup?phone=${encodeURIComponent(phone)}`);
      const d = await r.json();
      if (d.found) {
        setRecognized(d.name);
        if (!name.trim()) setName(d.name);
      } else {
        setRecognized(null);
      }
    } catch {
      /* ignore lookup failures */
    }
  }

  const company = companies.find((c) => c.id === companyId);
  const blocked = company?.status === "expired";

  async function submit() {
    setSubmitting(true);
    setSubmitError("");
    const payload = {
      company_id: companyId || null,
      inline_name: name.trim(),
      phone: phone.trim() || null,
      purpose: purpose.trim() || null,
      method: "qr",
      photo_base64: photo || undefined,
    };
    try {
      const res = await fetch(`/api/public/sign-in/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setStep("blocked");
        return;
      }
      if (!res.ok) {
        setSubmitError(d.error || "Something went wrong. Ask building staff for help.");
        return;
      }
      setStep("done");
    } catch {
      // Offline — queue and confirm; it'll sync when signal returns.
      await enqueueSignIn(code, payload);
      setQueuedOffline(true);
      setStep("done");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <Shell>
        <div className="text-center">
          <h1 className="text-lg font-semibold">Invalid sign-in code</h1>
          <p className="mt-2 text-sm text-ink-400">
            This QR code isn&apos;t linked to a building. Ask building staff to sign you in.
          </p>
        </div>
      </Shell>
    );
  }

  if (!building) {
    return (
      <Shell>
        <div className="text-center text-sm text-ink-400">Loading…</div>
      </Shell>
    );
  }

  if (step === "start") {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl text-white">
            ▮
          </div>
          <div className="text-xs uppercase tracking-widest text-ink-400">Contractor sign-in</div>
          <h1 className="mt-1 text-2xl font-semibold">{building.name}</h1>
          <p className="mt-1 text-sm text-ink-400">{building.address}</p>
        </div>
        <button
          onClick={() => setStep("form")}
          className="mt-6 w-full rounded-xl bg-brand-600 px-4 py-3.5 font-medium text-white"
        >
          Start sign-in →
        </button>
        <p className="mt-3 text-center text-xs text-ink-400">
          Takes ~20 seconds · your company&apos;s insurance is verified automatically.
        </p>
      </Shell>
    );
  }

  if (step === "blocked") {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-3xl text-danger">
            ⛔
          </div>
          <h1 className="text-xl font-semibold">Access not cleared</h1>
          <p className="mt-2 text-sm text-ink-500">
            {company?.name}&apos;s general liability insurance is expired. For everyone&apos;s
            protection, contractors can&apos;t be signed in without active coverage.
          </p>
        </div>
        <button
          onClick={() => setStep("start")}
          className="mt-6 w-full rounded-xl border border-ink-200 px-4 py-3 font-medium"
        >
          Back
        </button>
      </Shell>
    );
  }

  if (step === "done") {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-ok/10 text-3xl text-ok">
            {queuedOffline ? "⤓" : "✓"}
          </div>
          <h1 className="text-xl font-semibold">
            {queuedOffline ? "Saved — will sync" : "You're signed in"}
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            {queuedOffline
              ? "No signal right now. Your sign-in is saved on this device and will upload automatically when you're back online."
              : `Welcome to ${building.name}. Please sign out when you leave.`}
          </p>
        </div>
      </Shell>
    );
  }

  if (step === "photo") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Quick photo</h1>
        <p className="mt-1 text-sm text-ink-400">A verification photo is attached to your visit.</p>

        <div className="mt-4 aspect-[3/4] w-full overflow-hidden rounded-xl bg-ink-900">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Captured" className="h-full w-full object-cover" />
          ) : camError ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-ink-300">
              Camera unavailable. You can skip — staff can add a photo later.
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          )}
        </div>

        {photo ? (
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setPhoto("")}
              className="flex-1 rounded-xl border border-ink-200 px-4 py-3 font-medium"
            >
              Retake
            </button>
            <button
              disabled={submitting}
              onClick={submit}
              className="flex-1 rounded-xl bg-brand-600 px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {!camError && (
              <button
                onClick={capture}
                className="w-full rounded-xl bg-brand-600 px-4 py-3.5 font-medium text-white"
              >
                Take photo
              </button>
            )}
            <button
              disabled={submitting}
              onClick={submit}
              className="w-full rounded-xl border border-ink-200 px-4 py-3 font-medium disabled:opacity-50"
            >
              {submitting ? "Signing in…" : camError ? "Sign in" : "Skip photo & sign in"}
            </button>
          </div>
        )}

        {submitError && (
          <div className="mt-3 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">
            {submitError}
          </div>
        )}
      </Shell>
    );
  }

  // step === "form"
  return (
    <Shell>
      <h1 className="text-xl font-semibold">Who&apos;s signing in?</h1>
      <p className="mt-1 text-sm text-ink-400">
        We verify your company&apos;s insurance the moment you pick it.
      </p>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-ink-600">Company</span>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="w-full rounded-xl border border-ink-200 px-3 py-3 text-base"
        >
          <option value="">Select your company…</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {company && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${STATUS_TONE[company.status]}`}
        >
          <span className="font-medium">
            {company.status === "compliant" && "✓ Insurance verified"}
            {company.status === "expiring" && "⚠︎ Insurance expiring soon"}
            {company.status === "expired" && "⛔ Not cleared — insurance expired"}
            {company.status === "missing" && "No COI on file"}
          </span>
          <span className="opacity-70">· {complianceStatusLabel(company.status)}</span>
        </div>
      )}

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-ink-600">Mobile number</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={lookupPhone}
          placeholder="(555) 000-0000"
          inputMode="tel"
          autoComplete="tel"
          className="w-full rounded-xl border border-ink-200 px-3 py-3 text-base"
        />
      </label>

      {recognized && (
        <div className="mt-2 rounded-xl bg-ok/10 px-3 py-2 text-sm text-ok">
          👋 Welcome back, {recognized}.
        </div>
      )}

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-ink-600">Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          autoComplete="name"
          className="w-full rounded-xl border border-ink-200 px-3 py-3 text-base"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-ink-600">
          What are you here for? <span className="text-ink-400">(optional)</span>
        </span>
        <input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="e.g. leak in 4B"
          className="w-full rounded-xl border border-ink-200 px-3 py-3 text-base"
        />
      </label>

      <button
        disabled={!name.trim() || !companyId || blocked}
        onClick={() => (blocked ? setStep("blocked") : setStep("photo"))}
        className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-3.5 font-medium text-white disabled:opacity-50"
      >
        {blocked ? "Blocked — insurance expired" : "Continue"}
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto max-w-md px-5 py-10">
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">{children}</div>
        <p className="mt-4 text-center text-[11px] text-ink-400">Powered by GateLog · BoroDesk</p>
      </div>
    </div>
  );
}
