import * as api from "./api.js";
import { $, setStatus, setupLogout } from "./ui.js";

const playerId = api.requirePlayer();
const canvas = $("#paw-canvas");
const ctx = canvas.getContext("2d");
const message = $("#paw-message");
const restartButton = $("#restart-paw");
const roundLabel = $("#paw-round");
const scoreLabel = $("#paw-score");
const stateLabel = $("#paw-state");

const pendingQuest = api.getPendingPawQuest();
const difficulty = Math.max(Number(pendingQuest?.difficulty || 1), 1);
const difficultyLabel = pendingQuest?.difficultyLabel || api.normalizeQuestDifficulty(difficulty);
const difficultyConfig = getPawDifficultyConfig(difficulty);
const config = {
  questId: pendingQuest?.questId || null,
  title: pendingQuest?.title || "自由拍爪练习",
  ...difficultyConfig,
};

setupLogout(api);

const state = {
  phase: "waiting",
  attempts: 0,
  hits: 0,
  timer: 80,
  catX: 140,
  catTargetX: 140,
  humanX: 650,
  humanTargetX: 650,
  slapTimer: 0,
  slapResolved: false,
  resultText: "",
  completed: false,
  failed: false,
  lastTime: 0,
};

restartButton.addEventListener("click", resetGame);

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture?.(event.pointerId);
  triggerSlap();
});

resetGame();
requestAnimationFrame(loop);

function resetGame() {
  state.phase = "waiting";
  state.attempts = 0;
  state.hits = 0;
  state.timer = randomWait();
  state.catX = 140;
  state.catTargetX = 140;
  state.humanX = 650;
  state.humanTargetX = 650;
  state.slapTimer = 0;
  state.slapResolved = false;
  state.resultText = "";
  state.completed = false;
  state.failed = false;
  state.lastTime = performance.now();
  updateHud();
  setStatus(message, `${config.title}：点击鼠标拍一次猫爪，拍中和拍空都会消耗次数。${config.maxAttempts} 拍内命中 ${config.needHits} 次即可完成，难度 ${difficultyLabel}。`);
}

function loop(time) {
  const dt = Math.min(34, time - state.lastTime) / 16.67;
  state.lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (state.completed || state.failed) return;

  if (state.phase === "waiting") {
    state.timer -= dt;
    if (state.timer <= 0) startCatMove();
  }

  if (state.phase === "cat-holding") {
    state.timer -= dt;
    if (state.timer <= 0) beginCatRetract();
  }

  updateHands(dt);
  checkCollision();
  updateHud();
}

function triggerSlap() {
  if (state.completed || state.failed || state.slapTimer > 0 || state.attempts >= config.maxAttempts) return;
  state.attempts += 1;
  state.slapTimer = config.slapFrames;
  state.slapResolved = false;
  state.resultText = "";
  setStatus(message, `第 ${state.attempts} 拍，出手！`);
}

function startCatMove() {
  state.phase = "cat-extending";
  state.catTargetX = 326;
  state.timer = 999;
  state.resultText = "";
}

function beginCatHoldOrRetract() {
  if (Math.random() < config.catHoldChance) {
    state.phase = "cat-holding";
    state.timer = randomBetween(config.catHoldMin, config.catHoldMax);
  } else {
    beginCatRetract();
  }
}

function beginCatRetract() {
  state.phase = "cat-retracting";
  state.catTargetX = 140;
  state.timer = 999;
}

function updateHands(dt) {
  if (state.slapTimer > 0) {
    state.slapTimer = Math.max(0, state.slapTimer - dt);
    const half = config.slapFrames / 2;
    state.humanTargetX = state.slapTimer > half ? config.slapReachX : 650;
    if (state.slapTimer <= 0 && !state.slapResolved) {
      finishAttempt("miss", "拍空了，猫爪灵巧地避开了。");
    }
  } else {
    state.humanTargetX = 650;
  }

  state.humanX = moveToward(state.humanX, state.humanTargetX, config.humanSpeed * dt);

  let catSpeed = state.phase === "cat-retracting" ? config.catRetractSpeed : config.catExtendSpeed;
  state.catX = moveToward(state.catX, state.catTargetX, catSpeed * dt);

  if (state.phase === "cat-extending" && Math.abs(state.catX - state.catTargetX) < 1) beginCatHoldOrRetract();
  if (state.phase === "cat-retracting" && Math.abs(state.catX - state.catTargetX) < 1) {
    state.phase = "waiting";
    state.timer = randomWait();
  }
}

