import * as api from "./api.js";
import { $, clear, el, renderAvatar, renderState, setStatus, setupLogout, showDialog } from "./ui.js";

const playerId = api.requirePlayer();
const list = $("#post-list");
const status = $("#feed-status");
const filterAllButton = $("#filter-all");
const filterCatsButton = $("#filter-cats");
const filterHumansButton = $("#filter-humans");
const sortAscButton = $("#sort-asc");
const sortDescButton = $("#sort-desc");
const HUMAN_AUTHOR_NAMES = new Set(["二狗", "咩咩"]);
let activeFilter = "all";
let sortDirection = "asc";
let currentPosts = [];
let hasPendingNewPosts = false;

setupLogout(api);
setupFilterControls();
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

function setupFilterControls() {
  filterAllButton?.addEventListener("click", () => setActiveFilter("all"));
  filterCatsButton?.addEventListener("click", () => setActiveFilter("cats"));
  filterHumansButton?.addEventListener("click", () => setActiveFilter("humans"));
}

function setActiveFilter(filter) {
  activeFilter = filter;
  updateFilterButton(filterAllButton, filter === "all");
  updateFilterButton(filterCatsButton, filter === "cats");
  updateFilterButton(filterHumansButton, filter === "humans");
  renderFeedPosts();
}

function updateFilterButton(button, isActive) {
  button?.classList.toggle("active", isActive);
  button?.setAttribute("aria-pressed", isActive ? "true" : "false");
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
  const posts = getSortedPosts(getFilteredPosts(currentPosts));
  if (!posts.length) {
    renderState(list, "这个分类暂时没有帖子", getEmptyFilterMessage());
    return;
  }
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

function getFilteredPosts(posts) {
  if (activeFilter === "humans") return posts.filter(isHumanPost);
  if (activeFilter === "cats") return posts.filter((post) => !isHumanPost(post));
  return posts;
}

function isHumanPost(post) {
  return HUMAN_AUTHOR_NAMES.has(post?.cat?.name);
}

function getEmptyFilterMessage() {
  if (activeFilter === "humans") return "二狗和咩咩还没有发布可见动态。";
  if (activeFilter === "cats") return "猫猫们还在酝酿新的动态。";
  return "先完成一个任务，猫咪们就会慢慢出现。";
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
    post.quest ? renderQuestPreview({ ...post.quest, cat: post.cat }) : "",
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
  if (isGame(quest, "fishing")) return "钓鱼";
  if (isGame(quest, "merge_cats")) return "合成";
  if (isGame(quest, "paw_on_top")) return "猫爪";
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
  if (isGame(quest, "fishing")) return "接受钓鱼";
  if (isGame(quest, "merge_cats")) return "接受合成";
  if (isGame(quest, "paw_on_top")) return "接受猫爪挑战";
  if (quest.type === "dialogue") return "接受任务";
  return "查看任务";
}

function renderPostImage(post) {
  const images = getPostImages(post);
  if (!images.length) return "";
  const imageLabel = post.image_label || images[0]?.image_label || "";
  if (images.length === 1) {
    const image = images[0];
    return el("figure", { class: "post-image has-image" }, [
      renderPostImageButton(image, imageLabel || "猫咪帖子图片"),
      imageLabel ? el("figcaption", { text: imageLabel }) : "",
    ]);
  }

  return el("figure", { class: "post-image has-image post-gallery-wrap" }, [
    el("div", { class: getPostGalleryClass(images.length), "aria-label": `${images.length} 张帖子图片` }, (
      images.map((image, index) => renderPostGalleryItem(image, imageLabel, index, images.length))
    )),
    imageLabel ? el("figcaption", { text: imageLabel }) : "",
  ]);
}

function renderPostImageButton(image, altText) {
  return el("button", {
    class: "post-image-button",
    type: "button",
    "aria-label": "查看帖子图片大图",
    title: "查看大图",
    onclick: () => showPostImagePreview(image, altText),
  }, [
    el("img", { src: image.image_url, alt: altText, loading: "lazy" }),
  ]);
}

function renderPostGalleryItem(image, imageLabel, index, total) {
  const altText = imageLabel ? `${imageLabel} ${index + 1}` : `帖子图片 ${index + 1}`;
  return el("div", { class: "post-gallery-item" }, [
    el("button", {
      class: "post-image-button",
      type: "button",
      "aria-label": `查看第 ${index + 1} 张帖子图片大图`,
      title: "查看大图",
      onclick: () => showPostImagePreview(image, altText, index + 1, total),
    }, [
      el("img", { src: image.image_url, alt: altText, loading: "lazy" }),
    ]),
  ]);
}

function showPostImagePreview(image, altText, index = 1, total = 1) {
  if (!image?.image_url) return;
  const title = total > 1 ? `${altText}（${index}/${total}）` : altText;
  const dialog = el("dialog", { class: "avatar-preview-dialog post-image-preview-dialog" });
  const close = () => {
    dialog.close();
    dialog.remove();
  };

  dialog.append(
    el("div", { class: "dialog-body avatar-preview-body post-image-preview-body" }, [
      el("button", {
        class: "avatar-preview-close",
        type: "button",
        "aria-label": "关闭图片大图",
        title: "关闭",
        text: "×",
        onclick: close,
      }),
      el("img", { src: image.image_url, alt: title }),
      el("h2", { text: title }),
    ]),
  );

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  document.body.append(dialog);
  dialog.showModal();
}

function getPostImages(post) {
  const images = Array.isArray(post.images) && post.images.length
    ? post.images
    : post.image_url
      ? [{ image_url: post.image_url, image_label: post.image_label }]
      : [];
  return images.slice(0, 9).filter((image) => image.image_url);
}

function getPostGalleryClass(count) {
  if (count === 2) return "post-gallery post-gallery-two";
  if (count === 4) return "post-gallery post-gallery-four";
  return "post-gallery post-gallery-grid";
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

  if (isGame(quest, "merge_cats")) {
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
            showRewardCardPreview({ ...quest, status: "completed" });
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
    getRewardSummaryText(quest),
  ], [
    {
      label: "查看感谢卡",
      className: "ghost-btn",
      onClick: () => showRewardCardPreview(quest),
    },
    { label: "知道了", className: "primary-btn" },
  ]);
}

