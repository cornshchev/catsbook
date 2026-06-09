import { ENABLE_LOCAL_DEMO } from "./config.js";
import { hasSupabaseConfig, supabase } from "./supabaseClient.js";

const PLAYER_KEY = "catsbook_player_id";
const DEMO_KEY = "catsbook_demo_state";
const PENDING_FISHING_QUEST_KEY = "catsbook_pending_fishing_quest";
const PENDING_MERGE_QUEST_KEY = "catsbook_pending_merge_quest";
const PENDING_PAW_QUEST_KEY = "catsbook_pending_paw_on_top_quest";
const RESOURCE_BASE = "./resources/";

const demoSeed = {
  player: null,
  cats: [
    {
      id: "cat-mimi",
      name: "米米",
      handle: "@mimi.sunpatch",
      avatar_emoji: "米",
      avatar_path: "avatars/mimi.jpg",
      bio: "喜欢睡在窗边的三花猫，正在学习如何优雅地发帖。",
      personality: "温柔、慢热、会认真听你讲话",
      likes: ["猫条", "晒太阳", "浅蓝色毛线球"],
    },
    {
      id: "cat-achi",
      name: "阿池",
      handle: "@achi.river",
      avatar_emoji: "池",
      avatar_path: "avatars/gian.jpg",
      bio: "总在河边巡逻的狸花猫，坚信每条鱼都有自己的秘密。",
      personality: "行动派、有点嘴硬、遇到鱼会变得很专注",
      likes: ["小鱼干", "铃铛玩具", "雨后泥土味"],
    },
    {
      id: "cat-nono",
      name: "糯糯",
      handle: "@nono.box",
      avatar_emoji: "糯",
      avatar_path: "avatars/baga.jpg",
      bio: "纸箱发明家，正在筹备一场谜题展。",
      personality: "好奇、爱藏东西、说话像在绕圈",
      likes: ["纸箱", "羽毛棒", "南瓜垫子"],
    },
  ],
  posts: [
    {
      id: "post-first-morning",
      slug: "first-morning",
      cat_id: "cat-mimi",
      body: "新来的铲屎官你好。今天窗台的阳光很满，我把一半让给你。",
      image_label: "窗台阳光照片",
      image_path: "posts/mimi-post-1.jpg",
      sort_order: 1,
      created_at: "2026-05-22T09:10:00+08:00",
      unlock_key: null,
      quest_id: null,
    },
    {
      id: "post-welcome-note",
      slug: "welcome-note",
      cat_id: "cat-mimi",
      body: "刚刚收到一个赞！可以帮我检查一下这张猫书欢迎小纸条有没有写完整吗？",
      image_label: "写着欢迎词的小纸条",
      image_path: "posts/mimi-post-2.jpg",
      sort_order: 2,
      created_at: "2026-05-22T09:18:00+08:00",
      unlock_key: "liked_post:first-morning",
      quest_id: "quest-welcome-dialogue",
      comment_mode: "free",
      fixed_comment_body: null,
    },
    {
      id: "post-river-fishing",
      slug: "river-fishing",
      cat_id: "cat-achi",
      body: "河面在发亮。谁能帮我钓一条闪亮鱼？我会认真道谢，真的。",
      image_label: "小河和浮漂",
      image_path: "posts/mimi-post-3.jpg",
      sort_order: 3,
      created_at: "2026-05-22T20:30:00+08:00",
      unlock_key: "completed_welcome_dialogue",
      quest_id: "quest-shiny-fish",
      comment_mode: "free",
      fixed_comment_body: null,
    },
    {
      id: "post-merge-cats",
      slug: "merge-cats",
      cat_id: "cat-nono",
      body: "纸箱实验更新：我需要你把掉下来的像素小猫头合成起来。达到分数就算实验成功！",
      image_label: "像素猫头合成机",
      image_path: "posts/gian-post-2.jpg",
      sort_order: 4,
      created_at: "2026-05-23T14:00:00+08:00",
      unlock_key: "completed_welcome_dialogue",
      quest_id: "quest-merge-cats",
    },
    {
      id: "post-mimi-rain-fish",
      slug: "mimi-rain-fish",
      cat_id: "cat-mimi",
      body: "雨后水沟里有会反光的小影子。谁能帮我试试更快的钓鱼节奏？",
      image_label: "雨后水沟钓点",
      image_path: "posts/mimi-post-4.jpg",
      sort_order: 5,
      created_at: "2026-05-23T18:20:00+08:00",
      unlock_key: "quest_completed:shiny-fish",
      quest_id: "quest-mimi-rain-fish",
    },
    {
      id: "post-achi-cat-stack",
      slug: "achi-cat-stack",
      cat_id: "cat-achi",
      body: "巡逻记录缺一张合成实验图。别问为什么钓鱼猫也需要猫头合成机。",
      image_label: "河边临时合成台",
      image_path: "posts/gian-post-1.jpg",
      sort_order: 6,
      created_at: "2026-05-24T11:40:00+08:00",
      unlock_key: "quest_completed:merge-cats",
      quest_id: "quest-achi-cat-stack",
    },
    {
      id: "post-paw-on-top",
      slug: "paw-on-top",
      cat_id: "cat-mimi",
      body: "今天练习猫爪在上。规则很简单：我伸爪，你拍中就算你赢；你伸太早，被我按住就算我赢。",
      image_label: "一只准备出招的猫爪",
      image_path: "posts/mimi-post-5.jpg",
      sort_order: 7,
      created_at: "2026-05-24T15:10:00+08:00",
      unlock_key: "quest_completed:shiny-fish",
      quest_id: "quest-paw-on-top",
    },
    {
      id: "post-demo-gallery",
      slug: "demo-gallery",
      cat_id: "cat-mimi",
      body: "今天相册整理完成：多图帖子也能像猫爪一样整齐排队。",
      image_label: "多图相册",
      image_path: "posts/farm-post-1.jpg, posts/farm-post-2.jpg, posts/farm-post-5.jpg, posts/farm-post-6.jpg",
      sort_order: 8,
      created_at: "2026-05-24T16:10:00+08:00",
      unlock_key: null,
      quest_id: null,
    },
  ],
  quests: [
    {
      id: "quest-welcome-dialogue",
      slug: "welcome-dialogue",
      cat_id: "cat-mimi",
      title: "补全欢迎小纸条",
      description: "和米米进行一次短对话，熟悉接受与完成任务。",
      type: "dialogue",
      difficulty: "C",
      target_score: 0,
      unlock_key: "liked_post:first-morning",
      reward_affection: 12,
      reward_card_title: "米米的窗台谢卡",
      reward_card_text: "谢谢你把第一张小纸条读完。以后阳光也分你一半。",
      reward_image_path: "cards/mimi-window-card.png",
    },
    {
      id: "quest-shiny-fish",
      slug: "shiny-fish",
      cat_id: "cat-achi",
      title: "钓一条闪亮鱼",
      description: "在河边小游戏中钓到鱼，帮助阿池完成巡逻记录。",
      type: "fishing",
      difficulty: "C",
      target_score: 0,
      unlock_key: "completed_welcome_dialogue",
      reward_affection: 18,
      reward_card_title: "阿池的闪亮鱼谢卡",
      reward_card_text: "你拉杆的样子还不错。下次河边的位置，给你留一个。",
      reward_image_path: "cards/achi-fish-card.png",
    },
    {
      id: "quest-merge-cats",
      slug: "merge-cats",
      cat_id: "cat-nono",
      title: "像素猫头合成练习",
      description: "把掉落的小猫头合成更大的猫头，达到目标分数后完成糯糯的纸箱实验。",
      type: "merge",
      difficulty: "C",
      target_score: 260,
      unlock_key: "completed_welcome_dialogue",
      reward_affection: 8,
      reward_card_title: "糯糯的像素猫头卡",
      reward_card_text: "你把小小猫头合成了一只很有气势的大猫头。纸箱展的入口亮起来了。",
      reward_image_path: "cards/nono-merge-card.png",
    },
    {
      id: "quest-mimi-rain-fish",
      slug: "mimi-rain-fish",
      cat_id: "cat-mimi",
      title: "雨后反光鱼",
      description: "米米也可以调用钓鱼小游戏。这次鱼游得更快，考验拉杆节奏。",
      type: "fishing",
      difficulty: "B",
      target_score: 0,
      unlock_key: "quest_completed:shiny-fish",
      reward_affection: 14,
      reward_card_title: "米米的雨后钓点卡",
      reward_card_text: "原来雨后的水面也会发动态。谢谢你帮我盯住那道光。",
      reward_image_path: "cards/mimi-rain-fish-card.png",
    },
    {
      id: "quest-achi-cat-stack",
      slug: "achi-cat-stack",
      cat_id: "cat-achi",
      title: "河边猫头堆叠记录",
      description: "阿池调用合成小游戏。目标分数更高，掉落节奏也更紧。",
      type: "merge",
      difficulty: "B",
      target_score: 520,
      unlock_key: "quest_completed:merge-cats",
      reward_affection: 16,
      reward_card_title: "阿池的河边合成卡",
      reward_card_text: "虽然这不是鱼，但堆起来确实很像一份严肃的巡逻报告。",
      reward_image_path: "cards/achi-merge-card.png",
    },
    {
      id: "quest-paw-on-top",
      slug: "paw-on-top",
      cat_id: "cat-mimi",
      title: "猫爪在上练习赛",
      description: "和米米玩一局轻松的拍手小游戏。看准猫爪伸出来的时机，按住或短按鼠标出手。",
      type: "paw_on_top",
      difficulty: "C",
      target_score: 0,
      unlock_key: "quest_completed:shiny-fish",
      reward_affection: 12,
      reward_card_title: "米米的猫爪在上感谢卡",
      reward_card_text: "你的反应很温柔，拍到了爪爪，也没有吓到猫。",
      reward_image_path: "cards/mimi-card-1.jpg",
    },
  ],
  likes: [],
  commentLikes: [],
  comments: [
    {
      id: "comment-mimi-first-1",
      slug: "demo-mimi-first-sun",
      post_id: "post-first-morning",
      parent_comment_id: null,
      player_id: null,
      cat_id: "cat-mimi",
      body: "评论区也晒到太阳了。",
      sort_order: 1,
      created_at: "2026-05-22T09:12:00+08:00",
    },
  ],
  commentReplyRules: [
    {
      id: "reply-rule-mimi-fish",
      cat_id: "cat-mimi",
      post_id: null,
      match_type: "contains",
      keyword: "鱼",
      reply_body: "你也想到鱼了吗？我先把爪垫搓热，等一个夜宵机会。",
      once_per_player: false,
      sort_order: 1,
      is_enabled: true,
    },
    {
      id: "reply-rule-achi-river",
      cat_id: "cat-achi",
      post_id: null,
      match_type: "contains",
      keyword: "河",
      reply_body: "河边的风向变了，带上耐心再来找我。",
      once_per_player: false,
      sort_order: 1,
      is_enabled: true,
    },
    {
      id: "reply-rule-nono-box",
      cat_id: "cat-nono",
      post_id: null,
      match_type: "contains",
      keyword: "纸箱",
      reply_body: "纸箱不是箱子，是通往下一层谜题的门。",
      once_per_player: false,
      sort_order: 1,
      is_enabled: true,
    },
  ],
  commentRuleTriggers: [],
  seenPosts: null,
  questStates: {},
  friendships: {},
  inventory: { food: 0, treat: 0, toy: 0 },
  cards: [],
  dialogue: [
    { id: "dialogue-mimi-1", cat_id: "cat-mimi", min_affection: 0, title: "窗台初遇", body: "米米眯起眼睛：猫书的第一条规则，是先慢慢来。" },
    { id: "dialogue-mimi-2", cat_id: "cat-mimi", min_affection: 10, title: "半块阳光", body: "米米把尾巴挪开一点：今天这块阳光，确实可以写上你的名字。" },
    { id: "dialogue-achi-1", cat_id: "cat-achi", min_affection: 0, title: "河边巡逻", body: "阿池看着浮漂：鱼不只是鱼，也是河流发来的动态。" },
  ],
};

