import * as api from "./api.js";
import { $, setStatus, setupLogout } from "./ui.js";

const playerId = api.requirePlayer();
const canvas = $("#fishing-canvas");
const ctx = canvas.getContext("2d");
const message = $("#game-message");
const restartButton = $("#restart-game");
const pendingQuest = api.getPendingFishingQuest();
const fishingDifficulty = pendingQuest?.difficulty || 1;
const fishingDifficultyLabel = pendingQuest?.difficultyLabel || api.normalizeQuestDifficulty(fishingDifficulty);

setupLogout(api);

const state = {
  phase: "waiting",
  mouseDown: false,

  fishY: 210,
  fishVelocity: 1.2,
  fishTargetY: 210,
  fishWobble: 0,
  fishDashTimer: 0,

  barY: 300,
  progress: 0,
  biteTimer: 90,
  completed: false,
};

restartButton.addEventListener("click", resetGame);

canvas.addEventListener("pointerdown", () => {
  if (state.phase === "waiting" && state.biteTimer <= 0) {
    state.phase = "reeling";
  }
  state.mouseDown = true;
});

window.addEventListener("pointerup", () => {
  state.mouseDown = false;
});

resetGame();
requestAnimationFrame(loop);

function resetGame() {
  state.phase = "waiting";
  state.mouseDown = false;

  state.fishY = 210;
  state.fishVelocity = 1.2;
  state.fishTargetY = 210;
  state.fishWobble = Math.random() * 100;
  state.fishDashTimer = 0;

  state.barY = 300;
  state.progress = 0;
  state.biteTimer = 70 + Math.floor(Math.random() * 80);
  state.completed = false;

  const title = pendingQuest?.title || "自由钓鱼练习";
  setStatus(message, `${title}：等感叹号出现后点击画布，再按住鼠标控制绿色滑块。难度 ${fishingDifficultyLabel}。`);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function update() {
  if (state.completed) return;

  if (state.phase === "waiting") {
    state.biteTimer -= 1;
    return;
  }

  updateFishMovement();

  state.barY += state.mouseDown ? -3.2 : 2.7;
  state.barY = Math.max(74, Math.min(330, state.barY));

  const caught = state.fishY > state.barY && state.fishY < state.barY + 86;
  state.progress += caught ? 0.55 : -(0.34 + fishingDifficulty * 0.04);
  state.progress = Math.max(0, Math.min(100, state.progress));

  if (state.progress >= 100) finishFishing();
}

function updateFishMovement() {
  state.fishWobble += 0.06;

  // 随机切换目标高度，让鱼不再只做简单上下反弹
  if (Math.random() < 0.035) {
    state.fishTargetY = 92 + Math.random() * 256;
  }

  // 偶尔短距离冲刺
  if (state.fishDashTimer <= 0 && Math.random() < 0.012) {
    state.fishDashTimer = 18 + Math.floor(Math.random() * 22);
    state.fishVelocity += (Math.random() < 0.5 ? -1 : 1) * (1.4 + Math.random() * (1.4 + fishingDifficulty * 0.25));
  }

  if (state.fishDashTimer > 0) {
    state.fishDashTimer -= 1;
  }

  const targetForce = (state.fishTargetY - state.fishY) * 0.018;
  const randomForce = (Math.random() - 0.5) * 0.55;
  const wobbleForce = Math.sin(state.fishWobble) * 0.12;

  state.fishVelocity += targetForce + randomForce + wobbleForce;
  state.fishVelocity *= 0.96;
  const maxVelocity = 4.1 + fishingDifficulty * 0.28;
  state.fishVelocity = Math.max(-maxVelocity, Math.min(maxVelocity, state.fishVelocity));

  state.fishY += state.fishVelocity;

  if (state.fishY < 92) {
    state.fishY = 92;
    state.fishVelocity = Math.abs(state.fishVelocity) * 0.75;
    state.fishTargetY = 150 + Math.random() * 180;
  }

  if (state.fishY > 348) {
    state.fishY = 348;
    state.fishVelocity = -Math.abs(state.fishVelocity) * 0.75;
    state.fishTargetY = 92 + Math.random() * 180;
  }
}

async function finishFishing() {
  state.completed = true;
  setStatus(message, "钓鱼成功！正在提交任务结果...");

  const quest = api.getPendingFishingQuest();
  const questId = quest?.questId;

  if (!questId) {
    setStatus(message, "钓鱼成功！这是一次自由练习。");
    return;
  }

  try {
    await api.completeQuest(playerId, questId);
    api.clearPendingFishingQuest();
    setStatus(message, "任务完成，感谢卡已经收入图鉴。");
  } catch (error) {
    setStatus(message, error.message, "error");
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = false;

  drawPixelFirstPersonScene();

  if (state.phase === "waiting") {
    drawWaiting();
  } else {
    drawReeling();
  }
}

function drawPixelFirstPersonScene() {
  drawSky();
  drawLake();
  drawDistantShore();
  drawBoatEdge();
  drawFirstPersonHands();
  drawFirstPersonRod();
}

function drawSky() {
  ctx.fillStyle = "#7ec8e3";
  ctx.fillRect(0, 0, canvas.width, 170);

  ctx.fillStyle = "#bdefff";
  ctx.fillRect(0, 0, canvas.width, 70);

  drawPixelCloud(90, 44);
  drawPixelCloud(520, 36);
}

function drawPixelCloud(x, y) {
  ctx.fillStyle = "#fff8e8";
  ctx.fillRect(x, y, 48, 16);
  ctx.fillRect(x + 16, y - 12, 48, 16);
  ctx.fillRect(x + 48, y, 40, 16);
  ctx.fillRect(x + 8, y + 16, 72, 12);
}

function drawLake() {
  ctx.fillStyle = "#3aa6b9";
  ctx.fillRect(0, 170, canvas.width, 230);

  ctx.fillStyle = "#2b8799";
  for (let y = 190; y < 390; y += 28) {
    const offset = Math.floor(Date.now() / 180 + y) % 36;
    for (let x = -40; x < canvas.width; x += 90) {
      ctx.fillRect(x + offset, y, 42, 5);
    }
  }

  ctx.fillStyle = "#9ee3df";
  for (let y = 210; y < 370; y += 44) {
    const offset = Math.floor(Date.now() / 240 + y) % 54;
    for (let x = -70; x < canvas.width; x += 130) {
      ctx.fillRect(x + offset, y, 64, 4);
    }
  }
}

function drawDistantShore() {
  ctx.fillStyle = "#5faa68";
  ctx.fillRect(0, 150, canvas.width, 24);

  ctx.fillStyle = "#3f7d4a";
  for (let x = 0; x < canvas.width; x += 54) {
    ctx.fillRect(x, 130 + ((x / 54) % 2) * 8, 28, 30);
    ctx.fillRect(x + 10, 112 + ((x / 54) % 3) * 5, 12, 32);
  }

  ctx.fillStyle = "#806044";
  ctx.fillRect(0, 168, canvas.width, 8);
}

function drawBoatEdge() {
  ctx.fillStyle = "#7b4f2c";
  ctx.fillRect(0, 390, canvas.width, 90);

  ctx.fillStyle = "#9a6738";
  ctx.fillRect(0, 390, canvas.width, 18);

  ctx.fillStyle = "#5b351f";
  for (let x = 0; x < canvas.width; x += 80) {
    ctx.fillRect(x, 408, 8, 72);
  }
}

function drawFirstPersonHands() {
  // 左手
  ctx.fillStyle = "#f0b07a";
  ctx.fillRect(188, 356, 46, 34);
  ctx.fillRect(178, 378, 72, 28);

  ctx.fillStyle = "#c8794e";
  ctx.fillRect(188, 390, 54, 12);

  // 右手
  ctx.fillStyle = "#f0b07a";
  ctx.fillRect(448, 346, 48, 34);
  ctx.fillRect(432, 368, 76, 30);

  ctx.fillStyle = "#c8794e";
  ctx.fillRect(442, 396, 58, 12);
}

function drawFirstPersonRod() {
  // 第一人称视角：鱼竿从玩家右下方向湖面伸出
  ctx.strokeStyle = "#4b2f1c";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(486, 360);
  ctx.lineTo(420, 260);
  ctx.lineTo(380, 165);
  ctx.stroke();

  ctx.strokeStyle = "#8b5a30";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(486, 360);
  ctx.lineTo(420, 260);
  ctx.lineTo(380, 165);
  ctx.stroke();

  // 鱼线
  ctx.strokeStyle = "#f5f0d8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(380, 165);
  ctx.lineTo(405, 264);
  ctx.stroke();

  // 浮标
  const bobberOffset = Math.sin(Date.now() / 260) * 4;
  ctx.fillStyle = "#e64e3c";
  ctx.fillRect(397, 262 + bobberOffset, 16, 12);
  ctx.fillStyle = "#fff7dc";
  ctx.fillRect(397, 254 + bobberOffset, 16, 8);
}

function drawWaiting() {
  drawPixelPanel(286, 42, 210, 54);

  ctx.fillStyle = "#2f241d";
  ctx.font = "700 24px monospace";
  ctx.fillText("等待上钩...", 320, 78);

  if (state.biteTimer <= 0) {
    ctx.fillStyle = "#fff7dc";
    ctx.fillRect(374, 146, 54, 74);

    ctx.fillStyle = "#e64e3c";
    ctx.font = "900 72px monospace";
    ctx.fillText("!", 386, 207);

    drawPixelPanel(306, 238, 190, 44);
    ctx.fillStyle = "#2f241d";
    ctx.font = "700 18px monospace";
    ctx.fillText("点击开始拉杆", 333, 266);
  }
}

function drawReeling() {
  const trackX = 560;
  const trackY = 70;
  const trackH = 300;

  drawPixelPanel(232, 42, 246, 42);

  ctx.fillStyle = "#2f241d";
  ctx.font = "700 18px monospace";
  ctx.fillText("按住上升，松开下降", 252, 70);

  // 控制轨道
  ctx.fillStyle = "#2f241d";
  ctx.fillRect(trackX - 4, trackY - 4, 80, trackH + 8);

  ctx.fillStyle = "#fff4d6";
  ctx.fillRect(trackX, trackY, 72, trackH);

  ctx.fillStyle = "#d6c49a";
  for (let y = trackY; y < trackY + trackH; y += 18) {
    ctx.fillRect(trackX, y, 72, 3);
  }

  // 玩家控制条
  ctx.fillStyle = "#276d57";
  ctx.fillRect(trackX + 8, state.barY, 56, 86);

  ctx.fillStyle = "#45b685";
  ctx.fillRect(trackX + 12, state.barY + 4, 48, 78);

  // 鱼
  drawPixelFish(trackX + 36, state.fishY);

  // 进度条
  ctx.fillStyle = "#2f241d";
  ctx.fillRect(656, trackY - 4, 36, trackH + 8);

  ctx.fillStyle = "#fff4d6";
  ctx.fillRect(660, trackY, 28, trackH);

  const progressH = (trackH * state.progress) / 100;

  ctx.fillStyle = "#b93636";
  ctx.fillRect(660, trackY + trackH - progressH, 28, progressH);

  ctx.fillStyle = "#ef5f45";
  ctx.fillRect(664, trackY + trackH - progressH, 20, progressH);
}

function drawPixelFish(x, y) {
  const px = Math.round(x);
  const py = Math.round(y);

  ctx.fillStyle = "#b87928";
  ctx.fillRect(px - 26, py - 8, 42, 16);
  ctx.fillRect(px - 18, py - 14, 24, 6);
  ctx.fillRect(px - 18, py + 8, 24, 6);

  ctx.fillStyle = "#f3bd58";
  ctx.fillRect(px - 22, py - 6, 38, 12);
  ctx.fillRect(px - 10, py - 12, 18, 4);
  ctx.fillRect(px - 10, py + 8, 18, 4);

  ctx.fillStyle = "#d98232";
  ctx.fillRect(px + 16, py - 8, 12, 16);
  ctx.fillRect(px + 28, py - 12, 8, 8);
  ctx.fillRect(px + 28, py + 4, 8, 8);

  ctx.fillStyle = "#2f241d";
  ctx.fillRect(px - 18, py - 3, 4, 4);
}

function drawPixelPanel(x, y, width, height) {
  ctx.fillStyle = "#2f241d";
  ctx.fillRect(x - 4, y - 4, width + 8, height + 8);

  ctx.fillStyle = "#fff4d6";
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = "#d6a85d";
  ctx.fillRect(x, y, width, 6);
  ctx.fillRect(x, y + height - 6, width, 6);
  ctx.fillRect(x, y, 6, height);
  ctx.fillRect(x + width - 6, y, 6, height);
}