function isGame(quest, gameKey) {
  if (quest.game_key === gameKey) return true;
  if (gameKey === "fishing") return quest.type === "fishing";
  if (gameKey === "merge_cats") return quest.type === "merge";
  if (gameKey === "paw_on_top") return quest.type === "paw_on_top";
  return false;
}

function showRewardCardPreview(quest) {
  const title = quest.reward_card_title || "猫咪感谢卡";
  const imageUrl = api.getResourceUrl(quest.reward_image_path);
  const imageLabel = quest.reward_image_label || "感谢卡图片";
  const rewards = api.getQuestRewards(quest);
  const dialog = el("dialog", { class: "reward-card-dialog" });
  const close = () => {
    dialog.close();
    dialog.remove();
  };

  const image = imageUrl
    ? el("figure", { class: "reward-card-image has-image" }, [
        el("img", { src: imageUrl, alt: imageLabel, loading: "lazy" }),
        el("figcaption", { text: imageLabel }),
      ])
    : el("div", { class: "reward-card-image", text: imageLabel });

  dialog.append(
    el("div", { class: "dialog-body reward-card-body" }, [
      el("button", {
        class: "avatar-preview-close",
        type: "button",
        "aria-label": "关闭感谢卡预览",
        title: "关闭",
        text: "×",
        onclick: close,
      }),
      el("p", { class: "eyebrow", text: "猫咪感谢卡" }),
      image,
      el("h2", { text: title }),
      el("p", { class: "muted", text: quest.reward_card_text || "完成任务后，这张卡片会收入图鉴。" }),
      renderRewardSummary(quest, rewards),
    ]),
  );

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  document.body.append(dialog);
  dialog.showModal();
}

function getRewardSummaryText(quest) {
  const { affection, items } = api.getQuestRewards(quest);
  return `已获得：${getQuestCatName(quest)}的好感度 +${affection}、猫粮 +${items.food}、猫条 +${items.treat}、玩具 +${items.toy}`;
}

function renderRewardSummary(quest, rewards) {
  const items = [
    { label: `${getQuestCatName(quest)}的好感度`, value: `+${rewards.affection}` },
    { label: "猫粮", value: `+${rewards.items.food}` },
    { label: "猫条", value: `+${rewards.items.treat}` },
    { label: "玩具", value: `+${rewards.items.toy}` },
  ];

  return el("section", { class: "reward-summary", "aria-label": "任务获得内容" }, [
    el("h3", { text: "任务获得" }),
    el("div", { class: "reward-summary-grid" }, items.map((item) => (
      el("div", { class: "reward-summary-item" }, [
        el("span", { text: item.label }),
        el("strong", { text: item.value }),
      ])
    ))),
  ]);
}

function getQuestCatName(quest) {
  return quest?.cat?.name || quest?.cat_name || "猫咪";
}