function readDemo() {
  const saved = localStorage.getItem(DEMO_KEY);
  if (!saved) return structuredClone(demoSeed);
  const base = structuredClone(demoSeed);
  const state = JSON.parse(saved);
  return {
    ...base,
    ...state,
    cats: mergeById(base.cats, state.cats || []),
    posts: mergeById(base.posts, state.posts || []),
    quests: mergeById(base.quests, state.quests || []),
    dialogue: mergeById(base.dialogue, state.dialogue || []),
  };
}

function writeDemo(state) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(state));
}

function mergeById(baseItems, savedItems) {
  return baseItems.concat(savedItems.filter((item) => !baseItems.some((baseItem) => baseItem.id === item.id)));
}

export function getResourceUrl(path) {
  if (!path) return "";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  const cleanPath = path.replace(/^\.?\//, "").replace(/^public\//, "").replace(/^resources\//, "");
  return `${RESOURCE_BASE}${cleanPath}`;
}

function withResourceImage(item, sourceKey = "image_path", targetKey = "image_url") {
  return {
    ...item,
    [targetKey]: getResourceUrl(item?.[sourceKey]),
  };
}

function withPostImages(post) {
  const normalizedPost = withResourceImage(post);
  const postImages = parsePostImages(post?.images);
  const imagePaths = parseImagePathList(post?.image_path);
  const sourceImages = postImages.length
    ? postImages
    : imagePaths.map((imagePath, index) => ({
        image_label: post?.image_label,
        image_path: imagePath,
        sort_order: index + 1,
      }));
  const images = sourceImages
    .slice(0, 9)
    .map((image, index) => ({
      ...image,
      image_label: image.image_label || post?.image_label || `帖子图片 ${index + 1}`,
      image_url: image.image_url || getResourceUrl(image.image_path || image.path || image.url),
      sort_order: image.sort_order || index + 1,
    }))
    .filter((image) => image.image_url);

  return {
    ...normalizedPost,
    images,
  };
}

function parsePostImages(images) {
  if (Array.isArray(images)) return images;
  if (typeof images !== "string" || !images.trim()) return [];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseImagePathList(imagePath) {
  if (!imagePath) return [];
  if (Array.isArray(imagePath)) return imagePath.filter(Boolean);
  return String(imagePath)
    .split(/[,，\n]/)
    .map((path) => path.trim())
    .filter(Boolean)
    .slice(0, 9);
}

function shouldUseDemo() {
  return ENABLE_LOCAL_DEMO && (!hasSupabaseConfig || !supabase);
}

function getCat(state, catId) {
  const cat = state.cats.find((item) => item.id === catId);
  return withResourceImage(cat, "avatar_path", "avatar_url");
}

function withCatResource(cat) {
  return withResourceImage(cat, "avatar_path", "avatar_url");
}

function hasCompleted(state, questSlug) {
  const quest = state.quests.find((item) => item.slug === questSlug);
  return quest ? state.questStates[quest.id] === "completed" : false;
}

function isUnlocked(state, unlockKey) {
  if (!unlockKey) return true;
  if (unlockKey.startsWith("liked_post:")) {
    const postSlug = unlockKey.replace("liked_post:", "");
    const post = state.posts.find((item) => item.slug === postSlug);
    return post ? state.likes.includes(post.id) : false;
  }
  if (unlockKey === "completed_welcome_dialogue") return hasCompleted(state, "welcome-dialogue") || hasCompleted(state, "mimi-welcome");
  if (unlockKey.startsWith("quest_completed:")) return hasCompleted(state, unlockKey.replace("quest_completed:", ""));
  return false;
}

export function normalizeQuestDifficulty(difficulty) {
  if (typeof difficulty === "number") {
    if (difficulty >= 3) return "A";
    if (difficulty === 2) return "B";
    return "C";
  }
  const code = String(difficulty || "C").trim().toUpperCase();
  if (code === "D") return "C";
  return ["A", "B", "C"].includes(code) ? code : "C";
}

export function getQuestDifficultyValue(questOrDifficulty) {
  const difficulty = typeof questOrDifficulty === "object" ? questOrDifficulty?.difficulty : questOrDifficulty;
  const code = normalizeQuestDifficulty(difficulty);
  if (code === "A") return 3;
  if (code === "B") return 2;
  return 1;
}

function isQuestVisibleByPost(state, questId) {
  return state.posts.some((post) => post.quest_id === questId && isUnlocked(state, post.unlock_key));
}

function getQuestItemRewards(quest) {
  const difficulty = getQuestDifficultyValue(quest);
  return {
    food: 2 + difficulty * 2,
    treat: 1 + difficulty,
    toy: difficulty >= 2 ? 1 + Math.floor(difficulty / 2) : 1,
  };
}

export function getQuestRewards(quest) {
  return {
    affection: Number(quest?.reward_affection || 0),
    items: getQuestItemRewards(quest),
  };
}

function normalizeError(error) {
  return error?.message || "猫书短暂打了个盹，请稍后再试。";
}

async function ensureSupabase() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error("尚未配置 Supabase，当前只能使用本地演示模式。");
  }
}

