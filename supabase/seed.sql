-- Catsbook 初始数据
-- 执行顺序：猫咪档案 -> 任务 -> 帖子 -> 好感剧情。
-- 固定 UUID 用于让 seed.sql 可以重复执行，避免重复插入同一份内容。

-- Seed 辅助函数：后续新增数据时可以用 id('cats', 'mimi') 引用外键。
drop function if exists public.seed_cat_id(text);
drop function if exists public.seed_quest_id(text);
drop function if exists public.seed_post_id(text);
drop function if exists public.seed_comment_id(text);
drop function if exists public.seed_reply_rule_id(text);
drop function if exists public.slug(text, text);

create or replace function public.id(p_table text, p_slug text)
returns uuid
language plpgsql
stable
as $$
declare
  v_id uuid;
begin
  case p_table
    when 'cats' then
      select id into v_id from public.cats where slug = p_slug;
    when 'quests' then
      select id into v_id from public.quests where slug = p_slug;
    when 'posts' then
      select id into v_id from public.posts where slug = p_slug;
    when 'comments' then
      select id into v_id from public.comments where slug = p_slug;
    when 'comment_reply_rules' then
      select id into v_id from public.comment_reply_rules where slug = p_slug;
    else
      raise exception 'seed id helper does not support table: %', p_table;
  end case;

  if v_id is null then
    raise exception 'seed id not found: %.%', p_table, p_slug;
  end if;

  return v_id;
end;
$$;

-- 1. 猫咪档案
-- likes 使用 text[]，前端会在好友详情页直接展示。
insert into public.cats (
  id,             -- 猫咪唯一 ID，供其他表关联
  slug,           -- 猫咪短标识，用于代码和数据引用
  name,           -- 页面显示的猫咪名字
  handle,         -- 猫书账号名，显示在帖子和主页
  avatar_emoji,   -- 无图片时的头像占位字符
  avatar_path,    -- 头像图片路径，相对 public/resources
  bio,            -- 猫咪简介
  personality,    -- 性格描述
  likes           -- 喜欢的东西，好友详情页展示
) values
  ('10000000-0000-0000-0000-000000000001', 'dogy', '二狗', 'dogy@catsbook.com', '狗', 'avatars/dogy.png', '本网站的幕后黑手，如果遇到了bug，请在论坛上发帖求助，毕竟猫师傅都是专业的！', '懒癌晚期，但怎么能压力一只小狗呢！', array['咩咩', '鱿鱼丝', '咩咩']),
  ('10000000-0000-0000-0000-000000000002', 'mimi', '咪咪', 'mimi@catsbook.com', '咪', 'avatars/mimi.jpg', '有着白手套的简州猫，喜欢出现在宿舍楼和食堂的路上，每天最烦恼的事是用什么姿势睡觉。', '柔软的可以随时rua的大猫咪', array['摸后脑勺', '鱼（挑食）', '睡大觉']),
  ('10000000-0000-0000-0000-000000000003', 'gian', '胖虎', 'gian@catsbook.com', '虎', 'avatars/gian.jpg', '长相严肃的胖彩狸，但其实只是眼睛小而已！也是很喜欢和两脚兽贴贴的，除非是有饭吃。', '减肥ing，不要再用猫粮诱惑我了！', array['吃饭', '吃饭', '雨后泥土味']),
  ('10000000-0000-0000-0000-000000000004', 'baga', '嘎子', 'baga@catsbook.com', '嘎', 'avatars/baga.jpg', '说我长得丑的不许靠近我半步！还有，拍照的时候镜头举高点，低角度拍我的真要被我追杀。', '明明就是很可耐的奶牛猫', array['游戏', '揣手手', '南瓜垫子']),
  ('10000000-0000-0000-0000-000000000005', 'coco', '可可', 'coco@catsbook.com', '可', 'avatars/coco.jpg', '随机刷新在远处专家楼的橘猫，有时也会去食堂附近找其他猫猫吵架（划掉）玩耍。', '可可应该是一个可爱的大橘，没错！', array['神秘', '夜猫子（好像本来就是猫子）']),
  ('10000000-0000-0000-0000-000000000006', 'miea', '咩咩', 'miea@catsbook.com', '咩', 'avatars/miea.png', '天降黑手二号，第一次来到猫书，正在好奇地持续挖掘新的猫咪帖子……', '只想每天找茬咬人，但怎么能压力一只小羊呢！', array['狗子', '芒果', '狗子']),
  ('10000000-0000-0000-0000-000000000007', 'huihui', '灰芝麻', 'huihui@catsbook.com', '灰', 'avatars/huihui.jpg', '看起来很凶，喜欢瞪两脚兽的灰狸花。手感是顶级的毛茸茸，但不要上来就摸我的爪子！不可以叫我灰芝麻糊。', '夏冬判若两猫，天一热就开始秃毛', array['摸凹猫','不爱贴贴']),
  ('10000000-0000-0000-0000-000000000008', 'erha', '二哈', 'erha@catsbook.com', '哈', 'avatars/erha.jpg', '憨厚亲人，手感敦实，老实的大胖猫，佛系奶牛！', '随便摸吧，淡然了', array['挠下巴','装瘸','揣手手']),
  ('10000000-0000-0000-0000-000000000009', 'jvnjvn', '君君', 'jvnjvn@catsbook.com', '君', 'avatars/jvnjvn.jpg', '顶级坏咪，为疫苗事业创收无限，吸人后极易暴起喵喵拳，不要摸！不要摸！不要摸！', '最忠诚于底层代码的咪，爱挠路过的每个人', array['伪装人瘾犯了','观察两脚兽']),
  ('10000000-0000-0000-0000-000000000010', 'haitang', '海棠', 'haitang@catsbook.com', '棠', 'avatars/haiting.jpg', '常常刷新在振声苑的东南西北楼，超人气大海参，就这样被摸烦了都翻不过身挠人。其老婆名海狸，共育一子名海砺子（海狸子）。', '咪之大电动车两座坐不下，走过路过都爱摸', array['晒太阳','睡觉','和老婆贴贴']),
  ('10000000-0000-0000-0000-000000000011', 'taiji', '太极', 'taiji@catsbook.com', '极', 'avatars/taiji.jpg', '叫声有点嘶哑的话痨猫，头很痒，大声喵喵说话但是人听不懂很着急。人走了会追着蹭挽留。', '随地大小躺，呼噜声超级大', array['要吃的','和两脚兽贴贴'])


