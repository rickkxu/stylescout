import "server-only";
import { db } from "./supabase";
import { refreshCategory, runSearch } from "./finder";
import type { CategorySlug } from "./categories";
import type { FeedStatus } from "./types";

// A refresh that has been "running" longer than this probably died with its function.
const STALE_MS = 6 * 60 * 1000;
// Leave a margin under the function's maxDuration so we can record failures.
const RUN_BUDGET_MS = 280 * 1000;

export function isRunning(s: FeedStatus | undefined) {
  return s?.status === "running" && Date.now() - new Date(s.updated_at).getTime() < STALE_MS;
}

export async function getStatuses(): Promise<Record<string, FeedStatus>> {
  const { data } = await db().from("feed_status").select("*");
  return Object.fromEntries((data ?? []).map((s) => [s.category, s as FeedStatus]));
}

export async function markRunning(category: CategorySlug) {
  await db()
    .from("feed_status")
    .upsert({ category, status: "running", error: null, updated_at: new Date().toISOString() });
}

export async function doRefresh(category: CategorySlug) {
  const supa = db();
  try {
    const saved = await refreshCategory(category, AbortSignal.timeout(RUN_BUDGET_MS));
    await supa.from("feed_status").upsert({
      category,
      status: saved ? "idle" : "error",
      error: saved ? null : "Couldn't find new items this time.",
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`refresh ${category}`, err);
    await supa.from("feed_status").upsert({
      category,
      status: "error",
      error: err instanceof Error ? err.message : "Refresh failed",
      updated_at: new Date().toISOString(),
    });
  }
}

export async function doSearch(searchId: string, prompt: string) {
  const supa = db();
  await supa.from("searches").update({ status: "running" }).eq("id", searchId);
  try {
    const saved = await runSearch(searchId, prompt, AbortSignal.timeout(RUN_BUDGET_MS));
    await supa
      .from("searches")
      .update(saved ? { status: "done" } : { status: "error", error: "Couldn't find matching items. Try rewording." })
      .eq("id", searchId);
  } catch (err) {
    console.error("search", err);
    await supa
      .from("searches")
      .update({ status: "error", error: err instanceof Error ? err.message : "Search failed" })
      .eq("id", searchId);
  }
}