export function getStoredPlayerId() {
  return localStorage.getItem(PLAYER_KEY);
}

export function requirePlayer() {
  const playerId = getStoredPlayerId();
  if (!playerId) window.location.href = "./index.html";
  return playerId;
}

export function setPendingFishingQuest(quest) {
  const difficulty = getQuestDifficultyValue(quest);
  const difficultyLabel = normalizeQuestDifficulty(quest?.difficulty);
  const payload = typeof quest === "string"
    ? { questId: quest, difficulty: 1, difficultyLabel: "C", title: "钓鱼任务" }
    : { questId: quest.id, difficulty, difficultyLabel, title: quest.title || "钓鱼任务" };
  localStorage.setItem(PENDING_FISHING_QUEST_KEY, JSON.stringify(payload));
}
export function getPendingFishingQuest() {
  const value = localStorage.getItem(PENDING_FISHING_QUEST_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return { questId: value, difficulty: 1, difficultyLabel: "C", title: "钓鱼任务" };
  }
}

export function clearPendingFishingQuest() {
  localStorage.removeItem(PENDING_FISHING_QUEST_KEY);
}

export function setPendingMergeQuest(quest) {
  localStorage.setItem(
    PENDING_MERGE_QUEST_KEY,
    JSON.stringify({
      questId: quest.id,
      difficulty: getQuestDifficultyValue(quest),
      difficultyLabel: normalizeQuestDifficulty(quest.difficulty),
      targetScore: quest.target_score || 260,
      title: quest.title || "合成大猫咪",
    }),
  );
}
export function getPendingMergeQuest() {
  const value = localStorage.getItem(PENDING_MERGE_QUEST_KEY);
  return value ? JSON.parse(value) : null;
}

