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
const expandedCommentPostIds = new Set();
const collapsedCommentPostIds = new Set();
let pendingCommentFocusPostId = null;

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
  focusPendingCommentComposer();
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
  const commentsSection = renderComments(post);
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
      "aria-expanded": isCommentsExpanded(post) ? "true" : "false",
      text: "评论",
      onclick: () => toggleCommentComposer(post.id),
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
      el("span", { text: `${getComments(post).length} 条评论` }),
    ]),
    actionRow,
    commentsSection,
  );
  return card;
}

function renderComments(post) {
  const comments = getComments(post);
  if (!isCommentsExpanded(post)) return "";

  const listNode = el("div", { class: "comment-list" });
  if (comments.length) {
    buildCommentTree(comments).forEach((comment) => appendCommentNode(listNode, comment));
  } else {
    listNode.append(el("p", { class: "comment-empty", text: "还没有评论，给猫咪留一句话吧。" }));
  }

  return el("section", { class: "comments-panel", "aria-label": "评论区", "data-post-id": post.id }, [
    listNode,
    renderCommentForm(post),
  ]);
}

function appendCommentNode(listNode, comment) {
  listNode.append(renderComment(comment));
  (comment.children || []).forEach((child) => appendCommentNode(listNode, child));
}

function buildCommentTree(comments) {
  const nodes = comments.map((comment) => ({ ...comment, children: [] }));
  const byId = new Map(nodes.map((comment) => [comment.id, comment]));
  const roots = [];
  nodes.forEach((comment) => {
    const parent = comment.parent_comment_id ? byId.get(comment.parent_comment_id) : null;
    if (parent) parent.children.push(comment);
    else roots.push(comment);
  });
  return roots;
}

function renderComment(comment) {
  const isCat = comment.author_type === "cat";
  const isOwnComment = comment.author_type === "player" && comment.player_id === playerId;
  const avatar = {
    name: comment.author_name,
    avatar_emoji: comment.author_avatar_emoji || (isCat ? "猫" : "你"),
    avatar_url: comment.author_avatar_url,
  };
  const classes = [
    "comment-item",
    isCat ? "cat-reply" : "",
    isOwnComment ? "own-comment" : "",
    comment.parent_comment_id ? "comment-reply" : "",
  ].filter(Boolean).join(" ");
  const likeButton = el("button", {
    class: comment.liked ? "comment-like liked" : "comment-like",
    type: "button",
    title: comment.liked ? "已收到小鱼干赞" : "给这条评论点赞",
    "aria-label": comment.liked ? "已点赞评论" : "点赞评论",
    text: comment.liked ? "♥" : "♡",
    onclick: (event) => likeComment(comment.id, event.currentTarget),
  });
  likeButton.textContent = comment.liked ? "♥" : "♡";
  if (isOwnComment) {
    likeButton.classList.add("is-disabled");
    likeButton.disabled = true;
    likeButton.title = "不能给自己的评论点赞";
    likeButton.setAttribute("aria-label", "自己的评论不能点赞");
  }

  return el("article", { class: classes }, [
    renderAvatar(avatar, "small"),
    el("div", { class: "comment-bubble" }, [
      el("div", { class: "comment-meta" }, [
        el("strong", { text: comment.author_name || (isCat ? "猫咪" : "你") }),
        el("span", { text: comment.author_handle || (isCat ? "猫咪回复" : "玩家评论") }),
        el("time", { datetime: comment.created_at || "", text: formatCompactTime(comment.created_at) }),
        likeButton,
      ]),
      el("p", { text: comment.body }),
    ]),
  ]);
}

