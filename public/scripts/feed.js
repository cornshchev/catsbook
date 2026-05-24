import * as api from "./api.js";
import { $, clear, el, renderAvatar, renderState, setStatus, setupLogout, showDialog } from "./ui.js";

const playerId = api.requirePlayer();
const list = $("#post-list");
const status = $("#feed-status");
const sortAscButton = $("#sort-asc");
const sortDescButton = $("#sort-desc");
let sortDirection = "asc";
let currentPosts = [];
let hasPendingNewPosts = false;

setupLogout(api);
setupSortControls();
loadFeed();

async function loadFeed() {
  setStatus(status, "正在刷新猫咪动态...");
  try {
    const posts = await api.listFeedPosts(playerId);
    if (!Array.isArray(posts)) throw new Error("帖子数据格式异常，请检查 get_feed_posts RPC 返回值。");
    currentPosts = posts;
    hasPendingNewPosts = false;
    setStatus(status, "");
    if (!posts.length) {
      renderState(list, "时间线还是空的", "先完成一个任务，猫咪们就会慢慢出现。");
      return;
    }
    renderFeedPosts();
  } catch (error) {
    setStatus(status, error.message, "error");
  }
}

function setupSortControls() {
  sortAscButton?.addEventListener("click", () => setSortDirection("asc"));
  sortDescButton?.addEventListener("click", () => setSortDirection("desc"));
}

function setSortDirection(direction) {
  sortDirection = direction;
  sortAscButton?.classList.toggle("active", direction === "asc");
  sortDescButton?.classList.toggle("active", direction === "desc");
  sortAscButton?.setAttribute("aria-pressed", direction === "asc" ? "true" : "false");
  sortDescButton?.setAttribute("aria-pressed", direction === "desc" ? "true" : "false");
  renderFeedPosts();
}

function renderFeedPosts() {
  clear(list);
  if (!currentPosts.length) {
    renderState(list, "时间线还是空的", "先完成一个任务，猫咪们就会慢慢出现。");
    return;
  }
  const posts = getSortedPosts(currentPosts);
  if (hasPendingNewPosts && sortDirection === "desc") list.append(renderNewPostsNotice());
  posts.forEach((post) => {
    try {
      list.append(renderPost(post));
    } catch (error) {
      console.error("帖子渲染失败", post, error);
      list.append(renderBrokenPost(post, error));
    }
  });
  if (hasPendingNewPosts && sortDirection === "asc") list.append(renderNewPostsNotice());
}

function getSortedPosts(posts) {
  const sorted = [...posts].sort(comparePosts);
  return sortDirection === "desc" ? sorted.reverse() : sorted;
}

function comparePosts(a, b) {
  const timeDiff = getPostTimestamp(a) - getPostTimestamp(b);
  if (timeDiff) return timeDiff;
  return (a.sort_order || 0) - (b.sort_order || 0);
}

