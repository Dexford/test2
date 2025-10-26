const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panel-title");
const panelText = document.getElementById("panel-text");
const startButton = document.getElementById("start-button");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const STAR_COLORS = ["#f9d976", "#ffe066", "#ffd166", "#fcca46", "#fff3b0"];
const METEOR_COLOR = "#ff595e";
const TRAIL_COLOR = "rgba(255, 247, 174, 0.2)";

const keys = new Set();
let animationId = null;
let lastSpawn = 0;
let spawnInterval = 1100;
let level = 1;
let score = 0;
let lives = 3;
let elapsed = 0;

const player = {
  x: WIDTH / 2,
  y: HEIGHT - 60,
  width: 60,
  height: 20,
  speed: 320,
  color: "#8ecae6",
  trail: [],
};

const stars = [];
const meteors = [];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function resetGame() {
  score = 0;
  lives = 3;
  level = 1;
  elapsed = 0;
  spawnInterval = 1100;
  stars.length = 0;
  meteors.length = 0;
  player.x = WIDTH / 2;
  player.trail = [];
  updateHud();
}

function updateHud() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  levelEl.textContent = level;
}

function showPanel(title, text, buttonLabel = "Erneut spielen") {
  panelTitle.textContent = title;
  panelText.textContent = text;
  startButton.textContent = buttonLabel;
  panel.hidden = false;
}

function hidePanel() {
  panel.hidden = true;
}

function handleInput(delta) {
  let direction = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) direction -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) direction += 1;

  player.x += direction * player.speed * delta;
  player.x = clamp(player.x, player.width / 2, WIDTH - player.width / 2);

  player.trail.push({ x: player.x, y: player.y });
  if (player.trail.length > 20) player.trail.shift();
}

function spawnEntity() {
  const baseSpeed = 80 + level * 18;
  const spawnX = Math.random() * (WIDTH - 32) + 16;
  const isMeteor = Math.random() < Math.min(0.2 + level * 0.05, 0.65);

  if (isMeteor) {
    meteors.push({
      x: spawnX,
      y: -20,
      radius: 14,
      speed: baseSpeed * 1.2,
    });
  } else {
    stars.push({
      x: spawnX,
      y: -16,
      radius: 11,
      speed: baseSpeed,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      wobble: Math.random() * Math.PI * 2,
    });
  }
}

function updateEntities(delta) {
  for (const star of stars) {
    star.y += star.speed * delta;
    star.wobble += delta * 6;
    star.x += Math.sin(star.wobble) * 35 * delta;
  }

  for (const meteor of meteors) {
    meteor.y += meteor.speed * delta;
    meteor.x += Math.sin((meteor.y / HEIGHT) * Math.PI * 2) * 30 * delta;
  }

  stars.splice(0, stars.length, ...stars.filter((star) => star.y < HEIGHT + star.radius));
  meteors.splice(0, meteors.length, ...meteors.filter((meteor) => meteor.y < HEIGHT + meteor.radius));
}

function rectCircleColliding(circle, rect) {
  const distX = Math.abs(circle.x - rect.x);
  const distY = Math.abs(circle.y - rect.y);

  if (distX > rect.width / 2 + circle.radius) return false;
  if (distY > rect.height / 2 + circle.radius) return false;

  if (distX <= rect.width / 2) return true;
  if (distY <= rect.height / 2) return true;

  const dx = distX - rect.width / 2;
  const dy = distY - rect.height / 2;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function checkCollisions() {
  for (let i = stars.length - 1; i >= 0; i--) {
    if (rectCircleColliding(stars[i], player)) {
      score += 10;
      stars.splice(i, 1);
      updateHud();
    }
  }

  for (let i = meteors.length - 1; i >= 0; i--) {
    if (rectCircleColliding(meteors[i], player)) {
      meteors.splice(i, 1);
      lives -= 1;
      updateHud();
      flashCanvas();
      if (lives <= 0) {
        endGame(false);
      }
    }
  }
}

let flashTime = 0;
function flashCanvas() {
  flashTime = 0.3;
}

function drawPlayer() {
  ctx.save();
  ctx.fillStyle = player.color;
  ctx.shadowColor = "rgba(142, 202, 230, 0.9)";
  ctx.shadowBlur = 20;
  ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = TRAIL_COLOR;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < player.trail.length; i++) {
    const point = player.trail[i];
    const next = player.trail[i + 1] ?? point;
    ctx.globalAlpha = i / player.trail.length;
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(next.x, next.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawStars() {
  for (const star of stars) {
    ctx.save();
    ctx.fillStyle = star.color;
    ctx.shadowColor = star.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawMeteors() {
  for (const meteor of meteors) {
    ctx.save();
    ctx.fillStyle = METEOR_COLOR;
    ctx.shadowColor = METEOR_COLOR;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.ellipse(meteor.x, meteor.y, meteor.radius * 1.4, meteor.radius, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBackground(delta) {
  ctx.fillStyle = "#02030a";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  const gridSize = 40;
  const speed = 30;
  elapsed += delta * speed;
  const offsetY = elapsed % gridSize;

  for (let x = 0; x <= WIDTH; x += gridSize) {
    for (let y = -gridSize; y <= HEIGHT; y += gridSize) {
      const drawY = y + offsetY;
      ctx.globalAlpha = 0.1 + ((x + y) % 80) / 120;
      ctx.beginPath();
      ctx.arc(x, drawY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFlash(delta) {
  if (flashTime <= 0) return;
  flashTime -= delta;
  ctx.save();
  ctx.fillStyle = "rgba(255, 89, 94, 0.3)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

let lastTime = 0;
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground(delta);
  handleInput(delta);
  updateEntities(delta);
  checkCollisions();
  drawStars();
  drawMeteors();
  drawPlayer();
  drawFlash(delta);

  if (timestamp - lastSpawn > spawnInterval) {
    spawnEntity();
    lastSpawn = timestamp;
  }

  const targetScore = level * 180;
  if (score >= targetScore) {
    level += 1;
    spawnInterval = Math.max(450, spawnInterval * 0.88);
    lives = Math.min(lives + 1, 5);
    updateHud();
  }

  if (lives > 0) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

function endGame(won) {
  cancelAnimationFrame(animationId);
  animationId = null;
  const title = won ? "Sternenmeister!" : "Game Over";
  const text = won
    ? `Du hast Level ${level} erreicht und ${score} Punkte gesammelt. Stark gemacht!`
    : `Du hast ${score} Punkte gesammelt. Versuche es gleich nochmal!`;
  showPanel(title, text);
}

function startGame() {
  resetGame();
  hidePanel();
  lastTime = 0;
  lastSpawn = 0;
  flashTime = 0;
  animationId = requestAnimationFrame(gameLoop);
}

function handleKeydown(event) {
  keys.add(event.key);
  if (event.key === " " && animationId === null && panel.hidden) {
    startGame();
  }
}

function handleKeyup(event) {
  keys.delete(event.key);
}

startButton.addEventListener("click", startGame);
window.addEventListener("keydown", handleKeydown);
window.addEventListener("keyup", handleKeyup);

showPanel(
  "Starcatcher",
  "Fange die leuchtenden Sterne und halte Abstand von den roten Meteoriten. Je höher dein Level, desto schneller wird der Weltraum!",
  "Los geht's"
);
