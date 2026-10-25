import "server-only";
import { z } from "zod";
import { askJson } from "./claude";
import { CATEGORY_SLUGS } from "./categories";

const ClosetTags = z.object({
  name: z.string().describe("Short name, e.g. 'Heavyweight cropped white tee'"),
  category: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
  attributes: z.object({
    brand: z.string().describe("Brand if visible or stated, else empty"),
    color: z.string(),
    fit: z.string().describe("e.g. boxy, slim, relaxed, tapered"),
    length: z.string().describe("e.g. cropped at the waist, hip length, full length, 7in inseam"),
    material: z.string().describe("Best guess of fabric and weight"),
    details: z.string().describe("Collar, neckline, rise, pockets, sole, hardware, etc."),
    style: z.string().describe("e.g. minimal, workwear, preppy, streetwear"),
  }),
  summary: z.string().describe("One or two sentences on what defines this piece and why someone would love it, for a stylist to match against."),
});

export async function tagClosetPhoto(image: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }, note: string | null) {
  return askJson({
    system:
      "You catalog clothing from photos for a personal stylist. Describe the garment precisely: fit, length, proportions, fabric, color and details. If the photo shows several items, describe the most prominent one. Use the owner's note when it adds information.",
    schema: ClosetTags,
    content: [
      { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
      { type: "text", text: note ? `Owner's note: "${note}"` : "No note from the owner." },
    ],
  });
}
