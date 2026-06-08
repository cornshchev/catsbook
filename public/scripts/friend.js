import * as api from "./api.js";
import { $, clear, el, renderAvatar, renderState, setStatus, setupLogout, showDialog } from "./ui.js";

const playerId = api.requirePlayer();
const params = new URLSearchParams(window.location.search);
const catId = params.get("cat_id");
const catName = params.get("name") ? decodeURIComponent(params.get("name")) : "猫咪";
const list = $("#post-list");
const status = $("#friend-status");
const title = $("#friend-title");
const catDetail = $("#cat-detail");
const inventoryPanel = $("#inventory-panel");
let inventory = { food: 0, treat: 0, toy: 0 };
let currentCat = null;
let friendData = null;

setupLogout(api);
if (!catId) {
  window.location.href = "./cat.html";
} else {
  title.textContent = `${catName} 的主页`;
  loadFriendData();
}

/** 加载好友数据：猫咪信息、好感度、库存和帖子 */
async function loadFriendData() {
  setStatus(status, "正在加载猫咪主页...");
  try {
    const [posts, currentInventory] = await Promise.all([
      api.listFeedPosts(playerId),
      api.getInventory(playerId)
    ]);
    inventory = currentInventory;
    
    // 找到当前猫咪的信息
    const friendPost = posts.find(p => p.cat_id === catId);
    if (friendPost && friendPost.cat) {
      currentCat = friendPost.cat;
    }
    
    // 获取好友数据
    const friends = await api.listCatFriends(playerId);
    friendData = friends.find(f => f.cat.id === catId);
    
    renderInventory();
    renderCatDetail();
    
    clear(list);
    setStatus(status, "");
    
    // 显示该猫咪的帖子
    const friendPosts = posts.filter((post) => post.cat_id === catId);
    if (!friendPosts.length) {
      renderState(list, `${catName} 还没有可见的帖子`, "完成更多任务后她的个人主页会出现动态。");
      return;
    }
    friendPosts.forEach((post) => list.append(renderPost(post)));
  } catch (error) {
    setStatus(status, error.message, "error");
  }
}

/** 渲染道具库存面板 */
function renderInventory() {
  clear(inventoryPanel);
  inventoryPanel.append(
    el("div", { class: "inventory-item" }, [el("span", { text: "猫粮" }), el("strong", { text: inventory.food })]),
    el("div", { class: "inventory-item" }, [el("span", { text: "猫条" }), el("strong", { text: inventory.treat })]),
    el("div", { class: "inventory-item" }, [el("span", { text: "玩具" }), el("strong", { text: inventory.toy })]),
  );
}

/** 渲染猫咪档案详情 */
function renderCatDetail() {
  clear(catDetail);
  
  if (!currentCat && (!friendData || !friendData.cat)) {
    catDetail.append(el("p", { class: "muted", text: "猫咪信息加载中..." }));
    return;
  }
  
  const cat = currentCat || friendData.cat;
  const affection = Math.min(friendData?.affection || 0, 100);
  const actionRow = el("div", { class: "action-strip" }, [
    el("button", { class: "chip-btn", type: "button", text: "猫粮 +3", disabled: inventory.food <= 0 ? "true" : null, onclick: () => feed(cat.id, "food") }),
    el("button", { class: "chip-btn", type: "button", text: "猫条 +5", disabled: inventory.treat <= 0 ? "true" : null, onclick: () => feed(cat.id, "treat") }),
    el("button", { class: "chip-btn", type: "button", text: "玩具 +7", disabled: inventory.toy <= 0 ? "true" : null, onclick: () => feed(cat.id, "toy") }),
    el("button", { class: "primary-btn", type: "button", text: "查看剧情", onclick: () => openDialogue() }),
  ]);
  
  catDetail.append(
    el("div", { class: "post-author" }, [
      renderAvatarButton(cat),
      el("div", {}, [
        el("h3", { text: cat?.name || "猫咪" }),
        el("div", { class: "handle", text: cat?.handle || "@catsbook" }),
      ]),
    ]),
    el("p", { class: "muted", text: cat?.bio || "这只猫还没有写简介。" }),
    el("p", { class: "muted", text: `性格：${cat?.personality || "神秘"}` }),
    el("p", { class: "muted", text: `喜欢：${(cat?.likes || []).join("、") || "暂未记录"}` }),
    el("div", { class: "meter" }, [el("span", { style: `width:${affection}%` })]),
    el("div", { class: "stat-row" }, [
      el("span", { text: `好感度 ${friendData?.affection || 0}` }),
      el("span", { text: `已解锁剧情 ${friendData?.dialogues?.length || 0}` }),
    ]),
    actionRow,
  );
}

/** 投喂猫咪 */
async function feed(catId, itemType) {
  setStatus(status, "猫咪正在认真嗅嗅礼物...");
  try {
    await api.feedCat(playerId, catId, itemType);
    await loadFriendData();
  } catch (error) {
    setStatus(status, error.message, "error");
  }
}

/** 查看猫咪剧情对话 */
function openDialogue() {
  const lines = friendData?.dialogues?.length
    ? friendData.dialogues.map((node) => `${node.title}：${node.body}`)
    : ["这只猫还在观察你。好感度提高后会解锁更多剧情。"];
  showDialog(`${currentCat?.name || catName}的剧情`, lines);
}

function renderAvatarButton(cat) {
  return el("button", {
    class: "avatar-button",
    type: "button",
    "aria-label": `查看${cat?.name || "猫咪"}头像大图`,
    title: "查看头像大图",
    onclick: () => showAvatarPreview(cat),
  }, [renderAvatar(cat)]);
}

