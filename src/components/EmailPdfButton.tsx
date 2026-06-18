"use client";

import { useEffect, useState } from "react";

// =============================================================================
//  EmailPdfButton — download or 1-click email the work-order PDF
// =============================================================================
//  The PDF is rendered server-side (vector, one clean page) — this component
//  just triggers it. "Download PDF" opens the GET; "Email PDF" posts the
//  recipient (editable, remembered in localStorage; defaults to the owner).
//
//  Note: with the default Resend sender (onboarding@resend.dev) email only
//  delivers to the Resend account's own address until a custom domain is
//  verified — then any recipient works.
// =============================================================================

const DEFAULT_RECIPIENT = "candianyrodriguez@gmail.com";
const STORAGE_KEY = "wo-email-recipient";

export default function EmailPdfButton({
  woId,
  ticketNumber: _ticketNumber,
}: {
  woId: string;
  ticketNumber: string;
}) {
  const [recipient, setRecipient] = useState(DEFAULT_RECIPIENT);
  const [status, setStatus] = useState<"idle" | "working" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setRecipient(saved);
  }, []);

  async function send() {
    setStatus("working");
    setMsg("");
    localStorage.setItem(STORAGE_KEY, recipient.trim());
    try {
      const res = await fetch(`/api/work-orders/${woId}/email-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: recipient.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMsg(data.error ?? "Couldn't send");
        return;
      }
      setStatus("sent");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (e) {
      setStatus("error");
      setMsg(e instanceof Error ? e.message : "Couldn't send");
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2 print:hidden">
      <a
        href={`/api/work-orders/${woId}/email-pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
      >
        Download PDF
      </a>
      <input
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        type="email"
        aria-label="Email recipient"
        placeholder="recipient@email.com"
        className="w-52 rounded-md border border-ink-200 bg-white px-2 py-1.5 text-sm"
      />
      <button
        type="button"
        onClick={send}
        disabled={status === "working" || !recipient.trim()}
        className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {status === "working" ? "Sending…" : status === "sent" ? "Sent ✓" : "Email PDF"}
      </button>
      {status === "error" && <span className="text-xs text-danger-800">{msg}</span>}
    </div>
  );
}
