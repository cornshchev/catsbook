import * as api from "./api.js";
import { $, clear, el, formatQuestStatus, formatQuestType, renderState, setStatus, setupLogout, showDialog } from "./ui.js";

const playerId = api.requirePlayer();
const list = $("#quest-list");
const status = $("#quest-status");

setupLogout(api);
loadQuests();

async function loadQuests() {
  setStatus(status, "正在整理任务手账...");
  try {
    const quests = await api.listQuests(playerId);
    clear(list);
    setStatus(status, "");
    if (!quests.length) {
      renderState(list, "暂无可接任务", "去动态页给第一条猫咪帖子点个赞试试。");
      return;
    }
    quests.forEach((quest) => list.append(renderQuest(quest)));
  } catch (error) {
    setStatus(status, error.message, "error");
  }
}

function renderQuest(quest) {
  const card = el("article", { class: "quest-card" });
  const actionRow = el("div", { class: "action-strip" });

  if (quest.status === "available") {
    actionRow.append(el("button", { class: "primary-btn", type: "button", text: "开始任务", onclick: () => startQuest(quest) }));
  }
  if (quest.status === "active") {
    actionRow.append(el("button", { class: "primary-btn", type: "button", text: getQuestActionLabel(quest), onclick: () => continueQuest(quest) }));
  }
  if (quest.status === "completed") {
    actionRow.append(el("span", { class: "badge", text: "已收入图鉴" }));
  }

  card.append(
    el("div", { class: "stat-row" }, [
      el("span", { class: "badge", text: formatQuestType(quest.type) }),
      el("span", { text: formatQuestStatus(quest.status) }),
    ]),
    el("h2", { text: quest.title }),
    el("p", { class: "muted", text: quest.description }),
    el("p", { class: "muted", text: `委托猫咪：${quest.cat?.name || "未知猫咪"}` }),
    quest.game_key && quest.game_key !== "dialogue" ? el("p", { class: "muted", text: getQuestGameMeta(quest) }) : "",
    el("p", { class: "muted", text: getRewardText(quest) }),
    actionRow,
  );
  return card;
}

function getRewardText(quest) {
  const difficulty = Math.max(Number(quest.difficulty || 1), 1);
  const food = 2 + (difficulty - 1) * 2;
  const treat = 1 + (difficulty - 1);
  const toy = difficulty >= 2 ? 1 + Math.floor(difficulty / 2) : 1;
  return `奖励：猫粮 ${food}、猫条 ${treat}、玩具 ${toy}`;
}

function getQuestGameMeta(quest) {
  if (isGame(quest, "fishing")) return `小游戏：钓鱼 · 鱼速难度 ${quest.target_score || 1}`;
  if (isGame(quest, "merge_cats")) return `小游戏：合成 · 目标分数 ${quest.target_score || 260} · 难度 ${quest.difficulty || 1}`;
  if (isGame(quest, "paw_on_top")) return `小游戏：猫爪在上 · 难度 ${quest.difficulty || 1}`;
  return `小游戏：${quest.game_key}`;
}

function getQuestActionLabel(quest) {
  if (isGame(quest, "fishing")) return "进入钓鱼";
  if (isGame(quest, "merge_cats")) return "进入合成";
  if (isGame(quest, "paw_on_top")) return "进入猫爪在上";
  return "完成任务";
}

function openQuestGame(quest) {
  if (isGame(quest, "fishing")) {
    api.setPendingFishingQuest(quest);
    window.location.href = "./fishing.html";
    return true;
  }
  if (isGame(quest, "merge_cats")) {
    api.setPendingMergeQuest(quest);
    window.location.href = "./merge.html";
    return true;
  }
  if (isGame(quest, "paw_on_top")) {
    api.setPendingPawQuest(quest);
    window.location.href = "./paw-on-top.html";
    return true;
  }
  return false;
}

function isGame(quest, gameKey) {
  if (quest.game_key === gameKey) return true;
  if (gameKey === "fishing") return quest.type === "fishing";
  if (gameKey === "merge_cats") return quest.type === "merge";
  if (gameKey === "paw_on_top") return quest.type === "paw_on_top";
  return false;
}

async function startQuest(quest) {
  setStatus(status, "正在接受任务...");
  try {
    await api.startQuest(playerId, quest.id);
    if (openQuestGame(quest)) return;
    if (quest.type === "dialogue") {
      await completeDialogueQuest(quest);
      return;
    }
    await loadQuests();
  } catch (error) {
    setStatus(status, error.message, "error");
  }
}

async function continueQuest(quest) {
  if (openQuestGame(quest)) return;
  if (quest.type === "dialogue") {
    await completeDialogueQuest(quest);
    return;
  }
  showDialog("小游戏预留", ["这个类型的小游戏入口已经保留，当前 MVP 可以先直接完成占位任务。"], [
    {
      label: "完成占位任务",
      className: "primary-btn",
      onClick: async (close) => {
        await api.completeQuest(playerId, quest.id);
        close();
        loadQuests();
      },
    },
    { label: "稍后", className: "ghost-btn" },
  ]);
}

async function completeDialogueQuest(quest) {
  showDialog(quest.title, ["你认真听完猫咪的请求，并做出了温柔回应。"], [
    {
      label: "收下感谢卡",
      className: "primary-btn",
      onClick: async (close) => {
        await api.completeQuest(playerId, quest.id);
        close();
        loadQuests();
      },
    },
  ]);
}