on conflict (id) do update set
  name = excluded.name,
  handle = excluded.handle,
  avatar_emoji = excluded.avatar_emoji,
  avatar_path = excluded.avatar_path,
  bio = excluded.bio,
  personality = excluded.personality,
  likes = excluded.likes;

-- 2. 任务配置
-- 任务不再单独配置解锁条件：只要有已解锁帖子引用 quest_id，任务就会显示并可开始。
-- difficulty 使用字母表示小游戏难度：A=3 最难，B=2，C=1 最简单。
-- type 决定前端跳转到哪个玩法；dialogue 会直接用弹窗完成。
insert into public.quests (
  id,                 -- 任务唯一 ID，供帖子和玩家进度关联
  slug,               -- 任务短标识，用于解锁条件引用
  cat_id,             -- 发布任务的猫咪 ID
  title,              -- 任务标题
  description,        -- 任务说明
  type,               -- 任务类型，如 dialogue/fishing/merge/paw_on_top
  difficulty,         -- 任务难度 A/B/C，影响小游戏参数和道具奖励数量
  target_score,       -- 小游戏目标值，例如合成分数；钓鱼难度看 difficulty
  reward_affection,   -- 完成任务增加的好感度
  reward_card_title,  -- 完成后获得的感谢卡标题
  reward_card_text,   -- 感谢卡正文
  reward_image_path   -- 感谢卡图片路径，相对 public/resources
) values
  ('20000000-0000-0000-0000-000000000001', 'mimi-welcome', id('cats', 'mimi'), '咪咪的见面', '和咪咪的第一次相遇，居然摸到了脑袋！', 'dialogue', 'C', 0, 10, '咪咪的见面卡片', '我是掌管吃饭和睡觉的咪。', 'cards/mimi-card-1.jpg'),
  ('20000000-0000-0000-0000-000000000002', 'mimi-fishing-1', id('cats', 'mimi'), '钓一条鱼', '咪咪想吃夜宵了，去找一条鱼吧！', 'fishing', 'B', 1, 15, '咪咪的夜宵感谢信', '“告诉老默，我想吃鱼了”', 'cards/mimi-card-2.jpg'),
  ('20000000-0000-0000-0000-000000000003', 'gian-welcome', id('cats', 'gian'), '胖虎的见面', '和胖虎的第一次相遇，真是猫不可相貌。', 'dialogue', 'C', 0, 10, '胖虎的见面卡片', '横看成球侧成球', 'cards/gian-card-1.jpg'),
  ('20000000-0000-0000-0000-000000000004', 'gian-merge', id('cats', 'gian'), '猫咪的新游戏', '来帮胖虎完代打合成大猫咪吧！', 'merge', 'B', 1000, 15, '胖虎的游戏代打感谢', '什么好康的，是新游戏吗', 'cards/gian-card-2.jpg'),
  ('20000000-0000-0000-0000-000000000005', 'baga-welcome', id('cats', 'baga'), '嘎子的见面', '和嘎子的第一次相遇，看起来就不好惹。', 'dialogue', 'C', 0, 10, '嘎子的见面卡片', '猫中大佐', 'cards/baga-card-1.jpg'),
  ('20000000-0000-0000-0000-000000000006', 'mimi-fishing-2', id('cats', 'mimi'), '再钓一条鱼', '咪咪的鱼吃完了，再去找一条鱼吧！', 'fishing', 'A', 2, 20, '咪咪的鱼子护身符', '有了这个护身符，钓鱼永不空军', 'cards/mimi-card-3.jpg'),
  ('20000000-0000-0000-0000-000000000007', 'baga-merge', id('cats', 'baga'), '代肝业务拓展', '嘎子看到胖虎在玩新游戏，决定要超过他', 'merge', 'A', 1500, 15, '嘎子的奇妙自拍', '嘘，不要告诉其他人', 'cards/baga-card-2.jpg'),
  ('20000000-0000-0000-0000-000000000008', 'coco-welcome', id('cats', 'coco'), '可可的见面', '和可可的第一次相遇，真是可爱到犯规。', 'dialogue', 'C', 0, 10, '可可的见面卡片', '可可是一只只会贴贴的猫咪', 'cards/coco-card-1.jpg'),
  ('20000000-0000-0000-0000-000000000009', 'ending', id('cats', 'dogy'), '写在最后的话', '欢迎入驻！', 'dialogue', 'C', 0, 100, '2026.5.20', '520礼物合照：记录每一朵玫瑰', 'cards/ending-card.jpg'),
  ('20000000-0000-0000-0000-000000000010', 'A new beginning', id('cats', 'miea'), '新的开始', '猫书迎来了它的第二位幕后黑手，新的版本开始书写^^', 'dialogue', 'C', 0, 100, '2026.5.23', '爱来自咩', 'cards/A new beginning.jpg'),
  ('20000000-0000-0000-0000-000000000011', 'huihui-welcome', id('cats', 'huihui'), '灰芝麻的见面', '和灰芝麻的第一次相遇，感觉被瞪了是怎么回事……', 'dialogue', 'C', 0, 10, '灰芝麻的见面卡片', '看什么看？！', 'cards/huihui-card-1.jpg'),
  ('20000000-0000-0000-0000-000000000012', 'mimi-tarot', id('cats', 'mimi'), '咪咪的占卜', '来试试最聪明的咪咪会占卜到什么呢……？', 'dialogue', 'C', 0, 10, 'null', 'null', null),
  ('20000000-0000-0000-0000-000000000013', 'huihui-paw', id('cats', 'huihui'), '猫爪在上原则', '看准灰芝麻的爪爪伸出来的时机，轻轻拍中！', 'paw_on_top', 'B', 0, 10, '灰芝麻的jiojio', '山竹！让我摸摸！', 'cards/huihui-card-2.jpg'),
  ('20000000-0000-0000-0000-000000000014', 'erha-welcome', id('cats', 'erha'), '二哈的见面', '和二哈的第一次相遇，看到体型还以为会很凶……结果怎么摸都不生气。', 'dialogue', 'C', 0, 10, '二哈的见面卡片', '我只是懒得动。', 'cards/erha-card-1.jpg'),
  ('20000000-0000-0000-0000-000000000015', 'jvnjvn-paw', id('cats', 'jvnjvn'), '君君大王的殴打', '看到君君蹭你，你欣喜地摸摸它的脑袋，结果被挠了……你才知道它是惯犯，每年为疫苗中心创收无数。这比小灰灰的爪子难拍多了！', 'paw_on_top', 'A', 0, 10, '君君的见面卡片', '看起来毫不悔改的君君', 'cards/jvnjvn-card-1.jpg')


