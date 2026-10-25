"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, type SetStateAction } from "react";
import { api } from "@/lib/client";
import type { Recommendation } from "@/lib/types";
import { Page } from "@/components/Page";
import { CardSkeleton, ProductCard, useRecActions } from "@/components/Recs";
import { usePolling } from "@/components/useFeed";
import { RefreshIcon } from "@/components/icons";
import { useToast } from "@/components/Toast";

type Feed = { slug: string; label: string; items: Recommendation[]; refreshing: boolean; error: string | null };

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const toast = useToast();
  const { data, setData, error, reload } = usePolling<Feed>(`/api/feed/${slug}`, (d) => d.refreshing);
  const setItems = useCallback(
    (u: SetStateAction<Recommendation[]>) => setData((d) => d && { ...d, items: typeof u === "function" ? u(d.items) : u }),
    [setData],
  );
  const actions = useRecActions(setItems);
  const visible = data?.items.filter((i) => i.status !== "disliked") ?? [];

  const refresh = async () => {
    setData((d) => d && { ...d, refreshing: true });
    try {
      await api(`/api/feed/${slug}`, { method: "POST" });
      reload();
    } catch (e) {
      toast({ text: (e as Error).message, tone: "error" });
    }
  };

  return (
    <Page>
      <Link href="/" className="text-sm text-muted hover:text-fg">
        ← Home
      </Link>
      <div className="mt-2 mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{data?.label ?? ""}</h1>
        <button
          onClick={refresh}
          disabled={!data || data.refreshing}
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
        >
          <RefreshIcon width={16} height={16} className={data?.refreshing ? "animate-spin" : ""} />
          {data?.refreshing ? "Finding new picks…" : "Find more"}
        </button>
      </div>
      {error && <p className="text-sm text-heart">{error}</p>}
      {data?.error && !data.refreshing && <p className="mb-3 text-xs text-muted">Last refresh: {data.error}</p>}
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {data?.refreshing && Array.from({ length: 4 }, (_, i) => <CardSkeleton key={`s${i}`} />)}
        {visible.map((rec) => (
          <ProductCard key={rec.id} rec={rec} actions={actions} />
        ))}
        {!data && Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
      </div>
      {actions.sheets}
    </Page>
  );
}
