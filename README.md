# Catsbook RPG 猫书

Catsbook RPG 是一个轻量猫咪社交 RPG 网页游戏。玩家注册登录后进入猫咪时间线，给猫咪帖子点赞、接受任务、完成对话或钓鱼小游戏，逐步解锁猫咪好友、好感剧情和感谢卡图鉴。

## 技术栈

- 前端：原生 HTML + CSS + Vanilla JavaScript
- 后端与数据库：Supabase
- 前端数据访问：Supabase JS Client
- 复杂逻辑：Supabase RPC / Postgres Functions
- 小游戏：原生 Canvas

## 项目结构

```text
public/
  index.html              # 登录注册页
  feed.html               # 猫咪帖子时间线
  cat.html                # 好友猫咪与好感剧情
  quests.html             # 任务列表
  collections.html        # 图鉴与感谢卡
  fishing.html            # Canvas 钓鱼小游戏
  merge.html              # 像素猫头合成小游戏
  paw-on-top.html         # 猫爪在上拍爪小游戏
  account.html            # 玩家账户资料
  resources/              # 本地图片资源，按 posts/、cards/ 等子目录整理
  styles/main.css         # 全站共享样式
  scripts/
    config.js             # Supabase 公共配置
    supabaseClient.js     # Supabase Client 初始化
    api.js                # 所有 Supabase / RPC 调用
    ui.js                 # DOM 和弹窗辅助函数
    auth.js               # 登录注册逻辑
    feed.js               # 帖子页逻辑
    cat.js                # 好友页逻辑
    quests.js             # 任务页逻辑
    collections.js        # 图鉴页逻辑
    fishing.js            # 钓鱼小游戏逻辑
    merge.js              # 像素猫头合成逻辑
    paw-on-top.js         # 猫爪在上逻辑
    account.js            # 账户页逻辑
supabase/
  schema.sql              # 表结构
  policies.sql            # RLS 策略
  functions.sql           # RPC / Postgres Functions
  seed.sql                # 初始猫咪、帖子、任务、剧情数据
```

## 创建 Supabase 项目

1. 打开 Supabase 控制台，创建一个新项目。
2. 在 `Project Settings > API` 里复制：
   - Project URL
   - anon public key
3. 在 `Authentication > Providers > Email` 开启邮箱登录。
4. MVP 调试时可以关闭邮箱确认；如果开启邮箱确认，注册后需要先确认邮件再登录。

## 执行数据库脚本

在 Supabase 控制台进入 `SQL Editor`，按顺序执行：

1. `supabase/schema.sql`
2. `supabase/policies.sql`
3. `supabase/functions.sql`
4. `supabase/seed.sql`

所有 public 表都已在 `policies.sql` 中启用 Row Level Security。前端会用 RPC 读取聚合数据，并通过 `start_quest`、`complete_quest`、`feed_cat` 等函数维护进度。

如果登录后提示 `permission denied for table players`，通常是表权限没有授予给 `authenticated` 角色。请重新执行 `supabase/policies.sql`；如果之后调用任务或图鉴 RPC 报函数权限问题，再重新执行 `supabase/functions.sql`。

## 配置前端

编辑 `public/scripts/config.js`：

```js
export const SUPABASE_URL = "你的 Supabase Project URL";
export const SUPABASE_ANON_KEY = "你的 Supabase anon public key";
```

如果这两个值为空，并且 `ENABLE_LOCAL_DEMO = true`，前端会使用 localStorage 演示数据，方便不连 Supabase 时先预览流程。

## 本地运行

因为使用了 ES Modules，建议用静态服务器运行：

```bash
python3 -m http.server 5173 -d public
python -m http.server 5173 -d public
```

然后访问：

```text
http://localhost:5173
```

如果需要从supabase云端拉取最新文件，运行：

```bash
supabase db dump --linked --data-only --schema "public" --file=supabase/seed.sql
```


## 玩法流程

1. 首次进入 `index.html` 注册或登录。
2. 登录后 `player_id` 会保存到 localStorage。
3. 进入 `feed.html`，先给第一条帖子点赞。
4. 点赞后解锁第二条帖子和新手对话任务。
5. 完成对话任务后解锁更多猫咪帖子，包括钓鱼任务和像素猫头合成任务。
6. 完成任务后，猫咪会出现在好友页，感谢卡会出现在图鉴页。

## 如何添加猫咪

在 `supabase/seed.sql` 的 `public.cats` 插入数据中新增一行：