on conflict (id) do update set
  slug = excluded.slug,
  cat_id = excluded.cat_id,
  title = excluded.title,
  description = excluded.description,
  type = excluded.type,
  difficulty = excluded.difficulty,
  target_score = excluded.target_score,
  reward_affection = excluded.reward_affection,
  reward_card_title = excluded.reward_card_title,
  reward_card_text = excluded.reward_card_text,
  reward_image_path = excluded.reward_image_path;

-- 3. 时间线帖子
-- quest_id 为空表示纯动态；非空表示该帖子会显示任务入口。
-- 帖子自己的 unlock_key 控制帖子出现时机，通常和对应任务的前置条件保持一致。
insert into public.posts (
  id,          -- 帖子唯一 ID，供点赞和评论关联
  slug,        -- 帖子短标识，便于维护和特殊逻辑引用
  cat_id,      -- 发帖猫咪 ID
  quest_id,    -- 关联任务 ID；为空表示普通动态
  body,        -- 帖子正文
  image_label, -- 帖子图片说明或占位文案
  image_path,  -- 帖子图片路径，相对 public/resources；可用逗号、中文逗号或换行写 0~9 张图
  unlock_key,  -- 帖子解锁条件，为空则默认可见
  comment_mode, -- 评论模式：free 自由评论 / fixed 固定剧情评论
  fixed_comment_body, -- fixed 模式下玩家只能发送的评论
  sort_order,  -- 时间线排序权重，数值越小越靠前
  created_at   -- 可选手动日期；填 default 时使用数据库插入当天
) values
  ('30000000-0000-0000-0000-000000000001', 'first-morning', id('cats', 'mimi'), null, '今日OOTD：阳光不错，自带模糊半身照', '咪咪的半身照', 'posts/mimi-post-1.jpg', null, 'free', null, 1, default),
  ('30000000-0000-0000-0000-000000000002', 'mimi-welcome', id('cats', 'mimi'), id('quests', 'mimi-welcome'), '居然有新人赞我！有没有扩列dd ´ₒ⦁⩊⦁ₒ`', '友好靠近的咪咪', 'posts/mimi-post-2.jpg', 'liked_post:first-morning', 'free', null, 2, default),
  ('30000000-0000-0000-0000-000000000003', 'mimi-fishing-1', id('cats', 'mimi'), id('quests', 'mimi-fishing-1'), '刚准备躺下又饿了。。。 有没有好心人打赏份夜宵', '夜钓', 'posts/mimi-post-3.jpg', 'quest_completed:mimi-welcome', 'free', null, 3, default),
  ('30000000-0000-0000-0000-000000000004', 'gian-welcome', id('cats', 'gian'), id('quests', 'gian-welcome'), '所以这个网站能点外卖吗', '胖虎霸气走来', 'posts/gian-post-1.jpg', 'quest_completed:mimi-fishing-1', 'free', null, 4, default),
  ('30000000-0000-0000-0000-000000000005', 'gian-merge', id('cats', 'gian'), id('quests', 'gian-merge'), '合成大猫咪代肝招募，需要一位电竞高手', '坐着的胖虎', 'posts/gian-post-2.jpg', 'like_post:gian-welcome', 'free', null, 5, default),
  ('30000000-0000-0000-0000-000000000006', 'baga-welcome', id('cats', 'baga'), id('quests', 'baga-welcome'), '锐评自拍不玻璃心', '嘎子的自拍', 'posts/baga-post-1.jpg', 'quest_completed:gian-merge', 'free', null, 6, default),
  ('30000000-0000-0000-0000-000000000007', 'mimi-fishing-2', id('cats', 'mimi'), id('quests', 'mimi-fishing-2'), '好饿！为什么一条鱼这么小！', '寻找食物的咪咪', 'posts/mimi-post-4.jpg', 'quest_completed:mimi-fishing-1', 'free', null, 7, default),
  ('30000000-0000-0000-0000-000000000008', 'baga-merge', id('cats', 'baga'), id('quests', 'baga-merge'), '冲分合成大猫咪，有接单的小窗我', '虎视眈眈的嘎子', 'posts/baga-post-2.jpg', 'like_post:baga-welcome', 'free', null, 8, default),
  ('30000000-0000-0000-0000-000000000009', 'coco-welcome', id('cats', 'coco'), id('quests', 'coco-welcome'), '太阳这么暖洋洋，一定也是大橘吧', '标志的大橘可可', 'posts/coco-post-1.jpg', 'quest_completed:baga-merge', 'free', null, 9, default),
  ('30000000-0000-0000-0000-000000000010', 'ending', id('cats', 'dogy'), id('quests', 'ending'), '至此这个游戏的MVP版本就结束啦！很不好意思把这个简陋的东西拿出来作为520礼物，从来自咩咩的灵感火花到整个项目的落地还是来之不易的，不许说我敷衍！整个游戏开发得很匆忙，如果有奇奇怪怪的bug请见谅>ω<，做这个网页项目还有个私心，就是想和你一起有一个共同的工作空间。麻雀虽小，但项目还是有完整的前端，后端，美术，测试，运维的流程的，我们的共同话题不必只局限于吃喝玩乐，还能够通过这样的方式一起学习，或许也对就业有所帮助（？）恭迎你来添砖加瓦⸜(>ᰔ<)⸝', '结束海报', 'posts/ending-post.png', 'quest_completed:coco-welcome', 'free', null, 10, default),
  ('30000000-0000-0000-0000-000000000011', 'A new beginning', id('cats', 'miea'), id('quests', 'A new beginning'), '今天听说咪咪们都会刷猫书，是在这里吗？和咪咪的合影证明我不是陌生的两脚兽', '第一次看猫书的两脚兽', 'posts/miea-post-1.jpg', 'quest_completed:ending', 'free', null, 10, default),
  ('30000000-0000-0000-0000-000000000012', 'huihui-welcome', id('cats', 'huihui'), id('quests', 'huihui-welcome'), '怎么感觉有奇怪的两脚兽混进来了', '灰芝麻正在注视着你', 'posts/huihui-post-1.jpg', 'quest_completed:A new beginning', 'fixed', '我也觉得这里有问题。', 11, default),
  ('30000000-0000-0000-0000-000000000013', 'apology letter', id('cats', 'dogy'), null, '今天惹咩咩生气了，咩咩伤心了好久我好心疼...虽然做的很糟糕但咩咩还是原谅我了，以后咩咩生气一定要好好哄她，不让她一个人流泪>ω<', '送你大心心', 'posts/apology.png', null, 'free', null, 12, default),
  ('30000000-0000-0000-0000-000000000014', 'mimi-tarot', id('cats', 'mimi'), id('quests', 'mimi-tarot'), '（打哈欠）人，你是来占卜的吗？只需要两条小鱼干，咪是无所不能的……！:3', '"神秘咪咪仪式"', 'posts/mimi-post-5.jpg', 'quest_completed:huihui-welcome', 'free', null, 13, default),
  ('30000000-0000-0000-0000-000000000015', 'huihui-paw', id('cats', 'huihui'), id('quests', 'huihui-paw'), '我的原则是猫爪在上。', '谁能忍住不摸', 'posts/huihui-post-2.jpg', 'liked_post:huihui-welcome', 'free', null, 14, default),
  ('30000000-0000-0000-0000-000000000016', 'mie-defense', id('cats', 'miea'), null, '最好的答辩礼物^^', '晚风中的狗和咩', 'posts/miea-post-2.jpg', null, 'free', null, 15, default),
  ('30000000-0000-0000-0000-000000000017', 'farm-1', id('cats', 'miea'), null, '第三年的花舞节，勤勤恳恳地做了好多身衣服，挑出了最好看的一套参加舞会~', '第二年春的花舞节', 'posts/farm-post-1.jpg, posts/farm-post-2.jpg', null, 'free', null, 16, default),
  ('30000000-0000-0000-0000-000000000018', 'farm-2', id('cats', 'miea'), null, '第三年的春天，农场初具规模！', '第三年春', 'posts/farm-post-3.png', null, 'free', null, 17, default),
  ('30000000-0000-0000-0000-000000000019', 'farm-3', id('cats', 'miea'), null, '第一次种出杨桃！', '新鲜的大杨桃', 'posts/farm-post-4.jpg', null, 'free', null, 18, default),
  ('30000000-0000-0000-0000-000000000020', 'farm-4', id('cats', 'miea'), null, '落日的海边……静谧的蓝调时刻。', '咩和狗的背影', 'posts/farm-post-5.jpg', null, 'free', null, 19, default),
  ('30000000-0000-0000-0000-000000000021', 'farm-5', id('cats', 'miea'), null, '第三年的夏20，最可爱的狗子的求婚~（〃｀ 3′〃）终于我也有结婚戒指了！', '新婚合影（？', 'posts/farm-post-6.jpg', null, 'free', null, 20, default),
  ('30000000-0000-0000-0000-000000000022', 'farm-6', id('cats', 'miea'), null, '第一个大霜瓜！o(*≧▽≦)ツ', '圆圆的大霜瓜', 'posts/farm-post-7.jpg', null, 'free', null, 21, default),
  ('30000000-0000-0000-0000-000000000023', 'farm-7', id('cats', 'miea'), null, '终于开辟了姜岛的农场地图，再也不用担心晕倒了_(:з)∠)_', '圆圆的大霜瓜', 'posts/farm-post-8.jpg', null, 'free', null, 22, default),
  ('30000000-0000-0000-0000-000000000024', 'farm-8', id('cats', 'miea'), null, '我找到了第一个金色椰子！厉害吧', '金色椰子传说~', 'posts/farm-post-9.jpg', null, 'free', null, 23, default),
  ('30000000-0000-0000-0000-000000000025', 'farm-9', id('cats', 'miea'), null, '彩蛋，不是我今天来拍照，某狗根本没法发现(ˉ▽￣～) ', '狗咩之家', 'posts/farm-post-11.jpg, posts/farm-post-12.jpg', null, 'free', null, 24, default),
  ('30000000-0000-0000-0000-000000000026', 'farm-10', id('cats', 'miea'), null, '复活节的正确开启方式，第四年才发现，嘿嘿', '复活节', 'posts/farm-post-13.png, posts/farm-post-14.jpg', null, 'free', null, 25, default),
  ('30000000-0000-0000-0000-000000000027', 'farm-11', id('cats', 'miea'), null, '第四年春，种出了两颗大花椰菜，狗子还非说已经告诉我了，我觉得是我先发现第二颗的-3-', '巨大花椰菜', 'posts/farm-post-15.jpg', null, 'free', null, 26, default),
  ('30000000-0000-0000-0000-000000000028', 'erha-welcome', id('cats', 'erha'), id('quests', 'erha-welcome'), '这是什么网站？躺下了……（打哈欠）', '揣手手的奶牛猫', 'posts/erha-post-1.jpg', 'quest_completed:huihui-paw', 'free', null, 27, default),
  ('30000000-0000-0000-0000-000000000029', 'jvnjvn-welcome', id('cats', 'jvnjvn'), null, '快递站简直是咪的天堂', '来帮倒忙的君君', 'posts/jvnjvn-post-1.jpg', 'quest_completed:erha-welcome', 'free', null, 28, default),
  ('30000000-0000-0000-0000-000000000030', 'jvnjvn-paw', id('cats', 'jvnjvn'), id('quests', 'jvnjvn-paw'), '人，你好（蹭蹭）（邦邦打两拳）（蹭蹭）（邦邦打两拳）', '最尊重底层代码的坏君君', 'posts/jvnjvn-post-2.jpg, posts/jvnjvn-post-3.jpg, posts/jvnjvn-post-4.jpg', 'liked_post:jvnjvn-welcome', 'free',null, 29, default)



