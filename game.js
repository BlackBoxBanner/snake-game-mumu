(() => {
  "use strict";

  const GRID = 20;
  const BASE_TICK_MS = 220;
  const MIN_TICK_MS = 63;
  const SPEEDUP_PER_FOOD = 4;
  const DEFAULT_APPLE_TARGET = 3;

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("high-score");
  const coinBalanceEl = document.getElementById("coin-balance");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const playBtn = document.getElementById("play-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const themeBtn = document.getElementById("theme-btn");
  const langBtn = document.getElementById("lang-btn");
  const shopBtn = document.getElementById("shop-btn");
  const shopModal = document.getElementById("shop-modal");
  const shopBackdrop = document.getElementById("shop-backdrop");
  const shopCloseBtn = document.getElementById("shop-close-btn");
  const shopItemsEl = document.getElementById("shop-items");
  const shopCoinBalanceEl = document.getElementById("shop-coin-balance");
  const boostBadgesEl = document.getElementById("boost-badges");
  const shrinkBtn = document.getElementById("shrink-btn");

  const faceImg = new Image();
  faceImg.src = "assets/snake-face.png";

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let boardSize = 480;
  let CELL = boardSize / GRID;

  function resizeCanvas() {
    const size = canvas.clientWidth || boardSize;
    boardSize = size;
    CELL = size / GRID;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (snake) render(performance.now());
  }

  new ResizeObserver(resizeCanvas).observe(canvas);

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const LANG_KEY = "mumu-lang";

  const I18N = {
    en: {
      scoreNow: "now",
      scoreBest: "best",
      scoreCoins: "coins",
      coinsWord: "coins",
      overlayTitleIdle: "Hungry?",
      overlayTextIdle: "Arrows, WASD, or a swipe. Don't bite yourself.",
      overlayTextMobile: "Swipe the board or tap the arrows.",
      playGo: "Go",
      auto: "Auto",
      stop: "Stop",
      shop: "Shop",
      shrink: "Shrink",
      shrinkCount: "Shrink ({n})",
      hint: "arrows / wasd to slither · space to pause",
      source: "</> source",
      sourceTitle: "Source",
      copy: "Copy",
      buy: "Buy",
      owned: "Owned: {n}",
      again: "Again",
      back: "Back",
      overlayAiRun: "AI run.",
      overlayAiRunText: "{score} on autopilot — doesn't count toward Best.",
      overlayNewBest: "New best.",
      overlayNewBestText: "{score} — keep going.",
      overlayOuch: "Ouch.",
      overlayOuchText: "{score} this time. Best is {best}.",
      overlayStuffed: "Stuffed.",
      overlayStuffedAi: "Mumu played itself. Score not saved.",
      overlayStuffedWin: "The whole board. {score} points.",
      overlayPause: "Hold on.",
      overlayPauseText: "Mumu is waiting.",
      shop_slow_start_name: "Slow-mo",
      shop_slow_start_desc: "Snake moves 35% slower for one run.",
      shop_revive_name: "Extra life",
      shop_revive_desc: "Revive once after crashing.",
      shop_shrink_name: "Shrink potion",
      shop_shrink_desc: "Halve snake length mid-run (press X).",
      shop_score_boost_name: "2× score",
      shop_score_boost_desc: "Apples worth double for one run.",
      shop_magnet_name: "Coin magnet",
      shop_magnet_desc: "Coins spawn more often for one run.",
      shop_ghost_walls_name: "Ghost walls",
      shop_ghost_walls_desc: "Wrap through walls for one run.",
      shop_more_apples_name: "More apples",
      shop_more_apples_desc: "5 apples on the board for one run.",
      boost_slow_start: "Slow-mo",
      boost_revive: "Extra life",
      boost_shrink: "Shrink",
      boost_score_boost: "2× score",
      boost_magnet: "Magnet",
      boost_ghost_walls: "Ghost walls",
      boost_more_apples: "More apples",
      ariaThemeDark: "Switch to dark mode",
      ariaThemeLight: "Switch to light mode",
      ariaLangTh: "Switch to Thai",
      ariaLangEn: "Switch to English",
      ariaPause: "Pause",
      ariaResume: "Resume",
      ariaMoveUp: "Move up",
      ariaMoveDown: "Move down",
      ariaMoveLeft: "Move left",
      ariaMoveRight: "Move right",
      ariaClose: "Close",
      ariaDpad: "Direction controls",
      ariaBoosts: "Boosts for next run",
      ariaShrinkPotion: "Use shrink potion",
      ariaSourceFiles: "Source files",
    },
    th: {
      scoreNow: "ตอนนี้",
      scoreBest: "สูงสุด",
      scoreCoins: "เหรียญ",
      coinsWord: "เหรียญ",
      overlayTitleIdle: "หิวมั้ย?",
      overlayTextIdle: "ลูกศร, WASD หรือปัดนิ้ว อย่าไปกัดตัวเองนะ",
      overlayTextMobile: "ปัดบนกระดานหรือแตะลูกศร",
      playGo: "ไปเลย",
      auto: "ออโต้",
      stop: "หยุด",
      shop: "ร้านค้า",
      shrink: "ย่อ",
      shrinkCount: "ย่อ ({n})",
      hint: "ลูกศร / wasd เลื้อย · เว้นวรรค หยุดชั่วคราว",
      source: "</> โค้ด",
      sourceTitle: "โค้ด",
      copy: "คัดลอก",
      buy: "ซื้อ",
      owned: "มี: {n}",
      again: "อีกครั้ง",
      back: "กลับ",
      overlayAiRun: "เล่นออโต้.",
      overlayAiRunText: "{score} แบบออโต้ — ไม่นับเป็นสูงสุด",
      overlayNewBest: "สูงสุดใหม่!",
      overlayNewBestText: "{score} — ไปต่อเลย",
      overlayOuch: "โอ๊ย.",
      overlayOuchText: "ครั้งนี้ {score} สูงสุดคือ {best}",
      overlayStuffed: "อิ่มแล้ว.",
      overlayStuffedAi: "Mumu เล่นเอง คะแนนไม่บันทึก",
      overlayStuffedWin: "เต็มกระดาน {score} คะแนน",
      overlayPause: "เดี๋ยวก่อน.",
      overlayPauseText: "Mumu รออยู่",
      shop_slow_start_name: "สโลว์โม",
      shop_slow_start_desc: "งูเคลื่อนช้าลง 35% ต่อรอบ",
      shop_revive_name: "ชีวิตพิเศษ",
      shop_revive_desc: "ฟื้นคืนชีพได้ครั้งเดียวหลังชน",
      shop_shrink_name: "ยาเล็ก",
      shop_shrink_desc: "ลดความยาวงูครึ่งหนึ่งระหว่างเล่น (กด X)",
      shop_score_boost_name: "คะแนน x2",
      shop_score_boost_desc: "แอปเปิ้ลได้คะแนนสองเท่าต่อรอบ",
      shop_magnet_name: "แม่เหล็กดูดเหรียญ",
      shop_magnet_desc: "เหรียญโผล่บ่อยขึ้นต่อรอบ",
      shop_ghost_walls_name: "กำแพงผี",
      shop_ghost_walls_desc: "ทะลุกำแพงได้ต่อรอบ",
      shop_more_apples_name: "แอปเปิ้ลเพิ่ม",
      shop_more_apples_desc: "มี 5 แอปเปิ้ลบนกระดานต่อรอบ",
      boost_slow_start: "สโลว์โม",
      boost_revive: "ชีวิตพิเศษ",
      boost_shrink: "ย่อ",
      boost_score_boost: "x2",
      boost_magnet: "แม่เหล็ก",
      boost_ghost_walls: "กำแพงผี",
      boost_more_apples: "แอปเปิ้ล+",
      ariaThemeDark: "เปลี่ยนเป็นโหมดมืด",
      ariaThemeLight: "เปลี่ยนเป็นโหมดสว่าง",
      ariaLangTh: "เปลี่ยนเป็นภาษาไทย",
      ariaLangEn: "Switch to English",
      ariaPause: "หยุดชั่วคราว",
      ariaResume: "เล่นต่อ",
      ariaMoveUp: "เลื่อนขึ้น",
      ariaMoveDown: "เลื่อนลง",
      ariaMoveLeft: "เลื่อนซ้าย",
      ariaMoveRight: "เลื่อนขวา",
      ariaClose: "ปิด",
      ariaDpad: "ปุ่มควบคุมทิศทาง",
      ariaBoosts: "บูสต์สำหรับรอบถัดไป",
      ariaShrinkPotion: "ใช้ยาเล็ก",
      ariaSourceFiles: "ไฟล์โค้ด",
    },
  };

  let currentLang = "en";
  let overlayState = null;
  let idleOverlayMobile = false;

  function detectLang() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "th" || saved === "en") return saved;
    } catch (e) {}
    return navigator.language &&
      navigator.language.toLowerCase().startsWith("th")
      ? "th"
      : "en";
  }

  function t(key, vars = {}) {
    let str = I18N[currentLang][key] ?? I18N.en[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
    return str;
  }

  function boostLabel(id) {
    return t(`boost_${id}`);
  }

  function shopItemName(id) {
    return t(`shop_${id}_name`);
  }

  function shopItemDesc(id) {
    return t(`shop_${id}_desc`);
  }

  function idleOverlayKeys() {
    return {
      titleKey: "overlayTitleIdle",
      textKey: idleOverlayMobile ? "overlayTextMobile" : "overlayTextIdle",
      btnKey: "playGo",
    };
  }

  function refreshOverlay() {
    if (!overlayState) return;
    overlayTitle.textContent = t(overlayState.titleKey, overlayState.vars);
    overlayText.textContent = t(overlayState.textKey, overlayState.vars);
    playBtn.textContent = t(overlayState.btnKey);
  }

  function applyStaticI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
  }

  function applyAriaI18n() {
    const dark = currentTheme() === "dark";
    themeBtn.setAttribute(
      "aria-label",
      t(dark ? "ariaThemeLight" : "ariaThemeDark"),
    );
    langBtn.setAttribute(
      "aria-label",
      t(currentLang === "en" ? "ariaLangTh" : "ariaLangEn"),
    );
    langBtn.textContent = currentLang === "en" ? "ไทย" : "EN";
    pauseBtn.setAttribute(
      "aria-label",
      t(state === "paused" ? "ariaResume" : "ariaPause"),
    );
    shrinkBtn.setAttribute("aria-label", t("ariaShrinkPotion"));
    document.getElementById("dpad").setAttribute("aria-label", t("ariaDpad"));
    boostBadgesEl.setAttribute("aria-label", t("ariaBoosts"));
    shopCloseBtn.setAttribute("aria-label", t("ariaClose"));
    document
      .getElementById("source-close-btn")
      .setAttribute("aria-label", t("ariaClose"));
    document
      .querySelector(".source-tabs")
      .setAttribute("aria-label", t("ariaSourceFiles"));
    const dirLabels = {
      up: "ariaMoveUp",
      down: "ariaMoveDown",
      left: "ariaMoveLeft",
      right: "ariaMoveRight",
    };
    document.querySelectorAll(".dpad-btn[data-dir]").forEach((btn) => {
      btn.setAttribute("aria-label", t(dirLabels[btn.dataset.dir]));
    });
  }

  function applyLanguage(lang) {
    currentLang = lang === "th" ? "th" : "en";
    document.documentElement.lang = currentLang;
    document.documentElement.dataset.lang = currentLang;
    applyStaticI18n();
    applyAriaI18n();
    setAutoPlay(autoPlayEnabled);
    updateShrinkBtn();
    updateBoostBadges();
    if (!shopModal.hidden) renderShop();
    if (overlay.classList.contains("visible")) refreshOverlay();
    else if (state === "idle") {
      overlayState = idleOverlayKeys();
      refreshOverlay();
    }
  }

  // --- Tamper-resistant storage ---

  const WALLET_SALT = "mumu-snake-v1";
  const COINS_KEY = "mumu-coins";
  const INVENTORY_KEY = "mumu-inventory";

  function hashValue(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    return (h >>> 0).toString(36);
  }

  function saveSecure(key, value) {
    const payload = { v: value, h: hashValue(`${WALLET_SALT}:${value}`) };
    localStorage.setItem(key, btoa(JSON.stringify(payload)));
  }

  function loadSecure(key, defaultVal = 0) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultVal;
      const payload = JSON.parse(atob(raw));
      if (!payload || payload.h !== hashValue(`${WALLET_SALT}:${payload.v}`)) {
        return defaultVal;
      }
      const n = Number(payload.v);
      return Number.isFinite(n) && n >= 0 ? n : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  function saveSecureObject(key, obj) {
    const json = JSON.stringify(obj);
    const payload = { v: btoa(json), h: hashValue(`${WALLET_SALT}:${json}`) };
    localStorage.setItem(key, btoa(JSON.stringify(payload)));
  }

  function loadSecureObject(key, defaultObj) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { ...defaultObj };
      const payload = JSON.parse(atob(raw));
      const json = atob(payload.v);
      if (payload.h !== hashValue(`${WALLET_SALT}:${json}`)) {
        return { ...defaultObj };
      }
      return { ...defaultObj, ...JSON.parse(json) };
    } catch {
      return { ...defaultObj };
    }
  }

  const DEFAULT_INVENTORY = {
    slow_start: 0,
    revive: 0,
    shrink: 0,
    score_boost: 0,
    magnet: 0,
    ghost_walls: 0,
    more_apples: 0,
  };

  const SHOP_ITEMS = [
    { id: "slow_start", price: 20 },
    { id: "revive", price: 35 },
    { id: "shrink", price: 25 },
    { id: "score_boost", price: 30 },
    { id: "magnet", price: 18 },
    { id: "ghost_walls", price: 45 },
    { id: "more_apples", price: 22 },
  ];

  let coins = loadSecure(COINS_KEY, 0);
  let inventory = loadSecureObject(INVENTORY_KEY, DEFAULT_INVENTORY);

  function saveCoins() {
    saveSecure(COINS_KEY, coins);
    updateCoinUI();
  }

  function saveInventory() {
    saveSecureObject(INVENTORY_KEY, inventory);
    updateBoostBadges();
    updateShrinkBtn();
    renderShop();
  }

  function addCoins(n) {
    coins += n;
    saveCoins();
  }

  function updateCoinUI() {
    coinBalanceEl.textContent = coins;
    if (shopCoinBalanceEl) shopCoinBalanceEl.textContent = coins;
  }

  // --- Game state ---

  let snake,
    dir,
    dirQueue,
    foods,
    coin,
    coinNextSpawnAt,
    score,
    tickMs,
    state,
    lastTick,
    aiAssisted,
    run;
  let highScore = Number(localStorage.getItem("snake-high-score")) || 0;
  highScoreEl.textContent = highScore;
  updateCoinUI();

  function defaultRun() {
    return {
      speedFactor: 1,
      revives: 0,
      scorePerApple: 1,
      coinBoost: false,
      ghostWalls: false,
      appleTarget: DEFAULT_APPLE_TARGET,
    };
  }

  function occupiedCells() {
    const set = new Set();
    for (const s of snake) set.add(`${s.x},${s.y}`);
    for (const f of foods) set.add(`${f.x},${f.y}`);
    if (coin) set.add(`${coin.x},${coin.y}`);
    return set;
  }

  function freeCells() {
    const occ = occupiedCells();
    const free = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!occ.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    return free;
  }

  function spawnApples() {
    const target = run ? run.appleTarget : DEFAULT_APPLE_TARGET;
    const free = freeCells();
    while (foods.length < target && free.length) {
      const idx = Math.floor(Math.random() * free.length);
      foods.push(free.splice(idx, 1)[0]);
    }
  }

  function scheduleNextCoin(fromTime) {
    const min = run.coinBoost ? 5000 : 10000;
    const max = run.coinBoost ? 8000 : 16000;
    coinNextSpawnAt = fromTime + min + Math.random() * (max - min);
  }

  function spawnCoin() {
    const free = freeCells();
    if (!free.length) {
      scheduleNextCoin(performance.now());
      return;
    }
    const cell = free[Math.floor(Math.random() * free.length)];
    const now = performance.now();
    const lifetime = run.coinBoost ? 9000 : 6000;
    coin = {
      x: cell.x,
      y: cell.y,
      spawnAt: now,
      expiresAt: now + lifetime,
    };
  }

  function updateCoinTimers(time) {
    if (state !== "playing" || aiAssisted) return;
    if (coin) {
      if (time >= coin.expiresAt) {
        coin = null;
        scheduleNextCoin(time);
      }
    } else if (coinNextSpawnAt && time >= coinNextSpawnAt) {
      spawnCoin();
      coinNextSpawnAt = null;
    }
  }

  function applyRunBoosts() {
    run = defaultRun();
    if (aiAssisted) return;

    const consume = (key, apply) => {
      if (inventory[key] > 0) {
        inventory[key]--;
        apply();
      }
    };

    consume("slow_start", () => {
      run.speedFactor = 0.65;
    });
    consume("revive", () => {
      run.revives = 1;
    });
    consume("score_boost", () => {
      run.scorePerApple = 2;
    });
    consume("magnet", () => {
      run.coinBoost = true;
    });
    consume("ghost_walls", () => {
      run.ghostWalls = true;
    });
    consume("more_apples", () => {
      run.appleTarget = 5;
    });

    saveInventory();
  }

  function computeTickMs() {
    const base = Math.max(MIN_TICK_MS, BASE_TICK_MS - score * SPEEDUP_PER_FOOD);
    return base / run.speedFactor;
  }

  function reset() {
    const mid = Math.floor(GRID / 2);
    snake = [
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
      { x: mid - 3, y: mid },
    ];
    dir = DIRS.right;
    dirQueue = [];
    score = 0;
    foods = [];
    coin = null;
    coinNextSpawnAt = null;
    scoreEl.textContent = "0";
    tickMs = computeTickMs();
    spawnApples();
  }

  function reviveSnake() {
    const mid = Math.floor(GRID / 2);
    snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    dir = DIRS.right;
    dirQueue = [];
    spawnApples();
    if (coin) {
      const occ = occupiedCells();
      if (occ.has(`${coin.x},${coin.y}`)) coin = null;
    }
  }

  function useShrink() {
    if (state !== "playing" || aiAssisted || inventory.shrink <= 0) return;
    if (snake.length <= 3) return;
    const newLen = Math.max(3, Math.floor(snake.length / 2));
    snake = snake.slice(0, newLen);
    inventory.shrink--;
    saveInventory();
  }

  function setDirection(name) {
    const next = DIRS[name];
    if (!next) return;
    const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
    if (next.x === -last.x && next.y === -last.y) return;
    if (next.x === last.x && next.y === last.y) return;
    if (dirQueue.length < 3) dirQueue.push(next);
  }

  function step() {
    if (dirQueue.length) dir = dirQueue.shift();

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (run.ghostWalls) {
      if (head.x < 0) head.x = GRID - 1;
      else if (head.x >= GRID) head.x = 0;
      if (head.y < 0) head.y = GRID - 1;
      else if (head.y >= GRID) head.y = 0;
    }

    const hitWall =
      !run.ghostWalls &&
      (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID);
    const hitSelf = snake.some(
      (s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y,
    );
    if (hitWall || hitSelf) {
      if (run.revives > 0 && !aiAssisted) {
        run.revives--;
        reviveSnake();
        return;
      }
      gameOver();
      return;
    }

    snake.unshift(head);

    let ate = false;
    for (let i = 0; i < foods.length; i++) {
      if (head.x === foods[i].x && head.y === foods[i].y) {
        foods.splice(i, 1);
        score += run.scorePerApple;
        scoreEl.textContent = score;
        tickMs = computeTickMs();
        ate = true;
        break;
      }
    }

    if (coin && head.x === coin.x && head.y === coin.y) {
      if (!aiAssisted) addCoins(1);
      coin = null;
      scheduleNextCoin(performance.now());
    }

    if (ate) {
      if (snake.length === GRID * GRID) {
        win();
        return;
      }
      spawnApples();
    } else {
      snake.pop();
    }
  }

  // --- Rendering ---

  const THEME_KEY = "mumu-theme";
  let palette = {};

  function refreshPalette() {
    const styles = getComputedStyle(document.documentElement);
    const read = (name) => styles.getPropertyValue(name).trim();
    palette = {
      board: read("--board"),
      felt: read("--felt"),
      apple: read("--apple"),
      snakeLine: read("--snake-line"),
      foodStem: read("--food-stem"),
      coin: read("--coin"),
      coinShine: read("--coin-shine"),
    };
  }

  function currentTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const dark = theme === "dark";
    themeBtn.setAttribute("aria-pressed", String(dark));
    themeBtn.setAttribute(
      "aria-label",
      t(dark ? "ariaThemeLight" : "ariaThemeDark"),
    );
    refreshPalette();
    if (snake) render(performance.now());
  }

  function drawBoard() {
    ctx.fillStyle = palette.board;
    ctx.fillRect(0, 0, boardSize, boardSize);
    ctx.fillStyle = palette.felt;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  function drawApple(cell, time) {
    const cx = (cell.x + 0.5) * CELL;
    const cy = (cell.y + 0.5) * CELL;
    const pulse = 1 + 0.05 * Math.sin(time / 280);
    const r = CELL * 0.3 * pulse;

    ctx.beginPath();
    ctx.fillStyle = palette.apple;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, CELL * 0.07);
    ctx.strokeStyle = palette.snakeLine;
    ctx.stroke();

    ctx.fillStyle = palette.foodStem;
    ctx.beginPath();
    ctx.ellipse(
      cx + r * 0.28,
      cy - r * 1.02,
      r * 0.34,
      r * 0.16,
      -0.65,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  function drawCoin(time) {
    if (!coin) return;
    const remaining = coin.expiresAt - time;
    if (remaining <= 2000 && Math.floor(time / 120) % 2 === 0) return;

    const cx = (coin.x + 0.5) * CELL;
    const cy = (coin.y + 0.5) * CELL;
    const pulse = 1 + 0.06 * Math.sin(time / 200);
    const r = CELL * 0.26 * pulse;

    ctx.beginPath();
    ctx.fillStyle = palette.coin;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, CELL * 0.05);
    ctx.strokeStyle = palette.snakeLine;
    ctx.stroke();

    ctx.fillStyle = palette.coinShine;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFoods(time) {
    for (const f of foods) drawApple(f, time);
    drawCoin(time);
  }

  function segmentColor(i, total) {
    const t = total <= 1 ? 0 : i / (total - 1);
    const lerp = (a, b) => Math.round(a + (b - a) * t);
    return `rgb(${lerp(143, 58)}, ${lerp(188, 106)}, ${lerp(74, 48)})`;
  }

  function drawSnake() {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const drawBody = (widthExtra, colorFn) => {
      for (let i = snake.length - 1; i >= 1; i--) {
        const a = snake[i];
        const b = snake[i - 1];
        const taper = 1 - 0.32 * (i / (snake.length - 1));
        ctx.strokeStyle = colorFn(i);
        ctx.lineWidth = CELL * 0.72 * taper + widthExtra;
        ctx.beginPath();
        ctx.moveTo((a.x + 0.5) * CELL, (a.y + 0.5) * CELL);
        ctx.lineTo((b.x + 0.5) * CELL, (b.y + 0.5) * CELL);
        ctx.stroke();
      }
    };

    drawBody(CELL * 0.1, () => palette.snakeLine);
    drawBody(0, (i) => segmentColor(i, snake.length));

    const head = snake[0];
    const cx = (head.x + 0.5) * CELL;
    const cy = (head.y + 0.5) * CELL;
    const size = CELL * 1.35;
    let angle = 0;
    if (dir === DIRS.right) angle = Math.PI / 2;
    else if (dir === DIRS.down) angle = Math.PI;
    else if (dir === DIRS.left) angle = -Math.PI / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    if (faceImg.complete && faceImg.naturalWidth) {
      ctx.drawImage(faceImg, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = "#7a9e42";
      ctx.beginPath();
      ctx.arc(0, 0, CELL * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function render(time) {
    drawBoard();
    drawFoods(time);
    drawSnake();
  }

  // --- Game flow ---

  function loop(time) {
    if (state === "playing") {
      updateCoinTimers(time);
      if (time - lastTick >= tickMs) {
        lastTick = time;
        if (autoPlayEnabled) {
          const move = getAutoDirection();
          if (move) setDirection(move);
        }
        step();
      }
      render(time);
    }
    requestAnimationFrame(loop);
  }

  function setPausedChrome(paused) {
    pauseBtn.classList.toggle("is-paused", paused);
    pauseBtn.setAttribute("aria-label", t(paused ? "ariaResume" : "ariaPause"));
  }

  function start(manual = true) {
    aiAssisted = !manual;
    reset();
    if (manual) applyRunBoosts();
    else run = defaultRun();
    state = "playing";
    lastTick = performance.now();
    scheduleNextCoin(lastTick);
    setPausedChrome(false);
    overlayState = null;
    overlay.classList.remove("visible");
    updateShrinkBtn();
  }

  function showOverlay(titleKey, textKey, btnKey, vars = {}) {
    overlayState = { titleKey, textKey, btnKey, vars };
    refreshOverlay();
    overlay.classList.add("visible");
  }

  function gameOver() {
    state = "over";
    setAutoPlay(false);
    setPausedChrome(false);
    coin = null;
    coinNextSpawnAt = null;
    if (aiAssisted) {
      showOverlay("overlayAiRun", "overlayAiRunText", "again", { score });
    } else if (score > highScore) {
      highScore = score;
      localStorage.setItem("snake-high-score", highScore);
      highScoreEl.textContent = highScore;
      showOverlay("overlayNewBest", "overlayNewBestText", "again", { score });
    } else {
      showOverlay("overlayOuch", "overlayOuchText", "again", {
        score,
        best: highScore,
      });
    }
    updateShrinkBtn();
  }

  function win() {
    state = "over";
    setAutoPlay(false);
    setPausedChrome(false);
    coin = null;
    coinNextSpawnAt = null;
    if (!aiAssisted && score > highScore) {
      highScore = score;
      localStorage.setItem("snake-high-score", highScore);
      highScoreEl.textContent = highScore;
    }
    if (aiAssisted) {
      showOverlay("overlayStuffed", "overlayStuffedAi", "again");
    } else {
      showOverlay("overlayStuffed", "overlayStuffedWin", "again", { score });
    }
    updateShrinkBtn();
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      setPausedChrome(true);
      showOverlay("overlayPause", "overlayPauseText", "back");
    } else if (state === "paused") {
      state = "playing";
      setPausedChrome(false);
      overlayState = null;
      lastTick = performance.now();
      overlay.classList.remove("visible");
    }
  }

  // --- Shop UI ---

  function updateBoostBadges() {
    const runStartKeys = [
      "slow_start",
      "revive",
      "score_boost",
      "magnet",
      "ghost_walls",
      "more_apples",
    ];
    const badges = [];
    for (const key of runStartKeys) {
      const count = inventory[key];
      if (count > 0) {
        badges.push(
          `<span class="boost-badge">${boostLabel(key)}${count > 1 ? ` ×${count}` : ""}</span>`,
        );
      }
    }
    if (inventory.shrink > 0) {
      badges.push(
        `<span class="boost-badge">${boostLabel("shrink")}${inventory.shrink > 1 ? ` ×${inventory.shrink}` : ""}</span>`,
      );
    }
    boostBadgesEl.innerHTML = badges.join("");
    boostBadgesEl.hidden = badges.length === 0;
  }

  function updateShrinkBtn() {
    const show = inventory.shrink > 0 && state === "playing" && !aiAssisted;
    shrinkBtn.hidden = !show;
    shrinkBtn.textContent =
      inventory.shrink > 1
        ? t("shrinkCount", { n: inventory.shrink })
        : t("shrink");
  }

  function renderShop() {
    shopItemsEl.innerHTML = SHOP_ITEMS.map((item) => {
      const owned = inventory[item.id];
      const canBuy = coins >= item.price;
      return `<div class="shop-item">
        <div class="shop-item-info">
          <div class="shop-item-name">${shopItemName(item.id)} — ${item.price} ${t("coinsWord")}</div>
          <div class="shop-item-desc">${shopItemDesc(item.id)}</div>
          ${owned > 0 ? `<div class="shop-item-owned">${t("owned", { n: owned })}</div>` : ""}
        </div>
        <button class="shop-buy-btn" data-item="${item.id}" ${canBuy ? "" : "disabled"}>${t("buy")}</button>
      </div>`;
    }).join("");

    shopItemsEl.querySelectorAll(".shop-buy-btn").forEach((btn) => {
      btn.addEventListener("click", () => buyItem(btn.dataset.item));
    });
  }

  function buyItem(id) {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item || coins < item.price) return;
    coins -= item.price;
    inventory[id]++;
    saveCoins();
    saveInventory();
  }

  let pausedForShop = false;

  function openShop() {
    renderShop();
    shopModal.hidden = false;
    document.body.classList.add("shop-open");
    if (state === "playing") {
      state = "paused";
      pausedForShop = true;
      setPausedChrome(true);
      overlay.classList.remove("visible");
    }
  }

  function closeShop() {
    shopModal.hidden = true;
    document.body.classList.remove("shop-open");
    if (pausedForShop && state === "paused") {
      state = "playing";
      setPausedChrome(false);
      lastTick = performance.now();
      pausedForShop = false;
    }
  }

  shopBtn.addEventListener("click", openShop);
  shopCloseBtn.addEventListener("click", closeShop);
  shopBackdrop.addEventListener("click", closeShop);
  shrinkBtn.addEventListener("click", useShrink);

  // --- Auto-play AI ---

  let autoPlayEnabled = false;
  const autoPlayBtn = document.getElementById("auto-play-btn");

  const CELLS = GRID * GRID;
  const cycleIndex = [];
  const cellAtCycle = new Array(CELLS);
  {
    for (let y = 0; y < GRID; y++) cycleIndex.push(new Array(GRID));
    let idx = 0;
    for (let y = 0; y < GRID; y++) {
      if (y % 2 === 0) {
        for (let x = 1; x < GRID; x++) {
          cycleIndex[y][x] = idx;
          cellAtCycle[idx++] = { x, y };
        }
      } else {
        for (let x = GRID - 1; x >= 1; x--) {
          cycleIndex[y][x] = idx;
          cellAtCycle[idx++] = { x, y };
        }
      }
    }
    for (let y = GRID - 1; y >= 0; y--) {
      cycleIndex[y][0] = idx;
      cellAtCycle[idx++] = { x: 0, y };
    }
  }

  function nextCycleCell(x, y) {
    return cellAtCycle[(cycleIndex[y][x] + 1) % CELLS];
  }

  function isSafeCell(cell, body) {
    if (cell.x < 0 || cell.y < 0 || cell.x >= GRID || cell.y >= GRID) {
      return false;
    }
    return !body.some(
      (s, i) => i < body.length - 1 && s.x === cell.x && s.y === cell.y,
    );
  }

  function dirName(dx, dy) {
    if (dx === 1) return "right";
    if (dx === -1) return "left";
    if (dy === 1) return "down";
    return "up";
  }

  function isOrderedBody(body) {
    const tail = body[body.length - 1];
    const tailIdx = cycleIndex[tail.y][tail.x];
    let prev = -1;
    for (let i = body.length - 1; i >= 0; i--) {
      const r = (cycleIndex[body[i].y][body[i].x] - tailIdx + CELLS) % CELLS;
      if (r <= prev) return false;
      prev = r;
    }
    return true;
  }

  function bodyAdvance(body, cell, eats) {
    const next = [cell, ...body];
    if (!eats) next.pop();
    return next;
  }

  function floodSize(cell, body) {
    const blocked = new Uint8Array(CELLS);
    for (let i = 0; i < body.length - 1; i++) {
      blocked[body[i].y * GRID + body[i].x] = 1;
    }
    const seen = new Uint8Array(CELLS);
    const queue = [cell.y * GRID + cell.x];
    seen[queue[0]] = 1;
    for (let qi = 0; qi < queue.length; qi++) {
      const id = queue[qi];
      const x = id % GRID;
      const y = (id - x) / GRID;
      for (const d of Object.values(DIRS)) {
        const nx = x + d.x;
        const ny = y + d.y;
        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
        const nid = ny * GRID + nx;
        if (blocked[nid] || seen[nid]) continue;
        seen[nid] = 1;
        queue.push(nid);
      }
    }
    return queue.length;
  }

  function chaseProbe(cell, body0, foodCell) {
    const eats = foodCell && cell.x === foodCell.x && cell.y === foodCell.y;
    const body = bodyAdvance(body0, cell, eats);
    const len = body.length;
    if (len >= CELLS) return { chasable: true, depth: CELLS };

    const vacate = new Int32Array(CELLS);
    for (let j = 0; j < len; j++) {
      vacate[body[j].y * GRID + body[j].x] = len - j;
    }
    const tail = body[len - 1];
    const tailId = tail.y * GRID + tail.x;
    const headId = cell.y * GRID + cell.x;
    const dist = new Int32Array(CELLS).fill(-1);
    dist[headId] = 0;
    const queue = [headId];
    let chasable = false;
    let depth = 0;
    for (let qi = 0; qi < queue.length; qi++) {
      const id = queue[qi];
      const t = dist[id];
      if (t > depth) depth = t;
      if (id === tailId) {
        chasable = true;
        break;
      }
      const x = id % GRID;
      const y = (id - x) / GRID;
      for (const d of Object.values(DIRS)) {
        const nx = x + d.x;
        const ny = y + d.y;
        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
        const nid = ny * GRID + nx;
        if (dist[nid] !== -1 || t + 1 < vacate[nid]) continue;
        dist[nid] = t + 1;
        queue.push(nid);
      }
    }
    return { chasable, depth };
  }

  function scoreCell(cell, body, foodCell) {
    const probe = chaseProbe(cell, body, foodCell);
    const head = body[0];
    const nc = nextCycleCell(head.x, head.y);
    return probe.chasable
      ? 10000000 +
          (cell.x === nc.x && cell.y === nc.y ? 1000000 : 0) +
          floodSize(cell, body)
      : probe.depth * 1000 + floodSize(cell, body);
  }

  function policyCell(body, foodCell) {
    const head = body[0];
    let best = null;
    for (const d of Object.values(DIRS)) {
      const cell = { x: head.x + d.x, y: head.y + d.y };
      if (!isSafeCell(cell, body)) continue;
      const score = scoreCell(cell, body, foodCell);
      if (!best || score > best.score) best = { cell, score };
    }
    return best ? best.cell : null;
  }

  function pickTargetFood(body) {
    if (!foods.length) return null;
    const tail = body[body.length - 1];
    const tailIdx = cycleIndex[tail.y][tail.x];
    const rel = (cell) =>
      (cycleIndex[cell.y][cell.x] - tailIdx + CELLS) % CELLS;
    const relHead = rel(body[0]);
    let best = null;
    let bestRel = Infinity;
    for (const f of foods) {
      const r = rel(f);
      if (r > relHead && r < bestRel) {
        bestRel = r;
        best = f;
      }
    }
    return best || foods[0];
  }

  function rollout(firstCell) {
    let foodCell = pickTargetFood(snake);
    let eats =
      foodCell && firstCell.x === foodCell.x && firstCell.y === foodCell.y;
    let body = bodyAdvance(snake, firstCell, eats);
    if (eats) foodCell = pickTargetFood(body);
    for (let s = 0; s < CELLS; s++) {
      if (isOrderedBody(body)) return { ok: true, steps: s };
      const cell = policyCell(body, foodCell);
      if (!cell) return { ok: false, steps: s };
      eats = foodCell && cell.x === foodCell.x && cell.y === foodCell.y;
      body = bodyAdvance(body, cell, eats);
      if (eats) foodCell = pickTargetFood(body);
    }
    return { ok: true, steps: CELLS };
  }

  function recoveryDirection() {
    const head = snake[0];
    const target = pickTargetFood(snake);
    const candidates = [];
    for (const name of Object.keys(DIRS)) {
      const d = DIRS[name];
      const cell = { x: head.x + d.x, y: head.y + d.y };
      if (!isSafeCell(cell, snake)) continue;
      candidates.push({
        name,
        cell,
        score: scoreCell(cell, snake, target),
      });
    }
    candidates.sort((a, b) => b.score - a.score);

    let fallback = null;
    for (const c of candidates) {
      const r = rollout(c.cell);
      if (r.ok) return c.name;
      if (!fallback || r.steps > fallback.steps) {
        fallback = { name: c.name, steps: r.steps };
      }
    }
    return fallback ? fallback.name : null;
  }

  function getAutoDirection() {
    if (!isOrderedBody(snake)) return recoveryDirection();

    const head = snake[0];
    const tail = snake[snake.length - 1];
    const tailIdx = cycleIndex[tail.y][tail.x];
    const rel = (cell) =>
      (cycleIndex[cell.y][cell.x] - tailIdx + CELLS) % CELLS;

    const relHead = rel(head);
    const target = pickTargetFood(snake);
    const relFood = rel(target);

    if (relFood > relHead) {
      let best = null;
      let bestRel = relHead;
      for (const d of Object.values(DIRS)) {
        const cell = { x: head.x + d.x, y: head.y + d.y };
        if (cell.x < 0 || cell.y < 0 || cell.x >= GRID || cell.y >= GRID) {
          continue;
        }
        const r = rel(cell);
        if (r > bestRel && r <= relFood && isSafeCell(cell, snake)) {
          bestRel = r;
          best = cell;
        }
      }
      if (best) return dirName(best.x - head.x, best.y - head.y);
    }

    const nc = nextCycleCell(head.x, head.y);
    if (isSafeCell(nc, snake)) {
      return dirName(nc.x - head.x, nc.y - head.y);
    }

    for (const name of Object.keys(DIRS)) {
      const d = DIRS[name];
      if (isSafeCell({ x: head.x + d.x, y: head.y + d.y }, snake)) return name;
    }
    return null;
  }

  function setAutoPlay(on) {
    autoPlayEnabled = on;
    autoPlayBtn.textContent = t(on ? "stop" : "auto");
    autoPlayBtn.setAttribute("aria-pressed", String(on));
    if (on) dirQueue = [];
    updateShrinkBtn();
  }

  autoPlayBtn.addEventListener("click", () => {
    if (autoPlayEnabled) {
      setAutoPlay(false);
      return;
    }
    if (state === "idle" || state === "over") start(false);
    else if (state === "paused") togglePause();
    else aiAssisted = true;
    setAutoPlay(true);
  });

  // --- Input ---

  const KEY_DIRS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };

  document.addEventListener("keydown", (e) => {
    const name = KEY_DIRS[e.key] || KEY_DIRS[e.key.toLowerCase()];
    if (name) {
      e.preventDefault();
      if (state === "playing") {
        if (!autoPlayEnabled) setDirection(name);
      } else if (state === "idle" || state === "over") {
        start();
        setDirection(name);
      }
      return;
    }
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (state === "playing" || state === "paused") togglePause();
      else start();
    } else if (e.key === "Enter" && state !== "playing") {
      start();
    } else if (
      (e.key === "x" || e.key === "X") &&
      state === "playing" &&
      !autoPlayEnabled
    ) {
      useShrink();
    } else if (e.key === "Escape" && !shopModal.hidden) {
      closeShop();
    }
  });

  let touchStart = null;
  canvas.addEventListener(
    "touchstart",
    (e) => {
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    { passive: true },
  );

  canvas.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      if (!touchStart || state !== "playing" || autoPlayEnabled) return;
      const dx = e.touches[0].clientX - touchStart.x;
      const dy = e.touches[0].clientY - touchStart.y;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? "right" : "left");
      else setDirection(dy > 0 ? "down" : "up");
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    { passive: false },
  );

  document.querySelectorAll(".dpad-btn[data-dir]").forEach((btn) => {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (state === "playing") {
        if (!autoPlayEnabled) setDirection(btn.dataset.dir);
      } else if (state === "idle" || state === "over") start();
    });
  });

  pauseBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state === "playing" || state === "paused") togglePause();
  });

  playBtn.addEventListener("click", start);

  applyTheme(currentTheme());

  langBtn.addEventListener("click", () => {
    const next = currentLang === "en" ? "th" : "en";
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch (e) {}
    applyLanguage(next);
  });

  themeBtn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {}
    applyTheme(next);
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      try {
        if (localStorage.getItem(THEME_KEY)) return;
      } catch (err) {}
      applyTheme(e.matches ? "dark" : "light");
    });

  if (window.matchMedia("(pointer: coarse)").matches) {
    idleOverlayMobile = true;
  }

  window.pauseForSource = () => {
    if (state === "playing") {
      state = "paused";
      setPausedChrome(true);
      overlay.classList.remove("visible");
      return true;
    }
    return false;
  };

  window.resumeFromSource = () => {
    if (state === "paused") {
      state = "playing";
      setPausedChrome(false);
      lastTick = performance.now();
    }
  };

  run = defaultRun();
  foods = [];
  reset();
  state = "idle";
  currentLang =
    document.documentElement.dataset.lang === "th" ? "th" : detectLang();
  overlayState = idleOverlayKeys();
  applyLanguage(currentLang);
  updateBoostBadges();
  updateShrinkBtn();
  faceImg.onload = () => render(performance.now());
  render(performance.now());
  requestAnimationFrame(loop);
})();
