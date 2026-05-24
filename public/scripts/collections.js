import * as api from "./api.js";
import { $, clear, el, setStatus, setupLogout } from "./ui.js";

const playerId = api.requirePlayer();
const status = $("#collection-status");
const cardCollection = $("#card-collection");
const gameCollection = $("#game-collection");

setupLogout(api);
loadCollections();

async function loadCollections() {
  setStatus(status, "正在打开收藏柜...");
  try {
    const collections = await api.getCollections(playerId);
    setStatus(status, "");
    renderCards(collections.cards || []);
    renderGames(collections.games || []);
  } catch (error) {
    setStatus(status, error.message, "error");
  }
}

function renderCards(items) {
  clear(cardCollection);
  items.forEach((item) => {
    cardCollection.append(
      el("article", { class: item.unlocked ? "collection-card" : "collection-card locked" }, [
        renderCollectionImage(item),
        el("h3", { text: item.unlocked ? item.title : "未获得的感谢卡" }),
        el("p", { class: "muted", text: item.unlocked ? item.body : "完成相关任务后解锁。" }),
      ]),
    );
  });
}

function renderCollectionImage(item) {
  if (!item.unlocked) return el("div", { class: "collection-image", text: "?" });
  if (!item.image_url) return el("div", { class: "collection-image", text: item.image_label || "感谢卡图片" });
  return el("figure", { class: "collection-image has-image" }, [
    el("img", { src: item.image_url, alt: item.image_label || item.title || "感谢卡图片", loading: "lazy" }),
    item.image_label ? el("figcaption", { text: item.image_label }) : "",
  ]);
}

function renderGames(items) {
  clear(gameCollection);
  items.forEach((item) => {
    const children = [
      el("div", { class: "collection-image small", text: item.unlocked ? "玩" : "?" }),
      el("h3", { text: item.title }),
      el("p", { class: "muted", text: item.description }),
    ];
    if (item.unlocked) children.push(el("a", { class: "primary-link", href: item.href, text: "重新游玩" }));
    gameCollection.append(el("article", { class: item.unlocked ? "collection-card" : "collection-card locked" }, children));
  });
}
