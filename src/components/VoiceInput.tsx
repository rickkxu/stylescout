"use client";
import { useRef, useState } from "react";
import { useSpeech } from "./useSpeech";
import { MicIcon, SendIcon } from "./icons";

// A text box with a mic button. Speech is appended to whatever is already typed.
export function VoiceInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  rows = 3,
  busy,
  submitLabel,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  rows?: number;
  busy?: boolean;
  submitLabel?: string;
  autoFocus?: boolean;
}) {
  const before = useRef("");
  const [interim, setInterim] = useState("");
  const speech = useSpeech((finalText, interimText) => {
    onChange([before.current, finalText].filter(Boolean).join(" "));
    setInterim(interimText);
  });

  const toggle = () => {
    if (speech.listening) {
      speech.stop();
      setInterim("");
    } else {
      before.current = value.trim();
      speech.start();
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface focus-within:border-fg/40 transition-colors">
      <textarea
        className="block w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[15px] leading-relaxed outline-none placeholder:text-muted"
        rows={rows}
        value={interim ? `${value} ${interim}` : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={speech.listening ? "Listening…" : placeholder}
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && onSubmit) onSubmit();
        }}
      />
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <div className="flex items-center gap-2">
          {speech.supported && (
            <button
              type="button"
              onClick={toggle}
              className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition ${
                speech.listening ? "bg-heart text-white" : "bg-surface-2 text-fg hover:bg-line"
              }`}
              aria-label={speech.listening ? "Stop recording" : "Speak"}
            >
              <MicIcon width={17} height={17} className={speech.listening ? "animate-pulse" : ""} />
              {speech.listening ? "Stop" : "Speak"}
            </button>
          )}
          {speech.error && <span className="text-xs text-heart">{speech.error}</span>}
        </div>
        {onSubmit && (
          <button
            type="button"
            disabled={busy || !value.trim()}
            onClick={() => {
              speech.stop();
              onSubmit();
            }}
            className="flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-medium text-accent-fg disabled:opacity-40"
          >
            {busy ? "Working…" : (submitLabel ?? "Send")}
            {!busy && <SendIcon width={16} height={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