on conflict (id) do update set
  slug = excluded.slug,
  cat_id = excluded.cat_id,
  quest_id = excluded.quest_id,
  body = excluded.body,
  image_label = excluded.image_label,
  image_path = excluded.image_path,
  unlock_key = excluded.unlock_key,
  comment_mode = excluded.comment_mode,
  fixed_comment_body = excluded.fixed_comment_body,
  sort_order = excluded.sort_order,
  created_at = case
    when excluded.created_at = transaction_timestamp() then public.posts.created_at
    else excluded.created_at
  end;

-- 4. 评论规则
-- match_type 可选 contains / exact / regex；once_per_player 为 true 时每个玩家只触发一次。
insert into public.comment_reply_rules (
  id,              -- 规则唯一 ID
  slug,            -- 规则短标识
  cat_id,          -- 可选：限定发帖猫咪
  post_id,         -- 可选：限定帖子，若为空：该猫咪作者的所有帖子都检测 keyword。
  match_type,      -- contains/exact/regex
  keyword,         -- 触发关键词
  reply_body,      -- 命中后由帖子作者猫咪回复玩家的内容
  once_per_player, -- 是否每个玩家只触发一次
  sort_order,      -- 多条规则同时命中时，数字小的优先
  is_enabled       -- 是否启用
) values
  ('40000000-0000-0000-0000-000000000001', 'miea-love', id('cats', 'miea'), null, 'contains', '爱你', '咩也爱你爱你爱你——(´▽`ʃ♡ƪ)', false, 1, true)

