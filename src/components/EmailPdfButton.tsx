"use client";

import { useEffect, useState } from "react";

// =============================================================================
//  EmailPdfButton — 1-click email of the work-order PDF
// =============================================================================
//  Captures the already-rendered print sheet (#wo-print-sheet) to a PDF in the
//  browser (html2pdf), then posts it to the server to email via Resend. The
//  recipient is editable and remembered (localStorage); defaults to the owner.
//
//  Note: with the default Resend sender (onboarding@resend.dev) email can only
//  be delivered to the Resend account's own address until a custom domain is
//  verified — then any recipient works.
// =============================================================================

const DEFAULT_RECIPIENT = "candianyrodriguez@gmail.com";
const STORAGE_KEY = "wo-email-recipient";

export default function EmailPdfButton({
  woId,
  ticketNumber,
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
      const el = document.getElementById("wo-print-sheet");
      if (!el) throw new Error("Work order not found on page");

      const html2pdf = (await import("html2pdf.js")).default;
      const pdfBase64: string = await html2pdf()
        .from(el)
        .set({
          margin: 0.5,
          filename: `${ticketNumber}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        })
        .outputPdf("datauristring");

      const res = await fetch(`/api/work-orders/${woId}/email-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: recipient.trim(), pdfBase64 }),
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
      <input
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        type="email"
        aria-label="Email recipient"
        placeholder="recipient@email.com"
        className="w-56 rounded-md border border-ink-200 bg-white px-2 py-1.5 text-sm"
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
