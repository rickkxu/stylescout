import { after } from "next/server";
import { db } from "@/lib/supabase";
import { doSearch } from "@/lib/feeds";
import { fail, json } from "@/lib/api";

export const maxDuration = 300;

export async function GET() {
  const { data, error } = await db().from("searches").select("*").order("created_at", { ascending: false }).limit(20);
  if (error) return fail(error);
  return json(data);
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt?.trim()) return fail("Tell me what you're looking for", 400);
    const { data, error } = await db().from("searches").insert({ prompt: prompt.trim() }).select("*").single();
    if (error) throw error;
    after(() => doSearch(data.id, data.prompt));
    return json(data);
  } catch (err) {
    return fail(err);
  }
}
