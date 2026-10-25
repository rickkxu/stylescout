import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { claude, FALLBACK_BETA, MODEL } from "./claude";
import { buildTasteContext, getProfile } from "./context";
import { db } from "./supabase";
import { CATEGORIES, CATEGORY_SLUGS, categoryLabel, type CategorySlug } from "./categories";

// Secondhand, resale and marketplace sites that are never allowed.
export const RESALE_DOMAINS = [
  "ebay.com",
  "poshmark.com",
  "depop.com",
  "grailed.com",
  "mercari.com",
  "thredup.com",
  "vinted.com",
  "therealreal.com",
  "vestiairecollective.com",
  "facebook.com",
  "etsy.com",
  "tradesy.com",
  "rebag.com",
  "stockx.com",
  "goat.com",
  "kidizen.com",
  "swap.com",
  "offerup.com",
  "craigslist.org",
  "fashionphile.com",
  "theluxurycloset.com",
];

const SYSTEM = `You are a sharp personal stylist and shopper for one person. You find real clothing they would actually want to buy.

Where products may come from:
- New items from legitimate retailers: brand sites, department stores, established online shops. Small independent brands are welcome when they fit the person's taste better than big brands.
- Never secondhand, resale, vintage or marketplace listings (eBay, Poshmark, Depop, Grailed, Mercari, ThredUp, Vinted, TheRealReal, Vestiaire, Etsy, StockX, etc.), nothing marked pre-owned or used.
- Amazon or Walmart only when the item is sold by the brand itself, not a third-party seller.
- No knockoff, dropshipping or sketchy stores.

How to work:
1. Search the web for candidates that match the person's taste profile.
2. Open each promising product page with web_fetch to confirm it is a single product page for an item that is currently for sale, and to read the exact product name, current price, and the main product image URL (prefer the og:image or the main product photo; it must be a direct https image URL). Skip anything you couldn't confirm.
3. Pick the best matches. Respect their sizes (prefer items sold in their size), their budget, and every "avoid" preference. Learn from their past reactions: lean toward what they loved, steer away from what they disliked and why.
4. Keep variety: no near-duplicates, and at most 2 items from the same store.
5. Call submit_products exactly once with your final picks.

For each pick write a "reason": one short sentence addressed to them ("you") that ties the item to specific things in their profile, closet or past reactions. Make the reasons concrete, not generic.`;

const SUBMIT_TOOL: Anthropic.Beta.BetaTool = {
  name: "submit_products",
  description: "Submit the final list of verified product picks. Call this once, at the end.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["products"],
    properties: {
      products: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["url", "title", "brand", "retailer", "price", "currency", "image_url", "category", "description", "reason"],
          properties: {
            url: { type: "string", description: "The product page URL you verified" },
            title: { type: "string" },
            brand: { type: "string" },
            retailer: { type: "string", description: "Store name, e.g. Uniqlo" },
            price: { type: ["number", "null"], description: "Current price as a number" },
            currency: { type: "string", description: "ISO code, e.g. USD" },
            image_url: { type: ["string", "null"], description: "Direct https URL of the main product image" },
            category: { type: "string", enum: CATEGORY_SLUGS },
            description: { type: "string", description: "Short factual description: fit, length, fabric, color" },
            reason: { type: "string" },
          },
        },
      },
    },
  },
};

type Pick = {
  url: string;
  title: string;
  brand: string;
  retailer: string;
  price: number | null;
  currency: string;
  image_url: string | null;
  category: CategorySlug;
  description: string;
  reason: string;
};

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function isBlocked(host: string, blocked: string[]) {
  return blocked.some((d) => host === d || host.endsWith(`.${d}`));
}

// Run the search agent until it submits products.
async function runFinder(task: string, blocked: string[], signal: AbortSignal): Promise<Pick[]> {
  const blockedDomains = blocked.slice(0, 64);
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    { type: "web_search_20260209", name: "web_search", max_uses: 8, blocked_domains: blockedDomains },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 12, blocked_domains: blockedDomains },
    SUBMIT_TOOL,
  ];
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: task }];

  for (let turn = 0; turn < 8; turn++) {
    const response = await claude().beta.messages.create(
      {
        model: MODEL,
        max_tokens: 16000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: SYSTEM,
        tools,
        messages,
      },
      { signal },
    );
    if (response.stop_reason === "refusal") throw new Error("The model declined this search.");

    const submit = response.content.find(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === "submit_products",
    );
    if (submit) {
      const input = submit.input as { products?: Pick[] };
      return Array.isArray(input.products) ? input.products : [];
    }

    messages.push({ role: "assistant", content: response.content });
    // pause_turn: the server-side search loop paused; resending resumes it.
    if (response.stop_reason !== "pause_turn") {
      messages.push({ role: "user", content: "Please call submit_products now with the best verified picks you have." });
    }
  }
  throw new Error("The search didn't finish. Try again.");
}

