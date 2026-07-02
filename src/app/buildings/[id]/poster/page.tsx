"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QrPoster } from "@workorder/kit/qr/QrPoster";
import { VoicePoster } from "@workorder/kit/qr/VoicePoster";
import { publicBaseUrl } from "@/lib/format";

// 24/7 AI voice-assistant line — same work-order queue as the QR intake.
const VOICE_PHONE = "959-224-9331";

// Printable lobby posters. The poster UIs live in the shared @workorder/kit;
// this page resolves the building + canonical intake URL and lets staff pick a
// QR poster (scan OR call) or a phone-only poster.
export default function PosterPage() {
  const params = useParams<{ id: string }>();
  const buildingId = params?.id ?? "";
  const [building, setBuilding] = useState<{
    id: string;
    name: string;
    address: string;
  } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [origin, setOrigin] = useState("");
  const [mode, setMode] = useState<"qr" | "voice">("qr");

  useEffect(() => {
    setOrigin(publicBaseUrl());
  }, []);

  useEffect(() => {
    if (!buildingId) return;
    let cancelled = false;
    fetch(`/api/buildings/${buildingId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((b) => {
        if (!cancelled) setBuilding(b);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  if (loadError) {
    return (
      <div className="p-8 text-center text-sm text-ink-400">
        Unknown building.{" "}
        <Link href="/buildings" className="text-brand-600 underline">
          Back
        </Link>
      </div>
    );
  }

  if (!building || !origin) {
    return <div className="p-8 text-center text-sm text-ink-400">Loading…</div>;
  }

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <Link
          href="/buildings"
          className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
        >
          ← Buildings
        </Link>
        <div className="inline-flex overflow-hidden rounded-md border border-ink-200">
          <button
            type="button"
            onClick={() => setMode("qr")}
            className={`px-3 py-2 text-sm font-medium ${mode === "qr" ? "bg-brand-600 text-white" : "bg-white text-ink-600 hover:bg-ink-100"}`}
          >
            QR poster (scan or call)
          </button>
          <button
            type="button"
            onClick={() => setMode("voice")}
            className={`px-3 py-2 text-sm font-medium ${mode === "voice" ? "bg-brand-600 text-white" : "bg-white text-ink-600 hover:bg-ink-100"}`}
          >
            Voice-only poster
          </button>
        </div>
      </div>
      {mode === "qr" ? (
        <QrPoster
          building={{ name: building.name, address: building.address }}
          intakeUrl={`${origin}/intake/${buildingId}`}
          voicePhone={VOICE_PHONE}
          poweredBy="SupersDeck"
        />
      ) : (
        <VoicePoster
          building={{ name: building.name, address: building.address }}
          voicePhone={VOICE_PHONE}
          poweredBy="SupersDeck"
        />
      )}
    </>
  );
}