function renderCommentForm(post) {
  const isFixed = post.comment_mode === "fixed";
  const fixedAlreadySent = isFixed && hasPlayerFixedComment(post);
  const textarea = el("textarea", {
    class: [
      "comment-input",
      isFixed ? "fixed-comment-input" : "",
      fixedAlreadySent ? "sent-fixed-comment-input" : "",
    ].filter(Boolean).join(" "),
    name: "comment",
    rows: "3",
    maxlength: "280",
    placeholder: isFixed ? "" : "想对猫猫说：",
    "aria-label": "想对猫猫说：",
    title: fixedAlreadySent ? "剧情固定评论只能发送一次" : (isFixed ? "这条评论由剧情固定，无法更改" : "写下评论"),
    readonly: isFixed ? "readonly" : null,
  });
  textarea.placeholder = isFixed ? "" : "想对猫猫说：";
  textarea.setAttribute("aria-label", "想对猫猫说：");
  if (isFixed) textarea.value = post.fixed_comment_body || "";
  const submitButton = el("button", {
    class: "primary-btn",
    type: "submit",
    text: fixedAlreadySent ? "已发送" : "发送",
    disabled: fixedAlreadySent ? "disabled" : null,
    title: fixedAlreadySent ? "剧情固定评论只能发送一次" : "发送评论",
  });
  const form = el("form", { class: "comment-form" }, [
    textarea,
    submitButton,
  ]);
  submitButton.before(el("span", { class: "comment-limit", text: "最多 280 字" }));
  form.addEventListener("submit", (event) => submitComment(event, post, textarea, submitButton));
  return form;
}

function hasPlayerFixedComment(post) {
  return getComments(post).some((comment) => (
    comment.author_type === "player"
    && comment.player_id === playerId
    && comment.source_type === "player"
  ));
}

async function submitComment(event, post, textarea, submitButton) {
  event.preventDefault();
  if (post.comment_mode === "fixed" && hasPlayerFixedComment(post)) {
    setStatus(status, "这条剧情评论已经发送过啦。", "error");
    return;
  }
  const body = post.comment_mode === "fixed" ? (post.fixed_comment_body || "").trim() : textarea.value.trim();
  if (!body) {
    setStatus(status, "评论不能为空，猫咪听不见空白的小纸条。", "error");
    textarea.focus();
    return;
  }

  submitButton.disabled = true;
  setStatus(status, "正在把评论送到猫咪的小信箱...");
  try {
    const result = await api.addComment(playerId, post.id, body);
    updatePostComments(post.id, result.comments);
    setStatus(status, result.auto_reply_count ? "评论已送达，猫咪们也回复了你。" : "评论已送到猫咪的小信箱。");
    renderFeedPosts();
  } catch (error) {
    setStatus(status, error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
}

function updatePostComments(postId, comments) {
  currentPosts = currentPosts.map((post) => (post.id === postId ? { ...post, comments: comments || [] } : post));
}

function getComments(post) {
  return Array.isArray(post.comments) ? post.comments : [];
}

function focusCommentComposer(commentsSection) {
  const input = $(".comment-input", commentsSection);
  input?.focus();
}

function isCommentsExpanded(post) {
  if (expandedCommentPostIds.has(post.id)) return true;
  if (collapsedCommentPostIds.has(post.id)) return false;
  return getComments(post).length > 0;
}

function toggleCommentComposer(postId) {
  const post = currentPosts.find((item) => item.id === postId);
  if (!post) return;

  if (isCommentsExpanded(post)) {
    collapsedCommentPostIds.add(postId);
    expandedCommentPostIds.delete(postId);
    pendingCommentFocusPostId = null;
  } else {
    expandedCommentPostIds.add(postId);
    collapsedCommentPostIds.delete(postId);
    pendingCommentFocusPostId = postId;
  }

  renderFeedPosts();
}

function focusPendingCommentComposer() {
  if (!pendingCommentFocusPostId) return;
  const commentsSection = Array.from(list.querySelectorAll(".comments-panel"))
    .find((section) => section.dataset.postId === pendingCommentFocusPostId);
  pendingCommentFocusPostId = null;
  focusCommentComposer(commentsSection);
}

async function likeComment(commentId, button) {
  if (button?.disabled) return;
  button.disabled = true;
  try {
    const result = await api.likeComment(playerId, commentId);
    markCommentLiked(commentId);
    if (button) {
      button.classList.add("liked");
      button.textContent = "♥";
      button.disabled = false;
      if (result?.reward_food) showCommentReward(button, "猫粮 +1");
    }
  } catch (error) {
    if (button) button.disabled = false;
    setStatus(status, error.message, "error");
  }
}

function markCommentLiked(commentId) {
  currentPosts = currentPosts.map((post) => ({
    ...post,
    comments: getComments(post).map((comment) => (comment.id === commentId ? { ...comment, liked: true } : comment)),
  }));
}

function showCommentReward(button, text) {
  const bubble = el("span", { class: "comment-reward-pop", text });
  button.parentElement?.append(bubble);
  window.setTimeout(() => bubble.remove(), 1200);
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
      images.map((image, index) => renderPostGalleryItem(image, imageLabel, index, images))
    )),
    imageLabel ? el("figcaption", { text: imageLabel }) : "",
  ]);
}

