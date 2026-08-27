(() => {
  "use strict";

  const GRID = 20; // board size in cells; bigger = more room, longer games
  const BASE_TICK_MS = 231; // delay between moves at score 0; higher = slower start
  const MIN_TICK_MS = 118; // late-game speed floor; lower = faster max speed
  const SPEEDUP_MS_PER_SCORE = 2.4; // ms cut per score point; higher = ramps up faster
  const DEFAULT_APPLE_TARGET = 3; // apples on the board at once (shop can raise this)
  const MOUTH_OPEN_CELLS = 2; // face swaps to open mouth when an apple is this close

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("high-score");
  const coinBalanceEl = document.getElementById("coin-balance");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const boardTransition = document.getElementById("board-transition");
  const playBtn = document.getElementById("play-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const swipePadSurface = document.getElementById("swipe-pad-surface");
  const themeBtn = document.getElementById("theme-btn");
  const langBtn = document.getElementById("lang-btn");
  const shopBtn = document.getElementById("shop-btn");
  const shopModal = document.getElementById("shop-modal");
  const shopBackdrop = document.getElementById("shop-backdrop");
  const shopCloseBtn = document.getElementById("shop-close-btn");
  const shopItemsEl = document.getElementById("shop-items");
  const shopCoinBalanceEl = document.getElementById("shop-coin-balance");
  const loadoutEl = document.getElementById("loadout");
  const loadoutTogglesEl = document.getElementById("loadout-toggles");
  const loadoutPermanentEl = document.getElementById("loadout-permanent");
  const shrinkBtn = document.getElementById("shrink-btn");

  const faceImg = new Image();
  faceImg.src = "assets/snake-face.png";
  const faceOpenImg = new Image();
  faceOpenImg.src = "assets/snake-face-open.png";

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
      overlayTextMobile: "Swipe the board or the pad.",
      swipePadLabel: "Swipe",
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
      ownedForever: "Owned",
      shopPermanent: "Permanent",
      loadoutTitle: "Next run",
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
      boardCleared: "Board cleared!",
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
      shop_magnet_desc: "Coins spawn more often.",
      shop_ghost_walls_name: "Ghost walls",
      shop_ghost_walls_desc: "Wrap through walls for one run.",
      shop_more_apples_name: "More apples",
      shop_more_apples_desc: "5 apples on the board.",
      shop_shield_name: "Shield",
      shop_shield_desc: "Block one crash without resetting.",
      shop_head_start_name: "Head start",
      shop_head_start_desc: "Begin with 5 points already scored.",
      shop_lucky_coins_name: "Lucky coins",
      shop_lucky_coins_desc: "Coins stay on the board 50% longer.",
      boost_slow_start: "Slow-mo",
      boost_revive: "Extra life",
      boost_shrink: "Shrink",
      boost_score_boost: "2× score",
      boost_magnet: "Magnet",
      boost_ghost_walls: "Ghost walls",
      boost_more_apples: "More apples",
      boost_shield: "Shield",
      boost_head_start: "Head start",
      boost_lucky_coins: "Lucky coins",
      ariaThemeDark: "Switch to dark mode",
      ariaThemeLight: "Switch to light mode",
      ariaLangTh: "Switch to Thai",
      ariaLangEn: "Switch to English",
      ariaPause: "Pause",
      ariaResume: "Resume",
      ariaClose: "Close",
      ariaSwipePad: "Swipe controls",
      ariaLoadout: "Choose boosts for next run",
      ariaShrinkPotion: "Use shrink potion",
      ariaSourceFiles: "Source files",
      ariaAutoSpeed: "Auto speed",
    },
    th: {
      scoreNow: "ตอนนี้",
      scoreBest: "สูงสุด",
      scoreCoins: "เหรียญ",
      coinsWord: "เหรียญ",
      overlayTitleIdle: "หิวมั้ย?",
      overlayTextIdle: "ลูกศร, WASD หรือปัดนิ้ว อย่าไปกัดตัวเองนะ",
      overlayTextMobile: "ปัดบนกระดานหรือแผ่นปัด",
      swipePadLabel: "ปัด",
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
      ownedForever: "มีแล้ว",
      shopPermanent: "ถาวร",
      loadoutTitle: "รอบถัดไป",
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
      boardCleared: "เคลียร์กระดานแล้ว!",
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
      shop_magnet_desc: "เหรียญโผล่บ่อยขึ้น",
      shop_ghost_walls_name: "กำแพงผี",
      shop_ghost_walls_desc: "ทะลุกำแพงได้ต่อรอบ",
      shop_more_apples_name: "แอปเปิ้ลเพิ่ม",
      shop_more_apples_desc: "มี 5 แอปเปิ้ลบนกระดาน",
      shop_shield_name: "โล่",
      shop_shield_desc: "กันการชนครั้งหนึ่งโดยไม่รีเซ็ต",
      shop_head_start_name: "เริ่มนำ",
      shop_head_start_desc: "เริ่มด้วย 5 คะแนน",
      shop_lucky_coins_name: "เหรียญโชคดี",
      shop_lucky_coins_desc: "เหรียญอยู่บนกระดานนานขึ้น 50%",
      boost_slow_start: "สโลว์โม",
      boost_revive: "ชีวิตพิเศษ",
      boost_shrink: "ย่อ",
      boost_score_boost: "x2",
      boost_magnet: "แม่เหล็ก",
      boost_ghost_walls: "กำแพงผี",
      boost_more_apples: "แอปเปิ้ล+",
      boost_shield: "โล่",
      boost_head_start: "เริ่มนำ",
      boost_lucky_coins: "เหรียญโชคดี",
      ariaThemeDark: "เปลี่ยนเป็นโหมดมืด",
      ariaThemeLight: "เปลี่ยนเป็นโหมดสว่าง",
      ariaLangTh: "เปลี่ยนเป็นภาษาไทย",
      ariaLangEn: "Switch to English",
      ariaPause: "หยุดชั่วคราว",
      ariaResume: "เล่นต่อ",
      ariaClose: "ปิด",
      ariaSwipePad: "แผ่นปัดควบคุมทิศทาง",
      ariaLoadout: "เลือกบูสต์สำหรับรอบถัดไป",
      ariaShrinkPotion: "ใช้ยาเล็ก",
      ariaSourceFiles: "ไฟล์โค้ด",
      ariaAutoSpeed: "ความเร็วออโต้",
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
    document
      .getElementById("swipe-pad")
      .setAttribute("aria-label", t("ariaSwipePad"));
    loadoutTogglesEl.setAttribute("aria-label", t("ariaLoadout"));
    document
      .getElementById("auto-speed")
      .setAttribute("aria-label", t("ariaAutoSpeed"));
    shopCloseBtn.setAttribute("aria-label", t("ariaClose"));
    document
      .getElementById("source-close-btn")
      .setAttribute("aria-label", t("ariaClose"));
    document
      .querySelector(".source-tabs")
      .setAttribute("aria-label", t("ariaSourceFiles"));
  }

  function applyLanguage(lang) {
    currentLang = lang === "th" ? "th" : "en";
    document.documentElement.lang = currentLang;
    document.documentElement.dataset.lang = currentLang;
    applyStaticI18n();
    applyAriaI18n();
    setAutoPlay(autoPlayEnabled);
    updateShrinkBtn();
    renderLoadout();
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
  const LOADOUT_KEY = "mumu-loadout";
  const HIGH_SCORE_KEY = "snake-high-score";

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

  function loadHighScore() {
    try {
      const raw = localStorage.getItem(HIGH_SCORE_KEY);
      if (!raw) return 0;
      const secure = loadSecure(HIGH_SCORE_KEY, -1);
      if (secure >= 0) return secure;
      const legacy = Number(raw);
      if (Number.isFinite(legacy) && legacy >= 0) {
        saveSecure(HIGH_SCORE_KEY, legacy);
        return legacy;
      }
    } catch {}
    return 0;
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
    shield: 0,
    head_start: 0,
    lucky_coins: 0,
  };

  const SHOP_ITEMS = [
    { id: "slow_start", price: 1 },
    { id: "shrink", price: 1 },
    { id: "head_start", price: 1 },
    { id: "revive", price: 2 },
    { id: "score_boost", price: 2 },
    { id: "ghost_walls", price: 2 },
    { id: "shield", price: 2 },
    { id: "magnet", price: 18, permanent: true },
    { id: "lucky_coins", price: 15, permanent: true },
    { id: "more_apples", price: 22, permanent: true },
  ];

  const LOADOUT_KEYS = [
    "slow_start",
    "revive",
    "score_boost",
    "ghost_walls",
    "shrink",
    "shield",
    "head_start",
  ];
  const PERMANENT_KEYS = ["magnet", "more_apples", "lucky_coins"];

  const DEFAULT_LOADOUT = Object.fromEntries(
    LOADOUT_KEYS.map((key) => [key, false]),
  );

  let coins = loadSecure(COINS_KEY, 0);
  let inventory = loadSecureObject(INVENTORY_KEY, DEFAULT_INVENTORY);
  let loadout = loadSecureObject(LOADOUT_KEY, DEFAULT_LOADOUT);

  function saveCoins() {
    saveSecure(COINS_KEY, coins);
    updateCoinUI();
  }

  function saveInventory() {
    saveSecureObject(INVENTORY_KEY, inventory);
    syncLoadout();
    renderLoadout();
    updateShrinkBtn();
    renderShop();
  }

  function saveLoadout() {
    saveSecureObject(LOADOUT_KEY, loadout);
    renderLoadout();
  }

  function syncLoadout() {
    for (const key of LOADOUT_KEYS) {
      if (inventory[key] <= 0) loadout[key] = false;
    }
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
    prevSnake,
    dir,
    prevDir,
    dirQueue,
    foods,
    coin,
    coinNextSpawnAt,
    goldenApple,
    goldenNextSpawnAt,
    score,
    tickMs,
    state,
    lastTick,
    aiAssisted,
    run;
  let highScore = loadHighScore();
  highScoreEl.textContent = highScore;
  updateCoinUI();

  function defaultRun() {
    return {
      speedFactor: 1,
      revives: 0,
      shield: 0,
      scorePerApple: 1,
      coinBoost: false,
      ghostWalls: false,
      appleTarget: DEFAULT_APPLE_TARGET,
      shrinkArmed: false,
    };
  }

  function occupiedCells() {
    const set = new Set();
    for (const s of snake) set.add(`${s.x},${s.y}`);
    for (const f of foods) set.add(`${f.x},${f.y}`);
    if (coin) set.add(`${coin.x},${coin.y}`);
    if (goldenApple) set.add(`${goldenApple.x},${goldenApple.y}`);
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
    let lifetime = run.coinBoost ? 9000 : 6000;
    if (inventory.lucky_coins > 0) lifetime *= 1.5;
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

  function scheduleNextGoldenApple(fromTime) {
    goldenNextSpawnAt = fromTime + 20000 + Math.random() * 15000;
  }

  function spawnGoldenApple() {
    const free = freeCells();
    if (!free.length) {
      scheduleNextGoldenApple(performance.now());
      return;
    }
    const cell = free[Math.floor(Math.random() * free.length)];
    const now = performance.now();
    goldenApple = {
      x: cell.x,
      y: cell.y,
      spawnAt: now,
      expiresAt: now + 7000,
    };
  }

  function updateGoldenAppleTimers(time) {
    if (state !== "playing" || aiAssisted) return;
    if (goldenApple) {
      if (time >= goldenApple.expiresAt) {
        goldenApple = null;
        scheduleNextGoldenApple(time);
      }
    } else if (goldenNextSpawnAt && time >= goldenNextSpawnAt) {
      spawnGoldenApple();
      goldenNextSpawnAt = null;
    }
  }

  function applyRunBoosts() {
    run = defaultRun();
    if (aiAssisted) return;

    const consumeIfArmed = (key, apply) => {
      if (loadout[key] && inventory[key] > 0) {
        inventory[key]--;
        loadout[key] = false;
        apply();
      }
    };

    consumeIfArmed("slow_start", () => {
      run.speedFactor = 0.65;
    });
    consumeIfArmed("revive", () => {
      run.revives = 1;
    });
    consumeIfArmed("score_boost", () => {
      run.scorePerApple = 2;
    });
    consumeIfArmed("ghost_walls", () => {
      run.ghostWalls = true;
    });
    consumeIfArmed("shield", () => {
      run.shield = 1;
    });
    consumeIfArmed("head_start", () => {
      score = 5;
      scoreEl.textContent = score;
      tickMs = computeTickMs();
    });

    if (loadout.shrink && inventory.shrink > 0) {
      run.shrinkArmed = true;
      loadout.shrink = false;
    }

    if (inventory.magnet > 0) run.coinBoost = true;
    if (inventory.more_apples > 0) run.appleTarget = 5;

    saveInventory();
    saveLoadout();
  }

  // Shorter tick = faster snake. Score speeds it up until MIN_TICK_MS.
  // Slow-mo sets speedFactor < 1, which stretches the tick (slower run).
  // Auto speed chips multiply further while autopilot is on.
  function computeTickMs() {
    const base = Math.max(
      MIN_TICK_MS,
      BASE_TICK_MS - score * SPEEDUP_MS_PER_SCORE,
    );
    const mul = autoPlayEnabled ? autoSpeedMul : 1;
    return base / (run.speedFactor * mul);
  }

  function syncPrevSnake() {
    prevSnake = snake.map((s) => ({ x: s.x, y: s.y }));
    prevDir = dir;
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
    goldenApple = null;
    goldenNextSpawnAt = null;
    scoreEl.textContent = "0";
    tickMs = computeTickMs();
    spawnApples();
    syncPrevSnake();
  }

  function softReset() {
    const mid = Math.floor(GRID / 2);
    snake = [
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
      { x: mid - 3, y: mid },
    ];
    dir = DIRS.right;
    dirQueue = [];
    foods = [];
    tickMs = computeTickMs();
    spawnApples();
    syncPrevSnake();
  }

  const BOARD_TRANSITION_MS = 1400;
  let boardTransitionTimer = null;

  function boardCleared() {
    if (state === "transition") return;
    state = "transition";
    coin = null;
    coinNextSpawnAt = null;
    goldenApple = null;
    goldenNextSpawnAt = null;
    if (boardTransition) {
      boardTransition.hidden = false;
      boardTransition.classList.remove("is-active");
      void boardTransition.offsetWidth;
      boardTransition.classList.add("is-active");
    }
    clearTimeout(boardTransitionTimer);
    boardTransitionTimer = setTimeout(() => {
      boardTransitionTimer = null;
      softReset();
      state = "playing";
      lastTick = performance.now();
      scheduleNextCoin(lastTick);
      scheduleNextGoldenApple(lastTick);
      if (boardTransition) {
        boardTransition.classList.remove("is-active");
        boardTransition.hidden = true;
      }
      render(performance.now());
    }, BOARD_TRANSITION_MS);
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
    if (goldenApple) {
      const occ = occupiedCells();
      if (occ.has(`${goldenApple.x},${goldenApple.y}`)) goldenApple = null;
    }
    syncPrevSnake();
  }

  function useShrink() {
    if (
      state !== "playing" ||
      aiAssisted ||
      !run.shrinkArmed ||
      inventory.shrink <= 0
    )
      return;
    if (snake.length <= 3) return;
    const newLen = Math.max(3, Math.floor(snake.length / 2));
    snake = snake.slice(0, newLen);
    inventory.shrink--;
    run.shrinkArmed = false;
    saveInventory();
    syncPrevSnake();
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
    prevSnake = snake.map((s) => ({ x: s.x, y: s.y }));
    prevDir = dir;
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
      if (run.shield > 0 && !aiAssisted) {
        run.shield--;
        return;
      }
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

    let ateGolden = false;
    if (goldenApple && head.x === goldenApple.x && head.y === goldenApple.y) {
      score += 5 * run.scorePerApple;
      scoreEl.textContent = score;
      tickMs = computeTickMs();
      goldenApple = null;
      scheduleNextGoldenApple(performance.now());
      ateGolden = true;
    }

    if (ate || ateGolden) {
      if (snake.length === GRID * GRID) {
        boardCleared();
        return;
      }
      spawnApples();
      if (foods.length === 0) {
        boardCleared();
        return;
      }
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
      gold: read("--gold"),
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

  function drawGoldenApple(time) {
    if (!goldenApple) return;
    const remaining = goldenApple.expiresAt - time;
    if (remaining <= 2000 && Math.floor(time / 120) % 2 === 0) return;

    const cx = (goldenApple.x + 0.5) * CELL;
    const cy = (goldenApple.y + 0.5) * CELL;
    const pulse = 1 + 0.07 * Math.sin(time / 220);
    const r = CELL * 0.32 * pulse;

    ctx.beginPath();
    ctx.fillStyle = palette.gold;
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

  function drawFoods(time) {
    for (const f of foods) drawApple(f, time);
    drawGoldenApple(time);
    drawCoin(time);
  }

  function segmentColor(i, total) {
    const t = total <= 1 ? 0 : i / (total - 1);
    const lerp = (a, b) => Math.round(a + (b - a) * t);
    return `rgb(${lerp(143, 58)}, ${lerp(188, 106)}, ${lerp(74, 48)})`;
  }

  function cellAhead(steps) {
    let x = snake[0].x + dir.x * steps;
    let y = snake[0].y + dir.y * steps;
    if (run.ghostWalls) {
      if (x < 0) x = GRID - 1;
      else if (x >= GRID) x = 0;
      if (y < 0) y = GRID - 1;
      else if (y >= GRID) y = 0;
    }
    return { x, y };
  }

  function appleAheadOfHead() {
    for (let steps = 1; steps <= MOUTH_OPEN_CELLS; steps++) {
      const ahead = cellAhead(steps);
      for (const f of foods) {
        if (f.x === ahead.x && f.y === ahead.y) return true;
      }
    }
    return false;
  }

  function segmentsAdjacent(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 1.5;
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function dirAngle(d) {
    if (d === DIRS.right) return Math.PI / 2;
    if (d === DIRS.down) return Math.PI;
    if (d === DIRS.left) return -Math.PI / 2;
    return 0;
  }

  function lerpAngle(a, b, p) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * p;
  }

  function interpolateSnakeView(p) {
    if (!prevSnake?.length) {
      return snake.map((s) => ({ x: s.x, y: s.y }));
    }

    const view = [];
    for (let i = 0; i < snake.length; i++) {
      const curr = snake[i];
      const prev = prevSnake[Math.min(i, prevSnake.length - 1)];
      const dx = Math.abs(curr.x - prev.x);
      const dy = Math.abs(curr.y - prev.y);

      if (dx > 1 || dy > 1) {
        view.push({ x: curr.x, y: curr.y });
      } else {
        view.push({
          x: prev.x + (curr.x - prev.x) * p,
          y: prev.y + (curr.y - prev.y) * p,
        });
      }
    }
    return view;
  }

  function drawSnake(view, headAngle) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const drawBody = (widthExtra, colorFn) => {
      for (let i = view.length - 1; i >= 1; i--) {
        const a = view[i];
        const b = view[i - 1];
        const taper = 1 - 0.32 * (i / (view.length - 1));
        ctx.strokeStyle = colorFn(i);
        ctx.lineWidth = CELL * 0.72 * taper + widthExtra;

        if (segmentsAdjacent(a, b)) {
          ctx.beginPath();
          ctx.moveTo((a.x + 0.5) * CELL, (a.y + 0.5) * CELL);
          ctx.lineTo((b.x + 0.5) * CELL, (b.y + 0.5) * CELL);
          ctx.stroke();
          continue;
        }

        let dx = 0;
        let dy = 0;
        if (Math.abs(a.x - b.x) > 1) dx = Math.sign(a.x - b.x);
        else if (Math.abs(a.y - b.y) > 1) dy = Math.sign(a.y - b.y);
        else continue;

        ctx.beginPath();
        ctx.moveTo((a.x + 0.5) * CELL, (a.y + 0.5) * CELL);
        ctx.lineTo((a.x + dx + 0.5) * CELL, (a.y + dy + 0.5) * CELL);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo((b.x - dx + 0.5) * CELL, (b.y - dy + 0.5) * CELL);
        ctx.lineTo((b.x + 0.5) * CELL, (b.y + 0.5) * CELL);
        ctx.stroke();
      }
    };

    drawBody(CELL * 0.1, () => palette.snakeLine);
    drawBody(0, (i) => segmentColor(i, view.length));

    const head = view[0];
    const cx = (head.x + 0.5) * CELL;
    const cy = (head.y + 0.5) * CELL;
    const size = CELL * 1.35;

    const mouthOpen = appleAheadOfHead();
    const face =
      mouthOpen && faceOpenImg.complete && faceOpenImg.naturalWidth
        ? faceOpenImg
        : faceImg;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(headAngle);
    if (face.complete && face.naturalWidth) {
      ctx.drawImage(face, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = "#7a9e42";
      ctx.beginPath();
      ctx.arc(0, 0, CELL * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function render(time) {
    const p = state === "playing" ? clamp01((time - lastTick) / tickMs) : 1;
    const view = interpolateSnakeView(p);
    const headAngle = lerpAngle(dirAngle(prevDir), dirAngle(dir), p);
    drawBoard();
    drawFoods(time);
    drawSnake(view, headAngle);
  }

  // --- Game flow ---

  function loop(time) {
    if (state === "playing") {
      updateCoinTimers(time);
      updateGoldenAppleTimers(time);
      let steps = 0;
      while (state === "playing" && time - lastTick >= tickMs && steps < 8) {
        lastTick += tickMs;
        if (autoPlayEnabled) {
          const move = getAutoDirection();
          if (move) setDirection(move);
        }
        step();
        steps++;
      }
      if (steps === 8) lastTick = time;
      render(time);
    } else if (state === "transition") {
      render(time);
    }
    requestAnimationFrame(loop);
  }

  function setPausedChrome(paused) {
    pauseBtn.classList.toggle("is-paused", paused);
    pauseBtn.setAttribute("aria-label", t(paused ? "ariaResume" : "ariaPause"));
  }

  function start(manual = true) {
    clearTimeout(boardTransitionTimer);
    boardTransitionTimer = null;
    if (boardTransition) {
      boardTransition.classList.remove("is-active");
      boardTransition.hidden = true;
    }
    aiAssisted = !manual;
    reset();
    if (manual) applyRunBoosts();
    else run = defaultRun();
    state = "playing";
    lastTick = performance.now();
    scheduleNextCoin(lastTick);
    scheduleNextGoldenApple(lastTick);
    setPausedChrome(false);
    overlayState = null;
    overlay.classList.remove("visible");
    updateShrinkBtn();
    renderLoadout();
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
    goldenApple = null;
    goldenNextSpawnAt = null;
    if (aiAssisted) {
      showOverlay("overlayAiRun", "overlayAiRunText", "again", { score });
    } else if (score > highScore) {
      highScore = score;
      saveSecure(HIGH_SCORE_KEY, highScore);
      highScoreEl.textContent = highScore;
      showOverlay("overlayNewBest", "overlayNewBestText", "again", { score });
    } else {
      showOverlay("overlayOuch", "overlayOuchText", "again", {
        score,
        best: highScore,
      });
    }
    updateShrinkBtn();
    renderLoadout();
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      setPausedChrome(true);
      showOverlay("overlayPause", "overlayPauseText", "back");
      renderLoadout();
    } else if (state === "paused") {
      state = "playing";
      setPausedChrome(false);
      overlayState = null;
      lastTick = performance.now();
      overlay.classList.remove("visible");
      renderLoadout();
    }
  }

  // --- Loadout & shop UI ---

  function toggleLoadout(key) {
    if (inventory[key] <= 0) return;
    loadout[key] = !loadout[key];
    saveLoadout();
  }

  function renderLoadout() {
    syncLoadout();
    const showLoadout =
      state !== "playing" &&
      (LOADOUT_KEYS.some((key) => inventory[key] > 0) ||
        PERMANENT_KEYS.some((key) => inventory[key] > 0));

    loadoutEl.hidden = !showLoadout;
    if (!showLoadout) return;

    const toggles = [];
    for (const key of LOADOUT_KEYS) {
      const count = inventory[key];
      if (count <= 0) continue;
      const armed = !!loadout[key];
      toggles.push(
        `<button type="button" class="loadout-toggle${armed ? " is-armed" : ""}" data-loadout="${key}" aria-pressed="${armed}">${boostLabel(key)}${count > 1 ? ` ×${count}` : ""}</button>`,
      );
    }
    loadoutTogglesEl.innerHTML = toggles.join("");

    const permanents = [];
    for (const key of PERMANENT_KEYS) {
      if (inventory[key] > 0) {
        permanents.push(
          `<span class="loadout-permanent-badge">${boostLabel(key)}</span>`,
        );
      }
    }
    loadoutPermanentEl.innerHTML = permanents.join("");
    loadoutPermanentEl.hidden = permanents.length === 0;

    loadoutTogglesEl.querySelectorAll("[data-loadout]").forEach((btn) => {
      btn.addEventListener("click", () => toggleLoadout(btn.dataset.loadout));
    });
  }

  function updateShrinkBtn() {
    const show =
      run.shrinkArmed &&
      inventory.shrink > 0 &&
      state === "playing" &&
      !aiAssisted;
    shrinkBtn.hidden = !show;
    shrinkBtn.textContent =
      inventory.shrink > 1
        ? t("shrinkCount", { n: inventory.shrink })
        : t("shrink");
  }

  function renderShopItem(item) {
    const owned = inventory[item.id];
    const isOwnedPermanent = item.permanent && owned > 0;
    const canBuy = !isOwnedPermanent && coins >= item.price;
    const ownedLabel = isOwnedPermanent
      ? t("ownedForever")
      : owned > 0
        ? t("owned", { n: owned })
        : "";
    const btnLabel = isOwnedPermanent ? t("ownedForever") : t("buy");
    return `<div class="shop-item">
        <div class="shop-item-info">
          <div class="shop-item-name">${shopItemName(item.id)} — ${item.price} ${t("coinsWord")}</div>
          <div class="shop-item-desc">${shopItemDesc(item.id)}</div>
          ${ownedLabel ? `<div class="shop-item-owned">${ownedLabel}</div>` : ""}
        </div>
        <button class="shop-buy-btn" data-item="${item.id}" ${canBuy ? "" : "disabled"}>${btnLabel}</button>
      </div>`;
  }

  function renderShop() {
    const consumables = SHOP_ITEMS.filter((item) => !item.permanent);
    const permanents = SHOP_ITEMS.filter((item) => item.permanent);
    const sections = [
      ...consumables.map(renderShopItem),
      `<h3 class="shop-section-title">${t("shopPermanent")}</h3>`,
      ...permanents.map(renderShopItem),
    ];
    shopItemsEl.innerHTML = sections.join("");

    shopItemsEl.querySelectorAll(".shop-buy-btn").forEach((btn) => {
      btn.addEventListener("click", () => buyItem(btn.dataset.item));
    });
  }

  function buyItem(id) {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item || coins < item.price) return;
    if (item.permanent && inventory[id] > 0) return;
    coins -= item.price;
    inventory[id]++;
    if (LOADOUT_KEYS.includes(id)) loadout[id] = true;
    saveCoins();
    saveInventory();
    if (LOADOUT_KEYS.includes(id)) saveLoadout();
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
  let autoSpeedMul = 1;
  const autoPlayBtn = document.getElementById("auto-play-btn");
  const autoSpeedEl = document.getElementById("auto-speed");
  const AUTO_SPEEDS = [1, 2, 5, 10, 20];

  function syncAutoSpeedUI() {
    autoSpeedEl.hidden = !autoPlayEnabled;
    for (const btn of autoSpeedEl.querySelectorAll("[data-speed]")) {
      const pressed = Number(btn.dataset.speed) === autoSpeedMul;
      btn.setAttribute("aria-pressed", String(pressed));
    }
  }

  function setAutoSpeed(mul) {
    if (!AUTO_SPEEDS.includes(mul)) return;
    autoSpeedMul = mul;
    tickMs = computeTickMs();
    syncAutoSpeedUI();
  }

  autoSpeedEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-speed]");
    if (!btn || !autoSpeedEl.contains(btn)) return;
    setAutoSpeed(Number(btn.dataset.speed));
  });

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
    tickMs = computeTickMs();
    syncAutoSpeedUI();
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
      else if (state === "idle" || state === "over") start();
    } else if (e.key === "Enter" && (state === "idle" || state === "over")) {
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

  function bindSwipeTarget(el, { onTap } = {}) {
    let touchStart = null;
    let tapStart = null;

    el.addEventListener(
      "touchstart",
      (e) => {
        const touch = e.touches[0];
        touchStart = { x: touch.clientX, y: touch.clientY };
        tapStart = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      },
      { passive: true },
    );

    el.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        if (!touchStart || state !== "playing" || autoPlayEnabled) return;
        const dx = e.touches[0].clientX - touchStart.x;
        const dy = e.touches[0].clientY - touchStart.y;
        if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
        if (Math.abs(dx) > Math.abs(dy))
          setDirection(dx > 0 ? "right" : "left");
        else setDirection(dy > 0 ? "down" : "up");
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      },
      { passive: false },
    );

    el.addEventListener(
      "touchend",
      (e) => {
        if (tapStart && onTap) {
          const touch = e.changedTouches[0];
          const dx = touch.clientX - tapStart.x;
          const dy = touch.clientY - tapStart.y;
          const dt = Date.now() - tapStart.time;
          if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 300) onTap();
        }
        touchStart = null;
        tapStart = null;
      },
      { passive: true },
    );
  }

  bindSwipeTarget(canvas);
  bindSwipeTarget(swipePadSurface, {
    onTap: () => {
      if (state === "idle" || state === "over") start();
    },
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
  renderLoadout();
  updateShrinkBtn();
  faceImg.onload = () => render(performance.now());
  faceOpenImg.onload = () => render(performance.now());
  render(performance.now());
  requestAnimationFrame(loop);
})();
