"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { TIERS, type AlertTier } from "@/lib/alert-tiers";
import {
  TIER_DOT,
  TIER_SELECTED,
  tierLabel,
  channelsLabel,
} from "@/lib/alert-ui";

export interface ComposerBuilding {
  id: string;
  name: string;
  address: string;
  num_units: number;
}

export interface ComposerUnit {
  id: string;
  building_id: string;
  label: string;
  occupied: boolean;
}

interface PreviewResult {
  tier: AlertTier;
  channels: string[];
  staffCount: number;
  residentCount: number;
  smsConfigured: boolean;
}

interface SendResult {
  id: string;
  summary: {
    tier: AlertTier;
    channels: string[];
    staffCount: number;
    residentCount: number;
    push: { sent: number; failed: number };
    email: { sent: number; failed: number };
    sms: { sent: number; failed: number };
  };
}

const TIER_ORDER: AlertTier[] = ["routine", "urgent", "emergency"];

export default function AlertComposer({
  buildings,
  units,
}: {
  buildings: ComposerBuilding[];
  units: ComposerUnit[];
}) {
  const [tier, setTier] = useState<AlertTier>("routine");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [buildingIds, setBuildingIds] = useState<string[]>([]);
  const [unitMode, setUnitMode] = useState<"all" | "specific">("all");
  const [unitIds, setUnitIds] = useState<string[]>([]);

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Units that belong to the selected buildings (for the specific-unit list).
  const selectableUnits = useMemo(
    () => units.filter((u) => buildingIds.includes(u.building_id)),
    [units, buildingIds]
  );

  const allBuildingsSelected =
    buildings.length > 0 && buildingIds.length === buildings.length;

  // Keep unit selection coherent when buildings change.
  useEffect(() => {
    setUnitIds((prev) =>
      prev.filter((id) => selectableUnits.some((u) => u.id === id))
    );
  }, [selectableUnits]);

  const effectiveUnitIds =
    unitMode === "specific" && unitIds.length > 0 ? unitIds : undefined;

  // ---- Debounced preview on tier / buildings / units change ----
  const runPreview = useCallback(async () => {
    if (buildingIds.length === 0) {
      setPreview(null);
      return;
    }
    setPreviewing(true);
    try {
      const res = await fetch("/api/alerts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          building_ids: buildingIds,
          unit_ids: effectiveUnitIds,
        }),
      });
      if (!res.ok) {
        setPreview(null);
        return;
      }
      setPreview((await res.json()) as PreviewResult);
    } catch {
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, buildingIds, JSON.stringify(effectiveUnitIds)]);

  useEffect(() => {
    const t = setTimeout(runPreview, 350);
    return () => clearTimeout(t);
  }, [runPreview]);

  const canSend =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    buildingIds.length > 0 &&
    !sending;

  function toggleBuilding(id: string) {
    setBuildingIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }

  function toggleAllBuildings() {
    setBuildingIds(allBuildingsSelected ? [] : buildings.map((b) => b.id));
  }

  function toggleUnit(id: string) {
    setUnitIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  }

  async function doSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          title: title.trim(),
          message: message.trim(),
          building_ids: buildingIds,
          unit_ids: effectiveUnitIds,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | SendResult
        | { error?: string };
      if (!res.ok || !("id" in data)) {
        setError(
          ("error" in data && data.error) || "Could not send alert. Try again."
        );
        setSending(false);
        setConfirming(false);
        return;
      }
      setSent(data);
    } catch {
      setError("Network error. Try again.");
      setSending(false);
      setConfirming(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    if (tier === "emergency" && !confirming) {
      setConfirming(true);
      return;
    }
    void doSend();
  }

  // ---- Confirmation screen ----
  if (sent) {
    const s = sent.summary;
    const total = s.staffCount + s.residentCount;
    return (
      <div className="rounded-xl2 border border-ok-600/30 bg-white p-6">
        <div className="text-lg font-semibold text-ok-800">
          ✓ Alert sent to {total} recipient{total === 1 ? "" : "s"}
        </div>
        <p className="mt-1 text-sm text-ink-600">
          {tierLabel(s.tier)} alert · notified {s.residentCount} resident
          {s.residentCount === 1 ? "" : "s"} and {s.staffCount} staff.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {s.channels.includes("push") && (
            <ChannelStat label="Push" sent={s.push.sent} failed={s.push.failed} />
          )}
          {s.channels.includes("email") && (
            <ChannelStat
              label="Email"
              sent={s.email.sent}
              failed={s.email.failed}
            />
          )}
          {s.channels.includes("sms") && (
            <ChannelStat label="SMS" sent={s.sms.sent} failed={s.sms.failed} />
          )}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/alerts/${sent.id}`}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            View alert
          </Link>
          <Link
            href="/alerts"
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-900 hover:bg-ink-100"
          >
            Back to alerts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {/* Tier selector */}
        <fieldset className="rounded-xl2 border border-ink-200 bg-white p-4">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-ink-400">
            Tier
          </legend>
          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TIER_ORDER.map((t) => {
              const cfg = TIERS[t];
              const selected = tier === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${tierLabel(t)} tier`}
                  onClick={() => setTier(t)}
                  className={clsx(
                    "rounded-xl2 border p-3 text-left transition",
                    selected
                      ? TIER_SELECTED[t]
                      : "border-ink-200 bg-white hover:border-ink-400/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx("h-2.5 w-2.5 rounded-full", TIER_DOT[t])}
                    />
                    <span className="text-sm font-semibold text-ink-900">
                      {cfg.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-600">{cfg.description}</p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                    {channelsLabel(cfg.channels)}
                  </p>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Title + message */}
        <div className="space-y-4 rounded-xl2 border border-ink-200 bg-white p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder='e.g. "Water shutoff 2–4pm"'
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">
              Message
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
              placeholder="What's happening and what people should do."
              className={fieldClass}
            />
          </label>
        </div>

        {/* Building multi-select */}
        <fieldset className="rounded-xl2 border border-ink-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <legend className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Buildings
            </legend>
            {buildings.length > 1 && (
              <button
                type="button"
                onClick={toggleAllBuildings}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                {allBuildingsSelected ? "Clear all" : "Select all"}
              </button>
            )}
          </div>
          <div className="mt-2 space-y-1">
            {buildings.map((b) => (
              <label
                key={b.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-ink-50"
              >
                <input
                  type="checkbox"
                  checked={buildingIds.includes(b.id)}
                  onChange={() => toggleBuilding(b.id)}
                  className="h-4 w-4 rounded border-ink-200 text-brand-600 focus:ring-brand-100"
                />
                <span className="font-medium text-ink-900">{b.name}</span>
                <span className="text-xs text-ink-400">{b.address}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Unit selection */}
        {buildingIds.length > 0 && (
          <fieldset className="rounded-xl2 border border-ink-200 bg-white p-4">
            <legend className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Units
            </legend>
            <div className="mt-2 space-y-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="unitMode"
                  checked={unitMode === "all"}
                  onChange={() => setUnitMode("all")}
                  className="h-4 w-4 border-ink-200 text-brand-600 focus:ring-brand-100"
                />
                <span className="text-ink-900">All units in selected buildings</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="unitMode"
                  checked={unitMode === "specific"}
                  onChange={() => setUnitMode("specific")}
                  className="h-4 w-4 border-ink-200 text-brand-600 focus:ring-brand-100"
                />
                <span className="text-ink-900">Specific units</span>
              </label>
            </div>
            {unitMode === "specific" && (
              <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-ink-100 p-2">
                {selectableUnits.length === 0 ? (
                  <p className="text-xs text-ink-400">
                    No units found for the selected buildings.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
                    {selectableUnits.map((u) => (
                      <label
                        key={u.id}
                        className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-ink-50"
                      >
                        <input
                          type="checkbox"
                          checked={unitIds.includes(u.id)}
                          onChange={() => toggleUnit(u.id)}
                          className="h-3.5 w-3.5 rounded border-ink-200 text-brand-600 focus:ring-brand-100"
                        />
                        <span className="text-ink-900">{u.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </fieldset>
        )}

        {error && (
          <div
            className="rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm text-danger-800"
            role="alert"
          >
            {error}
          </div>
        )}
      </div>

      {/* Preview + send (sticky on desktop) */}
      <div className="lg:col-span-1">
        <div className="space-y-3 lg:sticky lg:top-4">
          <div className="rounded-xl2 border border-ink-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Preview
            </div>
            {buildingIds.length === 0 ? (
              <p className="mt-2 text-sm text-ink-400">
                Select at least one building to see who this reaches.
              </p>
            ) : previewing && !preview ? (
              <p className="mt-2 text-sm text-ink-400">Calculating…</p>
            ) : preview ? (
              <>
                <p className="mt-2 text-sm text-ink-900">
                  This will notify ~
                  <span className="font-semibold">
                    {preview.residentCount}
                  </span>{" "}
                  resident{preview.residentCount === 1 ? "" : "s"} and{" "}
                  <span className="font-semibold">{preview.staffCount}</span>{" "}
                  staff via {channelsLabel(preview.channels)}.
                </p>
                {tier === "emergency" && !preview.smsConfigured && (
                  <div className="mt-3 rounded-md border border-warn-600/40 bg-warn-50 px-3 py-2 text-xs text-warn-800">
                    SMS not configured — residents will not receive texts.
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-400">
                Preview unavailable right now.
              </p>
            )}
          </div>

          {confirming && tier === "emergency" ? (
            <div className="rounded-xl2 border border-danger-600/40 bg-danger-50 p-4">
              <p className="text-sm font-semibold text-danger-800">
                This sends SMS to all staff and tenants. Send now?
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-md bg-danger-600 px-3 py-2 text-sm font-medium text-white hover:bg-danger-800 disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send now"}
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => setConfirming(false)}
                  className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-900 hover:bg-ink-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              className={clsx(
                "w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50",
                tier === "emergency"
                  ? "bg-danger-600 hover:bg-danger-800"
                  : "bg-brand-600 hover:bg-brand-800"
              )}
            >
              {sending
                ? "Sending…"
                : tier === "emergency"
                ? "Send emergency alert"
                : `Send ${tierLabel(tier).toLowerCase()} alert`}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

const fieldClass =
  "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function ChannelStat({
  label,
  sent,
  failed,
}: {
  label: string;
  sent: number;
  failed: number;
}) {
  return (
    <div className="rounded-md border border-ink-200 bg-white p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-400">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold text-ink-900">{sent} sent</div>
      {failed > 0 && (
        <div className="text-xs text-danger-800">{failed} failed</div>
      )}
    </div>
  );
}
