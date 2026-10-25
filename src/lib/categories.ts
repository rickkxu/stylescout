export type CategorySlug =
  | "tops"
  | "shirts"
  | "outerwear"
  | "pants"
  | "shorts"
  | "shoes"
  | "accessories";

export const CATEGORIES: { slug: CategorySlug; label: string; hint: string }[] = [
  { slug: "tops", label: "Tees & Tops", hint: "t-shirts, tanks, polos, henleys, sweatshirts, knitwear" },
  { slug: "shirts", label: "Shirts", hint: "button-ups, oxfords, overshirts, camp collar shirts" },
  { slug: "outerwear", label: "Outerwear", hint: "jackets, coats, chore coats, bombers, puffers" },
  { slug: "pants", label: "Pants", hint: "jeans, chinos, trousers, joggers, cargo pants" },
  { slug: "shorts", label: "Shorts", hint: "chino shorts, denim shorts, athletic shorts, swim" },
  { slug: "shoes", label: "Shoes", hint: "sneakers, boots, loafers, sandals, dress shoes" },
  { slug: "accessories", label: "Accessories", hint: "hats, belts, bags, socks, sunglasses, jewelry" },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export function categoryLabel(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function isCategory(slug: string): slug is CategorySlug {
  return (CATEGORY_SLUGS as string[]).includes(slug);
}

// Quick reasons offered after a dislike
export const DISLIKE_REASONS: Record<CategorySlug, string[]> = {
  tops: ["Too long", "Too boxy", "Too tight", "Wrong color", "Graphic/logo", "Fabric", "Too pricey", "Not my style"],
  shirts: ["Too long", "Collar", "Too slim", "Too baggy", "Wrong color", "Pattern", "Too pricey", "Not my style"],
  outerwear: ["Too long", "Too bulky", "Wrong color", "Material", "Too formal", "Too pricey", "Not my style"],
  pants: ["Too baggy", "Too skinny", "Rise", "Length", "Wrong color", "Material", "Too pricey", "Not my style"],
  shorts: ["Too long", "Too short", "Too baggy", "Wrong color", "Material", "Too pricey", "Not my style"],
  shoes: ["Too chunky", "Too formal", "Too sporty", "Wrong color", "Material", "Too pricey", "Not my style"],
  accessories: ["Too flashy", "Wrong color", "Material", "Don't need it", "Too pricey", "Not my style"],
};

export function dislikeReasons(category: string): string[] {
  return isCategory(category) ? DISLIKE_REASONS[category] : ["Fit", "Wrong color", "Material", "Too pricey", "Not my style"];
}
