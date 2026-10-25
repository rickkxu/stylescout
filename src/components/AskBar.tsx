"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useSpeech } from "./useSpeech";
import { MicIcon, SendIcon, SparkIcon } from "./icons";
import { useToast } from "./Toast";
import type { Search } from "@/lib/types";

// "Find me loafers under $250" – starts a one-off search.
export function AskBar({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(initial);
  const [interim, setInterim] = useState("");
  const [busy, setBusy] = useState(false);
  const before = useRef("");
  const speech = useSpeech((finalText, interimText) => {
    setValue([before.current, finalText].filter(Boolean).join(" "));
    setInterim(interimText);
  });

  const submit = async () => {
    speech.stop();
    const prompt = value.trim();
    if (!prompt) return;
    setBusy(true);
    try {
      const search = await api<Search>("/api/search", { method: "POST", json: { prompt } });
      router.push(`/search/${search.id}`);
    } catch (e) {
      toast({ text: (e as Error).message, tone: "error" });
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-1 rounded-full border border-line bg-surface py-1.5 pl-4 pr-1.5 shadow-sm focus-within:border-fg/40"
    >
      <SparkIcon width={18} height={18} className="shrink-0 text-muted" />
      <input
        value={interim ? `${value} ${interim}` : value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={speech.listening ? "Listening…" : "Ask for anything… “loafers under $250”"}
        className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[15px] outline-none placeholder:text-muted"
        enterKeyHint="search"
      />
      {speech.supported && (
        <button
          type="button"
          onClick={() => {
            if (speech.listening) {
              speech.stop();
              setInterim("");
            } else {
              before.current = value.trim();
              speech.start();
            }
          }}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
            speech.listening ? "bg-heart text-white" : "text-fg hover:bg-surface-2"
          }`}
          aria-label={speech.listening ? "Stop recording" : "Speak your request"}
        >
          <MicIcon width={20} height={20} className={speech.listening ? "animate-pulse" : ""} />
        </button>
      )}
      <button
        type="submit"
        disabled={busy || !value.trim()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg disabled:opacity-30"
        aria-label="Search"
      >
        <SendIcon width={18} height={18} />
      </button>
    </form>
  );
}
