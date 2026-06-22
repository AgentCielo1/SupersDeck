"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TASK_STATUS_LABEL,
  type Task,
  type TaskStatus,
} from "@/types/tasks";

type Ref = { id: string; name: string };

const STATUS_TONE: Record<TaskStatus, string> = {
  pending: "bg-ink-100 text-ink-600",
  assigned: "bg-brand-600/10 text-brand",
  in_progress: "bg-warn-50 text-warn-800",
  done: "bg-ok-50 text-ok-800",
  archived: "bg-ink-100 text-ink-400",
};

const ALL_STATUSES: TaskStatus[] = [
  "pending",
  "assigned",
  "in_progress",
  "done",
  "archived",
];

const OTHER = "__other__";
const CURRENT = "__current__";

export default function TaskCard({
  task,
  buildings,
  vendors,
  urlByPath,
}: {
  task: Task;
  buildings: Ref[];
  vendors: Ref[];
  urlByPath: Record<string, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [assignOther, setAssignOther] = useState(false);
  const [otherName, setOtherName] = useState("");

  const buildingName = task.building_id
    ? buildings.find((b) => b.id === task.building_id)?.name ?? task.building_id
    : null;

  async function patch(fields: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm("Delete this task?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function onAssign(v: string) {
    if (v === CURRENT) return;
    if (v === OTHER) {
      setAssignOther(true);
      return;
    }
    if (v === "") {
      patch({ assigned_to: null, assigned_vendor_id: null });
      return;
    }
    const vendor = vendors.find((x) => x.id === v);
    patch({
      assigned_vendor_id: v,
      assigned_to: vendor?.name ?? null,
      status: task.status === "pending" ? "assigned" : task.status,
    });
  }

  function saveOther() {
    const name = otherName.trim();
    if (!name) return;
    setAssignOther(false);
    setOtherName("");
    patch({
      assigned_to: name,
      assigned_vendor_id: null,
      status: task.status === "pending" ? "assigned" : task.status,
    });
  }

  const assignValue = task.assigned_vendor_id
    ? task.assigned_vendor_id
    : task.assigned_to
    ? CURRENT
    : "";

  return (
    <div
      className={`rounded-lg border border-ink-200 bg-white p-3 ${
        task.status === "done" ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {task.priority === "high" && (
              <span
                title="High priority"
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-danger-600"
              />
            )}
            <span className="font-medium text-ink-900">{task.title}</span>
          </div>
          {task.notes && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600">
              {task.notes}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-400">
            {buildingName && <span>🏢 {buildingName}</span>}
            {task.due_date && (
              <span>📅 due {new Date(task.due_date).toLocaleDateString()}</span>
            )}
            {task.assigned_to && <span>👷 {task.assigned_to}</span>}
          </div>
          {task.files?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {task.files.map((f) => {
                const url = urlByPath[f.path];
                const isAudio = (f.type || "").startsWith("audio/");
                if (isAudio) {
                  return url ? (
                    <span key={f.path} className="inline-flex items-center gap-1">
                      <span className="text-xs text-ink-400">🎙</span>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio src={url} controls className="h-8 max-w-[200px]" />
                    </span>
                  ) : (
                    <span
                      key={f.path}
                      className="rounded border border-ink-200 bg-ink-50 px-2 py-0.5 text-xs text-ink-400"
                    >
                      🎙 {f.name}
                    </span>
                  );
                }
                return url ? (
                  <a
                    key={f.path}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-ink-200 bg-ink-50 px-2 py-0.5 text-xs text-brand hover:bg-ink-100"
                  >
                    📎 {f.name}
                  </a>
                ) : (
                  <span
                    key={f.path}
                    className="rounded border border-ink-200 bg-ink-50 px-2 py-0.5 text-xs text-ink-400"
                  >
                    📎 {f.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[task.status]}`}
        >
          {TASK_STATUS_LABEL[task.status]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-2">
        <select
          value={task.status}
          disabled={busy}
          onChange={(e) => patch({ status: e.target.value })}
          className="rounded-md border border-ink-200 px-2 py-1 text-xs"
          aria-label="Status"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        {assignOther ? (
          <span className="flex items-center gap-1">
            <input
              autoFocus
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveOther()}
              placeholder="Handyman name"
              className="w-36 rounded-md border border-ink-200 px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={saveOther}
              disabled={busy}
              className="rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white"
            >
              Set
            </button>
            <button
              type="button"
              onClick={() => setAssignOther(false)}
              className="px-1 text-xs text-ink-400"
            >
              ✕
            </button>
          </span>
        ) : (
          <select
            value={assignValue}
            disabled={busy}
            onChange={(e) => onAssign(e.target.value)}
            className="rounded-md border border-ink-200 px-2 py-1 text-xs"
            aria-label="Assign to"
          >
            <option value="">Unassigned</option>
            {assignValue === CURRENT && (
              <option value={CURRENT}>{task.assigned_to}</option>
            )}
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
            <option value={OTHER}>Other name…</option>
          </select>
        )}

        <input
          type="date"
          value={task.due_date ?? ""}
          disabled={busy}
          onChange={(e) => patch({ due_date: e.target.value || null })}
          className="rounded-md border border-ink-200 px-2 py-1 text-xs text-ink-600"
          aria-label="Due date"
        />

        <select
          value={task.priority}
          disabled={busy}
          onChange={(e) => patch({ priority: e.target.value })}
          className="rounded-md border border-ink-200 px-2 py-1 text-xs"
          aria-label="Priority"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>

        <button
          type="button"
          onClick={del}
          disabled={busy}
          className="ml-auto text-xs text-ink-400 hover:text-danger-800"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
