import * as api from "./api.js";
import { $, setStatus, setupLogout } from "./ui.js";

const playerId = api.requirePlayer();
const form = $("#profile-form");
const nameInput = $("#profile-name");
const idInput = $("#profile-id");
const message = $("#account-message");

setupLogout(api);
loadProfile();

async function loadProfile() {
  setStatus(message, "正在读取账户资料...");
  try {
    const profile = await api.getPlayerProfile(playerId);
    nameInput.value = profile.display_name || "";
    idInput.value = profile.id || playerId;
    setStatus(message, "");
  } catch (error) {
    setStatus(message, error.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const displayName = nameInput.value.trim();
  if (!displayName) {
    setStatus(message, "昵称不能为空。", "error");
    return;
  }

  setStatus(message, "正在保存昵称...");
  try {
    await api.updatePlayerProfile(playerId, displayName);
    setStatus(message, "昵称已更新。");
  } catch (error) {
    setStatus(message, error.message, "error");
  }
});