function getPostTimestamp(post) {
  const time = new Date(post.created_at || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function renderNewPostsNotice() {
  return el("button", {
    class: "new-posts-notice",
    type: "button",
    text: "有新的猫咪帖子，点击刷新",
    onclick: () => loadFeed(),
  });
}

async function showNewPostsNoticeIfNeeded() {
  const visibleIds = new Set(currentPosts.map((post) => post.id));
  const posts = await api.listFeedPosts(playerId);
  const visiblePosts = posts.filter((post) => visibleIds.has(post.id));
  const newPosts = posts.filter((post) => !visibleIds.has(post.id));

  currentPosts = visiblePosts;
  hasPendingNewPosts = newPosts.length > 0;
  renderFeedPosts();

  if (hasPendingNewPosts) {
    setStatus(status, "猫咪刚刚发了新动态，点提示或刷新网页就能看到。");
  } else {
    setStatus(status, "");
  }
}

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

  card.append(
    el("div", { class: "post-author post-author-with-time" }, [
      el("div", { class: "post-author-main" }, [
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
      el("time", {
        class: "post-time",
        datetime: post.created_at || "",
        text: formatPostTime(post.created_at),
      }),
    ]),
    el("p", { class: "post-body", text: post.body }),
    renderPostImage(post),
    post.quest ? renderQuestPreview(post.quest) : "",
    el("div", { class: "stat-row" }, [
      el("span", { text: post.liked ? "你已经给这条动态送出小鱼干赞" : "还没有点赞" }),
    ]),
    actionRow,
  );
  return card;
}

function renderBrokenPost(post, error) {
  return el("article", { class: "post-card" }, [
    el("h3", { text: post?.cat?.name || "猫咪帖子" }),
    el("p", { class: "muted", text: "这条帖子暂时显示失败，可以稍后刷新试试。" }),
    el("p", { class: "muted", text: error?.message || "未知错误" }),
  ]);
}

function renderQuestPreview(quest) {
  return el("section", { class: "quest-preview" }, [
    el("div", {}, [
      el("span", { class: "quest-preview-label", text: "猫咪委托" }),
      el("h4", { text: quest.title || "猫咪委托" }),
      el("p", { text: quest.description || "这只猫咪发来了一条小小委托。" }),
    ]),
    el("div", { class: "quest-preview-actions" }, [
      el("span", { class: "badge", text: getQuestTypeLabel(quest) }),
      el("button", {
        class: quest.status === "completed" ? "ghost-btn" : "primary-btn",
        type: "button",
        text: getQuestButtonLabel(quest),
        onclick: () => handleQuest(quest),
      }),
    ]),
  ]);
}

function getQuestTypeLabel(quest) {
  if (quest.game_key === "fishing") return "钓鱼";
  if (quest.game_key === "merge_cats") return "合成";
  if (quest.type === "dialogue") return "对话";
  return quest.type || "任务";
}

function formatPostTime(value) {
  if (!value) return "刚刚";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function getQuestButtonLabel(quest) {
  if (quest.status === "completed") return "已完成";
  if (quest.status === "active") return "继续任务";
  if (quest.game_key === "fishing") return "接受钓鱼";
  if (quest.game_key === "merge_cats") return "接受合成";
  if (quest.type === "dialogue") return "接受任务";
  return "查看任务";
}

function renderPostImage(post) {
  if (!post.image_url) return el("div", { class: "post-image", text: post.image_label || "猫咪图片占位" });
  return el("figure", { class: "post-image has-image" }, [
    el("img", { src: post.image_url, alt: post.image_label || "猫咪帖子图片", loading: "lazy" }),
    post.image_label ? el("figcaption", { text: post.image_label }) : "",
  ]);
}

async function likePost(postId) {
  setStatus(status, "正在送出小鱼干赞...");
  try {
    await api.likePost(playerId, postId);
    await showNewPostsNoticeIfNeeded();
  } catch (error) {
    setStatus(status, error.message, "error");
  }
}

function commentPost(postId) {
  showDialog("写一条友好评论", ["MVP 阶段先用弹窗模拟评论。"], [
    {
      label: "发送“摸摸头”",
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

async function handleQuest(quest) {
  if (quest.status === "completed") {
    showCompletedQuest(quest);
    return;
  }

  if (quest.game_key === "fishing") {
    try {
      await api.startQuest(playerId, quest.id);
      api.setPendingFishingQuest(quest);
      window.location.href = "./fishing.html";
    } catch (error) {
      setStatus(status, error.message, "error");
    }
    return;
  }

  if (quest.game_key === "merge_cats") {
    try {
      await api.startQuest(playerId, quest.id);
      api.setPendingMergeQuest(quest);
      window.location.href = "./merge.html";
    } catch (error) {
      setStatus(status, error.message, "error");
    }
    return;
  }

  if (quest.type === "dialogue") {
    showDialog(quest.title, [
      quest.description || "猫咪发来了一条小小委托。",
      quest.reward_card_title ? `完成后可获得：${quest.reward_card_title}` : "完成后会解锁猫咪感谢卡。",
    ], [
      {
        label: "完成对话",
        className: "primary-btn",
        onClick: async (close) => {
          try {
            await api.startQuest(playerId, quest.id);
            await api.completeQuest(playerId, quest.id);
            close();
            await showNewPostsNoticeIfNeeded();
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

function showCompletedQuest(quest) {
  showDialog(quest.title, [
    quest.description || "这条猫咪委托已经完成。",
    "状态：已完成",
    quest.reward_card_title ? `已获得：${quest.reward_card_title}` : "感谢卡已收入图鉴。",
  ], [
    { label: "知道了", className: "primary-btn" },
  ]);
}
