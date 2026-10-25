"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, type SetStateAction } from "react";
import { api } from "@/lib/client";
import type { Recommendation, Search } from "@/lib/types";
import { Page } from "@/components/Page";
import { AskBar } from "@/components/AskBar";
import { CardSkeleton, ProductCard, useRecActions } from "@/components/Recs";
import { usePolling } from "@/components/useFeed";
import { RefreshIcon, TrashIcon } from "@/components/icons";

type Result = { search: Search; items: Recommendation[] };
const working = (s?: Search) => s?.status === "pending" || s?.status === "running";

export default function SearchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, setData, error, reload } = usePolling<Result>(`/api/search/${id}`, (d) => working(d.search), 5000);
  const setItems = useCallback(
    (u: SetStateAction<Recommendation[]>) => setData((d) => d && { ...d, items: typeof u === "function" ? u(d.items) : u }),
    [setData],
  );
  const actions = useRecActions(setItems);
  const visible = data?.items.filter((i) => i.status !== "disliked") ?? [];
  const busy = !data || working(data.search);

  const more = async () => {
    setData((d) => d && { ...d, search: { ...d.search, status: "running" } });
    await api(`/api/search/${id}`, { method: "POST" });
    reload();
  };

  return (
    <Page>
      <Link href="/" className="text-sm text-muted hover:text-fg">
        ← Home
      </Link>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">You asked for</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight">{data?.search.prompt ?? "…"}</h1>
        </div>
        <button
          onClick={async () => {
            await api(`/api/search/${id}`, { method: "DELETE" });
            router.push("/");
          }}
          className="rounded-full p-2 text-muted hover:bg-surface hover:text-fg"
          aria-label="Delete this search"
        >
          <TrashIcon width={19} height={19} />
        </button>
      </div>

      {busy && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <RefreshIcon width={15} height={15} className="animate-spin" />
          Searching stores and checking each product page. This takes a minute or two.
        </p>
      )}
      {error && <p className="mt-4 text-sm text-heart">{error}</p>}
      {data?.search.status === "error" && <p className="mt-4 text-sm text-heart">{data.search.error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((rec) => (
          <ProductCard key={rec.id} rec={rec} actions={actions} />
        ))}
        {busy && Array.from({ length: visible.length ? 4 : 8 }, (_, i) => <CardSkeleton key={i} />)}
      </div>

      {!busy && (
        <div className="mt-10 space-y-3">
          <button onClick={more} className="w-full rounded-2xl border border-line bg-surface py-3.5 font-medium hover:border-fg/30">
            Show me more like this
          </button>
          <p className="pt-4 text-center text-xs text-muted">Or ask for something else</p>
          <AskBar />
        </div>
      )}
      {actions.sheets}
    </Page>
  );
}
