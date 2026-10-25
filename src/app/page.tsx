"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { Recommendation, Search } from "@/lib/types";
import { Page } from "@/components/Page";
import { AskBar } from "@/components/AskBar";
import { CardSkeleton, ProductCard, useRecActions } from "@/components/Recs";
import { usePolling } from "@/components/useFeed";
import { ChevronIcon, RefreshIcon } from "@/components/icons";
import { useToast } from "@/components/Toast";

type Row = { slug: string; label: string; items: Recommendation[]; refreshing: boolean; error: string | null };
type Feed = { onboarded: boolean; categories: Row[] };

export default function Home() {
  const router = useRouter();
  const toast = useToast();
  const { data, setData, error, reload } = usePolling<Feed>("/api/feed", (d) => d.categories.some((c) => c.refreshing), 8000);
  const [searches, setSearches] = useState<Search[]>([]);

  useEffect(() => {
    if (data && !data.onboarded) router.replace("/onboarding");
  }, [data, router]);
  useEffect(() => {
    api<Search[]>("/api/search").then(setSearches).catch(() => {});
  }, []);

  // Feedback updates the flat list of all items across rows.
  const setItems = useCallback(
    (update: SetStateAction<Recommendation[]>) =>
      setData((d) => {
        if (!d) return d;
        const all = d.categories.flatMap((c) => c.items);
        const next = typeof update === "function" ? update(all) : update;
        const byId = new Map(next.map((i) => [i.id, i]));
        return { ...d, categories: d.categories.map((c) => ({ ...c, items: c.items.map((i) => byId.get(i.id) ?? i) })) };
      }),
    [setData],
  );
  const actions = useRecActions(setItems);

  const refresh = async (slug: string) => {
    setData((d) => d && { ...d, categories: d.categories.map((c) => (c.slug === slug ? { ...c, refreshing: true, error: null } : c)) });
    try {
      await api(`/api/feed/${slug}`, { method: "POST" });
      reload();
    } catch (e) {
      toast({ text: (e as Error).message, tone: "error" });
    }
  };

  return (
    <Page>
      <header className="mb-4 flex items-center justify-between md:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">StyleScout</h1>
      </header>
      <div className="sticky top-0 z-20 -mx-4 bg-bg/95 px-4 pb-3 pt-2 backdrop-blur md:static md:mx-0 md:px-0 md:pt-0">
        <AskBar />
        {searches.length > 0 && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {searches.slice(0, 8).map((s) => (
              <Link key={s.id} href={`/search/${s.id}`} className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] hover:border-fg/30">
                {s.prompt.length > 32 ? `${s.prompt.slice(0, 30)}…` : s.prompt}
              </Link>
            ))}
          </div>
        )}
      </div>

      {error && !data && <p className="mt-10 text-center text-sm text-heart">{error}</p>}

      <div className="mt-4 space-y-9">
        {(data?.categories ?? PLACEHOLDER).map((row) => {
          const visible = row.items.filter((i) => i.status !== "disliked");
          return (
            <section key={row.slug}>
              <div className="mb-3 flex items-center justify-between">
                <Link href={`/category/${row.slug}`} className="group flex items-center gap-1">
                  <h2 className="text-lg font-semibold tracking-tight">{row.label}</h2>
                  <ChevronIcon width={18} height={18} className="text-muted transition group-hover:translate-x-0.5" />
                </Link>
                <button
                  onClick={() => refresh(row.slug)}
                  disabled={row.refreshing || !data}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-muted hover:bg-surface hover:text-fg disabled:hover:bg-transparent"
                >
                  <RefreshIcon width={15} height={15} className={row.refreshing ? "animate-spin" : ""} />
                  {row.refreshing ? "Finding…" : "More"}
                </button>
              </div>
              {row.error && !row.refreshing && <p className="mb-2 text-xs text-muted">Last refresh: {row.error}</p>}
              <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-5">
                {visible.slice(0, 10).map((rec) => (
                  <div key={rec.id} className="w-[44vw] max-w-[220px] shrink-0 snap-start md:w-auto md:max-w-none">
                    <ProductCard rec={rec} actions={actions} />
                  </div>
                ))}
                {(row.refreshing || !data) &&
                  Array.from({ length: visible.length ? 2 : 4 }, (_, i) => (
                    <div key={`s${i}`} className="w-[44vw] max-w-[220px] shrink-0 md:w-auto md:max-w-none">
                      <CardSkeleton />
                    </div>
                  ))}
                {data && !row.refreshing && !visible.length && (
                  <p className="py-6 text-sm text-muted">Nothing here yet. Tap More to find some picks.</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {actions.sheets}
    </Page>
  );
}

const PLACEHOLDER: Row[] = ["Tees & Tops", "Shirts", "Outerwear"].map((label) => ({ slug: label, label, items: [], refreshing: true, error: null }));
