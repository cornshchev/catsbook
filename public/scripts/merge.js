import * as api from "./api.js";
import { $, setStatus } from "./ui.js";

const playerId = api.requirePlayer();
const canvas = $("#merge-canvas");
const ctx = canvas.getContext("2d");
const scoreLabel = $("#merge-score");
const targetLabel = $("#merge-target");
const nextLabel = $("#merge-next");
const message = $("#merge-message");
const restartButton = $("#restart-merge");

const pendingQuest = api.getPendingMergeQuest();
const params = new URLSearchParams(window.location.search);
const urlTarget = params.get("target");
const targetScore = urlTarget ? Number(urlTarget) : pendingQuest?.targetScore;
const config = {
  questId: pendingQuest?.questId || null,
  title: pendingQuest?.title || "无限合成练习",
  difficulty: Number(params.get("difficulty") || pendingQuest?.difficulty || 1),
  difficultyLabel: pendingQuest?.difficultyLabel || api.normalizeQuestDifficulty(Number(params.get("difficulty") || pendingQuest?.difficulty || 1)),
  targetScore: targetScore ? Number(targetScore) : null,
  endless: !targetScore,
};

const board = {
  x: 120,
  y: 54,
  w: 520,
  h: 570,
  dangerY: 126,
};

const SIZE_SCALE = 3;

const catLevels = [
  {
    name: "布偶猫",
    size: 24 * SIZE_SCALE,
    color: "#fff8e8",
    patch: "#d8c6a5",
    ear: "#c69b83",
    eye: "#9fbbe8",
    score: 12,
  },
  {
    name: "橘子猫",
    size: 32 * SIZE_SCALE,
    color: "#f2a14b",
    patch: "#ffd17a",
    ear: "#bf6036",
    eye: "#fff3c9",
    score: 28,
  },
  {
    name: "暹罗猫",
    size: 42 * SIZE_SCALE,
    color: "#dfcfb0",
    patch: "#56483f",
    ear: "#2f2520",
    eye: "#5e8fce",
    score: 58,
  },
  {
    name: "三花猫",
    size: 54 * SIZE_SCALE,
    color: "#fff8e8",
    patch: "#d9a45b",
    ear: "#6c5a4d",
    eye: "#7bd7c6",
    score: 118,
  },
  {
    name: "黑糖猫",
    size: 70 * SIZE_SCALE,
    color: "#211d1b",
    patch: "#3a2d25",
    ear: "#15110f",
    eye: "#f6df94",
    score: 240,
  },
  {
    name: "星星猫",
    size: 90 * SIZE_SCALE,
    color: "#f2cf5b",
    patch: "#fff0a5",
    ear: "#e56b4f",
    eye: "#fff8e8",
    score: 500,
  },
];

const state = {
  cats: [],
  aimX: board.x + board.w / 2,
  nextLevel: 0,
  score: 0,
  dropCooldown: 0,
  completed: false,
  gameOver: false,
  lastTime: 0,
};

restartButton.addEventListener("click", resetGame);

canvas.addEventListener("pointermove", (event) => {
  const point = getCanvasPoint(event);
  const nextRadius = catLevels[state.nextLevel].size / 2;
  state.aimX = clamp(point.x, board.x + nextRadius, board.x + board.w - nextRadius);
});

canvas.addEventListener("pointerdown", (event) => {
  const point = getCanvasPoint(event);
  const nextRadius = catLevels[state.nextLevel].size / 2;
  state.aimX = clamp(point.x, board.x + nextRadius, board.x + board.w - nextRadius);
  dropCat();
});

resetGame();
requestAnimationFrame(loop);

function resetGame() {
  state.cats = [];
  state.aimX = board.x + board.w / 2;
  state.nextLevel = randomNextLevel();
  state.score = 0;
  state.dropCooldown = 0;
  state.completed = false;
  state.gameOver = false;
  state.lastTime = performance.now();
  updateHud();
  const modeText = config.endless ? "无限模式，没有目标分数。" : `目标分数 ${config.targetScore}。`;
  setStatus(message, `${config.title}：点击纸箱上方投放圆形像素猫，相同猫咪碰到会合成。${modeText}难度 ${config.difficultyLabel}。`);
}

