create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  handle text not null unique,
  avatar_emoji text not null default '猫',
  avatar_path text,
  bio text not null default '',
  personality text not null default '',
  likes text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.cats add column if not exists avatar_path text;

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  cat_id uuid not null references public.cats(id) on delete cascade,
  title text not null,
  description text not null,
  type text not null check (type in ('dialogue', 'merge', 'paw_on_top', 'puzzle', 'fishing', 'collect', 'social')),
  unlock_key text,
  reward_affection integer not null default 0,
  reward_card_title text not null,
  reward_card_text text not null,
  reward_image_label text not null default '感谢卡图片',
  created_at timestamptz not null default now()
);

alter table public.quests drop constraint if exists quests_type_check;
alter table public.quests add column if not exists game_key text;
alter table public.quests add column if not exists difficulty integer not null default 1;
alter table public.quests add column if not exists target_score integer not null default 0;
alter table public.quests add column if not exists reward_image_path text;

update public.quests
set type = 'merge',
    game_key = 'merge_cats'
where type in ('puzzle', 'merge')
  and (game_key in ('merge', 'merge_cats') or slug in ('box-puzzle', 'merge-cats', 'achi-cat-stack'));

alter table public.quests add constraint quests_type_check
  check (type in ('dialogue', 'merge', 'paw_on_top', 'puzzle', 'fishing', 'collect', 'social'));

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  cat_id uuid not null references public.cats(id) on delete cascade,
  quest_id uuid references public.quests(id) on delete set null,
  body text not null,
  image_label text not null default '猫咪图片占位',
  image_path text,
  unlock_key text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  image_label text not null default '猫咪图片',
  image_path text not null,
  sort_order integer not null check (sort_order between 1 and 9),
  created_at timestamptz not null default now(),
  unique (post_id, sort_order)
);

create table if not exists public.post_likes (
  player_id uuid not null references public.players(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id, post_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);

create table if not exists public.player_quests (
  player_id uuid not null references public.players(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  status text not null check (status in ('available', 'active', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  primary key (player_id, quest_id)
);

create table if not exists public.player_cats (
  player_id uuid not null references public.players(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade,
  affection integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (player_id, cat_id)
);

create table if not exists public.player_items (
  player_id uuid not null references public.players(id) on delete cascade,
  item_type text not null check (item_type in ('food', 'treat', 'toy')),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, item_type)
);

create table if not exists public.thank_cards (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade,
  title text not null,
  body text not null,
  image_label text not null default '感谢卡图片',
  image_path text,
  created_at timestamptz not null default now(),
  unique (player_id, quest_id)
);

create table if not exists public.dialogue_nodes (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  slug text not null unique,
  title text not null,
  body text not null,
  min_affection integer not null default 0,
  sort_order integer not null default 100
);

create table if not exists public.dialogue_choices (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.dialogue_nodes(id) on delete cascade,
  body text not null,
  next_node_id uuid references public.dialogue_nodes(id) on delete set null,
  affection_delta integer not null default 0,
  sort_order integer not null default 100
);
