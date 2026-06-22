"use client";

import { useEffect, useRef, useState } from "react";

// =============================================================================
//  VoiceNoteRecorder — record a short audio note for a backlog task
// =============================================================================
//  Uses MediaRecorder (mic). On stop it hands the recorded Blob up via onChange;
//  the parent uploads it to the task-files bucket on submit, so a voice note is
//  just another attachment (type audio/*) the card plays back. Secure-context
//  only (HTTPS / localhost); hidden where MediaRecorder is unavailable.
// =============================================================================

function supported() {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export default function VoiceNoteRecorder({
  onChange,
}: {
  onChange: (blob: Blob | null) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  if (!supported()) return null;

  async function start() {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        if (url) URL.revokeObjectURL(url);
        setUrl(URL.createObjectURL(blob));
        onChange(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
      setSecs(0);
      timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      setErr("Mic unavailable / denied.");
    }
  }

  function stop() {
    recRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

  function discard() {
    if (url) URL.revokeObjectURL(url);
    setUrl(null);
    setSecs(0);
    onChange(null);
  }

  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2">
      {!recording && !url && (
        <button
          type="button"
          onClick={start}
          className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
        >
          <span className="text-danger-600">●</span> Record
        </button>
      )}
      {recording && (
        <button
          type="button"
          onClick={stop}
          className="inline-flex items-center gap-1.5 rounded-md border border-danger-600/40 bg-danger-50 px-3 py-2 text-sm font-medium text-danger-800"
        >
          <span className="animate-pulse">⏹</span> Stop {clock}
        </button>
      )}
      {url && !recording && (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={url} controls className="h-8 max-w-[180px]" />
          <button
            type="button"
            onClick={discard}
            aria-label="Discard voice note"
            className="px-1 text-xs text-ink-400 hover:text-danger-800"
          >
            ✕
          </button>
        </>
      )}
      {err && <span className="text-xs text-danger-800">{err}</span>}
    </div>
  );
}
