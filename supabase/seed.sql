insert into public.cats (id, slug, name, handle, avatar_emoji, avatar_path, bio, personality, likes) values
  ('10000000-0000-0000-0000-000000000001', 'dogy', '二狗', 'dogy@catsbook.com', '狗', 'avatars/dogy.png', '本网站的幕后黑手，如果遇到了bug，请在论坛上发帖求助，毕竟猫师傅都是专业的！', '懒癌晚期，但怎么能压力一只小狗呢！', array['咩咩', '鱿鱼丝', '咩咩']),
  ('10000000-0000-0000-0000-000000000002', 'mimi', '咪咪', 'mimi@catsbook.com', '咪', 'avatars/mimi.jpg', '有着白手套的简州猫，喜欢出现在宿舍楼和食堂的路上，每天最烦恼的事是用什么姿势睡觉。', '柔软的可以随时rua的大猫咪', array['摸后脑勺', '鱼（挑食）', '睡大觉']),
  ('10000000-0000-0000-0000-000000000003', 'gian', '胖虎', 'gian@catsbook.com', '虎', 'avatars/gian.jpg', '长相严肃的胖彩狸，但其实只是眼睛小而已！也是很喜欢和两脚兽贴贴的，除非是有饭吃。', '减肥ing，不要再用猫粮诱惑我了！', array['吃饭', '吃饭', '雨后泥土味']),
  ('10000000-0000-0000-0000-000000000004', 'baga', '嘎子', 'baga@catsbook.com', '嘎', 'avatars/baga.jpg', '说我长得丑的不许靠近我半步！还有，拍照的时候镜头举高点，低角度拍我的真要被我追杀。', '明明就是很可耐的奶牛猫', array['游戏', '揣手手', '南瓜垫子']),
  ('10000000-0000-0000-0000-000000000005', 'coco', '可可', 'coco@catsbook.com', '嘎', 'avatars/coco.jpg', '随机刷新在远处专家楼的橘猫，有时也会去食堂附近找其他猫猫吵架（划掉）玩耍。', '可可应该是一个可爱的大橘，没错！', array['神秘', '夜猫子（好像本来就是猫子）']),
  ('10000000-0000-0000-0000-000000000006', 'miea', '咩咩', 'miea@catsbook.com', '咩', 'avatars/miea.png', '天降黑手二号，第一次来到猫书，正在好奇地持续挖掘新的猫咪帖子……', '只想每天找茬咬人，但怎么能压力一只小羊呢！', array['狗子', '芒果', '狗子'])

on conflict (id) do update set
  name = excluded.name,
  handle = excluded.handle,
  avatar_emoji = excluded.avatar_emoji,
  avatar_path = excluded.avatar_path,
  bio = excluded.bio,
  personality = excluded.personality,
  likes = excluded.likes;

