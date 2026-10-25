import { after } from "next/server";
import { db } from "@/lib/supabase";
import { learnFromComment, maybeConsolidate } from "@/lib/learn";
import { fail, json } from "@/lib/api";

export const maxDuration = 120;

const STATUS: Record<string, string> = { heart: "hearted", dislike: "disliked", bought: "bought", undo: "new" };

// Body: { recommendationId, kind, reasons?, comment?, feedbackId? }
// Passing feedbackId adds reasons/comment to a reaction already recorded.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supa = db();
    const reasons: string[] = Array.isArray(body.reasons) ? body.reasons.slice(0, 10) : [];
    const comment: string | null = body.comment?.trim() || null;

    const { data: rec, error: recErr } = await supa
      .from("recommendations")
      .select("id, status, reason, product:products(title, brand, retailer, price, description)")
      .eq("id", body.recommendationId)
      .single();
    if (recErr || !rec) return fail("Item not found", 404);

    let feedbackId: string | null = body.feedbackId ?? null;
    let kind: string = body.kind;
    if (feedbackId) {
      const { data: existing } = await supa
        .from("feedback")
        .update({ reasons, comment })
        .eq("id", feedbackId)
        .select("kind")
        .single();
      kind = existing?.kind ?? kind;
    } else {
      if (!["heart", "dislike", "bought", "undo", "comment"].includes(kind)) return fail("Unknown feedback", 400);
      const { data: row, error } = await supa
        .from("feedback")
        .insert({ recommendation_id: rec.id, kind, reasons, comment })
        .select("id")
        .single();
      if (error) throw error;
      feedbackId = row.id;
      if (STATUS[kind]) await supa.from("recommendations").update({ status: STATUS[kind] }).eq("id", rec.id);
    }

    // Detailed feedback is learned from right away so you see what changed.
    let learned: string | null = null;
    if (comment) {
      const p = rec.product as unknown as { title: string; brand: string | null; retailer: string | null; price: number | null; description: string | null };
      const desc = `${p.brand ?? p.retailer ?? ""} "${p.title}" ($${p.price ?? "?"}): ${p.description ?? ""}`;
      const reaction = [kind !== "comment" ? kind : "", reasons.join(", ")].filter(Boolean).join(" — ");
      const result = await learnFromComment(desc, comment, reaction || undefined);
      learned = result.summary || null;
      if (learned) await supa.from("feedback").update({ learned }).eq("id", feedbackId);
    } else if (kind !== "undo") {
      // Quick reactions are batched and looked at for patterns now and then.
      after(() => maybeConsolidate().catch((e) => console.error("consolidate", e)));
    }

    return json({ ok: true, feedbackId, learned });
  } catch (err) {
    return fail(err);
  }
}