export function clearPendingMergeQuest() {
  localStorage.removeItem(PENDING_MERGE_QUEST_KEY);
}

export function setPendingPawQuest(quest) {
  localStorage.setItem(
    PENDING_PAW_QUEST_KEY,
    JSON.stringify({
      questId: quest.id,
      difficulty: getQuestDifficultyValue(quest),
      difficultyLabel: normalizeQuestDifficulty(quest.difficulty),
      title: quest.title || "猫爪在上练习赛",
    }),
  );
}
export function getPendingPawQuest() {
  const value = localStorage.getItem(PENDING_PAW_QUEST_KEY);
  return value ? JSON.parse(value) : null;
}

export function clearPendingPawQuest() {
  localStorage.removeItem(PENDING_PAW_QUEST_KEY);
}

export async function register(displayName, email, password) {
  if (shouldUseDemo()) {
    const state = readDemo();
    state.player = { id: crypto.randomUUID(), display_name: displayName, email };
    localStorage.setItem(PLAYER_KEY, state.player.id);
    writeDemo(state);
    return state.player;
  }

  await ensureSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
  if (error) throw new Error(normalizeError(error));
  if (!data.session) throw new Error("注册成功，请先在邮箱中确认账户后再登录。");
  return ensurePlayerProfile(data.user.id, displayName);
}

