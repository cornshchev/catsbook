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
  created_at timestamptz not null default now()
);

alter table public.quests drop constraint if exists quests_type_check;
alter table public.quests add column if not exists game_key text;
alter table public.quests add column if not exists difficulty integer not null default 1;
alter table public.quests add column if not exists target_score integer not null default 0;
alter table public.quests add column if not exists reward_image_path text;
alter table public.quests drop column if exists reward_image_label;

update public.quests
set type = 'merge'
where type in ('puzzle', 'merge')
  and (game_key in ('merge', 'merge_cats') or slug in ('box-puzzle', 'merge-cats', 'achi-cat-stack'));

update public.quests set type = 'fishing' where game_key = 'fishing';
update public.quests set type = 'paw_on_top' where game_key = 'paw_on_top';
update public.quests set type = 'dialogue' where game_key = 'dialogue';
alter table public.quests drop column if exists game_key;

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
  comment_mode text not null default 'free' check (comment_mode in ('free', 'fixed')),
  fixed_comment_body text check (fixed_comment_body is null or char_length(fixed_comment_body) between 1 and 280),
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

alter table public.posts add column if not exists comment_mode text not null default 'free';
alter table public.posts add column if not exists fixed_comment_body text;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'posts_comment_mode_check') then
    alter table public.posts drop constraint posts_comment_mode_check;
  end if;
  alter table public.posts
    add constraint posts_comment_mode_check check (comment_mode in ('free', 'fixed'));
exception when duplicate_object then
  null;
end $$;

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

create table if not exists public.player_seen_posts (
  player_id uuid not null references public.players(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (player_id, post_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  player_id uuid references public.players(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  cat_id uuid references public.cats(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  check (
    (player_id is not null and cat_id is null)
    or (cat_id is not null and player_id is null)
  )
);

-- 兼容已创建过旧版 comments 表的数据库。
alter table public.comments alter column player_id drop not null;
alter table public.comments add column if not exists slug text unique;
alter table public.comments add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade;
alter table public.comments add column if not exists cat_id uuid references public.cats(id) on delete cascade;
alter table public.comments add column if not exists sort_order integer not null default 100;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'comments_author_type_check') then
    alter table public.comments drop constraint comments_author_type_check;
  end if;

  if exists (select 1 from pg_constraint where conname = 'comments_source_type_check') then
    alter table public.comments drop constraint comments_source_type_check;
  end if;

  if exists (select 1 from pg_constraint where conname = 'comments_author_identity_check') then
    alter table public.comments drop constraint comments_author_identity_check;
  end if;
  alter table public.comments
    add constraint comments_author_identity_check check (
      (player_id is not null and cat_id is null)
      or (cat_id is not null and player_id is null)
    );
end $$;

alter table public.comments drop column if exists author_type;
alter table public.comments drop column if exists source_type;

create table if not exists public.comment_reply_rules (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  cat_id uuid references public.cats(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  match_type text not null default 'contains' check (match_type in ('contains', 'exact', 'regex')),
  keyword text not null check (char_length(keyword) between 1 and 80),
  reply_body text not null check (char_length(reply_body) between 1 and 280),
  once_per_player boolean not null default false,
  is_enabled boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

alter table public.comment_reply_rules add column if not exists slug text unique;
alter table public.comment_reply_rules alter column cat_id drop not null;
alter table public.comment_reply_rules alter column keyword drop not null;
alter table public.comment_reply_rules add column if not exists reply_body text;

do $$
begin
  if to_regclass('public.comment_reply_outputs') is not null then
    update public.comment_reply_rules r
    set reply_body = coalesce(r.reply_body, o.body)
    from public.comment_reply_outputs o
    where o.rule_id = r.id
      and o.sort_order = 1;
  end if;
end $$;

delete from public.comment_reply_rules
where match_type = 'fixed';

delete from public.comment_reply_rules
where coalesce(trim(keyword), '') = ''
   or coalesce(trim(reply_body), '') = '';

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'comment_reply_rules_match_type_check') then
    alter table public.comment_reply_rules drop constraint comment_reply_rules_match_type_check;
  end if;
  alter table public.comment_reply_rules
    add constraint comment_reply_rules_match_type_check check (match_type in ('contains', 'exact', 'regex'));
exception when duplicate_object then
  null;
end $$;

alter table public.comment_reply_rules alter column keyword set not null;
alter table public.comment_reply_rules alter column reply_body set not null;
alter table public.comment_reply_rules drop constraint if exists comment_reply_rules_keyword_check;
alter table public.comment_reply_rules
  add constraint comment_reply_rules_keyword_check check (char_length(keyword) between 1 and 80);
alter table public.comment_reply_rules drop constraint if exists comment_reply_rules_reply_body_check;
alter table public.comment_reply_rules
  add constraint comment_reply_rules_reply_body_check check (char_length(reply_body) between 1 and 280);

drop table if exists public.comment_reply_outputs;

create table if not exists public.comment_likes (
  player_id uuid not null references public.players(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id, comment_id)
);

create table if not exists public.player_comment_rule_triggers (
  player_id uuid not null references public.players(id) on delete cascade,
  rule_id uuid not null references public.comment_reply_rules(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (player_id, rule_id)
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
  image_path text,
  created_at timestamptz not null default now(),
  unique (player_id, quest_id)
);

alter table public.thank_cards drop column if exists image_label;

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
