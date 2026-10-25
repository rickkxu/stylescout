"use client";
import { useEffect, type ReactNode } from "react";
import { CloseIcon } from "./icons";

// Bottom sheet on phones, centered dialog on larger screens.
export function Sheet({ open, onClose, children, title, wide }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="animate-fade absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        className={`animate-sheet relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-2xl md:rounded-3xl ${
          wide ? "md:max-w-3xl" : "md:max-w-lg"
        }`}
      >
        <div className="sticky top-0 z-10 bg-surface/95 px-5 pt-2 backdrop-blur">
          <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-line md:hidden" />
          <div className="flex min-h-11 items-center justify-between gap-3">
            <h2 className="text-base font-semibold">{title}</h2>
            <button onClick={onClose} className="-mr-2 rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Close">
              <CloseIcon width={20} height={20} />
            </button>
          </div>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
