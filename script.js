const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  scoreValue: document.getElementById("scoreValue"),
  highScoreValue: document.getElementById("highScoreValue"),
  coinValue: document.getElementById("coinValue"),
  gravityValue: document.getElementById("gravityValue"),
  powerupRow: document.getElementById("powerupRow"),
  startOverlay: document.getElementById("startOverlay"),
  countdownOverlay: document.getElementById("countdownOverlay"),
  pauseOverlay: document.getElementById("pauseOverlay"),
  gameOverOverlay: document.getElementById("gameOverOverlay"),
  countdownText: document.getElementById("countdownText"),
  finalScore: document.getElementById("finalScore"),
  bestScore: document.getElementById("bestScore"),
  playButton: document.getElementById("playButton"),
  restartButton: document.getElementById("restartButton"),
  resumeButton: document.getElementById("resumeButton"),
  pauseButton: document.getElementById("pauseButton"),
  flipButton: document.getElementById("flipButton"),
  soundToggle: document.getElementById("soundToggle"),
  musicToggle: document.getElementById("musicToggle"),
};

const STORAGE_KEY = "gravity-flip-runner-high-score";
const FLOOR_Y = canvas.height - 52;
const CEILING_Y = 52;
const PLAYER_RADIUS = 22;
const BASE_SPEED = 410;

const player = {
  x: 140,
  y: FLOOR_Y - PLAYER_RADIUS,
  radius: PLAYER_RADIUS,
  velocityY: 0,
  gravityDirection: 1,
  flipCooldown: 0,
  rotation: 0,
  shield: 0,
};

const game = {
  state: "start",
  score: 0,
  coins: 0,
  highScore: loadHighScore(),
  elapsed: 0,
  lastTime: 0,
  spawnTimer: 0,
  coinTimer: 0,
  powerTimer: 0,
  countdown: 3,
  speed: BASE_SPEED,
  obstacles: [],
  coinsArray: [],
  powerUps: [],
  particles: [],
  stars: [],
  skyline: [],
  slowMotionTimer: 0,
  doubleScoreTimer: 0,
  magnetTimer: 0,
  cameraShake: 0,
};

const audio = {
  ctx: null,
  musicEnabled: true,
  soundEnabled: true,
  musicTimer: null,
  musicStep: 0,
};

const effectStyles = {
  shield: "#3ef7c3",
  magnet: "#57d9ff",
  slow: "#c06cff",
  double: "#ffb052",
};

function loadHighScore() {
  const value = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(value) ? value : 0;
}

function saveHighScore() {
  if (game.score > game.highScore) {
    game.highScore = Math.floor(game.score);
    localStorage.setItem(STORAGE_KEY, String(game.highScore));
  }
}

function buildBackdrop() {
  game.stars = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * (canvas.height * 0.7),
    radius: Math.random() * 2 + 1,
    speed: 0.3 + Math.random() * 0.8,
  }));

  game.skyline = Array.from({ length: 18 }, (_, index) => {
    const width = 30 + Math.random() * 52;
    const height = 60 + Math.random() * 150;
    return {
      x: index * 52 + Math.random() * 12,
      y: canvas.height - 120 - height,
      width,
      height,
      glow: index % 2 === 0 ? "#57d9ff" : "#c06cff",
    };
  });
}

function resetGameState() {
  game.score = 0;
  game.coins = 0;
  game.elapsed = 0;
  game.speed = BASE_SPEED;
  game.spawnTimer = 0.9;
  game.coinTimer = 0.85;
  game.powerTimer = 7;
  game.obstacles = [];
  game.coinsArray = [];
  game.powerUps = [];
  game.particles = [];
  game.slowMotionTimer = 0;
  game.doubleScoreTimer = 0;
  game.magnetTimer = 0;
  game.cameraShake = 0;
  player.x = 140;
  player.y = FLOOR_Y - PLAYER_RADIUS;
  player.velocityY = 0;
  player.gravityDirection = 1;
  player.flipCooldown = 0;
  player.rotation = 0;
  player.shield = 0;
}

function setOverlayVisible(overlay, visible) {
  overlay.classList.toggle("hidden", !visible);
  overlay.classList.toggle("visible", visible);
}