export async function login(displayName, email, password) {
  if (shouldUseDemo()) {
    const state = readDemo();
    state.player = state.player || { id: crypto.randomUUID(), display_name: displayName || "猫书玩家", email };
    localStorage.setItem(PLAYER_KEY, state.player.id);
    writeDemo(state);
    return state.player;
  }

  await ensureSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(normalizeError(error));

  const { data: profile, error: profileError } = await supabase
    .from("players")
    .select("id, display_name")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (profileError) throw new Error(normalizeError(profileError));
  if (profile) {
    localStorage.setItem(PLAYER_KEY, profile.id);
    return profile;
  }

  return ensurePlayerProfile(data.user.id, displayName || data.user.user_metadata?.display_name || "猫书玩家");
}

export async function ensurePlayerProfile(authUserId, displayName) {
  await ensureSupabase();
  const { data, error } = await supabase
    .from("players")
    .upsert({ auth_user_id: authUserId, display_name: displayName }, { onConflict: "auth_user_id" })
    .select("id, display_name")
    .single();
  if (error) throw new Error(normalizeError(error));
  localStorage.setItem(PLAYER_KEY, data.id);
  return data;
}

export async function logout() {
  localStorage.removeItem(PLAYER_KEY);
  localStorage.removeItem(PENDING_FISHING_QUEST_KEY);
  localStorage.removeItem(PENDING_MERGE_QUEST_KEY);
  localStorage.removeItem(PENDING_PAW_QUEST_KEY);
  if (hasSupabaseConfig && supabase) await supabase.auth.signOut();
}

export async function getPlayerProfile(playerId) {
  if (shouldUseDemo()) {
    const state = readDemo();
    return state.player || { id: playerId, display_name: "猫书玩家" };
  }

  await ensureSupabase();
  const { data, error } = await supabase.from("players").select("id, display_name").eq("id", playerId).single();
  if (error) throw new Error(normalizeError(error));
  return data;
}

export async function updatePlayerProfile(playerId, displayName) {
  if (shouldUseDemo()) {
    const state = readDemo();
    state.player = state.player || { id: playerId, display_name: displayName };
    state.player.display_name = displayName;
    writeDemo(state);
    return state.player;
  }

  await ensureSupabase();
  const { data, error } = await supabase.from("players").update({ display_name: displayName }).eq("id", playerId).select("id, display_name").single();
  if (error) throw new Error(normalizeError(error));
  await supabase.auth.updateUser({ data: { display_name: displayName } });
  return data;
}

export async function listFeedPosts(playerId) {
  if (shouldUseDemo()) {
    const state = readDemo();
    const unlockedPosts = state.posts
      .filter((post) => isUnlocked(state, post.unlock_key))
      .sort((a, b) => a.sort_order - b.sort_order);

    if (!Array.isArray(state.seenPosts)) {
      state.seenPosts = unlockedPosts.map((post) => post.id);
      writeDemo(state);
    }

    return unlockedPosts.map((post) => ({
        ...withPostImages(post),
        cat: getCat(state, post.cat_id),
        quest: getPostQuest(state, post.quest_id),
        liked: state.likes.includes(post.id),
        is_new: !state.seenPosts.includes(post.id),
        comments: getPostComments(state, post.id),
        comment_mode: post.comment_mode || "free",
        fixed_comment_body: post.fixed_comment_body || "",
      }));
  }

  await ensureSupabase();
  const { data, error } = await supabase.rpc("get_feed_posts", { p_player_id: playerId });
  if (error) throw new Error(normalizeError(error));
  return (data || []).map((post) => ({
    ...withPostImages(post),
    cat: withCatResource(post.cat),
    quest: normalizeFeedQuest(post.quest),
    comments: normalizeComments(post.comments),
    is_new: Boolean(post.is_new),
    comment_mode: post.comment_mode || "free",
    fixed_comment_body: post.fixed_comment_body || "",
  }));
}

export async function markFeedPostsSeen(playerId, postIds) {
  const ids = Array.isArray(postIds) ? postIds.filter(Boolean) : [];
  if (!ids.length) return;

  if (shouldUseDemo()) {
    const state = readDemo();
    state.seenPosts = Array.isArray(state.seenPosts) ? state.seenPosts : [];
    ids.forEach((id) => {
      if (!state.seenPosts.includes(id)) state.seenPosts.push(id);
    });
    writeDemo(state);
    return;
  }

  await ensureSupabase();
  const { error } = await supabase.rpc("mark_feed_posts_seen", { p_player_id: playerId, p_post_ids: ids });
  if (error) throw new Error(normalizeError(error));
}