function formatCompactTime(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderPostImageButton(image, altText) {
  return el("button", {
      class: "post-image-button",
      type: "button",
      "aria-label": "查看帖子图片大图",
      title: "查看大图",
      onclick: () => showPostImagePreview([image], 0, altText),
  }, [
    el("img", { src: image.image_url, alt: altText, loading: "lazy" }),
  ]);
}

function renderPostGalleryItem(image, imageLabel, index, images) {
  const altText = imageLabel ? `${imageLabel} ${index + 1}` : `帖子图片 ${index + 1}`;
  return el("div", { class: "post-gallery-item" }, [
    el("button", {
      class: "post-image-button",
      type: "button",
      "aria-label": `查看第 ${index + 1} 张帖子图片大图`,
      title: "查看大图",
      onclick: () => showPostImagePreview(images, index, imageLabel || "帖子图片"),
    }, [
      el("img", { src: image.image_url, alt: altText, loading: "lazy" }),
    ]),
  ]);
}

function showPostImagePreview(images, initialIndex = 0, baseLabel = "帖子图片") {
  if (!Array.isArray(images) || !images.length) return;
  let currentIndex = Math.min(Math.max(initialIndex, 0), images.length - 1);
  const dialog = el("dialog", { class: "avatar-preview-dialog post-image-preview-dialog" });
  const previewImage = el("img", { src: "", alt: "" });
  const titleNode = el("h2", { text: "" });
  const previousButton = el("button", {
    class: "post-preview-nav post-preview-prev",
    type: "button",
    "aria-label": "查看上一张图片",
    title: "上一张",
    onclick: () => showPreviewAt(currentIndex - 1),
  }, [el("span", { text: "‹" })]);
  const nextButton = el("button", {
    class: "post-preview-nav post-preview-next",
    type: "button",
    "aria-label": "查看下一张图片",
    title: "下一张",
    onclick: () => showPreviewAt(currentIndex + 1),
  }, [el("span", { text: "›" })]);
  const close = () => {
    dialog.close();
    dialog.remove();
  };

  function getPreviewTitle() {
    const total = images.length;
    const label = baseLabel || images[currentIndex]?.image_label || "帖子图片";
    return total > 1 ? `${label}（${currentIndex + 1}/${total}）` : label;
  }

  function showPreviewAt(index) {
    currentIndex = Math.min(Math.max(index, 0), images.length - 1);
    const image = images[currentIndex];
    const title = getPreviewTitle();
    previewImage.src = image.image_url;
    previewImage.alt = title;
    titleNode.textContent = title;
    previousButton.hidden = currentIndex === 0;
    nextButton.hidden = currentIndex === images.length - 1;
  }

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
      el("div", { class: "post-preview-stage" }, [
        previousButton,
        previewImage,
        nextButton,
      ]),
      titleNode,
    ]),
  );

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  document.body.append(dialog);
  showPreviewAt(currentIndex);
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