insert into public.quests (id, slug, cat_id, title, description, type, game_key, difficulty, target_score, unlock_key, reward_affection, reward_card_title, reward_card_text, reward_image_label, reward_image_path) values
  ('20000000-0000-0000-0000-000000000001', 'mimi-welcome', '10000000-0000-0000-0000-000000000002', '咪咪的见面', '和咪咪的第一次相遇，居然摸到了脑袋！', 'dialogue', 'dialogue', 1, 0, 'liked_first_post', 10, '咪咪的见面卡片', '我是掌管吃饭和睡觉的咪。', '夜晚坐在地上的咪', 'cards/mimi-card-1.jpg'),
  ('20000000-0000-0000-0000-000000000002', 'night-fishing', '10000000-0000-0000-0000-000000000002', '钓一条鱼', '咪咪想吃夜宵了，去找一条鱼吧！', 'fishing', 'fishing', 2, 1, 'quest_completed:mimi-welcome', 15, '咪咪的夜宵感谢信', '“告诉老默，我想吃鱼了”', '吃饱喝足满足的咪', 'cards/mimi-card-2.jpg'),
  ('20000000-0000-0000-0000-000000000003', 'gian-welcome', '10000000-0000-0000-0000-000000000003', '胖虎的见面', '和胖虎的第一次相遇，真是猫不可相貌。', 'dialogue', 'dialogue', 1, 0, 'quest_completed:night-fishing', 10, '胖虎的见面卡片', '横看成球侧成球', '圆圆的胖虎', 'cards/gian-card-1.jpg'),
  ('20000000-0000-0000-0000-000000000004', 'new-game', '10000000-0000-0000-0000-000000000003', '猫咪的新游戏', '来帮胖虎完代打合成大猫咪吧！', 'merge', 'merge_cats', 2, 1000, 'quest_completed:gian-welcome', 15, '胖虎的游戏代打感谢', '什么好康的，是新游戏吗', '干饭干出残影的胖虎', 'cards/gian-card-2.jpg'),
  ('20000000-0000-0000-0000-000000000005', 'baga-welcome', '10000000-0000-0000-0000-000000000004', '嘎子的见面', '和嘎子的第一次相遇，看起来就不好惹。', 'dialogue', 'dialogue', 1, 0, 'quest_completed:gian-welcome', 10, '嘎子的见面卡片', '猫中大佐', '圆圆的嘎子', 'cards/baga-card-1.jpg'),
  ('20000000-0000-0000-0000-000000000006', 'more-fishes', '10000000-0000-0000-0000-000000000002', '再钓一条鱼', '咪咪的鱼吃完了，再去找一条鱼吧！', 'fishing', 'fishing', 3, 2, 'quest_completed:baga-welcome', 20, '咪咪的鱼子护身符', '有了这个护身符，钓鱼永不空军', '露出肚皮的咪咪', 'cards/mimi-card-3.jpg'),
  ('20000000-0000-0000-0000-000000000007', 'baga-merge', '10000000-0000-0000-0000-000000000004', '代肝业务拓展', '嘎子看到胖虎在玩新游戏，决定要超过他', 'merge', 'merge_cats', 3, 1500, 'quest_completed:new-game', 15, '嘎子的奇妙自拍', '嘘，不要告诉其他人', '嘎子的低角度自拍', 'cards/baga-card-2.jpg'),
  ('20000000-0000-0000-0000-000000000008', 'coco-welcome', '10000000-0000-0000-0000-000000000005', '可可的见面', '和可可的第一次相遇，真是可爱到犯规。', 'dialogue', 'dialogue', 1, 0, 'quest_completed:baga-merge', 10, '可可的见面卡片', '可可是一只只会贴贴的猫咪', '可可和两脚兽的自拍', 'cards/coco-card-1.jpg'),
  ('20000000-0000-0000-0000-000000000009', 'ending', '10000000-0000-0000-0000-000000000001', '写在最后的话', '这里没有东西', 'dialogue', 'dialogue', 1, 0, 'quest_completed:coco-welcome', 100, '2026.5.20', '记录每一朵玫瑰', '520礼物合照', 'cards/ending-card.jpg'),
  ('20000000-0000-0000-0000-000000000010', 'A new beginning', '10000000-0000-0000-0000-000000000006', '新的开始', '这里没有东西', 'dialogue', 'dialogue', 1, 0, 'quest_completed:ending', 100, '2026.5.23', '记录每一朵玫瑰', '520礼物合照', 'cards/A new beginning.jpg')





on conflict (id) do update set
  slug = excluded.slug,
  cat_id = excluded.cat_id,
  title = excluded.title,
  description = excluded.description,
  type = excluded.type,
  game_key = excluded.game_key,
  difficulty = excluded.difficulty,
  target_score = excluded.target_score,
  unlock_key = excluded.unlock_key,
  reward_affection = excluded.reward_affection,
  reward_card_title = excluded.reward_card_title,
  reward_card_text = excluded.reward_card_text,
  reward_image_label = excluded.reward_image_label,
  reward_image_path = excluded.reward_image_path;