function getPostComments(state, postId) {
  return (state.comments || [])
    .filter((comment) => comment.post_id === postId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || new Date(a.created_at || 0) - new Date(b.created_at || 0))
    .map((comment) => normalizeDemoComment(state, comment));
}

function normalizeDemoComment(state, comment) {
  const cat = comment.cat_id ? getCat(state, comment.cat_id) : null;
  return {
    ...comment,
    author_name: cat?.name || state.player?.display_name || "猫书玩家",
    author_handle: cat?.handle || "玩家评论",
    author_avatar_emoji: cat?.avatar_emoji || "你",
    author_avatar_url: cat?.avatar_url || "",
    parent_comment_id: comment.parent_comment_id || null,
    sort_order: comment.sort_order || 100,
    liked: (state.commentLikes || []).includes(comment.id),
  };
}

function normalizeComments(comments) {
  if (!Array.isArray(comments)) return [];
  return comments.map((comment) => ({
    ...comment,
    author_name: comment.author_name || "猫书玩家",
    author_handle: comment.author_handle || "玩家评论",
    author_avatar_emoji: comment.author_avatar_emoji || (comment.cat_id ? "猫" : "你"),
    author_avatar_url: getResourceUrl(comment.author_avatar_path || comment.author_avatar_url),
    parent_comment_id: comment.parent_comment_id || null,
    sort_order: comment.sort_order || 100,
    liked: Boolean(comment.liked),
  }));
}

function normalizeFeedQuest(quest) {
  if (!quest) return null;
  return {
    ...quest,
    difficulty: normalizeQuestDifficulty(quest.difficulty),
    status: quest.status || "available",
  };
}

function getPostQuest(state, questId) {
  const quest = state.quests.find((item) => item.id === questId);
  if (!quest) return null;
  return {
    ...quest,
    difficulty: normalizeQuestDifficulty(quest.difficulty),
    status: state.questStates[quest.id] || "available",
  };
}

export async function likePost(playerId, postId) {
  if (shouldUseDemo()) {
    const state = readDemo();
    if (!state.likes.includes(postId)) state.likes.push(postId);
    writeDemo(state);
    return;
  }

  await ensureSupabase();
  const { error } = await supabase.from("post_likes").upsert({ player_id: playerId, post_id: postId });
  if (error) throw new Error(normalizeError(error));
}

export async function addComment(playerId, postId, body, parentCommentId = null) {
  if (shouldUseDemo()) {
    const state = readDemo();
    const now = new Date().toISOString();
    const post = state.posts.find((item) => item.id === postId);
    const parentComment = parentCommentId ? (state.comments || []).find((comment) => comment.id === parentCommentId && comment.post_id === postId) : null;
    if (parentCommentId && !parentComment) {
      throw new Error("要回复的评论不存在。");
    }
    if (parentComment?.cat_id) {
      throw new Error("猫咪剧情回复不能继续回复。");
    }
    if (!parentCommentId && post?.comment_mode === "fixed" && (state.comments || []).some((comment) => (
      comment.post_id === postId
      && comment.player_id === playerId
      && !comment.parent_comment_id
    ))) {
      throw new Error("这条剧情评论已经发送过啦。");
    }
    const finalBody = !parentCommentId && post?.comment_mode === "fixed" ? post.fixed_comment_body : body;
    const playerComment = {
      id: crypto.randomUUID(),
      player_id: playerId,
      post_id: postId,
      parent_comment_id: parentCommentId || null,
      cat_id: null,
      body: finalBody,
      sort_order: 1000,
      created_at: now,
    };
    state.comments = state.comments || [];
    state.comments.push(playerComment);

    const replies = parentCommentId ? [] : createDemoAutoReplies(state, post, finalBody, playerComment);
    replies.forEach((reply) => state.comments.push(reply));

    writeDemo(state);
    return {
      comment: normalizeDemoComment(state, playerComment),
      auto_reply_count: replies.length,
      comments: getPostComments(state, postId),
    };
  }
  await ensureSupabase();
  const payload = {
    p_player_id: playerId,
    p_post_id: postId,
    p_body: body,
  };
  if (parentCommentId) payload.p_parent_comment_id = parentCommentId;
  const { data, error } = await supabase.rpc("create_post_comment", payload);
  if (error) throw new Error(normalizeError(error));
  return {
    ...data,
    comments: normalizeComments(data?.comments),
  };
}