on conflict (id) do update set
  slug = excluded.slug,
  cat_id = excluded.cat_id,
  post_id = excluded.post_id,
  match_type = excluded.match_type,
  keyword = excluded.keyword,
  reply_body = excluded.reply_body,
  once_per_player = excluded.once_per_player,
  sort_order = excluded.sort_order,
  is_enabled = excluded.is_enabled;

-- 5. 预设评论
-- 预设评论由猫咪发出；玩家不能回复这些评论，但可以点赞获得猫粮 +1。
-- 父评论都在这里统一写
insert into public.comments (
  id,                -- 评论唯一 ID
  slug,              -- 评论短标识，便于后续作为父评论引用
  post_id,           -- 所属帖子
  parent_comment_id, -- 父评论；null 表示顶层评论
  cat_id,            -- 发出评论的猫咪
  body,              -- 评论正文
  sort_order         -- 同一帖子下的显示顺序
) values
  ('50000000-0000-0000-0000-000000000001', 'A new beginning-1', id('posts', 'A new beginning'), null, id('cats', 'mimi'), '哦！是你！怎么把我拍成这样了(ノ｀Д)ノ', 1),
  ('50000000-0000-0000-0000-000000000002', 'A new beginning-2', id('posts', 'A new beginning'), null, id('cats', 'coco'), '熟悉的味道，贴贴贴贴', 2),
  ('50000000-0000-0000-0000-000000000003', 'baga-merge-1', id('posts', 'baga-merge'), null, id('cats', 'gian'), '你怎么偷偷找代肝啊！', 3)


