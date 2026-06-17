"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SPEECH_LOCALE, type LangCode } from "./strings";

// =============================================================================
//  useVoiceCapture — live microphone dictation via the Web Speech API
// =============================================================================
//  Free, on-device, instant. Streams interim + final transcript in the tenant's
//  language. Degrades gracefully: `supported` is false where SpeechRecognition
//  is unavailable (e.g. Firefox) so the form falls back to typing. The premium
//  streaming-translation path (OpenAI Realtime / Deepgram) can swap in behind
//  this same interface later.
// =============================================================================

interface VoiceCapture {
  supported: boolean;
  listening: boolean;
  start: () => void;
  stop: () => void;
}

export function useVoiceCapture(
  lang: LangCode,
  onTranscript: (text: string) => void
): VoiceCapture {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const cbRef = useRef(onTranscript);
  cbRef.current = onTranscript;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(Boolean(SR));
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = SPEECH_LOCALE[lang] ?? "en-US";
    rec.interimResults = true;
    rec.continuous = true;

    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      cbRef.current((finalText + interim).trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, [lang]);

  // Stop dictation if the component unmounts mid-listen.
  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  return { supported, listening, start, stop };
}