function loop(time) {
  const dt = Math.min(32, time - state.lastTime) / 16.67;
  state.lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (state.gameOver) return;
  if (state.dropCooldown > 0) state.dropCooldown -= dt;

  for (const cat of state.cats) {
    cat.vy += (0.34 + config.difficulty * 0.018) * dt;
    cat.vx *= 0.992;
    cat.vy *= 0.997;
    cat.x += cat.vx * dt;
    cat.y += cat.vy * dt;

    if (cat.x - cat.r < board.x) {
      cat.x = board.x + cat.r;
      cat.vx = Math.abs(cat.vx) * 0.45;
    }

    if (cat.x + cat.r > board.x + board.w) {
      cat.x = board.x + board.w - cat.r;
      cat.vx = -Math.abs(cat.vx) * 0.45;
    }

    if (cat.y + cat.r > board.y + board.h) {
      cat.y = board.y + board.h - cat.r;
      cat.vy = -Math.abs(cat.vy) * 0.28;
      cat.vx *= 0.92;
    }
  }

  for (let pass = 0; pass < 3; pass += 1) {
    resolveCollisions();
  }

  state.cats = state.cats.filter((cat) => !cat.removed);
  checkGameOver();
}

function resolveCollisions() {
  for (let i = 0; i < state.cats.length; i += 1) {
    for (let j = i + 1; j < state.cats.length; j += 1) {
      const a = state.cats[i];
      const b = state.cats[j];
      if (a.removed || b.removed) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 1;
      const minDistance = a.r + b.r;
      if (distance >= minDistance) continue;

      if (a.level === b.level && a.level < catLevels.length - 1) {
        mergeCats(a, b);
        continue;
      }

      const overlap = (minDistance - distance) / 2;
      const nx = dx / distance;
      const ny = dy / distance;

      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;

      const impulse = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      a.vx -= impulse * nx * 0.16;
      a.vy -= impulse * ny * 0.16;
      b.vx += impulse * nx * 0.16;
      b.vy += impulse * ny * 0.16;
    }
  }
}

function mergeCats(a, b) {
  const nextLevel = Math.min(a.level + 1, catLevels.length - 1);
  const merged = createCat(nextLevel, (a.x + b.x) / 2, (a.y + b.y) / 2);
  merged.vx = (a.vx + b.vx) * 0.22;
  merged.vy = Math.min((a.vy + b.vy) * 0.12, 0);

  a.removed = true;
  b.removed = true;

  state.cats.push(merged);
  state.score += catLevels[nextLevel].score;
  updateHud();

  if (!config.endless && state.score >= config.targetScore) completeMergeQuest();
}

function dropCat() {
  if (state.completed || state.gameOver || state.dropCooldown > 0) return;

  const data = catLevels[state.nextLevel];
  const cat = createCat(state.nextLevel, state.aimX, board.y + data.size / 2 + 8);
  cat.vx = (Math.random() - 0.5) * 0.7;

  state.cats.push(cat);
  state.nextLevel = randomNextLevel();
  state.dropCooldown = Math.max(16, 28 - config.difficulty * 2);

  updateHud();
}

function createCat(level, x, y) {
  const data = catLevels[level];

  return {
    id: createId(),
    level,
    x,
    y,
    r: data.size / 2,
    vx: 0,
    vy: 0,
    removed: false,
  };
}

function randomNextLevel() {
  const maxLevel = Math.min(2 + Math.floor(config.difficulty / 3), 3);
  const roll = Math.random();

  if (roll > 0.82 && maxLevel >= 2) return 2;
  if (roll > 0.52) return 1;
  return 0;
}

async function completeMergeQuest() {
  if (state.completed) return;
  state.completed = true;

  if (!config.questId) {
    setStatus(message, "合成达标！这是一次自由练习。");
    return;
  }

  setStatus(message, "分数达标！正在把实验结果交给猫咪...");

  try {
    await api.completeQuest(playerId, config.questId);
    api.clearPendingMergeQuest();
    setStatus(message, "任务完成，像素猫头感谢卡已经收入图鉴。");
  } catch (error) {
    setStatus(message, error.message, "error");
  }
}

function checkGameOver() {
  if (state.completed || state.cats.length < 8) return;

  const crowded = state.cats.some(
    (cat) =>
      Math.abs(cat.vx) < 0.12 &&
      Math.abs(cat.vy) < 0.12 &&
      cat.y - cat.r < board.dangerY
  );

  if (!crowded) return;

  state.gameOver = true;
  setStatus(message, "纸箱被圆形像素猫塞满了。重新开始再试一次。", "error");
}

function updateHud() {
  scoreLabel.textContent = `分数 ${state.score}`;
  targetLabel.textContent = config.endless ? "无限模式" : `目标 ${config.targetScore}`;
  nextLabel.textContent = `下一个：${catLevels[state.nextLevel].name}`;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  drawRoom();
  drawBoard();
  drawAim();
  state.cats.forEach(drawPixelCat);
  drawOverlay();
}