export async function deleteComment(playerId, commentId) {
  if (shouldUseDemo()) {
    const state = readDemo();
    const comment = (state.comments || []).find((item) => item.id === commentId);
    if (!comment) throw new Error("这条评论不存在。");
    if (comment.player_id !== playerId) {
      throw new Error("只能删除自己的评论。");
    }
    const removeIds = new Set([commentId]);
    let changed = true;
    while (changed) {
      changed = false;
      (state.comments || []).forEach((item) => {
        if (item.parent_comment_id && removeIds.has(item.parent_comment_id) && !removeIds.has(item.id)) {
          removeIds.add(item.id);
          changed = true;
        }
      });
    }
    state.comments = (state.comments || []).filter((item) => !removeIds.has(item.id));
    state.commentLikes = (state.commentLikes || []).filter((id) => !removeIds.has(id));
    writeDemo(state);
    return {
      post_id: comment.post_id,
      comments: getPostComments(state, comment.post_id),
    };
  }

  await ensureSupabase();
  const { data, error } = await supabase.rpc("delete_post_comment", { p_player_id: playerId, p_comment_id: commentId });
  if (error) throw new Error(normalizeError(error));
  return {
    ...data,
    comments: normalizeComments(data?.comments),
  };
}

export async function likeComment(playerId, commentId) {
  if (shouldUseDemo()) {
    const state = readDemo();
    const comment = (state.comments || []).find((item) => item.id === commentId);
    if (comment?.player_id === playerId) {
      throw new Error("不能给自己的评论点赞。");
    }
    state.commentLikes = state.commentLikes || [];
    const isNewLike = !state.commentLikes.includes(commentId);
    if (isNewLike) {
      state.commentLikes.push(commentId);
      state.inventory = state.inventory || { food: 0, treat: 0, toy: 0 };
      state.inventory.food = (state.inventory.food || 0) + 1;
    }
    writeDemo(state);
    return { liked: true, reward_food: isNewLike ? 1 : 0 };
  }

  await ensureSupabase();
  const { data, error } = await supabase.rpc("like_comment", { p_player_id: playerId, p_comment_id: commentId });
  if (error) throw new Error(normalizeError(error));
  return data;
}

