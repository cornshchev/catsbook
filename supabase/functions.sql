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
    when p_unlock_key like 'liked_post:%' then exists (
      select 1
      from public.post_likes pl
      join public.posts p on p.id = pl.post_id
      where pl.player_id = p_player_id
        and p.slug = replace(p_unlock_key, 'liked_post:', '')
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

create or replace function public.quest_difficulty_value(p_difficulty text)
returns integer
language sql
immutable
as $$
  select case upper(coalesce(p_difficulty, 'C'))
    when 'A' then 3
    when 'B' then 2
    else 1
  end;
$$;

create or replace function public.is_quest_visible_by_post(p_player_id uuid, p_quest_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    where p.quest_id = p_quest_id
      and public.is_unlocked(p_player_id, p.unlock_key)
  );
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
  images jsonb,
  sort_order integer,
  created_at timestamptz,
  comment_mode text,
  fixed_comment_body text,
  quest_id uuid,
  cat jsonb,
  quest jsonb,
  liked boolean,
  is_new boolean,
  comments jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_player_owner(p_player_id);

  -- 玩家第一次进入 feed 时，把当前已解锁的帖子作为基线，避免初始帖子全部显示为新帖。
  if not exists (
    select 1
    from public.player_seen_posts psp
    where psp.player_id = p_player_id
  ) then
    insert into public.player_seen_posts (player_id, post_id, seen_at)
    select p_player_id, p.id, now()
    from public.posts p
    where public.is_unlocked(p_player_id, p.unlock_key)
    on conflict (player_id, post_id) do nothing;
  end if;

  return query
  select
    p.id,
    p.slug,
    p.cat_id,
    p.body,
    p.image_label,
    p.image_path,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id::text || '-' || paths.sort_order::text,
          'image_label', p.image_label,
          'image_path', paths.image_path,
          'sort_order', paths.sort_order
        )
        order by paths.sort_order
      )
      from (
        select
          nullif(trim(path_item), '') as image_path,
          path_order::integer as sort_order
        from regexp_split_to_table(coalesce(p.image_path, ''), E'\\s*[,，\\n]\\s*')
          with ordinality as split_paths(path_item, path_order)
        where nullif(trim(path_item), '') is not null
        order by path_order
        limit 9
      ) paths
    ), '[]'::jsonb) as images,
    p.sort_order,
    p.created_at,
    p.comment_mode,
    p.fixed_comment_body,
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
      'difficulty', q.difficulty,
      'target_score', q.target_score,
      'reward_affection', q.reward_affection,
      'reward_card_title', q.reward_card_title,
      'reward_card_text', q.reward_card_text,
      'reward_image_path', q.reward_image_path,
      'status', coalesce(pq.status, 'available')
    ) end as quest,
    exists (
      select 1 from public.post_likes pl
      where pl.player_id = p_player_id and pl.post_id = p.id
    ) as liked,
    not exists (
      select 1 from public.player_seen_posts psp
      where psp.player_id = p_player_id and psp.post_id = p.id
    ) as is_new,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', cm.id,
          'slug', cm.slug,
          'post_id', cm.post_id,
          'parent_comment_id', cm.parent_comment_id,
          'player_id', cm.player_id,
          'cat_id', cm.cat_id,
          'body', cm.body,
          'sort_order', cm.sort_order,
          'created_at', cm.created_at,
          'author_name', case when cm.cat_id is not null then cc.name else cp.display_name end,
          'author_handle', case when cm.cat_id is not null then cc.handle else '玩家评论' end,
          'author_avatar_emoji', case when cm.cat_id is not null then cc.avatar_emoji else '你' end,
          'author_avatar_path', case when cm.cat_id is not null then cc.avatar_path else null end,
          'liked', exists (
            select 1 from public.comment_likes cl
            where cl.player_id = p_player_id and cl.comment_id = cm.id
          )
        )
        order by cm.sort_order, cm.created_at, cm.id
      )
      from public.comments cm
      left join public.cats cc on cc.id = cm.cat_id
      left join public.players cp on cp.id = cm.player_id
      where cm.post_id = p.id
    ), '[]'::jsonb) as comments
  from public.posts p
  join public.cats c on c.id = p.cat_id
  left join public.quests q on q.id = p.quest_id
  left join public.player_quests pq on pq.quest_id = q.id and pq.player_id = p_player_id
  where public.is_unlocked(p_player_id, p.unlock_key)
  order by p.sort_order, p.created_at;