on conflict (slug) do update set
  post_id = excluded.post_id,
  parent_comment_id = excluded.parent_comment_id,
  cat_id = excluded.cat_id,
  body = excluded.body,
  sort_order = excluded.sort_order;

-- 二层预设评论
insert into public.comments (
  id,
  slug,
  post_id,
  parent_comment_id,
  cat_id,
  body,
  sort_order
) values
  ('50000000-0000-0000-0000-000000000004', 'baga-merge-2', id('posts', 'baga-merge'), id('comments', 'baga-merge-1'), id('cats', 'baga'), '你不是也找了代肝吗= =', 2)

on conflict (slug) do update set
  post_id = excluded.post_id,
  parent_comment_id = excluded.parent_comment_id,
  cat_id = excluded.cat_id,
  body = excluded.body,
  sort_order = excluded.sort_order;

-- 三层预设评论：必须在二层评论写入后再引用它的 slug。
insert into public.comments (
  id,
  slug,
  post_id,
  parent_comment_id,
  cat_id,
  body,
  sort_order
) values
  ('50000000-0000-0000-0000-000000000005', 'baga-merge-3', id('posts', 'baga-merge'), id('comments', 'baga-merge-2'), id('cats', 'gian'), '嘿嘿，好饿，我要去饭饭了', 3)

