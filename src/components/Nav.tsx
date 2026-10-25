"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartIcon, HomeIcon, UserIcon } from "./icons";

const ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" || p.startsWith("/category") || p.startsWith("/search") },
  { href: "/saved", label: "Saved", Icon: HeartIcon, match: (p: string) => p.startsWith("/saved") },
  { href: "/profile", label: "Profile", Icon: UserIcon, match: (p: string) => p.startsWith("/profile") },
];

export function Nav() {
  const path = usePathname();
  if (path.startsWith("/login") || path.startsWith("/onboarding")) return null;
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-bg px-4 py-6 md:flex">
        <Link href="/" className="mb-8 px-3 text-xl font-semibold tracking-tight">
          StyleScout
        </Link>
        <nav className="flex flex-col gap-1">
          {ITEMS.map(({ href, label, Icon, match }) => {
            const active = match(path);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition ${
                  active ? "bg-surface font-semibold shadow-sm" : "text-muted hover:bg-surface hover:text-fg"
                }`}
              >
                <Icon filled={active} width={20} height={20} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md">
          {ITEMS.map(({ href, label, Icon, match }) => {
            const active = match(path);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${active ? "font-semibold text-fg" : "text-muted"}`}
              >
                <Icon filled={active} width={23} height={23} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
