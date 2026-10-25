import { db } from "@/lib/supabase";
import { fail, json, REC_SELECT } from "@/lib/api";

export async function GET() {
  const { data, error } = await db()
    .from("recommendations")
    .select(REC_SELECT)
    .in("status", ["hearted", "bought"])
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return fail(error);
  return json(data ?? []);
}