end;
$$;

create or replace function public.mark_feed_posts_seen(p_player_id uuid, p_post_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_player_owner(p_player_id);

  insert into public.player_seen_posts (player_id, post_id, seen_at)
  select p_player_id, p.id, now()
  from public.posts p
  join unnest(coalesce(p_post_ids, array[]::uuid[])) as requested(post_id) on requested.post_id = p.id
  where public.is_unlocked(p_player_id, p.unlock_key)
  on conflict (player_id, post_id) do update
  set seen_at = excluded.seen_at;
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
  difficulty text,
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
  where public.is_quest_visible_by_post(p_player_id, q.id)
  order by (
    select min(p.sort_order)
    from public.posts p
    where p.quest_id = q.id
      and public.is_unlocked(p_player_id, p.unlock_key)
  ), q.created_at;
end;
$$;

create or replace function public.start_quest(p_player_id uuid, p_quest_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_player_owner(p_player_id);

  if not exists (select 1 from public.quests where id = p_quest_id) then
    raise exception '任务不存在';
  end if;

  if not public.is_quest_visible_by_post(p_player_id, p_quest_id) then
    raise exception '这个任务还没有通过帖子解锁';
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
  if not public.is_quest_visible_by_post(p_player_id, p_quest_id) then
    raise exception '这个任务还没有通过帖子解锁';
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
    v_difficulty := public.quest_difficulty_value(v_quest.difficulty);
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

    insert into public.thank_cards (player_id, quest_id, cat_id, title, body, image_path)
    values (
      p_player_id,
      v_quest.id,
      v_quest.cat_id,
      v_quest.reward_card_title,
      v_quest.reward_card_text,
      v_quest.reward_image_path
    )
    on conflict (player_id, quest_id) do update
    set image_path = excluded.image_path;
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
        where pq.player_id = p_player_id and q.type = 'fishing' and pq.status = 'completed'
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
        where pq.player_id = p_player_id and q.type = 'merge' and pq.status = 'completed'
      )
    ),
    jsonb_build_object(
      'id', 'paw-on-top',
      'title', '猫爪在上',
      'description', '重玩已解锁的拍爪玩法',
      'href', './paw-on-top.html',
      'unlocked', exists (
        select 1
        from public.player_quests pq
        join public.quests q on q.id = pq.quest_id
        where pq.player_id = p_player_id and q.type = 'paw_on_top' and pq.status = 'completed'
      )
    )
  );

  return jsonb_build_object('friends', v_friends, 'cards', v_cards, 'games', v_games);
end;
$$;

-- 判断评论是否命中某条自动回复规则。正则写错时返回 false，避免影响评论提交。
create or replace function public.comment_rule_matches(p_match_type text, p_keyword text, p_body text)
returns boolean
language plpgsql
immutable
as $$
begin
  if coalesce(trim(p_keyword), '') = '' or coalesce(trim(p_body), '') = '' then
    return false;
  end if;

  if p_match_type = 'exact' then
    return lower(trim(p_body)) = lower(trim(p_keyword));
  end if;

  if p_match_type = 'regex' then
    begin
      return p_body ~* p_keyword;
    exception when invalid_regular_expression then
      return false;
    end;
  end if;

  return position(lower(p_keyword) in lower(p_body)) > 0;
end;
$$;

drop function if exists public.create_post_comment(uuid, uuid, text);
drop function if exists public.create_post_comment(uuid, uuid, text, uuid);

