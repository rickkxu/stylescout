"use client";
import { useRef, useState } from "react";
import { api, resizeImage } from "@/lib/client";
import type { ClosetItem } from "@/lib/types";
import { useToast } from "./Toast";
import { PlusIcon } from "./icons";

// Pick one or more photos; each is resized, uploaded and tagged by the AI.
export function ClosetUploader({ onAdded, label = "Add clothes" }: { onAdded: (item: ClosetItem) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<string[]>([]);
  const toast = useToast();

  const upload = async (files: FileList) => {
    const list = Array.from(files);
    const previews = list.map((f) => URL.createObjectURL(f));
    setPending((p) => [...p, ...previews]);
    await Promise.all(
      list.map(async (file, i) => {
        try {
          const blob = await resizeImage(file);
          const form = new FormData();
          form.append("image", new File([blob], "photo.jpg", { type: "image/jpeg" }));
          const item = await api<ClosetItem>("/api/closet", { method: "POST", body: form });
          onAdded({ ...item, image_url: previews[i] });
        } catch (e) {
          toast({ text: (e as Error).message, tone: "error" });
        } finally {
          setPending((p) => p.filter((x) => x !== previews[i]));
        }
      }),
    );
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) upload(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-sm font-medium text-muted transition hover:border-fg/30 hover:text-fg"
      >
        <PlusIcon width={26} height={26} />
        {label}
      </button>
      {pending.map((src) => (
        <div key={src} className="relative overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
          <img src={src} alt="" className="aspect-[3/4] w-full object-cover opacity-50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-fg/80 px-3 py-1 text-xs font-medium text-bg">Reading…</span>
          </div>
        </div>
      ))}
    </>
  );
}
