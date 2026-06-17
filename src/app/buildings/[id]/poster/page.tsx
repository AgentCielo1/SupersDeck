"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QrPoster } from "@workorder/kit/qr/QrPoster";
import { publicBaseUrl } from "@/lib/format";

// Printable QR lobby poster. The poster UI lives in the shared @workorder/kit;
// this page just resolves the building + the canonical intake URL and hands
// them to <QrPoster>.
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
      <div className="no-print mb-4">
        <Link
          href="/buildings"
          className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
        >
          ← Buildings
        </Link>
      </div>
      <QrPoster
        building={{ name: building.name, address: building.address }}
        intakeUrl={`${origin}/intake/${buildingId}`}
        poweredBy="SupersDeck"
      />
    </>
  );
}