-- 创建玩家评论，并按帖子配置和自动回复规则插入猫咪回复。
create or replace function public.create_post_comment(p_player_id uuid, p_post_id uuid, p_body text, p_parent_comment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.posts%rowtype;
  v_parent public.comments%rowtype;
  v_comment public.comments%rowtype;
  v_rule public.comment_reply_rules%rowtype;
  v_reply public.comments%rowtype;
  v_auto_reply_count integer := 0;
  v_comments jsonb;
  v_body text;
begin
  perform public.assert_player_owner(p_player_id);

  v_body := trim(coalesce(p_body, ''));

  if char_length(v_body) < 1 or char_length(v_body) > 280 then
    raise exception '评论需要写 1 到 280 个字。';
  end if;

  select * into v_post
  from public.posts
  where id = p_post_id;

  if not found or not public.is_unlocked(p_player_id, v_post.unlock_key) then
    raise exception '这条猫咪动态暂时还不能评论。';
  end if;

  if p_parent_comment_id is not null then
    select * into v_parent
    from public.comments
    where id = p_parent_comment_id and post_id = p_post_id;

    if not found then
      raise exception '要回复的评论不存在。';
    end if;

    if v_parent.player_id is null then
      raise exception '猫咪剧情回复不能继续回复。';
    end if;
  end if;

  if v_post.comment_mode = 'fixed' and p_parent_comment_id is null then
    if coalesce(trim(v_post.fixed_comment_body), '') = '' then
      raise exception '这条动态暂时没有可发送的剧情评论。';
    end if;
    v_body := trim(v_post.fixed_comment_body);

    if exists (
      select 1
      from public.comments c
      where c.post_id = p_post_id
        and c.player_id = p_player_id
        and c.parent_comment_id is null
    ) then
      raise exception '这条剧情评论已经发送过啦。';
    end if;
  end if;

  insert into public.comments (player_id, post_id, parent_comment_id, body, sort_order)
  values (p_player_id, p_post_id, p_parent_comment_id, v_body, 1000)
  returning * into v_comment;

  if p_parent_comment_id is null then
    select r.* into v_rule
    from public.comment_reply_rules r
    where r.is_enabled
      and (r.cat_id is null or r.cat_id = v_post.cat_id)
      and (r.post_id is null or r.post_id = p_post_id)
      and public.comment_rule_matches(r.match_type, r.keyword, v_body)
      and (
        not r.once_per_player
        or not exists (
          select 1
          from public.player_comment_rule_triggers t
          where t.player_id = p_player_id and t.rule_id = r.id
        )
      )
    order by r.sort_order, r.created_at
    limit 1;

    if found then
      if v_rule.once_per_player then
        insert into public.player_comment_rule_triggers (player_id, rule_id, comment_id)
        values (p_player_id, v_rule.id, v_comment.id)
        on conflict (player_id, rule_id) do nothing;
      end if;

      insert into public.comments (post_id, parent_comment_id, cat_id, body, sort_order)
      values (
        p_post_id,
        v_comment.id,
        v_post.cat_id,
        v_rule.reply_body,
        1001
      )
      returning * into v_reply;

      v_auto_reply_count := 1;
    end if;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', cm.id,
      'slug', cm.slug,
      'post_id', cm.post_id,
      'parent_comment_id', cm.parent_comment_id,
      'player_id', cm.player_id,
      'cat_id', cm.cat_id,
      'body', cm.body,
      'sort_order', cm.sort_order,
      'created_at', cm.created_at,
      'author_name', case when cm.cat_id is not null then cc.name else cp.display_name end,
      'author_handle', case when cm.cat_id is not null then cc.handle else '玩家评论' end,
      'author_avatar_emoji', case when cm.cat_id is not null then cc.avatar_emoji else '你' end,
      'author_avatar_path', case when cm.cat_id is not null then cc.avatar_path else null end,
      'liked', exists (
        select 1 from public.comment_likes cl
        where cl.player_id = p_player_id and cl.comment_id = cm.id
      )
    )
    order by cm.sort_order, cm.created_at, cm.id
  ), '[]'::jsonb)
  into v_comments
  from public.comments cm
  left join public.cats cc on cc.id = cm.cat_id
  left join public.players cp on cp.id = cm.player_id
  where cm.post_id = p_post_id;

  return jsonb_build_object(
    'comment', to_jsonb(v_comment),
    'auto_reply_count', v_auto_reply_count,
    'comments', v_comments
  );
end;
$$;

