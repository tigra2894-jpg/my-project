/**
 * CyberPulse 2026 - iOS 26 Test Edition
 * Motor de joc optimizat pentru ecrane tactile și performanță 60/120 FPS
 */

(function () {
  'use strict';

  // --- Sistem Audio Sintetizat (Web Audio API) ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playPickup() {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }

    playShield() {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.25);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }

    playCrash() {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  }

  // --- Elemente DOM ---
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const scoreDisplay = document.getElementById('score-display');
  const bestScoreDisplay = document.getElementById('best-score-display');
  const boostDisplay = document.getElementById('boost-display');
  const islandText = document.getElementById('island-text');
  const dynamicIsland = document.getElementById('dynamic-island');
  const startOverlay = document.getElementById('start-overlay');
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const shieldBtn = document.getElementById('shield-btn');
  const finalScoreEl = document.getElementById('final-score');
  const finalDistanceEl = document.getElementById('final-distance');
  const finalBestEl = document.getElementById('final-best');

  // --- Stare Joc ---
  const sound = new SoundEngine();
  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  let isPlaying = false;
  let score = 0;
  let distance = 0;
  let speed = 7;
  let baseSpeed = 7;
  let bestScore = parseInt(localStorage.getItem('cyberpulse_best') || '0', 10);
  bestScoreDisplay.textContent = bestScore;

  // Nava Jucătorului
  const player = {
    x: width / 2,
    y: height - 140,
    targetX: width / 2,
    width: 36,
    height: 48,
    speed: 0.22,
    shieldActive: false,
    shieldTimer: 0,
    shieldCooldown: 0,
    tilt: 0,
    trail: []
  };

  // Colectabile & Obstacole & Particule
  let obstacles = [];
  let pickups = [];
  let particles = [];
  let stars = [];
  let spawnTimer = 0;
  let lastTime = 0;

  // Feedback Haptic (iPhone / Dispozitive mobile)
  function triggerHaptic(type = 'light') {
    if (navigator.vibrate) {
      if (type === 'light') navigator.vibrate(12);
      else if (type === 'medium') navigator.vibrate(28);
      else if (type === 'heavy') navigator.vibrate([40, 30, 60]);
    }
  }

  // Notificări Dynamic Island
  let islandResetTimeout = null;
  function updateDynamicIsland(text, duration = 2000, isAlert = false) {
    islandText.textContent = text;
    dynamicIsland.classList.add('expanded');
    if (isAlert) {
      dynamicIsland.style.borderColor = '#ff007f';
    } else {
      dynamicIsland.style.borderColor = '#00f2fe';
    }

    clearTimeout(islandResetTimeout);
    islandResetTimeout = setTimeout(() => {
      dynamicIsland.classList.remove('expanded');
      islandText.textContent = 'iOS 26 ENGINE ACTIVE';
      dynamicIsland.style.borderColor = 'rgba(255, 255, 255, 0.14)';
    }, duration);
  }

  // Redimensionare Responsive la scară Retina
  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    player.y = height - Math.max(130, height * 0.18);
    initStars();
  }

  // Fundal Stelar Cuantic
  function initStars() {
    stars = [];
    const numStars = 65;
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.6,
        speed: Math.random() * 3 + 1,
        color: Math.random() > 0.4 ? '#00f2fe' : '#ffffff'
      });
    }
  }

  // Activare Scut
  function activateShield() {
    if (!isPlaying) return;
    if (player.shieldCooldown > 0 || player.shieldActive) return;

    sound.playShield();
    triggerHaptic('medium');
    player.shieldActive = true;
    player.shieldTimer = 220; // ~3.6 secunde
    player.shieldCooldown = 400; // timp de reîncărcare

    shieldBtn.classList.add('cooldown');
    updateDynamicIsland('SHIELD PROTECT ONLINE', 2500);

    // Creare explozie de particule de scut
    createParticleBurst(player.x, player.y, '#00f2fe', 24);
  }

  // Creare particule
  function createParticleBurst(x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speedVal = Math.random() * 5 + 2;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speedVal,
        vy: Math.sin(angle) * speedVal,
        size: Math.random() * 3.5 + 1.5,
        alpha: 1,
        color: color
      });
    }
  }

  // Adăugare obstacol nou
  function spawnObstacle() {
    const minX = 40;
    const maxX = width - 40;
    const obsWidth = Math.floor(Math.random() * 50) + 40;
    const obsX = Math.random() * (maxX - minX - obsWidth) + minX;
    const isSpecial = Math.random() > 0.75;

    obstacles.push({
      x: obsX,
      y: -50,
      width: obsWidth,
      height: 22,
      isSpecial: isSpecial,
      pulse: 0
    });
  }

  // Adăugare cristal de energie
  function spawnPickup() {
    const minX = 40;
    const maxX = width - 40;
    pickups.push({
      x: Math.random() * (maxX - minX) + minX,
      y: -30,
      radius: 12,
      rot: 0
    });
  }

  // Start Joc
  function startGame() {
    sound.init();
    isPlaying = true;
    score = 0;
    distance = 0;
    speed = baseSpeed;
    player.x = width / 2;
    player.targetX = width / 2;
    player.shieldActive = false;
    player.shieldTimer = 0;
    player.shieldCooldown = 0;
    player.trail = [];
    obstacles = [];
    pickups = [];
    particles = [];

    scoreDisplay.textContent = '0';
    boostDisplay.textContent = '100%';
    shieldBtn.classList.remove('cooldown');

    startOverlay.classList.remove('active');
    gameoverOverlay.classList.remove('active');

    updateDynamicIsland('CURSĂ ACTIVATĂ', 1500);
    triggerHaptic('light');
  }

  // Game Over
  function gameOver() {
    isPlaying = false;
    sound.playCrash();
    triggerHaptic('heavy');

    createParticleBurst(player.x, player.y, '#ff007f', 40);
    createParticleBurst(player.x, player.y, '#00f2fe', 25);

    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('cyberpulse_best', bestScore.toString());
      bestScoreDisplay.textContent = bestScore;
      updateDynamicIsland('RECORD NOU ATINS!', 3000, true);
    } else {
      updateDynamicIsland('SIMULARE ÎNCHEIATĂ', 2500, true);
    }

    finalScoreEl.textContent = score;
    finalDistanceEl.textContent = `${Math.floor(distance)} m`;
    finalBestEl.textContent = bestScore;

    setTimeout(() => {
      gameoverOverlay.classList.add('active');
    }, 450);
  }

  // Loop-ul principal de actualizare și randare
  function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000 || 0.016;
    lastTime = timestamp;

    ctx.clearRect(0, 0, width, height);

    // 1. Randare fundal grid perspectivă neon
    drawNeonGrid();

    // 2. Randare particule stelare
    drawStars();

    if (isPlaying) {
      // Progres distanță și dificultate
      distance += speed * 0.12;
      speed = baseSpeed + Math.min(distance * 0.0035, 9);
      score += Math.floor(speed * 0.1);
      scoreDisplay.textContent = score;

      // Scut timer & cooldown
      if (player.shieldActive) {
        player.shieldTimer--;
        boostDisplay.textContent = `${Math.ceil((player.shieldTimer / 220) * 100)}%`;
        if (player.shieldTimer <= 0) {
          player.shieldActive = false;
          boostDisplay.textContent = 'REÎNCĂRCARE';
        }
      } else if (player.shieldCooldown > 0) {
        player.shieldCooldown--;
        if (player.shieldCooldown === 0) {
          shieldBtn.classList.remove('cooldown');
          boostDisplay.textContent = 'GATA';
          updateDynamicIsland('SCUT DISPONIBIL', 1200);
        }
      }

      // Deplasare fluidă jucător
      const dx = player.targetX - player.x;
      player.x += dx * player.speed;
      player.tilt = (dx / (width * 0.35)) * 0.4;

      // Urmă particule nava
      if (Math.random() > 0.3) {
        player.trail.push({
          x: player.x,
          y: player.y + player.height / 2,
          alpha: 0.9,
          size: Math.random() * 5 + 3
        });
      }

      // Generare obstacole și cristale
      spawnTimer++;
      if (spawnTimer % Math.max(38, Math.floor(75 - speed * 2.5)) === 0) {
        spawnObstacle();
      }
      if (spawnTimer % 65 === 0) {
        spawnPickup();
      }

      // Actualizare obstacole
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.y += speed;
        obs.pulse += 0.06;

        // Verificare coliziune cu jucătorul
        const pLeft = player.x - player.width / 2;
        const pRight = player.x + player.width / 2;
        const pTop = player.y - player.height / 2;
        const pBottom = player.y + player.height / 2;

        if (
          pRight > obs.x &&
          pLeft < obs.x + obs.width &&
          pBottom > obs.y &&
          pTop < obs.y + obs.height
        ) {
          if (player.shieldActive) {
            // Distrugere obstacol cu scut
            player.shieldActive = false;
            createParticleBurst(obs.x + obs.width / 2, obs.y + obs.height / 2, '#00f2fe', 20);
            sound.playPickup();
            triggerHaptic('medium');
            obstacles.splice(i, 1);
            updateDynamicIsland('OBSTACOL NEUTRALIZAT', 1500);
            continue;
          } else {
            gameOver();
            break;
          }
        }

        // Ștergere când iese din ecran
        if (obs.y > height + 50) {
          obstacles.splice(i, 1);
        }
      }

      // Actualizare cristale energie
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        p.y += speed * 0.88;
        p.rot += 0.04;

        // Verificare colectare
        const distToPlayer = Math.hypot(p.x - player.x, p.y - player.y);
        if (distToPlayer < p.radius + player.width / 2) {
          sound.playPickup();
          triggerHaptic('light');
          score += 150;
          createParticleBurst(p.x, p.y, '#ffbe0b', 16);
          updateDynamicIsland('+150 ENERGIE QUANTUM', 1200);
          pickups.splice(i, 1);
          continue;
        }

        if (p.y > height + 40) {
          pickups.splice(i, 1);
        }
      }
    }

    // Randare particule trail
    drawPlayerTrail();

    // Randare obstacole
    drawObstacles();

    // Randare cristale de energie
    drawPickups();

    // Randare particule explozii
    drawParticles();

    // Randare Nava
    if (isPlaying) {
      drawPlayer();
    }

    requestAnimationFrame(gameLoop);
  }

  // Desenare Grid Neon
  let gridOffset = 0;
  function drawNeonGrid() {
    gridOffset = (gridOffset + (isPlaying ? speed * 0.6 : 1.2)) % 40;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.09)';
    ctx.lineWidth = 1;

    // Linii verticale
    const cols = 12;
    for (let i = 0; i <= cols; i++) {
      const x = (width / cols) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Linii orizontale în mișcare
    for (let y = gridOffset; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Desenare Stele
  function drawStars() {
    ctx.save();
    for (const star of stars) {
      star.y += isPlaying ? star.speed * (speed * 0.2) : star.speed * 0.5;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Desenare Urmă Nava
  function drawPlayerTrail() {
    ctx.save();
    for (let i = player.trail.length - 1; i >= 0; i--) {
      const t = player.trail[i];
      t.y += 2.5;
      t.alpha -= 0.04;
      if (t.alpha <= 0) {
        player.trail.splice(i, 1);
        continue;
      }
      ctx.fillStyle = `rgba(0, 242, 254, ${t.alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Desenare Nava Jucătorului
  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.tilt);

    // Strălucire scut dacă este activ
    if (player.shieldActive) {
      ctx.beginPath();
      ctx.arc(0, 0, 36 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 242, 254, 0.18)';
      ctx.fill();
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 15;
      ctx.stroke();
    }

    // Corpul navei (Cyber Dart)
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 16;

    ctx.beginPath();
    ctx.moveTo(0, -player.height / 2);
    ctx.lineTo(player.width / 2, player.height / 2);
    ctx.lineTo(0, player.height / 2 - 10);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.fill();

    // Nucleul de propulsie
    ctx.fillStyle = '#00f2fe';
    ctx.beginPath();
    ctx.moveTo(0, -player.height / 4);
    ctx.lineTo(player.width / 4, player.height / 2 - 5);
    ctx.lineTo(0, player.height / 2 - 12);
    ctx.lineTo(-player.width / 4, player.height / 2 - 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Desenare Obstacole
  function drawObstacles() {
    ctx.save();
    for (const obs of obstacles) {
      const glow = Math.sin(obs.pulse) * 4 + 8;
      ctx.shadowBlur = glow;
      ctx.shadowColor = obs.isSpecial ? '#ff007f' : '#ff4444';
      ctx.fillStyle = obs.isSpecial ? '#ff007f' : '#ef4444';

      // Desenare barieră cu margini rotunjite
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 6);
      ctx.fill();

      // Linie interioară luminoasă
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(obs.x + 6, obs.y + obs.height / 2);
      ctx.lineTo(obs.x + obs.width - 6, obs.y + obs.height / 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Desenare Cristale Colectabile
  function drawPickups() {
    ctx.save();
    for (const p of pickups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      ctx.shadowColor = '#ffbe0b';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffbe0b';

      // Romb / Diamant cuantic
      ctx.beginPath();
      ctx.moveTo(0, -p.radius);
      ctx.lineTo(p.radius, 0);
      ctx.lineTo(0, p.radius);
      ctx.lineTo(-p.radius, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }

  // Desenare Particule
  function drawParticles() {
    ctx.save();
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= 0.025;

      if (pt.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- Gestionare Evenimente Tactile & Control ---
  let lastTapTime = 0;

  function handleTouchMove(clientX) {
    if (!isPlaying) return;
    const clampedX = Math.max(player.width / 2 + 10, Math.min(width - player.width / 2 - 10, clientX));
    player.targetX = clampedX;
  }

  // Touch pe Canvas
  canvas.addEventListener('touchstart', (e) => {
    sound.init();
    const touch = e.touches[0];
    handleTouchMove(touch.clientX);

    // Detectare dublu-tap pentru scut
    const now = Date.now();
    if (now - lastTapTime < 280) {
      activateShield();
    }
    lastTapTime = now;
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    handleTouchMove(touch.clientX);
  }, { passive: true });

  // Mouse pentru testare pe desktop
  let isMouseDown = false;
  window.addEventListener('mousedown', (e) => {
    sound.init();
    isMouseDown = true;
    handleTouchMove(e.clientX);
  });

  window.addEventListener('mousemove', (e) => {
    if (isMouseDown) {
      handleTouchMove(e.clientX);
    }
  });

  window.addEventListener('mouseup', () => {
    isMouseDown = false;
  });

  // Taste stânga/dreapta/spațiu
  window.addEventListener('keydown', (e) => {
    sound.init();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      player.targetX = Math.max(40, player.targetX - 35);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      player.targetX = Math.min(width - 40, player.targetX + 35);
    } else if (e.code === 'Space') {
      activateShield();
    }
  });

  // Butoane UI
  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  shieldBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    activateShield();
  });

  // Inițializare & Resize listener
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 150);
  });

  resizeCanvas();
  requestAnimationFrame(gameLoop);
})();