// Read og:image / price straight from the product page. Many stores block bots, so this is best-effort.
async function inspectPage(url: string): Promise<{ gone: boolean; image?: string; price?: number }> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    if (res.status === 404 || res.status === 410) return { gone: true };
    if (!res.ok) return { gone: false };
    const html = (await res.text()).slice(0, 600_000);
    const meta = (prop: string) => {
      const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`,
        "i",
      );
      const m = html.match(re);
      return m ? (m[1] ?? m[2]) : undefined;
    };
    let image = meta("og:image:secure_url") ?? meta("og:image") ?? meta("twitter:image");
    if (image?.startsWith("//")) image = `https:${image}`;
    if (image && !/^https?:/i.test(image)) image = new URL(image, url).toString();
    const priceStr = meta("product:price:amount") ?? meta("og:price:amount");
    const price = priceStr ? Number(priceStr.replace(/[^0-9.]/g, "")) : undefined;
    return { gone: false, image: image?.replace(/&amp;/g, "&"), price: price && Number.isFinite(price) ? price : undefined };
  } catch {
    return { gone: false };
  }
}

// Check picks, save them, and attach them to a feed or a search.
async function savePicks(picks: Pick[], blocked: string[], opts: { category?: CategorySlug; searchId?: string }) {
  const supa = db();
  const seen = new Set<string>();
  const clean = picks.filter((p) => {
    const host = hostOf(p.url);
    if (!host || isBlocked(host, blocked) || seen.has(p.url)) return false;
    if (/pre-?owned|\bused\b|vintage|resale/i.test(`${p.title} ${p.description}`)) return false;
    seen.add(p.url);
    return true;
  });

  // Skip products that were already suggested somewhere in the app.
  if (opts.category && clean.length) {
    const { data: existing } = await supa
      .from("products")
      .select("url")
      .in("url", clean.map((p) => p.url));
    const already = new Set((existing ?? []).map((e) => e.url));
    for (let i = clean.length - 1; i >= 0; i--) if (already.has(clean[i].url)) clean.splice(i, 1);
  }

  const inspected = await Promise.all(clean.map((p) => inspectPage(p.url)));
  const rows = clean
    .map((p, i) => ({ pick: p, info: inspected[i] }))
    .filter(({ info }) => !info.gone);

  let saved = 0;
  for (const { pick, info } of rows) {
    const { data: product, error } = await supa
      .from("products")
      .upsert(
        {
          url: pick.url,
          title: pick.title,
          brand: pick.brand || null,
          retailer: pick.retailer || hostOf(pick.url),
          price: info.price ?? pick.price,
          currency: pick.currency || "USD",
          image_url: info.image ?? pick.image_url,
          category: opts.category ?? pick.category,
          description: pick.description,
        },
        { onConflict: "url" },
      )
      .select("id")
      .single();
    if (error || !product) continue;
    await supa.from("recommendations").insert({
      product_id: product.id,
      category: opts.category ?? pick.category,
      search_id: opts.searchId ?? null,
      reason: pick.reason,
    });
    saved++;
  }
  return saved;
}

async function blockedList() {
  const profile = await getProfile();
  return [...RESALE_DOMAINS, ...(profile.blocked_stores ?? []).map((s) => s.toLowerCase().replace(/^www\./, ""))];
}

async function recentTitles(filter: { category?: string; searchId?: string }) {
  let q = db()
    .from("recommendations")
    .select("status, products(title, retailer)")
    .order("created_at", { ascending: false })
    .limit(60);
  q = filter.searchId ? q.eq("search_id", filter.searchId) : q.eq("category", filter.category!).is("search_id", null);
  const { data } = await q;
  type Row = { status: string; products: { title: string; retailer: string | null } | null };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.products)
    .map((r) => `- ${r.products!.retailer ?? ""} ${r.products!.title}${r.status === "disliked" ? " (disliked)" : ""}`)
    .join("\n");
}

export const FEED_BATCH = 6;
export const SEARCH_BATCH = 8;

export async function refreshCategory(category: CategorySlug, signal: AbortSignal) {
  const [taste, blocked, shown] = await Promise.all([buildTasteContext(), blockedList(), recentTitles({ category })]);
  const cat = CATEGORIES.find((c) => c.slug === category)!;
  const task = `# Taste profile\n${taste}\n\n# Task\nFind ${FEED_BATCH} new picks for their "${cat.label}" feed (${cat.hint}). Stay within their budget. All picks must have category "${category}".\n\nAlready shown in this feed (don't repeat these):\n${shown || "(nothing yet)"}`;
  const picks = await runFinder(task, blocked, signal);
  return savePicks(picks, blocked, { category });
}

export async function runSearch(searchId: string, prompt: string, signal: AbortSignal) {
  const [taste, blocked, shown] = await Promise.all([buildTasteContext(), blockedList(), recentTitles({ searchId })]);
  const task = `# Taste profile\n${taste}\n\n# Task\nThey asked for something specific:\n"""${prompt}"""\n\nFind up to ${SEARCH_BATCH} picks that answer this request and fit their taste. If the request names a price, that overrides their usual budget; otherwise stay within it. Set each pick's category to the best match among: ${CATEGORY_SLUGS.map((c) => `${c} (${categoryLabel(c)})`).join(", ")}.${
    shown ? `\n\nAlready shown for this request (find different ones, and learn from any marked disliked):\n${shown}` : ""
  }`;
  const picks = await runFinder(task, blocked, signal);
  return savePicks(picks, blocked, { searchId });
}
