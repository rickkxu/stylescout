import { db } from "@/lib/supabase";
import { getProfile } from "@/lib/context";
import { fail, json } from "@/lib/api";

export async function GET() {
  try {
    return json(await getProfile());
  } catch (err) {
    return fail(err);
  }
}

const EDITABLE = ["height", "build", "gender", "sizes", "budget_min", "budget_max", "blocked_stores"] as const;

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of EDITABLE) if (key in body) update[key] = body[key];
    const { data, error } = await db().from("profile").update(update).eq("id", 1).select("*").single();
    if (error) throw error;
    return json(data);
  } catch (err) {
    return fail(err);
  }
}
