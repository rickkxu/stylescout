import { db } from "@/lib/supabase";
import { getActivePreferences } from "@/lib/context";
import { learnFromStatement } from "@/lib/learn";
import { fail, json } from "@/lib/api";

export const maxDuration = 120;

export async function GET() {
  try {
    return json(await getActivePreferences());
  } catch (err) {
    return fail(err);
  }
}

// Tell the app something about your taste, in your own words.
export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text?.trim()) return fail("Say or type something first", 400);
    const result = await learnFromStatement(text.trim());
    return json({ ...result, preferences: await getActivePreferences() });
  } catch (err) {
    return fail(err);
  }
}

// Edit a single preference directly.
export async function PATCH(request: Request) {
  try {
    const { id, text, category, polarity } = await request.json();
    const update: Record<string, unknown> = {};
    if (typeof text === "string" && text.trim()) update.text = text.trim();
    if (category !== undefined) update.category = category || null;
    if (polarity) update.polarity = polarity;
    const { error } = await db().from("preferences").update(update).eq("id", id);
    if (error) throw error;
    return json(await getActivePreferences());
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Missing id", 400);
  const { error } = await db().from("preferences").update({ active: false }).eq("id", id);
  if (error) return fail(error);
  return json({ ok: true });
}
