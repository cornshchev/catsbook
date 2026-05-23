import * as api from "./api.js";
import { $, clear, el, renderAvatar, renderState, setStatus, setupLogout, showDialog } from "./ui.js";

const playerId = api.requirePlayer();
const list = $("#post-list");
const status = $("#feed-status");

setupLogout(api);
loadFeed();

async function loadFeed() {
  setStatus(status, "正在刷新猫咪动态...");
  try {
    const posts = await api.listFeedPosts(playerId);
    clear(list);
    setStatus(status, "");
    if (!posts.length) {
      renderState(list, "时间线还是空的", "先完成一个任务，猫咪们就会慢慢出现。");
      return;
    }
    posts.forEach((post) => list.append(renderPost(post)));
  } catch (error) {
    setStatus(status, error.message, "error");
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
      renderAvatar(post.cat),
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

function getQuestButtonLabel(quest) {
  if (quest.game_key === "fishing") return "接受钓鱼任务";
  if (quest.game_key === "merge_cats") return "接受游戏任务";
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
    await loadFeed();
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
    showDialog(quest.title, ["猫咪把一张卡片递过来~", "你点点头，帮它确认每个字都很可爱。"], [
      {
        label: "完成对话",
        className: "primary-btn",
        onClick: async (close) => {
          try {
            await api.startQuest(playerId, quest.id);
            await api.completeQuest(playerId, quest.id);
            close();
            await loadFeed();
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
