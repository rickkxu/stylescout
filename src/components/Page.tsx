import type { ReactNode } from "react";

// Standard page frame: leaves room for the sidebar (desktop) and bottom bar (mobile).
export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main className={`mx-auto w-full max-w-6xl px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] md:pb-12 md:pl-62 md:pr-8 md:pt-8 ${className}`}>
      {children}
    </main>
  );
}
