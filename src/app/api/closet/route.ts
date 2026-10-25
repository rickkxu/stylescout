import { db, CLOSET_BUCKET } from "@/lib/supabase";
import { tagClosetPhoto } from "@/lib/closet";
import { fail, json } from "@/lib/api";
import type { ClosetItem } from "@/lib/types";

export const maxDuration = 120;

export async function GET() {
  try {
    const supa = db();
    const { data, error } = await supa.from("closet_items").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    const items = (data ?? []) as ClosetItem[];
    if (items.length) {
      const { data: signed } = await supa.storage
        .from(CLOSET_BUCKET)
        .createSignedUrls(items.map((i) => i.image_path), 60 * 60);
      const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      for (const item of items) item.image_url = urls.get(item.image_path) ?? undefined;
    }
    return json(items);
  } catch (err) {
    return fail(err);
  }
}

const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// multipart form: image (resized on the device), note (optional)
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("image");
    const note = (form.get("note") as string | null)?.trim() || null;
    if (!(file instanceof File)) return fail("Add a photo", 400);
    const type = TYPES.find((t) => t === file.type);
    if (!type) return fail("Use a JPEG, PNG or WebP photo", 400);

    const bytes = Buffer.from(await file.arrayBuffer());
    const supa = db();
    const ext = type.split("/")[1];
    const path = `${crypto.randomUUID()}.${ext}`;
    const [upload, tags] = await Promise.all([
      supa.storage.from(CLOSET_BUCKET).upload(path, bytes, { contentType: type }),
      tagClosetPhoto({ base64: bytes.toString("base64"), mediaType: type }, note),
    ]);
    if (upload.error) throw upload.error;

    const { data, error } = await supa
      .from("closet_items")
      .insert({ image_path: path, note, name: tags.name, category: tags.category, attributes: tags.attributes, summary: tags.summary })
      .select("*")
      .single();
    if (error) throw error;
    return json(data);
  } catch (err) {
    return fail(err);
  }
}

// Update the note on an item.
export async function PATCH(request: Request) {
  const { id, note, name } = await request.json();
  const update: Record<string, unknown> = {};
  if (note !== undefined) update.note = note?.trim() || null;
  if (name !== undefined) update.name = name;
  const { error } = await db().from("closet_items").update(update).eq("id", id);
  if (error) return fail(error);
  return json({ ok: true });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Missing id", 400);
  const supa = db();
  const { data } = await supa.from("closet_items").select("image_path").eq("id", id).single();
  if (data) await supa.storage.from(CLOSET_BUCKET).remove([data.image_path]);
  const { error } = await supa.from("closet_items").delete().eq("id", id);
  if (error) return fail(error);
  return json({ ok: true });
}
