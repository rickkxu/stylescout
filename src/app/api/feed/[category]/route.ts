import { after } from "next/server";
import { db } from "@/lib/supabase";
import { categoryLabel, isCategory } from "@/lib/categories";
import { doRefresh, getStatuses, isRunning, markRunning } from "@/lib/feeds";
import { fail, json, REC_SELECT } from "@/lib/api";

export const maxDuration = 300;

export async function GET(_req: Request, ctx: RouteContext<"/api/feed/[category]">) {
  const { category } = await ctx.params;
  if (!isCategory(category)) return fail("Unknown category", 404);
  try {
    const [{ data, error }, statuses] = await Promise.all([
      db()
        .from("recommendations")
        .select(REC_SELECT)
        .eq("category", category)
        .is("search_id", null)
        .in("status", ["new", "hearted", "bought"])
        .order("created_at", { ascending: false })
        .limit(60),
      getStatuses(),
    ]);
    if (error) throw error;
    const s = statuses[category];
    return json({
      slug: category,
      label: categoryLabel(category),
      items: data ?? [],
      refreshing: isRunning(s),
      error: s?.status === "error" ? s.error : null,
    });
  } catch (err) {
    return fail(err);
  }
}

// Ask for a fresh batch now.
export async function POST(_req: Request, ctx: RouteContext<"/api/feed/[category]">) {
  const { category } = await ctx.params;
  if (!isCategory(category)) return fail("Unknown category", 404);
  try {
    const statuses = await getStatuses();
    if (!isRunning(statuses[category])) {
      await markRunning(category);
      after(() => doRefresh(category));
    }
    return json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
