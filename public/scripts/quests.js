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
  const actionRow = el("div", { class: "quest-card-actions" });

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
    el("div", { class: "quest-card-header" }, [
      el("div", { class: "quest-card-kicker" }, [
        el("span", { class: "badge", text: formatQuestType(quest.type) }),
        el("span", { class: `quest-status-pill ${quest.status || "available"}`, text: formatQuestStatus(quest.status) }),
      ]),
      el("p", { class: "quest-card-cat", text: quest.cat?.name || "未知猫咪" }),
    ]),
    el("div", { class: "quest-card-body" }, [
      el("div", { class: "quest-card-main" }, [
        el("h2", { text: quest.title }),
        el("p", { class: "muted", text: quest.description }),
      ]),
      el("div", { class: "quest-card-side" }, [
        el("div", { class: "quest-info-box" }, [
          el("span", { text: "委托猫咪" }),
          el("strong", { text: quest.cat?.name || "未知猫咪" }),
        ]),
        isPlayableQuest(quest) ? el("div", { class: "quest-info-box" }, [
          el("span", { text: "玩法" }),
          el("strong", { text: getQuestGameMeta(quest) }),
        ]) : "",
        el("div", { class: "quest-info-box reward" }, [
          el("span", { text: "奖励" }),
          el("strong", { text: getRewardText(quest) }),
        ]),
      ]),
    ]),
    actionRow,
  );
  return card;
}

function getRewardText(quest) {
  const difficulty = api.getQuestDifficultyValue(quest);
  const food = 2 + difficulty * 2;
  const treat = 1 + difficulty;
  const toy = difficulty >= 2 ? 1 + Math.floor(difficulty / 2) : 1;
  return `猫粮 ${food}、猫条 ${treat}、玩具 ${toy}`;
}
function getQuestGameMeta(quest) {
  const difficulty = api.normalizeQuestDifficulty(quest.difficulty);
  if (isGame(quest, "fishing")) return `钓鱼 · 难度 ${difficulty}`;
  if (isGame(quest, "merge")) return `合成 · ${quest.target_score || 260} 分 · 难度 ${difficulty}`;
  if (isGame(quest, "paw_on_top")) return `猫爪在上 · 难度 ${difficulty}`;
  return formatQuestType(quest.type);
}
function getQuestActionLabel(quest) {
  if (isGame(quest, "fishing")) return "进入钓鱼";
  if (isGame(quest, "merge")) return "进入合成";
  if (isGame(quest, "paw_on_top")) return "进入猫爪在上";
  return "完成任务";
}

function openQuestGame(quest) {
  if (isGame(quest, "fishing")) {
    api.setPendingFishingQuest(quest);
    window.location.href = "./fishing.html";
    return true;
  }
  if (isGame(quest, "merge")) {
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

function isGame(quest, type) {
  return quest?.type === type;
}

function isPlayableQuest(quest) {
  return ["fishing", "merge", "paw_on_top"].includes(quest?.type);
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