- `slug`：猫咪稳定标识，例如 `pumpkin`
- `name`：显示名称
- `handle`：猫书账号名
- `avatar_emoji`：头像图片缺失时的占位文字
- `avatar_path`：猫咪头像图片路径，例如 `avatars/mimi.png`
- `bio`：简介
- `personality`：性格
- `likes`：喜欢的东西数组

如果要在页面中使用真实图片，可以给 `cats` 或 `posts` 增加图片 URL 字段，并在 `api.js` 与对应渲染函数里读取。

## 如何维护图片资源

图片文件放在 `public/resources/` 下，例如：

```text
public/resources/posts/window-sun.png
public/resources/cards/mimi-window-card.png
public/resources/avatars/mimi.png
```

数据库只保存相对路径：

- `cats.avatar_path`：猫咪头像，例如 `avatars/mimi.png`
- `posts.image_label`：帖子所有图片共用的说明文字
- `posts.image_path`：帖子图片路径；没有图片时填 `null`，多张图片时用逗号、中文逗号或换行分隔，最多 9 张
- `quests.reward_image_path`：任务感谢卡图片，例如 `cards/mimi-window-card.png`
- `thank_cards.image_path`：玩家实际获得的感谢卡图片，会在完成任务时由 RPC 自动写入

前端在 `public/scripts/api.js` 里通过 `getResourceUrl()` 把这些路径转换成 `./resources/...`。帖子没有图片时不会显示图片区；1 张图显示为大图；2 张和 4 张图显示为二宫格 / 四宫格；其他多图按九宫格尺寸自适应排列。

## 如何添加帖子和任务

1. 在 `public.quests` 新增任务，设置：
   - `type`：`dialogue`、`merge`、`paw_on_top`、`fishing`、`collect`、`social`
   - 前端会根据 `type` 自动识别入口：`fishing` 进入钓鱼，`merge` 进入合成，`paw_on_top` 进入猫爪在上，`dialogue` 使用弹窗完成。
   - `difficulty`：小游戏难度，填写 `A` / `B` / `C`。`A` 表示最难，`B` 表示中等，`C` 表示最简单。
   - `target_score`：小游戏目标值，例如合成小游戏的完成分数；不要再用它表示难度。
   - `reward_affection`：完成后增加的好感度
   - `reward_card_*`：感谢卡内容
   - 任务完成时会把 `difficulty` 字母换算为数值后自动发放道具：猫粮 `2 + difficulty_value * 2`，猫条 `1 + difficulty_value`，玩具在难度值 1 时给 `1`，难度值 2 起为 `1 + floor(difficulty_value / 2)`。
2. 在 `public.posts` 新增帖子，并把 `quest_id` 指向对应任务。
3. 在 `public.posts.image_path` 写图片路径。单图写一个路径；多图直接写多个路径，用逗号、中文逗号或换行分隔；无图写 `null`。
4. 在 `public.posts.created_at` 可手动写帖子日期，例如 `'2026-06-06'`；填 `default` 时使用数据库首次插入当天。

```sql
-- 单图
('帖子id', 'first-morning', ..., '图片说明', 'posts/mimi-post-1.jpg', ..., 1, default)

-- 多图
('帖子id', 'farm-1', ..., '图片说明', 'posts/farm-post-1.jpg, posts/farm-post-2.jpg, posts/farm-post-5.jpg', ..., 16, '2026-06-06')
```
5. 如果要复用小游戏，只需要把新任务的 `type` 写成对应玩法，并调整 `difficulty` / `target_score`。
6. 任务不再维护自己的 `unlock_key`。只要某条已解锁帖子在 `posts.quest_id` 引用了该任务，任务就会显示在帖子和任务列表里，也可以被 `start_quest` / `complete_quest` RPC 接受。
7. 解锁条件只维护在 `public.posts.unlock_key`：例如 `liked_post:first-morning` 或 `quest_completed:mimi-welcome`。
8. 如需更复杂的新帖子解锁条件，在 `supabase/functions.sql` 的 `is_unlocked` 中添加判断，并在 `public/scripts/api.js` 的本地演示 `isUnlocked` 中同步添加。

## 如何维护评论自动回复

评论区会随帖子默认展开。玩家提交评论时，前端调用 `create_post_comment` RPC，数据库会根据帖子配置和 `comment_reply_rules` 自动插入猫咪回复。

帖子评论模式在 `public.posts` 里维护：

