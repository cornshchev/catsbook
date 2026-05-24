create or replace function public.assert_player_owner(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.players
    where id = p_player_id and auth_user_id = auth.uid()
  ) then
    raise exception '无权访问这个玩家档案';
  end if;
end;
$$;

create or replace function public.is_unlocked(p_player_id uuid, p_unlock_key text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select case
    when p_unlock_key is null then true
    when p_unlock_key = 'liked_first_post' then exists (
      select 1
      from public.post_likes pl
      join public.posts p on p.id = pl.post_id
      where pl.player_id = p_player_id and p.slug = 'first-morning'
    )
    when p_unlock_key = 'completed_welcome_dialogue' then exists (
      select 1
      from public.player_quests pq
      join public.quests q on q.id = pq.quest_id
      where pq.player_id = p_player_id
        and q.slug in ('welcome-dialogue', 'mimi-welcome')
        and pq.status = 'completed'
    )
    when p_unlock_key like 'quest_completed:%' then exists (
      select 1
      from public.player_quests pq
      join public.quests q on q.id = pq.quest_id
      where pq.player_id = p_player_id
        and q.slug = replace(p_unlock_key, 'quest_completed:', '')
        and pq.status = 'completed'
    )
    else false
  end;
$$;

drop function if exists public.get_feed_posts(uuid);
create or replace function public.get_feed_posts(p_player_id uuid)
returns table (
  id uuid,
  slug text,
  cat_id uuid,
  body text,
  image_label text,
  image_path text,
  sort_order integer,
  created_at timestamptz,
  quest_id uuid,
  cat jsonb,
  quest jsonb,
  liked boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_player_owner(p_player_id);

  return query
  select
    p.id,
    p.slug,
    p.cat_id,
    p.body,
    p.image_label,
    p.image_path,
    p.sort_order,
    p.created_at,
    p.quest_id,
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'handle', c.handle,
      'avatar_emoji', c.avatar_emoji,
      'avatar_path', c.avatar_path,
      'bio', c.bio,
      'personality', c.personality,
      'likes', c.likes
    ) as cat,
    case when q.id is null then null else jsonb_build_object(
      'id', q.id,
      'slug', q.slug,
      'title', q.title,
      'description', q.description,
      'type', q.type,
      'game_key', q.game_key,
      'difficulty', q.difficulty,
      'target_score', q.target_score,
      'reward_card_title', q.reward_card_title,
      'reward_card_text', q.reward_card_text,
      'reward_image_label', q.reward_image_label,
      'reward_image_path', q.reward_image_path,
      'status', coalesce(pq.status, 'available')
    ) end as quest,
    exists (
      select 1 from public.post_likes pl
      where pl.player_id = p_player_id and pl.post_id = p.id
    ) as liked
  from public.posts p
  join public.cats c on c.id = p.cat_id
  left join public.quests q on q.id = p.quest_id
  left join public.player_quests pq on pq.quest_id = q.id and pq.player_id = p_player_id
  where public.is_unlocked(p_player_id, p.unlock_key)
  order by p.sort_order, p.created_at;
end;
$$;

drop function if exists public.get_player_quests(uuid);
create or replace function public.get_player_quests(p_player_id uuid)
returns table (
  id uuid,
  slug text,
  cat_id uuid,
  title text,
  description text,
  type text,
  game_key text,
  difficulty integer,
  target_score integer,
  reward_card_title text,
  status text,
  cat jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_player_owner(p_player_id);

  return query
  select
    q.id,
    q.slug,
    q.cat_id,
    q.title,
    q.description,
    q.type,
    q.game_key,
    q.difficulty,
    q.target_score,
    q.reward_card_title,
    coalesce(pq.status, 'available') as status,
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'handle', c.handle,
      'avatar_emoji', c.avatar_emoji,
      'avatar_path', c.avatar_path
    ) as cat
  from public.quests q
  join public.cats c on c.id = q.cat_id
  left join public.player_quests pq on pq.quest_id = q.id and pq.player_id = p_player_id
  where public.is_unlocked(p_player_id, q.unlock_key)
  order by q.created_at;
end;
$$;

create or replace function public.start_quest(p_player_id uuid, p_quest_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unlock_key text;
begin
  perform public.assert_player_owner(p_player_id);
  select unlock_key into v_unlock_key from public.quests where id = p_quest_id;
  if not found then
    raise exception '任务不存在';
  end if;
  if not public.is_unlocked(p_player_id, v_unlock_key) then
    raise exception '这个任务还没有解锁';
  end if;

  insert into public.player_quests (player_id, quest_id, status, started_at)
  values (p_player_id, p_quest_id, 'active', now())
  on conflict (player_id, quest_id) do update
  set status = case when public.player_quests.status = 'completed' then 'completed' else 'active' end,
      started_at = coalesce(public.player_quests.started_at, now());
end;
$$;

create or replace function public.complete_quest(p_player_id uuid, p_quest_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quest public.quests%rowtype;
  v_already_completed boolean;
  v_difficulty integer;
  v_food_reward integer;
  v_treat_reward integer;
  v_toy_reward integer;
begin
  perform public.assert_player_owner(p_player_id);
  select * into v_quest from public.quests where id = p_quest_id;
  if not found then
    raise exception '任务不存在';
  end if;
  if not public.is_unlocked(p_player_id, v_quest.unlock_key) then
    raise exception '这个任务还没有解锁';
  end if;

  select exists (
    select 1
    from public.player_quests
    where player_id = p_player_id
      and quest_id = p_quest_id
      and status = 'completed'
  ) into v_already_completed;

  insert into public.player_quests (player_id, quest_id, status, started_at, completed_at)
  values (p_player_id, p_quest_id, 'completed', now(), now())
  on conflict (player_id, quest_id) do update
  set status = 'completed',
      completed_at = now(),
      started_at = coalesce(public.player_quests.started_at, now());

  if not v_already_completed then
    v_difficulty := greatest(coalesce(v_quest.difficulty, 1), 1);
    v_food_reward := 2 + v_difficulty * 2;
    v_treat_reward := 1 + v_difficulty;
    v_toy_reward := case when v_difficulty >= 2 then 1 + floor(v_difficulty / 2.0)::integer else 1 end;

    insert into public.player_cats (player_id, cat_id, affection, updated_at)
    values (p_player_id, v_quest.cat_id, v_quest.reward_affection, now())
    on conflict (player_id, cat_id) do update
    set affection = public.player_cats.affection + excluded.affection,
        updated_at = now();

    insert into public.player_items (player_id, item_type, quantity, updated_at)
    values
      (p_player_id, 'food', v_food_reward, now()),
      (p_player_id, 'treat', v_treat_reward, now()),
      (p_player_id, 'toy', v_toy_reward, now())
    on conflict (player_id, item_type) do update
    set quantity = public.player_items.quantity + excluded.quantity,
        updated_at = now();

    insert into public.thank_cards (player_id, quest_id, cat_id, title, body, image_label, image_path)
    values (
      p_player_id,
      v_quest.id,
      v_quest.cat_id,
      v_quest.reward_card_title,
      v_quest.reward_card_text,
      v_quest.reward_image_label,
      v_quest.reward_image_path
    )
    on conflict (player_id, quest_id) do update
    set image_path = excluded.image_path,
        image_label = excluded.image_label;
  end if;
end;
$$;

create or replace function public.feed_cat(p_player_id uuid, p_cat_id uuid, p_item_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta integer;
  v_quantity integer;
begin
  perform public.assert_player_owner(p_player_id);
  v_delta := case p_item_type
    when 'food' then 3
    when 'treat' then 5
    when 'toy' then 7
    else 2
  end;

  select quantity into v_quantity
  from public.player_items
  where player_id = p_player_id and item_type = p_item_type;

  if coalesce(v_quantity, 0) <= 0 then
    raise exception '这个道具已经用完了';
  end if;

  update public.player_items
  set quantity = quantity - 1,
      updated_at = now()
  where player_id = p_player_id and item_type = p_item_type;

  insert into public.player_cats (player_id, cat_id, affection, updated_at)
  values (p_player_id, p_cat_id, v_delta, now())
  on conflict (player_id, cat_id) do update
  set affection = public.player_cats.affection + excluded.affection,
      updated_at = now();
end;
$$;

create or replace function public.get_player_items(p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.assert_player_owner(p_player_id);

  select jsonb_build_object(
    'food', coalesce(max(quantity) filter (where item_type = 'food'), 0),
    'treat', coalesce(max(quantity) filter (where item_type = 'treat'), 0),
    'toy', coalesce(max(quantity) filter (where item_type = 'toy'), 0)
  )
  into v_result
  from public.player_items
  where player_id = p_player_id;

  return coalesce(v_result, jsonb_build_object('food', 0, 'treat', 0, 'toy', 0));
end;
$$;

create or replace function public.get_cat_friends(p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.assert_player_owner(p_player_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'cat_id', pc.cat_id,
    'affection', pc.affection,
    'cat', jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'handle', c.handle,
      'avatar_emoji', c.avatar_emoji,
      'avatar_path', c.avatar_path,
      'bio', c.bio,
      'personality', c.personality,
      'likes', c.likes
    ),
    'dialogues', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', dn.id,
        'title', dn.title,
        'body', dn.body,
        'min_affection', dn.min_affection
      ) order by dn.sort_order)
      from public.dialogue_nodes dn
      where dn.cat_id = pc.cat_id and dn.min_affection <= pc.affection
    ), '[]'::jsonb)
  ) order by c.name), '[]'::jsonb)
  into v_result
  from public.player_cats pc
  join public.cats c on c.id = pc.cat_id
  where pc.player_id = p_player_id;

  return v_result;