function checkCollision() {
  if (state.slapTimer <= 0 || state.slapResolved) return;

  const humanPalm = { x: state.humanX - 76, y: 218, w: 82, h: 72 };
  const catPaw = { x: state.catX - 6, y: 204, w: 88, h: 76 };
  if (!intersects(humanPalm, catPaw)) return;

  if (state.phase === "cat-extending" || state.phase === "cat-holding") {
    state.hits += 1;
    finishAttempt("hit", "拍到了！猫爪软乎乎地停在你手心。");
    return;
  }
}

function finishAttempt(kind, text) {
  state.slapResolved = true;
  state.slapTimer = 0;
  state.resultText = text;
  state.catTargetX = kind === "hit" ? 318 : 374;
  state.humanTargetX = kind === "hit" ? 390 : 432;
  setStatus(message, text, kind === "miss" ? "error" : "info");

  if (state.hits >= config.needHits) finishQuest();
  else if (state.attempts >= config.maxAttempts) failQuest();
}

async function finishQuest() {
  state.completed = true;
  updateHud();

  if (!config.questId) {
    setStatus(message, "练习成功！这是一局自由练习。");
    return;
  }

  setStatus(message, "猫爪在上挑战成功！正在提交任务结果...");
  try {
    await api.completeQuest(playerId, config.questId);
    api.clearPendingPawQuest();
    setStatus(message, "任务完成，猫爪感谢卡已经收入图鉴。");
  } catch (error) {
    setStatus(message, error.message, "error");
  }
}

function failQuest() {
  state.failed = true;
  state.humanTargetX = 650;
  updateHud();
  setStatus(message, `挑战失败：${config.maxAttempts} 拍内命中 ${state.hits} 次。重新开始再试一次。`, "error");
}

function updateHud() {
  const nextAttempt = Math.min(state.attempts + 1, config.maxAttempts);
  roundLabel.textContent = state.completed || state.failed ? `共 ${state.attempts} 拍` : `第 ${nextAttempt} 拍`;
  scoreLabel.textContent = `命中 ${state.hits} / ${config.needHits} · 拍数 ${state.attempts} / ${config.maxAttempts}`;
  const labels = {
    waiting: "等待猫爪",
    "cat-extending": "猫爪伸出",
    "cat-holding": "抓住时机",
    "cat-retracting": "猫爪收回",
  };
  if (state.completed) stateLabel.textContent = "挑战成功";
  else if (state.failed) stateLabel.textContent = "挑战失败";
  else if (state.slapTimer > 0) stateLabel.textContent = "正在拍爪";
  else stateLabel.textContent = labels[state.phase] || "准备中";
}

function getPawDifficultyConfig(value) {
  const level = Math.max(1, Math.min(Number(value || 1), 3));
  const configs = {
    1: {
      needHits: 2,
      maxAttempts: 6,
      catHoldChance: 0.82,
      catWaitMin: 72,
      catWaitMax: 136,
      catHoldMin: 92,
      catHoldMax: 154,
      catExtendSpeed: 9.0,
      catRetractSpeed: 10.0,
      humanSpeed: 20,
      slapFrames: 22,
      slapReachX: 382,
    },
    2: {
      needHits: 3,
      maxAttempts: 6,
      catHoldChance: 0.72,
      catWaitMin: 58,
      catWaitMax: 118,
      catHoldMin: 74,
      catHoldMax: 132,
      catExtendSpeed: 9.4,
      catRetractSpeed: 11.2,
      humanSpeed: 20,
      slapFrames: 21,
      slapReachX: 384,
    },
    3: {
      needHits: 3,
      maxAttempts: 5,
      catHoldChance: 0.64,
      catWaitMin: 48,
      catWaitMax: 106,
      catHoldMin: 62,
      catHoldMax: 116,
      catExtendSpeed: 9.8,
      catRetractSpeed: 12.2,
      humanSpeed: 20,
      slapFrames: 20,
      slapReachX: 386,
    },
  };
  return configs[level];
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoom();
  drawCat();
  drawHumanHand();
  drawCenterGuide();
  if (state.resultText || state.completed || state.failed) drawResultBanner();
}