function showAvatarPreview(cat) {
  const title = `${cat?.name || "猫咪"}的头像`;
  if (!cat?.avatar_url) {
    showDialog(title, ["这只猫咪暂时还没有头像图片。"]);
    return;
  }

  const dialog = el("dialog", { class: "avatar-preview-dialog" });
  const close = () => {
    dialog.close();
    dialog.remove();
  };

  dialog.append(
    el("div", { class: "dialog-body avatar-preview-body" }, [
      el("button", {
        class: "avatar-preview-close",
        type: "button",
        "aria-label": "关闭头像大图",
        title: "关闭",
        text: "×",
        onclick: close,
      }),
      el("img", { src: cat.avatar_url, alt: `${cat.name || "猫咪"}头像大图` }),
      el("h2", { text: title }),
      cat.handle ? el("p", { class: "muted", text: cat.handle }) : "",
    ]),
  );

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  document.body.append(dialog);
  dialog.showModal();
}

/** 渲染帖子卡片 */
function renderPost(post) {
  const card = el("article", { class: "post-card" });
  const actionRow = el("div", { class: "action-strip" });
  actionRow.append(
    el("button", {
      class: post.liked ? "heart-btn liked" : "heart-btn",
      type: "button",
      "aria-label": post.liked ? "已点赞" : "点赞",
      title: post.liked ? "已点赞" : "点赞",
      text: post.liked ? "♥" : "♡",
      onclick: () => likePost(post.id),
    }),
    el("button", {
      class: "chip-btn",
      type: "button",
      text: "评论",
      onclick: () => commentPost(post.id),
    }),
  );

  if (post.quest) {
    actionRow.append(
      el("button", {
        class: "primary-btn",
        type: "button",
        text: getQuestButtonLabel(post.quest),
        onclick: () => handleQuest(post.quest),
      }),
    );
  }

  card.append(
    el("div", { class: "post-author" }, [
      renderAvatarButton(post.cat),
      el("div", {}, [
        el("h3", {}, [
          el("a", {
            class: "profile-link",
            href: `./friend.html?cat_id=${encodeURIComponent(post.cat_id)}&name=${encodeURIComponent(post.cat?.name || "猫咪")}`,
            text: post.cat?.name || "猫咪",
          }),
        ]),
        el("div", { class: "handle", text: post.cat?.handle || "@catsbook" }),
      ]),
    ]),
    el("p", { class: "post-body", text: post.body }),
    renderPostImage(post),
    el("div", { class: "stat-row" }, [
      el("span", { text: post.liked ? "你已经给这条动态送出小鱼干赞" : "还没有点赞" }),
      post.quest ? el("span", { class: "badge", text: post.quest.title }) : el("span"),
    ]),
    actionRow,
  );
  return card;
}

/** 获取任务按钮文字 */
function getQuestButtonLabel(quest) {
  if (isGame(quest, "fishing")) return "接受钓鱼任务";
  if (isGame(quest, "merge")) return "接受游戏任务";
  if (isGame(quest, "paw_on_top")) return "接受猫爪挑战";
  return "查看任务";
}

/** 渲染帖子图片 */
function renderPostImage(post) {
  if (!post.image_url) return el("div", { class: "post-image", text: post.image_label || "猫咪图片占位" });
  return el("figure", { class: "post-image has-image" }, [
    el("img", { src: post.image_url, alt: post.image_label || "猫咪帖子图片", loading: "lazy" }),
    post.image_label ? el("figcaption", { text: post.image_label }) : "",
  ]);
}

/** 点赞帖子 */
async function likePost(postId) {
  setStatus(status, "正在送出小鱼干赞...");
  try {
    await api.likePost(playerId, postId);
    await loadFriendData();
  } catch (error) {
    setStatus(status, error.message, "error");
  }
}

/** 评论帖子 */
function commentPost(postId) {
  showDialog("写一条友好评论", ["MVP 阶段先用弹窗模拟评论。"], [
    {
      label: "发送摸摸头",
      className: "primary-btn",
      onClick: async (close) => {
        try {
          await api.addComment(playerId, postId, "摸摸头，今天也辛苦了。");
          close();
          setStatus(status, "评论已送到猫咪的小信箱。");
        } catch (error) {
          setStatus(status, error.message, "error");
        }
      },
    },
    { label: "取消", className: "ghost-btn" },
  ]);
}

/** 处理任务按钮点击 */
async function handleQuest(quest) {
  if (isGame(quest, "fishing")) {
    try {
      await api.startQuest(playerId, quest.id);
      api.setPendingFishingQuest(quest);
      window.location.href = "./fishing.html";
    } catch (error) {
      setStatus(status, error.message, "error");
    }
    return;
  }

  if (isGame(quest, "merge")) {
    try {
      await api.startQuest(playerId, quest.id);
      api.setPendingMergeQuest(quest);
      window.location.href = "./merge.html";
    } catch (error) {
      setStatus(status, error.message, "error");
    }
    return;
  }

  if (isGame(quest, "paw_on_top")) {
    try {
      await api.startQuest(playerId, quest.id);
      api.setPendingPawQuest(quest);
      window.location.href = "./paw-on-top.html";
    } catch (error) {
      setStatus(status, error.message, "error");
    }
    return;
  }

  if (quest.type === "dialogue") {
    showDialog(quest.title, ["猫咪把一张卡片递过来~", "你点点头，帮它确认每个字都很可爱。"], [
      {
        label: "完成对话",
        className: "primary-btn",
        onClick: async (close) => {
          try {
            await api.startQuest(playerId, quest.id);
            await api.completeQuest(playerId, quest.id);
            close();
            await loadFriendData();
          } catch (error) {
            setStatus(status, error.message, "error");
          }
        },
      },
      { label: "稍后", className: "ghost-btn" },
    ]);
    return;
  }

  window.location.href = "./quests.html";
}

function isGame(quest, type) {
  return quest?.type === type;
}