- `comment_mode = 'free'`：玩家可以自由评论，按关键词触发自动回复。
- `comment_mode = 'fixed'`：输入框显示 `fixed_comment_body`，玩家只能发送这句剧情评论。

预设剧情评论在 `public.comments` 中维护，写 `cat_id` 表示由猫咪发出，写 `parent_comment_id` 表示回复哪条评论：

- `slug`：评论短标识，便于后续维护。
- `parent_comment_id`：为空是一级评论；填父评论则显示为回复。

普通关键词自动回复在 `public.comment_reply_rules` 中维护：

- `cat_id`：哪只猫咪作者的帖子适用。
- `post_id`：指定某一条帖子；填 `null` 表示这只猫咪的所有帖子都检测。
- `match_type`：`contains`、`exact`、`regex`。
- `keyword`：触发关键词，你可以随意修改。
- `reply_body`：命中后由帖子作者猫咪回复玩家的内容。
- `once_per_player`：是否每个玩家只触发一次。
- `is_enabled`：是否启用该规则。

评论和自动回复都可以点赞。玩家第一次点赞某条评论会调用 `like_comment` RPC，并获得猫粮 `+1`。

## Seed 行生成工具

项目内置了一个轻量生成器，方便继续使用固定 UUID，同时用 slug 引用猫咪、任务和帖子。

命令行生成副本复制粘贴：

```powershell
powershell -ExecutionPolicy Bypass -File tools/seed-row.ps1 post
powershell -ExecutionPolicy Bypass -File tools/seed-row.ps1 quest
powershell -ExecutionPolicy Bypass -File tools/seed-row.ps1 cat
powershell -ExecutionPolicy Bypass -File tools/seed-row.ps1 dialogue
powershell -ExecutionPolicy Bypass -File tools/seed-row.ps1 reply-rule
powershell -ExecutionPolicy Bypass -File tools/seed-row.ps1 comment
```

生成器直接插入seed：

```powershell
powershell -ExecutionPolicy Bypass -File tools/seed-row.ps1 post -Insert
```

生成器会读取 `supabase/seed.sql`，自动给对应类型生成下一个固定 UUID；`post`、`dialogue`、`reply-rule`、`comment` 还会自动生成下一个 `sort_order`。不加 `-Insert` 时只打印 SQL 行；加 `-Insert` 时会直接写入 `seed.sql`。

当前固定 UUID 分段：猫咪 `10000000`，任务 `20000000`，帖子 `30000000`，评论规则 `40000000`，预设评论 `50000000`，好感剧情 `60000000`。

如果本机安装了 Node，也可以使用同等功能的 `node tools/seed-row.mjs post`。

VSCode 中可以打开命令面板，运行 `Tasks: Run Task`，选择：

- `Catsbook: 生成 post seed 行`
- `Catsbook: 生成 quest seed 行`
- `Catsbook: 生成 cat seed 行`
- `Catsbook: 生成 dialogue seed 行`
- `Catsbook: 生成自动回复 seed 行`

这些 VSCode Task 默认会直接插入到 `supabase/seed.sql`。

也可以在 SQL 文件里使用 snippet：

- `cbpost`
- `cbquest`
- `cbcat`
- `cbdialogue`
- `cbreply`

`seed.sql` 顶部提供了 `id('cats', 'mimi')` 形式的辅助函数，表示去对应表里查找指定 `slug` 的 `id`。目前支持 `cats`、`quests`、`posts`、`comments`、`comment_reply_rules`。

## 如何维护剧情

剧情使用：

- `dialogue_nodes`：剧情节点
- `dialogue_choices`：剧情选项

`dialogue_nodes.min_affection` 决定剧情需要多少好感度才解锁。MVP 版本在好友页用弹窗展示已解锁剧情文本，后续可以把 `dialogue_choices` 接入成完整分支对话。

## 后续扩展建议

- 给帖子、猫咪、感谢卡增加 Supabase Storage 图片字段。
- 给合成小游戏增加更多像素猫头等级、障碍物或限时目标。
- 增加背包表，限制每日投喂次数和道具消耗。
- 每次测试新任务都需要删除数据库，研究一下更简便的自动化方法。
- 咪咪占卜还没有做
- 好感度ui考虑设计得更突出，在达到设定节点时设计自动弹窗弹出解锁的剧情
- 感谢卡片的图鉴界面做预览图和分类
- friend界面预览
- 新增浏览过提示，方便引入新帖子提示

## test
天降一只咩！
