export type Sizes = {
  tops?: string;
  waist?: string;
  inseam?: string;
  shoes?: string;
  other?: string;
};

export type Profile = {
  id: number;
  onboarded: boolean;
  height: string | null;
  build: string | null;
  gender: string | null;
  sizes: Sizes;
  budget_min: number | null;
  budget_max: number | null;
  blocked_stores: string[];
};

export type Preference = {
  id: string;
  text: string;
  category: string | null;
  polarity: "like" | "avoid" | "fact";
  source: "told" | "feedback" | "closet" | "onboarding";
  active: boolean;
  created_at: string;
};

export type ClosetItem = {
  id: string;
  image_path: string;
  image_url?: string;
  name: string | null;
  category: string | null;
  attributes: Record<string, string>;
  summary: string | null;
  note: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  url: string;
  title: string;
  brand: string | null;
  retailer: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  category: string | null;
  description: string | null;
};

export type RecStatus = "new" | "hearted" | "disliked" | "bought" | "dismissed";

export type Recommendation = {
  id: string;
  category: string;
  search_id: string | null;
  reason: string | null;
  status: RecStatus;
  created_at: string;
  product: Product;
};

export type Search = {
  id: string;
  prompt: string;
  status: "pending" | "running" | "done" | "error";
  error: string | null;
  created_at: string;
};

export type FeedStatus = {
  category: string;
  status: "idle" | "running" | "error";
  error: string | null;
  updated_at: string;
};