function drawRoom() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#ffe5ba");
  gradient.addColorStop(0.5, "#ffd49a");
  gradient.addColorStop(1, "#c97848");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 246, 218, 0.42)";
  for (let x = 0; x < canvas.width; x += 32) {
    for (let y = 0; y < canvas.height; y += 32) {
      if ((x + y) % 64 === 0) {
        ctx.fillRect(x, y, 16, 16);
      }
    }
  }

  ctx.fillStyle = "#a95f3e";
  ctx.fillRect(0, 618, canvas.width, 62);

  ctx.fillStyle = "rgba(255, 226, 170, 0.34)";
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.fillRect(x, 618, 20, 62);
  }
}

function drawBoard() {
  ctx.fillStyle = "#9a6040";
  ctx.fillRect(board.x - 18, board.y + board.h, board.w + 36, 18);

  ctx.fillStyle = "#f4be72";
  ctx.fillRect(board.x - 12, board.y - 8, 12, board.h + 8);
  ctx.fillRect(board.x + board.w, board.y - 8, 12, board.h + 8);
  ctx.fillRect(board.x - 12, board.y + board.h, board.w + 24, 14);

  ctx.fillStyle = "#fff0c9";
  ctx.fillRect(board.x, board.y, board.w, board.h);

  ctx.fillStyle = "rgba(214, 132, 73, 0.16)";
  for (let x = board.x; x < board.x + board.w; x += 24) {
    for (let y = board.y; y < board.y + board.h; y += 24) {
      if ((x + y) % 48 === 0) {
        ctx.fillRect(x, y, 12, 12);
      }
    }
  }

  ctx.strokeStyle = "#e56b4f";
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(board.x, board.dangerY);
  ctx.lineTo(board.x + board.w, board.dangerY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawAim() {
  ctx.fillStyle = "#fff8e8";
  ctx.fillRect(state.aimX - 2, board.y - 30, 4, 34);
  drawTinyPreview(state.nextLevel, state.aimX, board.y - 38);
}

function drawPixelCat(cat) {
  const data = catLevels[cat.level];
  const size = Math.round(data.size);
  const x = Math.round(cat.x - size / 2);
  const y = Math.round(cat.y - size / 2);
  const unit = Math.max(4, Math.round(size / 18));

  ctx.fillStyle = "rgba(87, 45, 29, 0.22)";
  drawPixelEllipse(cat.x, cat.y + cat.r * 0.84, cat.r * 0.72, unit * 2, unit);

  drawPixelCircle(cat.x, cat.y, cat.r, data.color, unit);

  drawCatPattern(cat, data, unit);
  drawCatEars(cat, data, unit);
  drawCatFace(cat, data, unit);
  drawPixelOutline(cat.x, cat.y, cat.r, unit);
}

function drawCatPattern(cat, data, unit) {
  const r = cat.r;
  const cx = cat.x;
  const cy = cat.y;

  if (cat.level === 0) {
    ctx.fillStyle = data.patch;
    drawPixelEllipse(cx - r * 0.45, cy - r * 0.46, r * 0.4, r * 0.3, unit);
    drawPixelEllipse(cx + r * 0.45, cy - r * 0.46, r * 0.4, r * 0.3, unit);

    // 腮红
    ctx.fillStyle = "rgb(223, 153, 143)";
    ctx.fillRect(
      Math.round(cx - r * 0.56),
      Math.round(cy + r * 0.16),
      unit * 2,
      unit * 2
    );
    ctx.fillRect(
      Math.round(cx + r * 0.46),
      Math.round(cy + r * 0.16),
      unit * 2,
      unit * 2
    );
  }

  if (cat.level === 1) {
    ctx.fillStyle = "#fff8e8";
    drawPixelEllipse(cx, cy + r * 0.6, r * 0.9, r * 0.38, unit);
    // 腮红
    ctx.fillStyle = "rgba(255, 132, 112, 1)";
    ctx.fillRect(
      Math.round(cx - r * 0.56),
      Math.round(cy + r * 0.16),
      unit * 3,
      unit * 2
    );
    ctx.fillRect(
      Math.round(cx + r * 0.36),
      Math.round(cy + r * 0.16),
      unit * 3,
      unit * 2
    );
  }

  if (cat.level === 2) {
    ctx.fillStyle = data.patch;
    drawPixelEllipse(cx, cy + r * 0, r * 0.7, r * 0.5, unit);
  }

  if (cat.level === 3) {
    ctx.fillStyle = "#6c5a4d";
    drawPixelEllipse(cx - r * 0.32, cy - r * 0.38, r * 0.28, r * 0.22, unit);

    ctx.fillStyle = "#d98b4f";
    drawPixelEllipse(cx + r * 0.3, cy - r * 0.38, r * 0.28, r * 0.22, unit);
    drawPixelEllipse(cx + r * 0.22, cy + r * 0.36, r * 0.22, r * 0.18, unit);
    // 腮红
    ctx.fillStyle = "rgb(255, 181, 170)";
    ctx.fillRect(
      Math.round(cx - r * 0.56),
      Math.round(cy + r * 0.16),
      unit * 3,
      unit * 2
    );
    ctx.fillRect(
      Math.round(cx + r * 0.36),
      Math.round(cy + r * 0.16),
      unit * 3,
      unit * 2
    );
  }

  if (cat.level === 4) {
    ctx.fillStyle = data.patch;
    drawPixelEllipse(cx - r * 0.14, cy - r * 0.12, r * 0.24, r * 0.18, unit);
    drawPixelEllipse(cx + r * 0.18, cy + r * 0.18, r * 0.2, r * 0.16, unit);
    
  }

  if (cat.level === 5) {
    ctx.fillStyle = data.patch;
    drawPixelEllipse(cx, cy - r * 0.18, r * 0.36, r * 0.24, unit);

    ctx.fillStyle = "#fff8e8";
    drawPixelStar(cx + r * 0.35, cy - r * 0.35, unit);
    drawPixelStar(cx - r * 0.38, cy + r * 0.18, unit);
  }
}

function drawCatEars(cat, data, unit) {
  const r = cat.r;
  const cx = cat.x;
  const cy = cat.y;

  ctx.fillStyle = data.ear;
  drawPixelTriangle(
    cx - r * 0.48,
    cy - r * 0.62,
    cx - r * 0.18,
    cy - r * 0.95,
    cx - r * 0.06,
    cy - r * 0.48,
    unit
  );
  drawPixelTriangle(
    cx + r * 0.48,
    cy - r * 0.62,
    cx + r * 0.18,
    cy - r * 0.95,
    cx + r * 0.06,
    cy - r * 0.48,
    unit
  );

  ctx.fillStyle = "#ffd0bf";
  drawPixelTriangle(
    cx - r * 0.4,
    cy - r * 0.61,
    cx - r * 0.2,
    cy - r * 0.78,
    cx - r * 0.14,
    cy - r * 0.5,
    unit
  );
  drawPixelTriangle(
    cx + r * 0.4,
    cy - r * 0.61,
    cx + r * 0.2,
    cy - r * 0.78,
    cx + r * 0.14,
    cy - r * 0.5,
    unit
  );
}

function drawCatFace(cat, data, unit) {
  const r = cat.r;
  const cx = cat.x;
  const cy = cat.y;

  // 眼睛
  ctx.fillStyle = data.eye;
  ctx.fillRect(
    Math.round(cx - r * 0.32),
    Math.round(cy - r * 0.1),
    unit * 2,
    unit * 3
  );
  ctx.fillRect(
    Math.round(cx + r * 0.22),
    Math.round(cy - r * 0.1),
    unit * 2,
    unit * 3
  );

  // 眼睛高光 / 瞳孔
  ctx.fillStyle = "#1f1a1d";
  ctx.fillRect(
    Math.round(cx - r * 0.3),
    Math.round(cy - r * 0.08),
    unit,
    unit * 2
  );
  ctx.fillRect(
    Math.round(cx + r * 0.3),
    Math.round(cy - r * 0.08),
    unit,
    unit * 2
  );

  // 只给橘子圆猫画腮红，其他猫不画胡子
  if (cat.level === 1) {
    
  }
}

function drawTinyPreview(level, x, y) {
  const data = catLevels[level];
  const previewSize = 42;
  const previewUnit = 4;
  const previewRadius = previewSize / 2;

  drawPixelCircle(x, y, previewRadius, data.color, previewUnit);

  ctx.fillStyle = data.ear;
  drawPixelTriangle(
    x - previewRadius * 0.48,
    y - previewRadius * 0.62,
    x - previewRadius * 0.16,
    y - previewRadius * 0.92,
    x - previewRadius * 0.04,
    y - previewRadius * 0.46,
    previewUnit
  );
  drawPixelTriangle(
    x + previewRadius * 0.48,
    y - previewRadius * 0.62,
    x + previewRadius * 0.16,
    y - previewRadius * 0.92,
    x + previewRadius * 0.04,
    y - previewRadius * 0.46,
    previewUnit
  );

  ctx.fillStyle = data.eye;
  ctx.fillRect(Math.round(x - 9), Math.round(y - 2), 5, 6);
  ctx.fillRect(Math.round(x + 5), Math.round(y - 2), 5, 6);

  ctx.fillStyle = "#1f1a1d";
  ctx.fillRect(Math.round(x - 8), Math.round(y), 3, 4);
  ctx.fillRect(Math.round(x + 6), Math.round(y), 3, 4);
  ctx.fillRect(Math.round(x - 2), Math.round(y + 7), 4, 3);

  drawPixelOutline(x, y, previewRadius, previewUnit);
}

function drawOverlay() {
  if (!state.gameOver && !state.completed) return;

  ctx.fillStyle = "rgba(98, 52, 35, 0.52)";
  ctx.fillRect(board.x, board.y, board.w, board.h);

  ctx.fillStyle = "#fff8e8";
  ctx.font = "700 26px monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    state.completed ? "CLEAR!" : "TRY AGAIN",
    board.x + board.w / 2,
    board.y + 230
  );
  ctx.textAlign = "start";
}

function drawPixelCircle(cx, cy, r, color, unit) {
  ctx.fillStyle = color;

  for (let py = -r; py <= r; py += unit) {
    for (let px = -r; px <= r; px += unit) {
      const distance = Math.hypot(px + unit / 2, py + unit / 2);
      if (distance <= r) {
        ctx.fillRect(
          Math.round(cx + px),
          Math.round(cy + py),
          unit,
          unit
        );
      }
    }
  }
}

function drawPixelEllipse(cx, cy, rx, ry, unit) {
  for (let py = -ry; py <= ry; py += unit) {
    for (let px = -rx; px <= rx; px += unit) {
      const value =
        ((px + unit / 2) * (px + unit / 2)) / (rx * rx) +
        ((py + unit / 2) * (py + unit / 2)) / (ry * ry);

      if (value <= 1) {
        ctx.fillRect(
          Math.round(cx + px),
          Math.round(cy + py),
          unit,
          unit
        );
      }
    }
  }
}

function drawPixelTriangle(x1, y1, x2, y2, x3, y3, unit) {
  const minX = Math.floor(Math.min(x1, x2, x3) / unit) * unit;
  const maxX = Math.ceil(Math.max(x1, x2, x3) / unit) * unit;
  const minY = Math.floor(Math.min(y1, y2, y3) / unit) * unit;
  const maxY = Math.ceil(Math.max(y1, y2, y3) / unit) * unit;

  for (let y = minY; y <= maxY; y += unit) {
    for (let x = minX; x <= maxX; x += unit) {
      if (pointInTriangle(x + unit / 2, y + unit / 2, x1, y1, x2, y2, x3, y3)) {
        ctx.fillRect(Math.round(x), Math.round(y), unit, unit);
      }
    }
  }
}

function drawPixelOutline(cx, cy, r, unit) {
  ctx.fillStyle = "rgba(43, 31, 27, 0.5)";

  for (let py = -r - unit; py <= r + unit; py += unit) {
    for (let px = -r - unit; px <= r + unit; px += unit) {
      const distance = Math.hypot(px + unit / 2, py + unit / 2);

      if (distance > r - unit * 0.35 && distance <= r + unit * 0.35) {
        ctx.fillRect(
          Math.round(cx + px),
          Math.round(cy + py),
          unit,
          unit
        );
      }
    }
  }
}

function drawPixelStar(cx, cy, unit) {
  ctx.fillRect(Math.round(cx), Math.round(cy - unit), unit, unit * 3);
  ctx.fillRect(Math.round(cx - unit), Math.round(cy), unit * 3, unit);
}

function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const area =
    0.5 *
    (-y2 * x3 +
      y1 * (-x2 + x3) +
      x1 * (y2 - y3) +
      x2 * y3);

  const s =
    (1 / (2 * area)) *
    (y1 * x3 -
      x1 * y3 +
      (y3 - y1) * px +
      (x1 - x3) * py);

  const t =
    (1 / (2 * area)) *
    (x1 * y2 -
      y1 * x2 +
      (y1 - y2) * px +
      (x2 - x1) * py);

  return s >= 0 && t >= 0 && 1 - s - t >= 0;
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = [...bytes]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `cat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
