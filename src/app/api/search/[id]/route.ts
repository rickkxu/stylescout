import { after } from "next/server";
import { db } from "@/lib/supabase";
import { doSearch } from "@/lib/feeds";
import { fail, json, REC_SELECT } from "@/lib/api";

export const maxDuration = 300;

export async function GET(_req: Request, ctx: RouteContext<"/api/search/[id]">) {
  const { id } = await ctx.params;
  const supa = db();
  const [{ data: search, error }, { data: items }] = await Promise.all([
    supa.from("searches").select("*").eq("id", id).single(),
    supa
      .from("recommendations")
      .select(REC_SELECT)
      .eq("search_id", id)
      .neq("status", "disliked")
      .order("created_at", { ascending: true }),
  ]);
  if (error) return fail("Search not found", 404);
  return json({ search, items: items ?? [] });
}

// "Show me more" for the same request.
export async function POST(_req: Request, ctx: RouteContext<"/api/search/[id]">) {
  const { id } = await ctx.params;
  const { data: search, error } = await db().from("searches").select("*").eq("id", id).single();
  if (error) return fail("Search not found", 404);
  if (search.status !== "running") {
    await db().from("searches").update({ status: "running", error: null }).eq("id", id);
    after(() => doSearch(id, search.prompt));
  }
  return json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/search/[id]">) {
  const { id } = await ctx.params;
  const { error } = await db().from("searches").delete().eq("id", id);
  if (error) return fail(error);
  return json({ ok: true });
}