insert into public.posts (id, slug, cat_id, quest_id, body, image_label, image_path, unlock_key, sort_order) values
  ('30000000-0000-0000-0000-000000000001', 'first-morning', '10000000-0000-0000-0000-000000000002', null, '今日OOTD：阳光不错，自带模糊半身照', '咪咪的半身照', 'posts/mimi-post-1.jpg', null, 1),
  ('30000000-0000-0000-0000-000000000002', 'mimi-welcome', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '居然有新人赞我！有没有扩列dd ´ₒ⦁⩊⦁ₒ`', '咪咪的见面卡片', 'posts/mimi-post-2.jpg', 'liked_first_post', 2),
  ('30000000-0000-0000-0000-000000000003', 'night-fishing', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '刚准备躺下又饿了。。。 有没有好心人打赏份夜宵', '夜钓', 'posts/mimi-post-3.jpg', 'quest_completed:mimi-welcome', 3),
  ('30000000-0000-0000-0000-000000000004', 'gian-welcome', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '所以这个网站能点外卖吗', '胖虎霸气走来', 'posts/gian-post-1.jpg', 'quest_completed:night-fishing', 4),
  ('30000000-0000-0000-0000-000000000005', 'new-game', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', '合成大猫咪代肝招募，需要一位电竞高手', '坐着的胖虎', 'posts/gian-post-2.jpg', 'quest_completed:gian-welcome', 5),
  ('30000000-0000-0000-0000-000000000006', 'baga-welcome', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000005', '锐评自拍不玻璃心', '嘎子的自拍', 'posts/baga-post-1.jpg', 'quest_completed:gian-welcome', 6),
  ('30000000-0000-0000-0000-000000000007', 'more-fishes', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006', '好饿！为什么一条鱼这么小！', '寻找食物的咪咪', 'posts/mimi-post-4.jpg', 'quest_completed:baga-welcome', 7),
  ('30000000-0000-0000-0000-000000000008', 'baga-merge', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000007', '冲分合成大猫咪，有接单的小窗我', '虎视眈眈的嘎子', 'posts/baga-post-2.jpg', 'quest_completed:new-game', 8),
  ('30000000-0000-0000-0000-000000000009', 'coco-welcome', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000008', '太阳这么暖洋洋，一定也是大橘吧', '可可的见面卡片', 'posts/coco-post-1.jpg', 'quest_completed:baga-merge', 9),
  ('30000000-0000-0000-0000-000000000010', 'ending', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000009', '至此这个游戏的MVP版本就结束啦！很不好意思把这个简陋的东西拿出来作为520礼物，从来自咩咩的灵感火花到整个项目的落地还是来之不易的，不许说我敷衍！整个游戏开发得很匆忙，如果有奇奇怪怪的bug请见谅>ω<，做这个网页项目还有个私心，就是想和你一起有一个共同的工作空间。麻雀虽小，但项目还是有完整的前端，后端，美术，测试，运维的流程的，我们的共同话题不必只局限于吃喝玩乐，还能够通过这样的方式一起学习，或许也对就业有所帮助（？）恭迎你来添砖加瓦⸜(>ᰔ<)⸝', '结束海报', 'posts/ending-post.png', 'quest_completed:coco-welcome', 10),
  ('30000000-0000-0000-0000-000000000011', 'A new beginning', '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000010', '今天听说咪咪们都会刷猫书，是在这里吗？和咪咪的合影证明我不是陌生的两脚兽', '第一次看猫书的两脚兽', 'posts/miea-post-1.jpg', 'quest_completed:ending', 10)
 

on conflict (id) do update set
  slug = excluded.slug,
  cat_id = excluded.cat_id,
  quest_id = excluded.quest_id,
  body = excluded.body,
  image_label = excluded.image_label,
  image_path = excluded.image_path,
  unlock_key = excluded.unlock_key,
  sort_order = excluded.sort_order;

insert into public.dialogue_nodes (id, cat_id, slug, title, body, min_affection, sort_order) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'mimi-window-first', '路边初遇', '咪咪！', 0, 1),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'mimi-real-name', '刘波', '咪咪原来有大名！一起前来看望咪咪的同学透露到', 50, 2),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'gian-first-meet', '^ω^', ' ', 0, 1),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'gian-second-meet', '^ω^', ' ', 50, 2),
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'gian-thrd-meet', '^ω^', ' ', 100, 3),
  ('40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'dogy-dogy', '好感度', '狗子好感度永远是100%', 0, 1),
  ('40000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000006', 'miea-miea', '好感度', '咩咩永远爱你^333333^', 0, 1)

on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  min_affection = excluded.min_affection,
  sort_order = excluded.sort_order;

insert into public.dialogue_choices (id, node_id, body, next_node_id, affection_delta, sort_order) values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '我会慢慢熟悉这里。', '40000000-0000-0000-0000-000000000002', 1, 1),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003', '那就拜托你教我看浮漂。', null, 1, 1)
on conflict (id) do update set
  body = excluded.body,
  next_node_id = excluded.next_node_id,
  affection_delta = excluded.affection_delta,
  sort_order = excluded.sort_order;