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
```

然后访问：

```text
http://localhost:5173
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
- `posts.image_path`：帖子图片，例如 `posts/window-sun.png`
- `quests.reward_image_path`：任务感谢卡图片，例如 `cards/mimi-window-card.png`
- `thank_cards.image_path`：玩家实际获得的感谢卡图片，会在完成任务时由 RPC 自动写入

前端在 `public/scripts/api.js` 里通过 `getResourceUrl()` 把这些路径转换成 `./resources/...`，页面会优先渲染图片；如果没有图片路径，就显示原来的文字占位。

## 如何添加帖子和任务

1. 在 `public.quests` 新增任务，设置：
   - `type`：`dialogue`、`merge`、`fishing`、`collect`、`social`
   - `game_key`：小游戏入口，例如 `fishing` 或 `merge_cats`。它不属于某只猫，任何猫咪任务都可以调用。
   - `difficulty`：小游戏难度，数值越高越难。钓鱼会提升鱼移动速度和失败压力；合成会加快掉落节奏。
   - `target_score`：合成小游戏的完成分数，钓鱼任务可以设为 `0`。
   - `unlock_key`：控制解锁条件
   - `reward_affection`：完成后增加的好感度
   - `reward_card_*`：感谢卡内容
   - 任务完成时还会按 `difficulty` 自动发放道具：猫粮 `2 + difficulty * 2`，猫条 `1 + difficulty`，玩具在难度 1 时给 `1`，难度 2 起为 `1 + floor(difficulty / 2)`。
2. 在 `public.posts` 新增帖子，并把 `quest_id` 指向对应任务。
3. 如果要复用小游戏，只需要把新任务的 `game_key` 指向已有小游戏，并调整 `difficulty` / `target_score`。
4. 如果要让任务在某个任务完成后解锁，可以把 `unlock_key` 写成 `quest_completed:任务slug`，例如 `quest_completed:merge-cats`。
5. 如需更复杂的新解锁条件，在 `supabase/functions.sql` 的 `is_unlocked` 中添加判断，并在 `public/scripts/api.js` 的本地演示 `isUnlocked` 中同步添加。

## 如何维护剧情

剧情使用：

- `dialogue_nodes`：剧情节点
- `dialogue_choices`：剧情选项

`dialogue_nodes.min_affection` 决定剧情需要多少好感度才解锁。MVP 版本在好友页用弹窗展示已解锁剧情文本，后续可以把 `dialogue_choices` 接入成完整分支对话。

## 后续扩展建议

- 给帖子、猫咪、感谢卡增加 Supabase Storage 图片字段。
- 给 `merge_cats` 增加更多像素猫头等级、障碍物或限时目标。
- 增加背包表，限制每日投喂次数和道具消耗。
- 增加评论列表读取和猫咪自动回复。
