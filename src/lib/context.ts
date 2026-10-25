import "server-only";
import { db } from "./supabase";
import type { Preference, Profile } from "./types";
import { categoryLabel } from "./categories";

export async function getProfile(): Promise<Profile> {
  const { data, error } = await db().from("profile").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as Profile;
}

export async function getActivePreferences(): Promise<Preference[]> {
  const { data, error } = await db()
    .from("preferences")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Preference[];
}

export function formatPreferences(prefs: Preference[], withIds = false): string {
  if (!prefs.length) return "(none yet)";
  return prefs
    .map((p) => {
      const scope = p.category ? categoryLabel(p.category) : "General";
      const tag = p.polarity === "avoid" ? "AVOID" : p.polarity === "like" ? "LIKES" : "FACT";
      return `- ${withIds ? `[${p.id}] ` : ""}(${scope}, ${tag}) ${p.text}`;
    })
    .join("\n");
}

// Everything the app knows about the user, as text for the model.
export async function buildTasteContext(): Promise<string> {
  const supa = db();
  const [profile, prefs, closet, feedback] = await Promise.all([
    getProfile(),
    getActivePreferences(),
    supa.from("closet_items").select("name, category, summary, note").order("created_at", { ascending: false }).limit(40),
    supa
      .from("feedback")
      .select("kind, reasons, comment, created_at, recommendations(category, products(title, brand, retailer, price))")
      .neq("kind", "undo")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const s = profile.sizes ?? {};
  const basics = [
    profile.gender && `Shops: ${profile.gender}`,
    profile.height && `Height: ${profile.height}`,
    profile.build && `Build: ${profile.build}`,
    s.tops && `Top size: ${s.tops}`,
    s.waist && `Waist: ${s.waist}`,
    s.inseam && `Inseam: ${s.inseam}`,
    s.shoes && `Shoe size: ${s.shoes}`,
    s.other && `Other sizing notes: ${s.other}`,
    profile.budget_min != null || profile.budget_max != null
      ? `Budget per item: $${profile.budget_min ?? 0} to $${profile.budget_max ?? "any"}`
      : null,
  ].filter(Boolean);

  const closetLines = (closet.data ?? []).map(
    (c) => `- ${c.name ?? "Item"} (${categoryLabel(c.category ?? "")}): ${c.summary ?? ""}${c.note ? ` | Their note: "${c.note}"` : ""}`,
  );

  type FeedbackRow = {
    kind: string;
    reasons: string[];
    comment: string | null;
    recommendations: { category: string; products: { title: string; brand: string | null; retailer: string | null; price: number | null } | null } | null;
  };
  const feedbackLines = ((feedback.data ?? []) as unknown as FeedbackRow[]).map((f) => {
    const p = f.recommendations?.products;
    const item = p ? `${p.brand ?? p.retailer ?? ""} "${p.title}"${p.price ? ` $${p.price}` : ""}` : "an item";
    const verb = { heart: "LOVED", dislike: "DISLIKED", comment: "COMMENTED ON", bought: "BOUGHT" }[f.kind] ?? f.kind;
    const why = [f.reasons?.length ? `reasons: ${f.reasons.join(", ")}` : "", f.comment ? `said: "${f.comment}"` : ""]
      .filter(Boolean)
      .join("; ");
    return `- ${verb} ${item}${why ? ` (${why})` : ""}`;
  });

  return [
    "## Basics",
    basics.length ? basics.map((b) => `- ${b}`).join("\n") : "(not provided)",
    "",
    "## What they've told us / we've learned",
    formatPreferences(prefs),
    "",
    "## Clothes they own and love",
    closetLines.length ? closetLines.join("\n") : "(none uploaded yet)",
    "",
    "## Recent reactions to suggestions (newest first)",
    feedbackLines.length ? feedbackLines.join("\n") : "(no feedback yet)",
  ].join("\n");
}