function createDemoAutoReplies(state, post, body, playerComment) {
  if (!post) return [];
  const rule = (state.commentReplyRules || [])
    .filter((item) => item.is_enabled !== false)
    .filter((item) => !item.cat_id || item.cat_id === post.cat_id)
    .filter((item) => !item.post_id || item.post_id === post.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .find((item) => matchesCommentRule(item, body) && canTriggerDemoRule(state, item));

  if (!rule) return [];
  if (rule.once_per_player) {
    state.commentRuleTriggers = state.commentRuleTriggers || [];
    state.commentRuleTriggers.push({ rule_id: rule.id, player_id: state.player?.id });
  }

  return [{
    id: crypto.randomUUID(),
    player_id: null,
    post_id: post.id,
    parent_comment_id: playerComment.id,
    cat_id: post.cat_id,
    body: rule.reply_body,
    sort_order: 1001,
    created_at: new Date(Date.now() + 450).toISOString(),
  }];
}

function canTriggerDemoRule(state, rule) {
  if (!rule.once_per_player) return true;
  return !(state.commentRuleTriggers || []).some((item) => item.rule_id === rule.id && item.player_id === state.player?.id);
}

function matchesCommentRule(rule, body) {
  const keyword = String(rule.keyword || "").trim();
  const content = String(body || "").trim();
  if (!keyword || !content) return false;
  if (rule.match_type === "exact") return content === keyword;
  if (rule.match_type === "regex") {
    try {
      return new RegExp(keyword, "i").test(content);
    } catch {
      return false;
    }
  }
  return content.includes(keyword);
}

export async function listQuests(playerId) {
  if (shouldUseDemo()) {
    const state = readDemo();
    return state.quests
      .filter((quest) => isQuestVisibleByPost(state, quest.id))
      .map((quest) => ({
        ...quest,
        difficulty: normalizeQuestDifficulty(quest.difficulty),
        cat: getCat(state, quest.cat_id),
        status: state.questStates[quest.id] || "available",
      }));
  }

  await ensureSupabase();
  const { data, error } = await supabase.rpc("get_player_quests", { p_player_id: playerId });
  if (error) throw new Error(normalizeError(error));
  return (data || []).map((quest) => ({
    ...quest,
    difficulty: normalizeQuestDifficulty(quest.difficulty),
    cat: withCatResource(quest.cat),
  }));
}

export async function startQuest(playerId, questId) {
  if (shouldUseDemo()) {
    const state = readDemo();
    if (!isQuestVisibleByPost(state, questId)) throw new Error("这个任务还没有通过帖子解锁");
    if (state.questStates[questId] !== "completed") state.questStates[questId] = "active";
    writeDemo(state);
    return;
  }

  await ensureSupabase();
  const { error } = await supabase.rpc("start_quest", { p_player_id: playerId, p_quest_id: questId });
  if (error) throw new Error(normalizeError(error));
}

export async function completeQuest(playerId, questId) {
  if (shouldUseDemo()) {
    const state = readDemo();
    const quest = state.quests.find((item) => item.id === questId);
    if (!quest) throw new Error("没有找到这条任务。");
    if (!isQuestVisibleByPost(state, questId)) throw new Error("这个任务还没有通过帖子解锁");
    const wasCompleted = state.questStates[questId] === "completed";
    state.questStates[questId] = "completed";
    if (!wasCompleted) {
      const current = state.friendships[quest.cat_id]?.affection || 0;
      const rewards = getQuestItemRewards(quest);
      state.inventory = state.inventory || { food: 0, treat: 0, toy: 0 };
      state.inventory.food += rewards.food;
      state.inventory.treat += rewards.treat;
      state.inventory.toy += rewards.toy;
      state.friendships[quest.cat_id] = { cat_id: quest.cat_id, affection: current + quest.reward_affection };
      if (!state.cards.some((card) => card.quest_id === questId)) {
        state.cards.push({
          id: crypto.randomUUID(),
          quest_id: questId,
          cat_id: quest.cat_id,
          title: quest.reward_card_title,
          body: quest.reward_card_text,
          image_path: quest.reward_image_path,
        });
      }
    }
    writeDemo(state);
    return;
  }

  await ensureSupabase();
  const { error } = await supabase.rpc("complete_quest", { p_player_id: playerId, p_quest_id: questId });
  if (error) throw new Error(normalizeError(error));
}

export async function listCatFriends(playerId) {
  if (shouldUseDemo()) {
    const state = readDemo();
    return Object.values(state.friendships).map((friend) => ({
      ...friend,
      cat: getCat(state, friend.cat_id),
      dialogues: state.dialogue.filter((node) => node.cat_id === friend.cat_id && node.min_affection <= friend.affection),
    }));
  }

  await ensureSupabase();
  const { data, error } = await supabase.rpc("get_cat_friends", { p_player_id: playerId });
  if (error) throw new Error(normalizeError(error));
  return (data || []).map((friend) => ({
    ...friend,
    cat: withCatResource(friend.cat),
  }));
}

export async function getInventory(playerId) {
  if (shouldUseDemo()) {
    const state = readDemo();
    return { food: 0, treat: 0, toy: 0, ...(state.inventory || {}) };
  }

  await ensureSupabase();
  const { data, error } = await supabase.rpc("get_player_items", { p_player_id: playerId });
  if (error) throw new Error(normalizeError(error));
  return { food: 0, treat: 0, toy: 0, ...(data || {}) };
}

export async function feedCat(playerId, catId, itemType) {
  if (shouldUseDemo()) {
    const bonuses = { food: 3, treat: 5, toy: 7 };
    const state = readDemo();
    state.inventory = state.inventory || { food: 0, treat: 0, toy: 0 };
    if ((state.inventory[itemType] || 0) <= 0) throw new Error("这个道具已经用完了。完成任务可以获得更多。");
    state.inventory[itemType] -= 1;
    const current = state.friendships[catId]?.affection || 0;
    state.friendships[catId] = { cat_id: catId, affection: current + (bonuses[itemType] || 2) };
    writeDemo(state);
    return;
  }

  await ensureSupabase();
  const { error } = await supabase.rpc("feed_cat", { p_player_id: playerId, p_cat_id: catId, p_item_type: itemType });
  if (error) throw new Error(normalizeError(error));
}

export async function getCollections(playerId) {
  if (shouldUseDemo()) {
    const state = readDemo();
    const friends = state.cats.map((cat) => {
      const friend = state.friendships[cat.id];
      return friend ? { unlocked: true, cat: withCatResource(cat), affection: friend.affection } : { unlocked: false, cat: withCatResource(cat) };
    });
    const cards = state.quests.map((quest) => {
      const card = state.cards.find((item) => item.quest_id === quest.id);
      return card ? { unlocked: true, ...withResourceImage(card), cat: getCat(state, card.cat_id) } : { unlocked: false, quest };
    });
    const games = [
      { id: "fishing", title: "钓鱼小游戏", description: "重玩已解锁的钓鱼玩法", href: "./fishing.html", unlocked: state.quests.some((quest) => quest.type === "fishing" && state.questStates[quest.id] === "completed") },
      { id: "merge-cats", title: "合成大猫咪", description: "重玩已解锁的合成玩法", href: "./merge.html", unlocked: state.quests.some((quest) => quest.type === "merge" && state.questStates[quest.id] === "completed") },
      { id: "paw-on-top", title: "猫爪在上", description: "重玩已解锁的拍爪玩法", href: "./paw-on-top.html", unlocked: state.quests.some((quest) => quest.type === "paw_on_top" && state.questStates[quest.id] === "completed") },
    ];
    return { friends, cards, games };
  }

  await ensureSupabase();
  const { data, error } = await supabase.rpc("get_collections", { p_player_id: playerId });
  if (error) throw new Error(normalizeError(error));
  return {
    ...data,
    friends: (data?.friends || []).map((friend) => ({
      ...friend,
      cat: withCatResource(friend.cat),
    })),
    cards: (data?.cards || []).map((card) => (card.unlocked ? withResourceImage(card) : card)),
  };
}