function showStartScreen() {
  setOverlayVisible(ui.startOverlay, true);
  setOverlayVisible(ui.countdownOverlay, false);
  setOverlayVisible(ui.pauseOverlay, false);
  setOverlayVisible(ui.gameOverOverlay, false);
  ui.pauseButton.textContent = "Pause";
  ui.pauseButton.disabled = false;
}

function startCountdown() {
  resetGameState();
  game.state = "countdown";
  game.countdown = 3;
  ui.countdownText.textContent = "3";
  setOverlayVisible(ui.startOverlay, false);
  setOverlayVisible(ui.countdownOverlay, true);
  setOverlayVisible(ui.gameOverOverlay, false);
  setOverlayVisible(ui.pauseOverlay, false);
  ui.pauseButton.disabled = false;
  initAudio();
  startMusic();
  updateHud();
}

function togglePause() {
  if (game.state === "start" || game.state === "countdown") {
    return;
  }

  if (game.state === "paused") {
    game.state = "playing";
    setOverlayVisible(ui.pauseOverlay, false);
    ui.pauseButton.textContent = "Pause";
  } else if (game.state === "playing") {
    game.state = "paused";
    setOverlayVisible(ui.pauseOverlay, true);
    ui.pauseButton.textContent = "Resume";
  }
}

function resumeGame() {
  if (game.state === "paused") {
    game.state = "playing";
    setOverlayVisible(ui.pauseOverlay, false);
    ui.pauseButton.textContent = "Pause";
  }
}

function updateHud() {
  ui.scoreValue.textContent = Math.floor(game.score);
  ui.highScoreValue.textContent = Math.floor(game.highScore);
  ui.coinValue.textContent = game.coins;
  ui.gravityValue.textContent = player.gravityDirection > 0 ? "Ground" : "Ceiling";

  const badges = [];

  if (player.shield > 0) {
    badges.push({ label: `Shield ${player.shield}`, type: "shield" });
  }

  if (game.magnetTimer > 0) {
    badges.push({ label: `Magnet ${game.magnetTimer.toFixed(1)}s`, type: "magnet" });
  }

  if (game.slowMotionTimer > 0) {
    badges.push({ label: `Slow ${game.slowMotionTimer.toFixed(1)}s`, type: "slow" });
  }

  if (game.doubleScoreTimer > 0) {
    badges.push({ label: `Double ${game.doubleScoreTimer.toFixed(1)}s`, type: "double" });
  }

  ui.powerupRow.innerHTML = badges
    .map(
      (badge) =>
        `<span class="power-badge ${badge.type}">${badge.label}</span>`
    )
    .join("");
}

function handleFlip() {
  if (game.state !== "playing" && game.state !== "countdown") {
    return;
  }

  if (game.state === "countdown") {
    return;
  }

  if (player.flipCooldown > 0) {
    return;
  }

  player.gravityDirection *= -1;
  player.flipCooldown = 0.28;
  player.velocityY = 0;
  spawnFlipParticles();
  playSound("flip");
}

function spawnFlipParticles() {
  for (let i = 0; i < 20; i += 1) {
    const angle = (Math.PI / 20) * i;
    const speed = 40 + Math.random() * 80;
    game.particles.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8 + Math.random() * 0.4,
      color: player.gravityDirection > 0 ? "#57d9ff" : "#ff63d8",
      size: 3 + Math.random() * 5,
    });
  }
}

function spawnObstacle() {
  const side = Math.random() < 0.5 ? "ground" : "ceiling";
  const width = 44 + Math.random() * 22;
  const height = 36 + Math.random() * 20;
  const obstacle = {
    x: canvas.width + 80,
    y: side === "ground" ? FLOOR_Y - height : CEILING_Y,
    width,
    height,
    type: "spike",
    side,
    speed: game.speed * (0.95 + Math.random() * 0.15),
    moving: Math.random() < 0.2,
    phase: Math.random() * Math.PI * 2,
    baseY: side === "ground" ? FLOOR_Y - height : CEILING_Y,
    amplitude: 18 + Math.random() * 30,
  };

  if (Math.random() < 0.25) {
    obstacle.type = "drone";
    obstacle.width = 52;
    obstacle.height = 48;
    obstacle.y = 160 + Math.random() * (canvas.height - 240);
    obstacle.baseY = obstacle.y;
    obstacle.moving = true;
  }

  game.obstacles.push(obstacle);
}

