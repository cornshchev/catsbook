export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function clear(node) {
  node.replaceChildren();
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  });
  children.forEach((child) => node.append(child instanceof Node ? child : document.createTextNode(child)));
  return node;
}

export function setStatus(target, message, type = "info") {
  if (!target) return;
  target.className = type === "error" ? "message error" : "message";
  target.textContent = message || "";
}

export function renderState(target, title, body = "") {
  clear(target);
  target.append(
    el("div", { class: "state-card" }, [
      el("h2", { text: title }),
      body ? el("p", { class: "muted", text: body }) : "",
    ]),
  );
}

export function formatQuestType(type) {
  const labels = {
    dialogue: "对话",
    merge: "合成",
    paw_on_top: "猫爪",
    puzzle: "合成",
    fishing: "钓鱼",
    collect: "收集",
    social: "社交",
  };
  return labels[type] || type;
}

export function formatQuestStatus(status) {
  const labels = {
    available: "可接受",
    active: "进行中",
    completed: "已完成",
  };
  return labels[status] || "可接受";
}

export function renderAvatar(cat, size = "normal") {
  const className = size === "small" ? "avatar small-avatar" : "avatar";
  if (cat?.avatar_url) {
    return el("div", { class: className }, [
      el("img", { src: cat.avatar_url, alt: `${cat.name || "猫咪"}头像`, loading: "lazy" }),
    ]);
  }
  return el("div", { class: className, text: cat?.avatar_emoji || "猫" });
}

export function renderAvatarButton(cat) {
  return el("button", {
    class: "avatar-button",
    type: "button",
    "aria-label": `查看${cat?.name || "猫咪"}头像大图`,
    title: "查看头像大图",
    onclick: () => showAvatarPreview(cat),
  }, [renderAvatar(cat)]);
}

export function showAvatarPreview(cat) {
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

export function showDialog(title, lines = [], actions = []) {
  const dialog = el("dialog");
  const body = el("div", { class: "dialog-body" }, [
    el("h2", { text: title }),
    ...lines.map((line) => el("p", { class: "muted", text: line })),
    el("div", { class: "button-row" }),
  ]);
  const actionRow = $(".button-row", body);
  const close = () => {
    dialog.close();
    dialog.remove();
  };
  const normalizedActions = actions.length ? actions : [{ label: "知道了", onClick: close, className: "primary-btn" }];
  normalizedActions.forEach((action) => {
    actionRow.append(
      el("button", {
        class: action.className || "primary-btn",
        type: "button",
        text: action.label,
        onclick: async () => {
          if (action.onClick) await action.onClick(close);
          else close();
        },
      }),
    );
  });
  dialog.append(body);
  document.body.append(dialog);
  dialog.showModal();
}

export function setupLogout(api) {
  const button = $("#logout-button");
  if (!button) return;
  button.addEventListener("click", async () => {
    await api.logout();
    window.location.href = "./index.html";
  });
}
