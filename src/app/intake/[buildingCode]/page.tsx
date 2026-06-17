"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MultilingualIntakeForm } from "@workorder/kit/intake/MultilingualIntakeForm";
import {
  STRINGS,
  detectInitialLanguage,
  type LangCode,
} from "@workorder/kit/intake/strings";
import { publicBaseUrl } from "@/lib/format";

// PUBLIC tenant intake (QR target). The multilingual speak-or-type form lives
// in @workorder/kit; this page resolves the building + posts to the existing
// SupersDeck work-orders API (which auto-translates to English server-side).
export default function TenantIntakePage() {
  const params = useParams<{ buildingCode: string }>();
  const buildingId = params?.buildingCode ?? "";
  const [building, setBuilding] = useState<{
    id: string;
    name: string;
    address: string;
  } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [lang, setLang] = useState<LangCode>("en");
  const t = STRINGS[lang];

  useEffect(() => setLang(detectInitialLanguage()), []);

  useEffect(() => {
    if (!buildingId) return;
    let cancelled = false;
    fetch(`/api/buildings/${buildingId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
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
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold">{t.invalidCode}</h1>
        <p className="mt-2 text-sm text-zinc-500">{t.invalidCodeBody}</p>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-sm text-zinc-500">
        {t.loading}
      </div>
    );
  }

  return (
    <MultilingualIntakeForm
      building={{ id: building.id, name: building.name, address: building.address }}
      trackUrlFor={(ticket) => `${publicBaseUrl()}/track/${ticket}`}
      onSubmit={async (payload) => {
        const res = await fetch("/api/work-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { error: data.error };
        return { ticket_number: data.ticket_number };
      }}
    />
  );
}