function spawnCoinCluster() {
  const clusterSize = Math.random() < 0.4 ? 3 : 2;
  const verticalStart = 140 + Math.random() * (canvas.height - 250);

  for (let i = 0; i < clusterSize; i += 1) {
    game.coinsArray.push({
      x: canvas.width + 40 + i * 28,
      y: verticalStart + Math.sin(i * 1.2) * 18,
      radius: 10,
      pulse: Math.random() * Math.PI * 2,
    });
  }
}

function spawnPowerUp() {
  const types = ["shield", "magnet", "slow", "double"];
  const type = types[Math.floor(Math.random() * types.length)];

  game.powerUps.push({
    x: canvas.width + 60,
    y: 150 + Math.random() * (canvas.height - 260),
    radius: 15,
    type,
    pulse: Math.random() * Math.PI * 2,
  });
}

function update(dt) {
  if (game.state === "countdown") {
    game.countdown -= dt;
    const nextCount = Math.max(1, Math.ceil(game.countdown));
    ui.countdownText.textContent = String(nextCount);

    if (game.countdown <= 0) {
      game.state = "playing";
      setOverlayVisible(ui.countdownOverlay, false);
      ui.countdownText.textContent = "3";
    }
    return;
  }

  if (game.state !== "playing") {
    updateParticles(dt);
    return;
  }

  game.elapsed += dt;
  game.score += dt * (game.doubleScoreTimer > 0 ? 22 : 11);
  game.speed = BASE_SPEED + game.elapsed * 8;

  player.flipCooldown = Math.max(0, player.flipCooldown - dt);
  game.slowMotionTimer = Math.max(0, game.slowMotionTimer - dt);
  game.doubleScoreTimer = Math.max(0, game.doubleScoreTimer - dt);
  game.magnetTimer = Math.max(0, game.magnetTimer - dt);

  const gravityForce = 1550;
  player.velocityY += player.gravityDirection * gravityForce * dt;
  player.y += player.velocityY * dt;

  player.rotation += (player.gravityDirection > 0 ? 1 : -1) * dt * 3;
  player.rotation = Math.max(-1.4, Math.min(1.4, player.rotation));

  if (player.gravityDirection > 0 && player.y + player.radius >= FLOOR_Y) {
    player.y = FLOOR_Y - player.radius;
    player.velocityY = 0;
  }

  if (player.gravityDirection < 0 && player.y - player.radius <= CEILING_Y) {
    player.y = CEILING_Y + player.radius;
    player.velocityY = 0;
  }

  game.spawnTimer -= dt;
  game.coinTimer -= dt;
  game.powerTimer -= dt;

  if (game.spawnTimer <= 0) {
    spawnObstacle();
    const minDelay = Math.max(0.7, 1.28 - game.elapsed * 0.012);
    game.spawnTimer = minDelay + Math.random() * 0.6;
  }

  if (game.coinTimer <= 0) {
    spawnCoinCluster();
    const minCoinDelay = Math.max(0.7, 1.4 - game.elapsed * 0.01);
    game.coinTimer = minCoinDelay + Math.random() * 0.8;
  }

  if (game.powerTimer <= 0) {
    spawnPowerUp();
    game.powerTimer = 12 + Math.random() * 8;
  }

  const worldSpeed = game.speed * (game.slowMotionTimer > 0 ? 0.55 : 1);

  for (let i = game.obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = game.obstacles[i];
    obstacle.x -= worldSpeed * dt;

    if (obstacle.moving) {
      obstacle.y = obstacle.baseY + Math.sin(game.elapsed * 2.6 + obstacle.phase) * obstacle.amplitude;
    }

    if (obstacle.x + obstacle.width < -10) {
      game.obstacles.splice(i, 1);
    }
  }

  for (let i = game.coinsArray.length - 1; i >= 0; i -= 1) {
    const coin = game.coinsArray[i];
    coin.x -= worldSpeed * dt;
    coin.pulse += dt * 10;

    if (game.magnetTimer > 0) {
      const dx = player.x - coin.x;
      const dy = player.y - coin.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 150) {
        coin.x += (dx / distance) * dt * 220;
        coin.y += (dy / distance) * dt * 220;
      }
    }

    if (coin.x < -10) {
      game.coinsArray.splice(i, 1);
    }
  }

  for (let i = game.powerUps.length - 1; i >= 0; i -= 1) {
    const powerUp = game.powerUps[i];
    powerUp.x -= worldSpeed * dt;
    powerUp.pulse += dt * 7;

    if (powerUp.x < -20) {
      game.powerUps.splice(i, 1);
    }
  }

  updateParticles(dt);
  detectCollisions();
  updateHud();
}

function updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i -= 1) {
    const particle = game.particles[i];
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 60 * dt;

    if (particle.life <= 0) {
      game.particles.splice(i, 1);
    }
  }
}

function detectCollisions() {
  const playerBox = {
    left: player.x - player.radius,
    right: player.x + player.radius,
    top: player.y - player.radius,
    bottom: player.y + player.radius,
  };

  for (let i = game.obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = game.obstacles[i];
    const box = {
      left: obstacle.x,
      right: obstacle.x + obstacle.width,
      top: obstacle.y,
      bottom: obstacle.y + obstacle.height,
    };

    const hit =
      playerBox.right > box.left &&
      playerBox.left < box.right &&
      playerBox.bottom > box.top &&
      playerBox.top < box.bottom;

    if (hit) {
      if (player.shield > 0) {
        player.shield -= 1;
        playSound("shield");
        game.cameraShake = 0.6;
        game.obstacles.splice(i, 1);
        continue;
      }

      endGame();
      return;
    }
  }

  for (let i = game.coinsArray.length - 1; i >= 0; i -= 1) {
    const coin = game.coinsArray[i];
    const distance = Math.hypot(player.x - coin.x, player.y - coin.y);

    if (distance < player.radius + coin.radius) {
      game.coinsArray.splice(i, 1);
      game.coins += 1;
      game.score += game.doubleScoreTimer > 0 ? 25 : 15;
      playSound("coin");
      spawnCoinBurst(coin.x, coin.y, "#ffd45a");
    }
  }

  for (let i = game.powerUps.length - 1; i >= 0; i -= 1) {
    const powerUp = game.powerUps[i];
    const distance = Math.hypot(player.x - powerUp.x, player.y - powerUp.y);

    if (distance < player.radius + powerUp.radius + 8) {
      game.powerUps.splice(i, 1);
      applyPowerUp(powerUp.type);
      playSound("power");
      spawnCoinBurst(powerUp.x, powerUp.y, effectStyles[powerUp.type]);
    }
  }
}

function applyPowerUp(type) {
  if (type === "shield") {
    player.shield = 1;
  } else if (type === "magnet") {
    game.magnetTimer = 6;
  } else if (type === "slow") {
    game.slowMotionTimer = 5;
  } else if (type === "double") {
    game.doubleScoreTimer = 6;
  }
}

function spawnCoinBurst(x, y, color) {
  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12;
    const speed = 50 + Math.random() * 90;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.5,
      color,
      size: 2 + Math.random() * 4,
    });
  }
}

function endGame() {
  game.state = "gameover";
  ui.finalScore.textContent = Math.floor(game.score);
  saveHighScore();
  ui.bestScore.textContent = Math.floor(game.highScore);
  setOverlayVisible(ui.gameOverOverlay, true);
  ui.pauseButton.disabled = true;
  playSound("hit");
}

function loop(timestamp) {
  if (!game.lastTime) {
    game.lastTime = timestamp;
  }

  const dt = Math.min((timestamp - game.lastTime) / 1000, 0.03);
  game.lastTime = timestamp;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  if (game.cameraShake > 0) {
    const shakeX = (Math.random() - 0.5) * 12 * game.cameraShake;
    const shakeY = (Math.random() - 0.5) * 12 * game.cameraShake;
    ctx.translate(shakeX, shakeY);
    game.cameraShake = Math.max(0, game.cameraShake - 0.02);
  }

  drawBackground();
  drawTracks();
  drawPowerUps();
  drawCoins();
  drawObstacles();
  drawParticles();
  drawPlayer();
  ctx.restore();
}

