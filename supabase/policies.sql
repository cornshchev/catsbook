alter table public.players enable row level security;
alter table public.cats enable row level security;
alter table public.quests enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.player_quests enable row level security;
alter table public.player_cats enable row level security;
alter table public.player_items enable row level security;
alter table public.thank_cards enable row level security;
alter table public.dialogue_nodes enable row level security;
alter table public.dialogue_choices enable row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update on public.players to authenticated;
grant select on public.cats to authenticated;
grant select on public.quests to authenticated;
grant select on public.posts to authenticated;
grant select, insert, update on public.post_likes to authenticated;
grant select, insert on public.comments to authenticated;
grant select, insert, update on public.player_quests to authenticated;
grant select, insert, update on public.player_cats to authenticated;
grant select, insert, update on public.player_items to authenticated;
grant select, insert, update on public.thank_cards to authenticated;
grant select on public.dialogue_nodes to authenticated;
grant select on public.dialogue_choices to authenticated;

drop policy if exists "players_select_own" on public.players;
create policy "players_select_own" on public.players for select using (auth_user_id = auth.uid());

drop policy if exists "players_insert_own" on public.players;
create policy "players_insert_own" on public.players for insert with check (auth_user_id = auth.uid());

drop policy if exists "players_update_own" on public.players;
create policy "players_update_own" on public.players for update using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

drop policy if exists "cats_read_authenticated" on public.cats;
create policy "cats_read_authenticated" on public.cats for select to authenticated using (true);

drop policy if exists "quests_read_authenticated" on public.quests;
create policy "quests_read_authenticated" on public.quests for select to authenticated using (true);

drop policy if exists "posts_read_authenticated" on public.posts;
create policy "posts_read_authenticated" on public.posts for select to authenticated using (true);

drop policy if exists "post_likes_read_own" on public.post_likes;
create policy "post_likes_read_own" on public.post_likes for select using (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
);

drop policy if exists "post_likes_insert_own" on public.post_likes;
create policy "post_likes_insert_own" on public.post_likes for insert with check (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
);

drop policy if exists "post_likes_update_own" on public.post_likes;
create policy "post_likes_update_own" on public.post_likes for update using (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
);

drop policy if exists "comments_read_authenticated" on public.comments;
create policy "comments_read_authenticated" on public.comments for select to authenticated using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments for insert with check (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
);

drop policy if exists "player_quests_read_own" on public.player_quests;
create policy "player_quests_read_own" on public.player_quests for select using (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
);

drop policy if exists "player_quests_modify_own" on public.player_quests;
create policy "player_quests_modify_own" on public.player_quests for all using (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
);

drop policy if exists "player_cats_read_own" on public.player_cats;
create policy "player_cats_read_own" on public.player_cats for select using (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
);

drop policy if exists "player_cats_modify_own" on public.player_cats;
create policy "player_cats_modify_own" on public.player_cats for all using (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
);

drop policy if exists "player_items_read_own" on public.player_items;
create policy "player_items_read_own" on public.player_items for select using (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
);

drop policy if exists "player_items_modify_own" on public.player_items;
create policy "player_items_modify_own" on public.player_items for all using (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
);

drop policy if exists "thank_cards_read_own" on public.thank_cards;
create policy "thank_cards_read_own" on public.thank_cards for select using (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
);

drop policy if exists "thank_cards_modify_own" on public.thank_cards;
create policy "thank_cards_modify_own" on public.thank_cards for all using (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.players p where p.id = player_id and p.auth_user_id = auth.uid())
);

drop policy if exists "dialogue_nodes_read_authenticated" on public.dialogue_nodes;
create policy "dialogue_nodes_read_authenticated" on public.dialogue_nodes for select to authenticated using (true);

drop policy if exists "dialogue_choices_read_authenticated" on public.dialogue_choices;
create policy "dialogue_choices_read_authenticated" on public.dialogue_choices for select to authenticated using (true);
