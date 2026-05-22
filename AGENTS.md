# AGENTS.md

请帮我创建一个名为 catsbook-rpg 的轻量 Web 游戏项目。

项目目标：
这是一个模拟社交网站的猫咪 RPG 网页游戏 Catsbook（猫书）。玩家首先进入注册登录界面，注册账户来进行游玩和记录进度，游戏主页面有三个标签，一个是帖子页面（类似facebook），可以看到游戏中猫咪发的帖子，会随着游戏进度更新，帖子有猫咪任务（可以是解密，钓鱼小游戏），可以点赞、评论、接受猫咪任务、完成解密或钓鱼小游戏完成猫咪的任务，可以收集到猫猫的感谢卡片（有帖子的图片和文字，能在收集中查看），跟游戏中的猫咪互动增加好感解锁剧情。第二个标签是好友界面，完成过任务的猫咪会在该界面显示，可以显示好感度，投喂猫粮、猫条，玩具等提升猫咪好感度、解锁剧情和图鉴。第三个标签是图鉴，可以看到收集到的猫咪感谢卡片，重新玩小游戏，和历史剧情对话。

技术栈：
- 前端使用原生 HTML + CSS + Vanilla JavaScript
- 数据库和后端使用 Supabase
- 前端通过 Supabase JS Client 访问数据
- 复杂逻辑通过 Supabase RPC / Postgres Functions 实现
- 所有 public 表必须启用 Row Level Security
- 钓鱼小游戏可以用原生 Canvas 或 Phaser 3，优先原生 Canvas

supabase的密钥存放在.env>exsample

可以参考生成以下项目结构：各个函数和API应该有简明中文注释

catsbook/
  public/
    index.html
    feed.html
    cat.html
    quests.html
    collections.html
    fishing.html
    styles/
      main.css
    scripts/
      config.js
      supabaseClient.js
      auth.js
      api.js
      feed.js
      cat.js
      quests.js
      collections.js
      fishing.js
      ui.js
  supabase/
    schema.sql
    policies.sql
    functions.sql
    seed.sql
  README.md

功能要求：

1. 用户系统
- 首次进入时进入登录注册界面，登录后进入游戏
- 将 player_id 保存在 localStorage
- 后续页面自动读取 player_id

2. 帖子界面
- feed.html 显示猫咪帖子列表
- 每条帖子显示猫咪头像、猫咪名字、handle、正文、图片占位、点赞按钮、评论按钮，先生成一个帖子，在点击点赞后更新出第二个帖子，第二个帖子有简单任务（只需要点击对话框即可完成），帮助玩家熟悉操作，完成前序任务后更新其他猫咪的帖子和任务，包括有钓鱼任务的帖子，可先占位。

3. 好友界面
- cat.html 显示猫咪详情
- 显示猫咪简介、性格、喜欢的东西、好感度、已解锁剧情

4. 任务系统
- quests.html 显示任务列表
- 支持任务状态：available、active、completed
- 支持任务类型：dialogue、puzzle、fishing、collect、social
- 开始任务调用 start_quest RPC
- 完成任务调用 complete_quest RPC

5. 剧情系统
- 使用 dialogue_nodes 和 dialogue_choices 表
- 根据玩家与猫咪好感度解锁剧情，在好友界面打开
- MVP 可以先用弹窗展示剧情文本

6. 收集界面
- collections.html 显示好友猫咪、任务感谢卡、重玩小游戏图鉴
- 未解锁项目显示问号
- 已解锁项目显示名称、描述

7. 钓鱼小游戏
- fishing.html 使用 Canvas 实现简单钓鱼玩法
- 感叹号表示上钩，玩家点击鼠标开始拉杆，出现钓鱼条
- 钓鱼条垂直放置，鱼在钓鱼条上下移动，按住鼠标控制绿色滑块向上运动，松开向下，绿色滑块框住鱼时，旁边有钓鱼进度条进度增加，鱼离开绿色滑块进度下降，进度条满后钓鱼成功。

8. 预留后续添加解谜等小游戏



前端要求：
- 所有页面使用同一套 CSS
- 风格温暖、可爱、卡片式、猫咪社交网站感
- 不要复制 Facebook 的品牌、logo、颜色或具体 UI
- 代码清晰拆分
- 每个 JS 文件职责明确
- 所有 Supabase 调用集中在 api.js
- 所有 DOM 辅助函数集中在 ui.js
- 错误提示要友好
- loading 和 empty 状态要完整

README 要求：（中文）
- 说明如何创建 Supabase 项目
- 说明如何维护和添加剧情，猫咪，图片
- 说明如何执行 schema.sql、policies.sql、functions.sql、seed.sql
- 说明如何配置 public/scripts/config.js
- 说明如何本地运行


