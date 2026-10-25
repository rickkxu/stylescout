"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Minimal typing for the Web Speech API (not in TypeScript's DOM lib everywhere).
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

// Speech to text in the browser. `onText` receives the full transcript of this session as it grows.
export function useSpeech(onText: (finalText: string, interim: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  useEffect(() => {
    cb.current = onText;
  });
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => !!getRecognition(),
    () => false,
  );

  const stop = useCallback(() => {
    rec.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    setError(null);
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      cb.current(finalText.trim(), interim.trim());
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") setError("Microphone access was blocked.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setError("Couldn't hear that. Try again.");
    };
    r.onend = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  }, []);

  useEffect(() => () => rec.current?.stop(), []);

  return { supported, listening, error, start, stop };
}
