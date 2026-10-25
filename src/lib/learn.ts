import "server-only";
import { z } from "zod";
import { askJson } from "./claude";
import { db } from "./supabase";
import { formatPreferences, getActivePreferences } from "./context";
import { CATEGORY_SLUGS } from "./categories";
import type { Preference } from "./types";

const PreferenceChanges = z.object({
  add: z.array(
    z.object({
      text: z.string().describe("A short, specific, standalone preference in plain language, written about the user in third person."),
      category: z.enum(CATEGORY_SLUGS as [string, ...string[]]).nullable().describe("null if it applies to all clothing"),
      polarity: z.enum(["like", "avoid", "fact"]).describe("fact = neutral info like body measurements"),
    }),
  ),
  retire: z.array(z.string()).describe("ids of existing preferences that the new information contradicts or replaces"),
  summary: z.string().describe("One short sentence telling the user what you learned, addressed to them as 'you'. Empty if nothing."),
});
type Changes = z.infer<typeof PreferenceChanges>;

const SYSTEM = `You maintain a personal clothing taste profile for one person.
Turn new information into durable preferences that will help pick clothes they'd buy.
Rules:
- Only record what the information actually supports. Never invent preferences.
- Be specific and concrete (fit, length, rise, color, fabric, silhouette, brand, price, occasion) and keep the user's reasoning when given (e.g. "because they're 5'6\\"").
- Don't duplicate an existing preference; if new info refines or contradicts one, retire the old id and add the updated version.
- Scope to a category when it clearly applies to one; otherwise use null.
- Trivial or one-off reactions with no general lesson should produce no changes.`;

async function apply(changes: Changes, source: Preference["source"], existing: Preference[]) {
  const supa = db();
  const valid = new Set(existing.map((p) => p.id));
  const retire = changes.retire.filter((id) => valid.has(id));
  if (retire.length) await supa.from("preferences").update({ active: false }).in("id", retire);
  if (changes.add.length) {
    await supa.from("preferences").insert(changes.add.map((a) => ({ ...a, source })));
  }
  return { added: changes.add.length, retired: retire.length, summary: changes.summary };
}

// Free-form "here's what I've learned about myself" input, typed or spoken.
export async function learnFromStatement(text: string, source: Preference["source"] = "told") {
  const existing = await getActivePreferences();
  const changes = await askJson({
    system: SYSTEM,
    schema: PreferenceChanges,
    content: `Existing preferences:\n${formatPreferences(existing, true)}\n\nThe user just told us:\n"""${text}"""`,
  });
  return apply(changes, source, existing);
}

// Detailed feedback on one suggested product.
export async function learnFromComment(productDescription: string, comment: string, reaction?: string) {
  const existing = await getActivePreferences();
  const changes = await askJson({
    system: SYSTEM,
    schema: PreferenceChanges,
    content: `Existing preferences:\n${formatPreferences(existing, true)}\n\nWe suggested this item:\n${productDescription}\n\n${
      reaction ? `Their quick reaction: ${reaction}\n` : ""
    }Their comment:\n"""${comment}"""`,
  });
  return apply(changes, "feedback", existing);
}

// Look across many hearts/dislikes for patterns worth writing down.
export async function consolidateFeedback(feedbackSummary: string) {
  const existing = await getActivePreferences();
  const changes = await askJson({
    system: `${SYSTEM}\n- You are looking at a batch of quick reactions. Only add a preference when a pattern shows up across several items.`,
    schema: PreferenceChanges,
    effort: "medium",
    content: `Existing preferences:\n${formatPreferences(existing, true)}\n\nRecent reactions to suggested items:\n${feedbackSummary}`,
  });
  return apply(changes, "feedback", existing);
}

// How many quick reactions to collect before looking for patterns.
export const CONSOLIDATE_EVERY = 8;

export async function maybeConsolidate() {
  const supa = db();
  const { data: profile } = await supa.from("profile").select("last_learned_at").eq("id", 1).single();
  const since = profile?.last_learned_at ?? "1970-01-01";
  const { data: rows } = await supa
    .from("feedback")
    .select("kind, reasons, comment, recommendations(category, products(title, brand, price, description))")
    .in("kind", ["heart", "dislike", "bought"])
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(40);
  if (!rows || rows.length < CONSOLIDATE_EVERY) return null;

  await supa.from("profile").update({ last_learned_at: new Date().toISOString() }).eq("id", 1);
  type Row = {
    kind: string;
    reasons: string[];
    recommendations: { category: string; products: { title: string; brand: string | null; price: number | null; description: string | null } | null } | null;
  };
  const summary = (rows as unknown as Row[])
    .map((r) => {
      const p = r.recommendations?.products;
      return `- ${r.kind.toUpperCase()} [${r.recommendations?.category}] ${p?.brand ?? ""} "${p?.title}" $${p?.price ?? "?"} — ${p?.description ?? ""}${
        r.reasons?.length ? ` (reasons: ${r.reasons.join(", ")})` : ""
      }`;
    })
    .join("\n");
  return consolidateFeedback(summary);
}