function drawBackground() {
  const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
  background.addColorStop(0, "#030b18");
  background.addColorStop(0.35, "#0a1630");
  background.addColorStop(1, "#0d1a2a");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const star of game.stars) {
    const x = ((star.x - game.elapsed * 18 * star.speed) % canvas.width + canvas.width) % canvas.width;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.fillRect(x, star.y, star.radius, star.radius);
  }

  for (const block of game.skyline) {
    const x = (block.x - (game.elapsed * 80) % 110) % (canvas.width + 120);
    const drawX = x < -block.width ? x + canvas.width + 120 : x;

    ctx.fillStyle = "rgba(22, 36, 59, 0.9)";
    ctx.fillRect(drawX, block.y, block.width, block.height);

    ctx.fillStyle = "rgba(87, 217, 255, 0.18)";
    ctx.fillRect(drawX + 10, block.y + 18, 7, block.height - 22);
    ctx.fillRect(drawX + 24, block.y + 32, 7, block.height - 42);

    ctx.fillStyle = block.glow;
    ctx.fillRect(drawX + block.width * 0.2, block.y + 12, 4, 12);
    ctx.fillRect(drawX + block.width * 0.56, block.y + 4, 4, 18);
  }
}

function drawTracks() {
  ctx.strokeStyle = "rgba(87, 217, 255, 0.5)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y + 2);
  ctx.lineTo(canvas.width, FLOOR_Y + 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, CEILING_Y - 2);
  ctx.lineTo(canvas.width, CEILING_Y - 2);
  ctx.stroke();

  const glowGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  glowGradient.addColorStop(0, "rgba(87,217,255,0)");
  glowGradient.addColorStop(0.5, "rgba(87,217,255,0.25)");
  glowGradient.addColorStop(1, "rgba(192,108,255,0)");

  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, FLOOR_Y - 4, canvas.width, 8);
  ctx.fillRect(0, CEILING_Y - 4, canvas.width, 8);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let x = 0; x < canvas.width; x += 32) {
    ctx.fillRect(x, FLOOR_Y + 10, 18, 2);
    ctx.fillRect(x, CEILING_Y - 12, 18, 2);
  }
}