on conflict (slug) do update set
  post_id = excluded.post_id,
  parent_comment_id = excluded.parent_comment_id,
  cat_id = excluded.cat_id,
  body = excluded.body,
  sort_order = excluded.sort_order;

-- 6. 好感剧情节点
-- 好友页会读取玩家已解锁猫咪的 dialogue_nodes，并按 min_affection 判断可见剧情。
-- dialogue_choices 表目前是分支对话预留，MVP 尚未在前端使用。
insert into public.dialogue_nodes (
  id,            -- 剧情节点唯一 ID
  cat_id,        -- 归属猫咪 ID
  slug,          -- 剧情短标识，便于后续扩展引用
  title,         -- 剧情标题
  body,          -- 剧情正文
  min_affection, -- 解锁所需最低好感度
  sort_order     -- 好友页剧情显示顺序
) values
  ('60000000-0000-0000-0000-000000000001', id('cats', 'mimi'), 'mimi-first', '路边初遇', '咪咪！', 0, 1),
  ('60000000-0000-0000-0000-000000000002', id('cats', 'mimi'), 'mimi-realname', '刘波', '咪咪原来有大名！一起前来看望咪咪的同学透露到', 50, 2),
  ('60000000-0000-0000-0000-000000000003', id('cats', 'mimi'), 'mimi-like', '最特别的波波', '熟悉之后，总是能找到波波睡觉的小窝，睡着了叫它就会打哈欠然后扁扁地走过来躺下让人摸摸继续睡的绝世好咪。爱你波波', 100, 3),
  ('60000000-0000-0000-0000-000000000004', id('cats', 'gian'), 'gian-first-meet', '胖虎的第一次见面', '面相凶猛的胖虎，但看到干饭的样子就知道是没有坏心眼的憨厚呆咪', 0, 1),
  ('60000000-0000-0000-0000-000000000005', id('cats', 'dogy'), 'dogy-dogy', '好感度', '狗子好感度永远是100%', 0, 1),
  ('60000000-0000-0000-0000-000000000006', id('cats', 'miea'), 'miea-miea', '好感度', '咩咩永远爱你^333333^', 0, 1)

on conflict (slug) do update set
  cat_id = excluded.cat_id,
  title = excluded.title,
  body = excluded.body,
  min_affection = excluded.min_affection,
  sort_order = excluded.sort_order;
