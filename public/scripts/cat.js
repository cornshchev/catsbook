import * as api from "./api.js";
import { $, clear, el, renderAvatar, renderState, setStatus, setupLogout, showDialog } from "./ui.js";

const playerId = api.requirePlayer();
const list = $("#cat-list");
const status = $("#cat-status");
const inventoryPanel = $("#inventory-panel");
let inventory = { food: 0, treat: 0, toy: 0 };

setupLogout(api);
loadCats();

async function loadCats() {
  setStatus(status, "正在查看好友小窝...");
  try {
    const [friends, currentInventory] = await Promise.all([api.listCatFriends(playerId), api.getInventory(playerId)]);
    inventory = currentInventory;
    clear(list);
    renderInventory();
    setStatus(status, "");
    if (!friends.length) {
      renderState(list, "还没有猫咪好友", "完成一条猫咪任务后，这里会出现好友档案。");
      return;
    }
    friends.forEach((friend) => list.append(renderCat(friend)));
  } catch (error) {
    setStatus(status, error.message, "error");
  }
}

function renderCat(friend) {
  const affection = Math.min(friend.affection || 0, 100);
  const cat = friend.cat;
  const card = el("article", { class: "cat-card" });
  const actionRow = el("div", { class: "action-strip" }, [
    el("button", { class: "chip-btn", type: "button", text: "猫粮 +3", disabled: inventory.food <= 0 ? "true" : null, onclick: () => feed(cat.id, "food") }),
    el("button", { class: "chip-btn", type: "button", text: "猫条 +5", disabled: inventory.treat <= 0 ? "true" : null, onclick: () => feed(cat.id, "treat") }),
    el("button", { class: "chip-btn", type: "button", text: "玩具 +7", disabled: inventory.toy <= 0 ? "true" : null, onclick: () => feed(cat.id, "toy") }),
    el("button", { class: "primary-btn", type: "button", text: "查看剧情", onclick: () => openDialogue(friend) }),
  ]);

  card.append(
    el("div", { class: "post-author" }, [
      renderAvatarButton(cat),
      el("div", {}, [
        el("h2", {}, [
          el("a", {
            class: "profile-link",
            href: `./friend.html?cat_id=${encodeURIComponent(cat.id)}&name=${encodeURIComponent(cat?.name || "猫咪")}`,
            text: cat?.name || "猫咪",
          }),
        ]),
        el("div", { class: "handle", text: cat?.handle || "@catsbook" }),
      ]),
    ]),
    el("p", { class: "muted", text: cat?.bio || "这只猫还没有写简介。" }),
    el("p", { class: "muted", text: `性格：${cat?.personality || "神秘"}` }),
    el("p", { class: "muted", text: `喜欢：${(cat?.likes || []).join("、") || "暂未记录"}` }),
    el("div", { class: "meter" }, [el("span", { style: `width:${affection}%` })]),
    el("div", { class: "stat-row" }, [
      el("span", { text: `好感度 ${friend.affection || 0}` }),
      el("span", { text: `已解锁剧情 ${friend.dialogues?.length || 0}` }),
    ]),
    actionRow,
  );
  return card;
}

function renderInventory() {
  clear(inventoryPanel);
  inventoryPanel.append(
    el("div", { class: "inventory-item" }, [el("span", { text: "猫粮" }), el("strong", { text: inventory.food })]),
    el("div", { class: "inventory-item" }, [el("span", { text: "猫条" }), el("strong", { text: inventory.treat })]),
    el("div", { class: "inventory-item" }, [el("span", { text: "玩具" }), el("strong", { text: inventory.toy })]),
  );
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

async function feed(catId, itemType) {
  setStatus(status, "猫咪正在认真嗅嗅礼物...");
  try {
    await api.feedCat(playerId, catId, itemType);
    await loadCats();
  } catch (error) {
    setStatus(status, error.message, "error");
  }
}

function openDialogue(friend) {
  const lines = friend.dialogues?.length
    ? friend.dialogues.map((node) => `${node.title}：${node.body}`)
    : ["这只猫还在观察你。好感度提高后会解锁更多剧情。"];
  showDialog(`${friend.cat?.name || "猫咪"}的剧情`, lines);
}