function drawRoom() {
  ctx.fillStyle = "#fff4dc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f4d6b7";
  ctx.fillRect(0, 322, canvas.width, 158);
  ctx.fillStyle = "#deaa78";
  for (let x = 0; x < canvas.width; x += 72) ctx.fillRect(x, 322, 4, 158);
  ctx.fillStyle = "#f8e4c9";
  ctx.fillRect(0, 316, canvas.width, 10);

  ctx.fillStyle = "#8fc7b5";
  ctx.fillRect(276, 70, 208, 116);
  ctx.fillStyle = "#fff8e8";
  ctx.fillRect(288, 82, 184, 92);
  ctx.fillStyle = "#e56b4f";
  ctx.font = "700 24px sans-serif";
  ctx.fillText("PAW ON TOP", 306, 136);
}

function drawCat() {
  ctx.fillStyle = "#d49a5d";
  ctx.fillRect(40, 232, 126, 90);
  ctx.fillRect(64, 190, 88, 64);
  ctx.fillStyle = "#b96e43";
  ctx.beginPath();
  ctx.moveTo(72, 190);
  ctx.lineTo(92, 158);
  ctx.lineTo(108, 190);
  ctx.moveTo(124, 190);
  ctx.lineTo(144, 158);
  ctx.lineTo(148, 196);
  ctx.fill();
  ctx.fillStyle = "#2f241d";
  ctx.fillRect(88, 214, 8, 8);
  ctx.fillRect(126, 214, 8, 8);
  ctx.fillRect(106, 230, 12, 6);

  drawCatArm(state.catX, 240);
}

function drawCatArm(x, y) {
  ctx.fillStyle = "#c7834d";
  ctx.fillRect(130, y + 6, Math.max(20, x - 104), 34);
  ctx.fillStyle = "#e5a765";
  ctx.fillRect(x, y, 82, 54);
  ctx.fillStyle = "#fff2d0";
  for (let i = 0; i < 4; i += 1) ctx.fillRect(x + 12 + i * 16, y + 42, 8, 10);
}

function drawHumanHand() {
  const x = state.humanX;
  ctx.fillStyle = "#b9d7e8";
  ctx.fillRect(x + 16, 250, 120, 44);
  ctx.fillStyle = "#f1b684";
  ctx.fillRect(x - 76, 224, 86, 64);
  ctx.fillRect(x - 34, 206, 18, 34);
  ctx.fillRect(x - 54, 206, 16, 34);
  ctx.fillRect(x - 72, 212, 14, 30);
  ctx.fillRect(x - 86, 234, 20, 18);
  ctx.fillStyle = "#d99062";
  ctx.fillRect(x + 4, 246, 14, 38);
}

function drawCenterGuide() {
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = "rgba(54, 43, 36, 0.24)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(380, 186);
  ctx.lineTo(380, 318);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawResultBanner() {
  ctx.fillStyle = "rgba(255, 253, 248, 0.9)";
  ctx.fillRect(194, 30, 372, 54);
  ctx.strokeStyle = "#ecd8bd";
  ctx.strokeRect(194, 30, 372, 54);
  ctx.fillStyle = "#362b24";
  ctx.font = "800 22px sans-serif";
  ctx.textAlign = "center";
  const text = state.completed ? "挑战成功！" : state.failed ? "挑战失败，再来一次！" : state.resultText;
  ctx.fillText(text, 380, 65);
  ctx.textAlign = "left";
}

function randomWait() {
  return randomBetween(config.catWaitMin, config.catWaitMax);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function moveToward(value, target, speed) {
  if (value < target) return Math.min(target, value + speed);
  if (value > target) return Math.max(target, value - speed);
  return value;
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