function drawCoins() {
  for (const coin of game.coinsArray) {
    const pulse = 1 + Math.sin(coin.pulse) * 0.14;

    ctx.save();
    ctx.translate(coin.x, coin.y);
    ctx.scale(pulse, pulse);
    ctx.beginPath();
    ctx.fillStyle = "#ffd45a";
    ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.arc(-2, -2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPowerUps() {
  for (const powerUp of game.powerUps) {
    const pulse = 1 + Math.sin(powerUp.pulse) * 0.18;

    ctx.save();
    ctx.translate(powerUp.x, powerUp.y);
    ctx.scale(pulse, pulse);

    ctx.beginPath();
    ctx.fillStyle = effectStyles[powerUp.type];
    ctx.arc(0, 0, powerUp.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#09131d";
    ctx.font = "bold 12px Segoe UI";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(powerUp.type.charAt(0).toUpperCase(), 0, 1);
    ctx.restore();
  }
}

function drawObstacles() {
  for (const obstacle of game.obstacles) {
    if (obstacle.type === "drone") {
      ctx.save();
      ctx.translate(obstacle.x, obstacle.y);
      ctx.fillStyle = "rgba(255, 124, 160, 0.25)";
      ctx.fillRect(-16, -10, obstacle.width + 32, obstacle.height + 20);

      ctx.fillStyle = "#ff4d75";
      ctx.fillRect(0, 0, obstacle.width, obstacle.height);

      ctx.fillStyle = "#ffc7d8";
      ctx.fillRect(8, 10, obstacle.width - 16, 8);
      ctx.restore();
      continue;
    }

    ctx.save();
    ctx.fillStyle = "#ff4d75";
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
    ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of game.particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(particle.life, 0);
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }

  ctx.globalAlpha = 1;
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.gravityDirection < 0 ? Math.PI : 0);

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.beginPath();
  ctx.ellipse(0, player.radius + 12, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const runPhase = Math.sin(game.elapsed * 14) * 5;

  ctx.strokeStyle = "#57d9ff";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-7, 10);
  ctx.lineTo(-12, 28 + runPhase);
  ctx.moveTo(7, 10);
  ctx.lineTo(12, 28 - runPhase);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(-14, -10);
  ctx.moveTo(5, 0);
  ctx.lineTo(14, -10);
  ctx.stroke();

  ctx.fillStyle = player.gravityDirection > 0 ? "#57d9ff" : "#ff63d8";
  ctx.beginPath();
  ctx.roundRect(-18, -18, 36, 28, 12);
  ctx.fill();

  ctx.fillStyle = "#dff8ff";
  ctx.beginPath();
  ctx.arc(0, -24, 11, 0, Math.PI * 2);
  ctx.fill();

  if (player.shield > 0) {
    ctx.strokeStyle = "rgba(62,247,195,0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function initAudio() {
  if (!audio.ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    audio.ctx = new AudioContextClass();
  }

  if (audio.ctx.state === "suspended") {
    audio.ctx.resume();
  }
}

function playTone(freq, duration, type = "square", volume = 0.04, slideTo = null) {
  if (!audio.ctx || !audio.soundEnabled) {
    return;
  }

  const now = audio.ctx.currentTime;
  const oscillator = audio.ctx.createOscillator();
  const gainNode = audio.ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, now);

  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  }

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audio.ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}

function playSound(type) {
  if (!audio.soundEnabled) {
    return;
  }

  initAudio();

  if (type === "flip") {
    playTone(240, 0.12, "square", 0.05, 90);
  } else if (type === "coin") {
    playTone(900, 0.08, "triangle", 0.06, 1050);
  } else if (type === "power") {
    playTone(600, 0.14, "sawtooth", 0.05, 760);
  } else if (type === "shield") {
    playTone(420, 0.16, "triangle", 0.04, 550);
  } else if (type === "hit") {
    playTone(140, 0.35, "square", 0.08, 80);
  }
}

function startMusic() {
  if (!audio.musicEnabled || !audio.soundEnabled) {
    return;
  }

  initAudio();
  if (audio.musicTimer) {
    clearInterval(audio.musicTimer);
  }

  const melody = [220, 277, 330, 277, 196, 247, 294, 247];
  audio.musicTimer = setInterval(() => {
    if (game.state !== "playing") {
      return;
    }

    const tone = melody[audio.musicStep % melody.length];
    playTone(tone, 0.18, "sawtooth", 0.018, tone * 1.03);
    audio.musicStep += 1;
  }, 260);
}

function stopMusic() {
  if (audio.musicTimer) {
    clearInterval(audio.musicTimer);
    audio.musicTimer = null;
  }
}

function toggleMusic() {
  audio.musicEnabled = !audio.musicEnabled;
  ui.musicToggle.textContent = `Music: ${audio.musicEnabled ? "On" : "Off"}`;

  if (audio.musicEnabled) {
    startMusic();
  } else {
    stopMusic();
  }
}

function toggleSound() {
  audio.soundEnabled = !audio.soundEnabled;
  ui.soundToggle.textContent = `Sound: ${audio.soundEnabled ? "On" : "Off"}`;

  if (!audio.soundEnabled) {
    stopMusic();
  } else {
    startMusic();
  }
}

function handleKeyDown(event) {
  if (event.code === "Space") {
    event.preventDefault();
    handleFlip();
  }

  if (event.key.toLowerCase() === "p") {
    togglePause();
  }

  if (event.key.toLowerCase() === "r" && game.state === "gameover") {
    startCountdown();
  }
}

ui.playButton.addEventListener("click", startCountdown);
ui.restartButton.addEventListener("click", startCountdown);
ui.resumeButton.addEventListener("click", resumeGame);
ui.pauseButton.addEventListener("click", togglePause);
ui.flipButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  handleFlip();
});
canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  handleFlip();
});
ui.soundToggle.addEventListener("click", toggleSound);
ui.musicToggle.addEventListener("click", toggleMusic);
window.addEventListener("keydown", handleKeyDown);

buildBackdrop();
showStartScreen();
updateHud();
requestAnimationFrame(loop);
