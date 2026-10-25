"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; text: string; tone: "default" | "learned" | "error"; action?: { label: string; run: () => void } };
const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), t.tone === "learned" ? 6000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-fade pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-lg ${
              t.tone === "error" ? "bg-heart text-white" : "bg-fg text-bg"
            }`}
          >
            {t.tone === "learned" && <span className="text-base">✨</span>}
            <span>{t.text}</span>
            {t.action && (
              <button
                className="ml-1 font-semibold underline underline-offset-2"
                onClick={() => {
                  t.action!.run();
                  setToasts((ts) => ts.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