create or replace function public.create_post_comment(p_player_id uuid, p_post_id uuid, p_body text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.create_post_comment(p_player_id, p_post_id, p_body, null::uuid);
$$;

create or replace function public.delete_post_comment(p_player_id uuid, p_comment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment public.comments%rowtype;
  v_comments jsonb;
begin
  perform public.assert_player_owner(p_player_id);

  select * into v_comment
  from public.comments
  where id = p_comment_id;

  if not found then
    raise exception '这条评论不存在。';
  end if;

  if v_comment.player_id <> p_player_id then
    raise exception '只能删除自己的评论。';
  end if;

  if not exists (
    select 1
    from public.posts p
    where p.id = v_comment.post_id
      and public.is_unlocked(p_player_id, p.unlock_key)
  ) then
    raise exception '这条评论暂时不能删除。';
  end if;

  delete from public.comments
  where id = p_comment_id
    and player_id = p_player_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', cm.id,
      'slug', cm.slug,
      'post_id', cm.post_id,
      'parent_comment_id', cm.parent_comment_id,
      'player_id', cm.player_id,
      'cat_id', cm.cat_id,
      'body', cm.body,
      'sort_order', cm.sort_order,
      'created_at', cm.created_at,
      'author_name', case when cm.cat_id is not null then cc.name else cp.display_name end,
      'author_handle', case when cm.cat_id is not null then cc.handle else '玩家评论' end,
      'author_avatar_emoji', case when cm.cat_id is not null then cc.avatar_emoji else '你' end,
      'author_avatar_path', case when cm.cat_id is not null then cc.avatar_path else null end,
      'liked', exists (
        select 1 from public.comment_likes cl
        where cl.player_id = p_player_id and cl.comment_id = cm.id
      )
    )
    order by cm.sort_order, cm.created_at, cm.id
  ), '[]'::jsonb)
  into v_comments
  from public.comments cm
  left join public.cats cc on cc.id = cm.cat_id
  left join public.players cp on cp.id = cm.player_id
  where cm.post_id = v_comment.post_id;

  return jsonb_build_object('post_id', v_comment.post_id, 'comments', v_comments);
end;
$$;

-- 点赞评论并奖励猫粮 +1。重复点赞不会重复给奖励。
create or replace function public.like_comment(p_player_id uuid, p_comment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_count integer := 0;
begin
  perform public.assert_player_owner(p_player_id);

  if not exists (
    select 1
    from public.comments c
    join public.posts p on p.id = c.post_id
    where c.id = p_comment_id
      and public.is_unlocked(p_player_id, p.unlock_key)
  ) then
    raise exception '这条评论暂时不能点赞。';
  end if;

  if exists (
    select 1
    from public.comments c
    where c.id = p_comment_id
      and c.player_id = p_player_id
  ) then
    raise exception '不能给自己的评论点赞。';
  end if;

  insert into public.comment_likes (player_id, comment_id)
  values (p_player_id, p_comment_id)
  on conflict (player_id, comment_id) do nothing;

  get diagnostics v_row_count = row_count;

  if v_row_count > 0 then
    insert into public.player_items (player_id, item_type, quantity, updated_at)
    values (p_player_id, 'food', 1, now())
    on conflict (player_id, item_type) do update
    set quantity = public.player_items.quantity + 1,
        updated_at = now();
  end if;

  return jsonb_build_object('liked', true, 'reward_food', case when v_row_count > 0 then 1 else 0 end);
end;
$$;

grant execute on function public.assert_player_owner(uuid) to authenticated;
grant execute on function public.is_unlocked(uuid, text) to authenticated;
grant execute on function public.quest_difficulty_value(text) to authenticated;
grant execute on function public.is_quest_visible_by_post(uuid, uuid) to authenticated;
grant execute on function public.get_feed_posts(uuid) to authenticated;
grant execute on function public.mark_feed_posts_seen(uuid, uuid[]) to authenticated;
grant execute on function public.get_player_quests(uuid) to authenticated;
grant execute on function public.start_quest(uuid, uuid) to authenticated;
grant execute on function public.complete_quest(uuid, uuid) to authenticated;
grant execute on function public.feed_cat(uuid, uuid, text) to authenticated;
grant execute on function public.get_player_items(uuid) to authenticated;
grant execute on function public.get_cat_friends(uuid) to authenticated;
grant execute on function public.get_collections(uuid) to authenticated;
grant execute on function public.comment_rule_matches(text, text, text) to authenticated;
grant execute on function public.create_post_comment(uuid, uuid, text) to authenticated;
grant execute on function public.create_post_comment(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.delete_post_comment(uuid, uuid) to authenticated;
grant execute on function public.like_comment(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