end;
$$;

create or replace function public.get_collections(p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_friends jsonb;
  v_cards jsonb;
  v_games jsonb;
begin
  perform public.assert_player_owner(p_player_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'unlocked', pc.player_id is not null,
    'affection', coalesce(pc.affection, 0),
    'cat', jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'handle', c.handle,
      'avatar_emoji', c.avatar_emoji,
      'avatar_path', c.avatar_path
    )
  ) order by c.created_at), '[]'::jsonb)
  into v_friends
  from public.cats c
  left join public.player_cats pc on pc.cat_id = c.id and pc.player_id = p_player_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'unlocked', tc.id is not null,
    'title', coalesce(tc.title, q.reward_card_title),
    'body', coalesce(tc.body, '完成相关任务后解锁。'),
    'image_label', coalesce(tc.image_label, '?'),
    'image_path', tc.image_path,
    'quest', jsonb_build_object('id', q.id, 'title', q.title)
  ) order by q.created_at), '[]'::jsonb)
  into v_cards
  from public.quests q
  left join public.thank_cards tc on tc.quest_id = q.id and tc.player_id = p_player_id;

  v_games := jsonb_build_array(
    jsonb_build_object(
      'id', 'fishing',
      'title', '钓鱼小游戏',
      'description', '重玩已解锁的钓鱼玩法',
      'href', './fishing.html',
      'unlocked', exists (
        select 1
        from public.player_quests pq
        join public.quests q on q.id = pq.quest_id
        where pq.player_id = p_player_id and q.game_key = 'fishing' and pq.status = 'completed'
      )
    ),
    jsonb_build_object(
      'id', 'merge-cats',
      'title', '合成大猫咪',
      'description', '重玩已解锁的合成玩法',
      'href', './merge.html',
      'unlocked', exists (
        select 1
        from public.player_quests pq
        join public.quests q on q.id = pq.quest_id
        where pq.player_id = p_player_id and q.game_key = 'merge_cats' and pq.status = 'completed'
      )
    )
  );

  return jsonb_build_object('friends', v_friends, 'cards', v_cards, 'games', v_games);
end;
$$;

grant execute on function public.assert_player_owner(uuid) to authenticated;
grant execute on function public.is_unlocked(uuid, text) to authenticated;
grant execute on function public.get_feed_posts(uuid) to authenticated;
grant execute on function public.get_player_quests(uuid) to authenticated;
grant execute on function public.start_quest(uuid, uuid) to authenticated;
grant execute on function public.complete_quest(uuid, uuid) to authenticated;
grant execute on function public.feed_cat(uuid, uuid, text) to authenticated;
grant execute on function public.get_player_items(uuid) to authenticated;
grant execute on function public.get_cat_friends(uuid) to authenticated;
grant execute on function public.get_collections(uuid) to authenticated;
