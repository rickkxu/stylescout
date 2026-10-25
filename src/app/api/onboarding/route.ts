import { after } from "next/server";
import { db } from "@/lib/supabase";
import { learnFromStatement } from "@/lib/learn";
import { doRefresh, markRunning } from "@/lib/feeds";
import { CATEGORY_SLUGS } from "@/lib/categories";
import { fail, json } from "@/lib/api";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { error } = await db()
      .from("profile")
      .update({
        height: body.height || null,
        build: body.build || null,
        gender: body.gender || null,
        sizes: body.sizes ?? {},
        budget_min: body.budget_min ?? null,
        budget_max: body.budget_max ?? null,
        onboarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw error;

    let learned = null;
    const about = [body.height && `I'm ${body.height}.`, body.build && `Build: ${body.build}.`, body.about]
      .filter(Boolean)
      .join(" ");
    if (body.about?.trim()) learned = await learnFromStatement(about, "onboarding");

    // Fill every feed in the background.
    await Promise.all(CATEGORY_SLUGS.map((c) => markRunning(c)));
    after(() => Promise.all(CATEGORY_SLUGS.map((c) => doRefresh(c))));
    return json({ ok: true, learned });
  } catch (err) {
    return fail(err);
  }
}
