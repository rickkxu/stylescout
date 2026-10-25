import { after } from "next/server";
import { db } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/categories";
import { doRefresh, getStatuses, isRunning, markRunning } from "@/lib/feeds";
import { fail, json, REC_SELECT } from "@/lib/api";
import type { Recommendation } from "@/lib/types";

export const maxDuration = 300;

const ROW_SIZE = 12;
// Refill a feed automatically when it has fewer unrated items than this...
const REFILL_BELOW = 3;
// ...but not more often than this, and back off after errors.
const REFILL_COOLDOWN_MS = 15 * 60 * 1000;

export async function GET() {
  try {
    const supa = db();
    const [{ data: profile }, statuses] = await Promise.all([
      supa.from("profile").select("onboarded").eq("id", 1).single(),
      getStatuses(),
    ]);

    const rows = await Promise.all(
      CATEGORIES.map(async (c) => {
        const { data } = await supa
          .from("recommendations")
          .select(REC_SELECT)
          .eq("category", c.slug)
          .is("search_id", null)
          .in("status", ["new", "hearted", "bought"])
          .order("created_at", { ascending: false })
          .limit(ROW_SIZE);
        return { ...c, items: (data ?? []) as unknown as Recommendation[] };
      }),
    );

    const toRefill = profile?.onboarded
      ? rows.filter((r) => {
          const s = statuses[r.slug];
          if (isRunning(s)) return false;
          const unrated = r.items.filter((i) => i.status === "new").length;
          const recent = s && Date.now() - new Date(s.updated_at).getTime() < REFILL_COOLDOWN_MS;
          return unrated < REFILL_BELOW && !recent;
        })
      : [];
    if (toRefill.length) {
      await Promise.all(toRefill.map((r) => markRunning(r.slug)));
      after(() => Promise.all(toRefill.map((r) => doRefresh(r.slug))));
    }
    const refilling = new Set(toRefill.map((r) => r.slug));

    return json({
      onboarded: !!profile?.onboarded,
      categories: rows.map((r) => {
        const s = statuses[r.slug];
        return {
          slug: r.slug,
          label: r.label,
          items: r.items,
          refreshing: refilling.has(r.slug) || isRunning(s),
          error: s?.status === "error" ? s.error : null,
        };
      }),
    });
  } catch (err) {
    return fail(err);
  }
}
