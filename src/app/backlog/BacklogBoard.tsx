"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  ACTIVE_STATUSES,
  TASK_BUCKET,
  TASK_FOLDERS,
  type Task,
  type TaskFile,
} from "@/types/tasks";
import TaskCard from "./TaskCard";
import VoiceNoteRecorder from "@/components/VoiceNoteRecorder";

type Ref = { id: string; name: string };

export default function BacklogBoard({
  initialTasks,
  buildings,
  vendors,
  urlByPath,
}: {
  initialTasks: Task[];
  buildings: Ref[];
  vendors: Ref[];
  urlByPath: Record<string, string>;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState("General");
  const [buildingId, setBuildingId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [voice, setVoice] = useState<Blob | null>(null);
  const [recorderKey, setRecorderKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [filterFolder, setFilterFolder] = useState("all");
  const [showDone, setShowDone] = useState(false);
  // Categories start collapsed — pick one, then "Show all" to drop it down.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleFolder(f: string) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(f)) n.delete(f);
      else n.add(f);
      return n;
    });
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    setErr("");
    try {
      const sb = getBrowserSupabase();
      const uploaded: TaskFile[] = [];
      for (const f of files) {
        const safe = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `${crypto.randomUUID()}-${safe}`;
        const { error } = await sb.storage
          .from(TASK_BUCKET)
          .upload(path, f, { upsert: false });
        if (error) throw new Error(`File upload failed: ${error.message}`);
        uploaded.push({ path, name: f.name, type: f.type });
      }
      if (voice) {
        const ext = /mp4|mpeg|aac/.test(voice.type)
          ? "m4a"
          : voice.type.includes("ogg")
          ? "ogg"
          : "webm";
        const vpath = `${crypto.randomUUID()}-voice-note.${ext}`;
        const { error } = await sb.storage
          .from(TASK_BUCKET)
          .upload(vpath, voice, { contentType: voice.type || "audio/webm", upsert: false });
        if (error) throw new Error(`Voice note upload failed: ${error.message}`);
        uploaded.push({ path: vpath, name: `Voice note.${ext}`, type: voice.type || "audio/webm" });
      }
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          folder: folder.trim() || "General",
          building_id: buildingId || null,
          files: uploaded,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Couldn't add task.");
      }
      setTitle("");
      setFiles([]);
      setVoice(null);
      setRecorderKey((k) => k + 1);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const visible = initialTasks.filter((t) =>
    showDone ? true : ACTIVE_STATUSES.includes(t.status)
  );
  const presentFolders = Array.from(
    new Set(visible.map((t) => t.folder || "General"))
  ).sort();
  const shownFolders =
    filterFolder === "all"
      ? presentFolders
      : presentFolders.filter((f) => f === filterFolder);

  const counts = {
    pending: initialTasks.filter((t) => t.status === "pending").length,
    assigned: initialTasks.filter((t) => t.status === "assigned").length,
    in_progress: initialTasks.filter((t) => t.status === "in_progress").length,
  };

  return (
    <div className="space-y-5">
      {/* Quick add */}
      <form
        onSubmit={add}
        className="rounded-xl2 border border-ink-200 bg-white p-4"
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1">
            <span className="mb-1 block text-xs font-medium text-ink-400">
              Job / note
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Re-stain cabinets in 5B"
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-400">
              Folder
            </span>
            <input
              list="folder-options"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-40 rounded-md border border-ink-200 px-3 py-2 text-sm"
            />
            <datalist id="folder-options">
              {TASK_FOLDERS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-400">
              Building
            </span>
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className="w-44 rounded-md border border-ink-200 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-400">
              Files
            </span>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="block w-56 text-xs text-ink-600 file:mr-2 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-xs file:font-medium"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-400">
              Voice note
            </span>
            <VoiceNoteRecorder key={recorderKey} onChange={setVoice} />
          </label>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add to backlog"}
          </button>
        </div>
        {files.length > 0 && (
          <p className="mt-2 text-xs text-ink-400">
            {files.length} file(s) attached
          </p>
        )}
        {err && <p className="mt-2 text-xs text-danger-800">{err}</p>}
      </form>

      {/* Stats + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-ink-100 px-2.5 py-1 text-ink-600">
            {counts.pending} pending
          </span>
          <span className="rounded-full bg-brand-600/10 px-2.5 py-1 text-brand">
            {counts.assigned} assigned
          </span>
          <span className="rounded-full bg-warn-50 px-2.5 py-1 text-warn-800">
            {counts.in_progress} in progress
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <select
            value={filterFolder}
            onChange={(e) => setFilterFolder(e.target.value)}
            className="rounded-md border border-ink-200 px-2 py-1 text-xs"
          >
            <option value="all">All folders</option>
            {presentFolders.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-ink-600">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
            />
            Show done
          </label>
        </div>
      </div>

      {/* List grouped by folder */}
      {shownFolders.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-ink-200 bg-white px-4 py-12 text-center text-sm text-ink-400">
          Nothing here yet. Add a job above — it&apos;ll wait in its folder until
          you hand it out.
        </div>
      ) : (
        <div className="space-y-2">
          {shownFolders.map((f) => {
            const ts = visible.filter((t) => (t.folder || "General") === f);
            const open = expanded.has(f) || filterFolder === f;
            return (
              <section
                key={f}
                className="overflow-hidden rounded-xl2 border border-ink-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => toggleFolder(f)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-ink-50"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      className={`h-4 w-4 text-ink-400 transition-transform ${open ? "rotate-90" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm font-semibold text-ink-900">{f}</span>
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-500">
                      {ts.length}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-brand-600">
                    {open ? "Hide" : `Show all (${ts.length})`}
                  </span>
                </button>
                {open && (
                  <div className="space-y-2 border-t border-ink-100 p-3">
                    {ts.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        buildings={buildings}
                        vendors={vendors}
                        urlByPath={urlByPath}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
