import * as api from "./api.js";
import { $, setStatus } from "./ui.js";

const form = $("#auth-form");
const message = $("#auth-message");
const registerButton = $("#register-button");

if (api.getStoredPlayerId()) {
  window.location.href = "./feed.html";
}

async function submitAuth(mode) {
  const displayName = $("#display-name").value.trim();
  const email = $("#email").value.trim();
  const password = $("#password").value;

  if (!email || !password || (mode === "register" && !displayName)) {
    setStatus(message, mode === "register" ? "注册时请把昵称、邮箱和密码都填好。" : "请填写邮箱和密码。", "error");
    return;
  }

  setStatus(message, mode === "register" ? "正在注册猫书账户..." : "正在登录...");
  try {
    if (mode === "register") await api.register(displayName, email, password);
    else await api.login(displayName, email, password);
    window.location.href = "./feed.html";
  } catch (error) {
    setStatus(message, error.message, "error");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAuth("login");
});

registerButton.addEventListener("click", () => submitAuth("register"));
