-- StyleScout schema. Paste into the Supabase SQL editor and run once.

create extension if not exists "pgcrypto";

-- Single-user profile (always id = 1)
create table if not exists profile (
  id int primary key default 1 check (id = 1),
  onboarded boolean not null default false,
  height text,
  build text,
  gender text,
  sizes jsonb not null default '{}'::jsonb,
  budget_min numeric,
  budget_max numeric,
  blocked_stores text[] not null default '{}',
  last_learned_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into profile (id) values (1) on conflict do nothing;

-- Things the app knows about the user's taste, in plain language
create table if not exists preferences (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text,               -- null = applies to everything
  polarity text not null default 'like' check (polarity in ('like', 'avoid', 'fact')),
  source text not null default 'told' check (source in ('told', 'feedback', 'closet', 'onboarding')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Clothes the user owns and loves
create table if not exists closet_items (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  name text,
  category text,
  attributes jsonb not null default '{}'::jsonb,
  summary text,
  note text,
  created_at timestamptz not null default now()
);

-- One-off requests ("loafers under $250")
create table if not exists searches (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'error')),
  error text,
  created_at timestamptz not null default now()
);

-- Products found on the web
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  title text not null,
  brand text,
  retailer text,
  price numeric,
  currency text default 'USD',
  image_url text,
  category text,
  description text,
  created_at timestamptz not null default now()
);

-- A product suggested to the user, either in a category feed or for a search
create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  category text not null,
  search_id uuid references searches(id) on delete cascade,
  reason text,
  status text not null default 'new' check (status in ('new', 'hearted', 'disliked', 'bought', 'dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists recommendations_category_idx on recommendations (category, created_at desc) where search_id is null;
create index if not exists recommendations_search_idx on recommendations (search_id);

-- Every piece of feedback, quick or detailed
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid references recommendations(id) on delete cascade,
  kind text not null check (kind in ('heart', 'dislike', 'comment', 'bought', 'undo')),
  reasons text[] not null default '{}',
  comment text,
  learned text,
  created_at timestamptz not null default now()
);

-- Background refresh state per category feed
create table if not exists feed_status (
  category text primary key,
  status text not null default 'idle' check (status in ('idle', 'running', 'error')),
  error text,
  updated_at timestamptz not null default now()
);

-- The app talks to the database only from the server with the service role key,
-- so lock everything down for the public (anon) key.
alter table profile enable row level security;
alter table preferences enable row level security;
alter table closet_items enable row level security;
alter table searches enable row level security;
alter table products enable row level security;
alter table recommendations enable row level security;
alter table feedback enable row level security;
alter table feed_status enable row level security;

-- Private bucket for closet photos
insert into storage.buckets (id, name, public) values ('closet', 'closet', false)
on conflict (id) do nothing;
