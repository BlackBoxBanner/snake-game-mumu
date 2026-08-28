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
  const boardToast = document.getElementById("board-toast");
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
  const shopTabsEl = document.getElementById("shop-tabs");
  const titleSkinEl = document.getElementById("title-skin");
  const shrinkBtn = document.getElementById("shrink-btn");
  const overlayShopBtn = document.getElementById("overlay-shop-btn");
  const overlayQuitBtn = document.getElementById("overlay-quit-btn");
  const runHud = document.getElementById("run-hud");
  const runHudBoosts = document.getElementById("run-hud-boosts");
  const desktopPauseBtn = document.getElementById("desktop-pause-btn");
  const overlayStatsEl = document.getElementById("overlay-stats");

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
      legendApple: "apple",
      legendGold: "gold",
      legendPoison: "bitter",
      legendWarp: "warp",
      pendingBoosts: "Ready: {list}",
      toastLuckyBite: "Lucky coin!",
      overlayTitleIdle: "Hungry?",
      overlayTextIdle:
        "Arrows, WASD, or swipe. Gold = big points. Purple hurts. Blue warps.",
      overlayTextMobile: "Swipe the board or pad. Watch purple berries.",
      swipePadLabel: "Swipe",
      playGo: "Go",
      auto: "Auto",
      stop: "Stop",
      shop: "Shop",
      shrink: "Shrink",
      hint: "arrows / wasd · space pause · enter play · r again · b shop",
      ariaRestart: "Play again",
      source: "</> source",
      sourceTitle: "Source",
      copy: "Copy",
      buy: "Buy",
      ownedForever: "Owned",
      shopPermanent: "Permanent",
      shopActiveRun: "Active this round",
      shopReadyNext: "Ready for next round",
      again: "Again",
      back: "Resume",
      endRun: "End run",
      equip: "Wear",
      equipped: "Wearing",
      shopLooks: "Looks",
      shopFloors: "Boards",
      comboLabel: "×{n} combo",
      toastCombo: "×{n} combo!",
      toastPoison: "Bitter berry — shortened!",
      overlayStats: "best {best} · {coins} coins",
      floor_meadow_name: "Meadow",
      floor_meadow_desc: "Soft lavender checks.",
      floor_sand_name: "Sand",
      floor_sand_desc: "Warm dune tiles.",
      floor_pond_name: "Pond",
      floor_pond_desc: "Cool blue ripples.",
      floor_orchard_name: "Orchard",
      floor_orchard_desc: "Leafy green picnic.",
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
      toastShield: "Shield blocked the crash — turn away!",
      toastRevive: "Extra life used!",
      toastShieldArmed: "Shield armed — one crash saved!",
      toastReviveArmed: "Revive ready — one extra life!",
      toastScoreBoost: "2× score — apples pay double!",
      toastGhostWalls: "Ghost walls — wrap the edges!",
      overlayPause: "Hold on.",
      overlayPauseText: "Resume, shop, or end the run.",
      shop_slow_start_name: "Slow-mo",
      shop_slow_start_desc: "Snake moves 35% slower for one run.",
      shop_revive_name: "Extra life",
      shop_revive_desc: "Revive once after crashing.",
      shop_shrink_name: "Shrink potion",
      shop_shrink_desc: "Halve snake length mid-run (press X).",
      shop_score_boost_name: "2× score",
      shop_score_boost_desc: "Apples worth double for one run.",
      shop_magnet_name: "Coin magnet",
      shop_magnet_desc: "Coins spawn more often and drift toward you.",
      shop_ghost_walls_name: "Ghost walls",
      shop_ghost_walls_desc: "Wrap through walls for one run.",
      shop_more_apples_name: "More apples",
      shop_more_apples_desc: "5 apples on the board.",
      shop_shield_name: "Shield",
      shop_shield_desc: "Block one crash without resetting.",
      shop_head_start_name: "Head start",
      shop_head_start_desc: "Instantly adds 5 points.",
      shop_lucky_coins_name: "Lucky coins",
      shop_lucky_coins_desc: "Coins stay on the board 50% longer.",
      shop_dash_name: "Sugar rush",
      shop_dash_desc: "Move 40% faster for one run.",
      shop_trail_name: "Sparkle trail",
      shop_trail_desc: "Leave glitter while slithering (cosmetic).",
      shop_antidote_name: "Antidote",
      shop_antidote_desc: "Ignore the next bitter berry.",
      shop_sweet_tooth_name: "Sweet tooth",
      shop_sweet_tooth_desc: "Every apple is worth +1 forever.",
      shop_echo_name: "Echo",
      shop_echo_desc: "Leave a soft afterimage while moving.",
      shop_feast_name: "Feast",
      shop_feast_desc: "Next 3 apples give +2 bonus each.",
      shop_calm_name: "Calm",
      shop_calm_desc: "Speed stays steady — no late-game rush.",
      shop_surprise_name: "Surprise bag",
      shop_surprise_desc: "Random boost for this run.",
      shop_combo_grace_name: "Combo grace",
      shop_combo_grace_desc: "Extra steps to keep your combo alive.",
      toastSurprise: "Surprise: {name}!",
      toastShrink: "Shrink potion — half size!",
      toastShrinkArmed: "Shrink armed — press X when packed!",
      toastAntidoteArmed: "Antidote ready for the next bitter berry!",
      toastComboGrace: "Combo grace — more time between bites!",
      toastCalm: "Calm — speed stays steady!",
      tipIdle0: "Gold apples are worth 5. Warp berries phase walls.",
      tipIdle1: "Chain bites quickly for combo bonus points.",
      tipIdle2: "B opens the shop. Esc or space pauses a run.",
      tipIdle3: "Clear the whole board for a coin bonus.",
      tipIdle4: "Coin magnet pulls nearby coins toward you.",
      tipIdle5: "Near your best, the HUD shows how close you are.",
      tipIdle6: "Claim finished goals in the shop for bonus coins.",
      tipIdle7: "Purple berries shrink you — antidote or tidy helps.",
      tipIdle8: "A shield buys one crash — turn away before the next hit.",
      tipIdle9: "X uses a shrink potion mid-run when one is armed.",
      tipIdle10: "Permanents in the shop last forever — worth saving for.",
      tipIdleMobile0: "Swipe on the board or pad. Watch purple berries.",
      tipIdleMobile1: "Tap pause anytime. Shop works mid-run.",
      tipIdleMobile2: "Gold = big score. Blue = warp through walls.",
      tipIdleMobile3: "Enter starts a run. Double-tap the board to pause.",
      tipIdleMobile4: "Purple = shrink. Gold = score. Blue = warp.",
      tipIdleMobile5: "Shield blocks one crash — then turn away fast.",
      tipIdleMobile6: "Armed shrink button halves your length — tap carefully.",
      tipIdleMobile7: "Shop permanents stay unlocked after you buy them.",
      lengthLabel: "len {n}",
      toastClearBonus: "Board clear! +{n} coins",
      toastFeast: "Feast armed — big bites ahead!",
      shopMissions: "Today's goals",
      missionClaim: "Claim",
      missionClaimAll: "Claim all",
      missionDone: "Claimed",
      toastNewBestCoins: "New best! +{n} coins",
      toastExtraApple: "Bonus apple on the board!",
      mission_clears1_name: "Clean sweep",
      mission_clears1_desc: "Clear the board once today.",
      mission_clears2_name: "Double sweep",
      mission_clears2_desc: "Clear the board twice today.",
      mission_clears3_name: "Triple sweep",
      mission_clears3_desc: "Clear the board three times today.",
      mission_clears4_name: "Quad sweep",
      mission_clears4_desc: "Clear the board four times today.",
      mission_warp1_name: "Phase shift",
      mission_warp1_desc: "Eat a warp berry today.",
      mission_warp2_name: "Double phase",
      mission_warp2_desc: "Eat 2 warp berries today.",
      mission_warp3_name: "Triple phase",
      mission_warp3_desc: "Eat 3 warp berries today.",
      mission_warp4_name: "Phase marathon",
      mission_warp4_desc: "Eat 4 warp berries today.",
      mission_length12_name: "Long noodle",
      mission_length12_desc: "Grow to length 12 in one run.",
      missionProgress: "{cur}/{target}",
      toastDailyGift: "Daily gift: +{n} coins",
      mission_apples10_name: "Snack attack",
      mission_apples10_desc: "Eat 10 apples today.",
      mission_apples15_name: "Second helping",
      mission_apples15_desc: "Eat 15 apples today.",
      mission_apples20_name: "Third course",
      mission_apples20_desc: "Eat 20 apples today.",
      mission_score50_name: "Half century",
      mission_score50_desc: "Reach a score of 50 in one run.",
      mission_score20_name: "Solid run",
      mission_score20_desc: "Score 20 in a single run.",
      mission_coins2_name: "Pocket change",
      mission_coins2_desc: "Pick up 2 coins today.",
      mission_combo5_name: "Combo craze",
      mission_combo5_desc: "Reach a ×5 combo.",
      mission_golden1_name: "Gold rush",
      mission_golden1_desc: "Eat a golden apple today.",
      mission_golden2_name: "Twice gilded",
      mission_golden2_desc: "Eat 2 golden apples today.",
      mission_golden3_name: "Triple gilt",
      mission_golden3_desc: "Eat 3 golden apples today.",
      mission_golden4_name: "Gilded haul",
      mission_golden4_desc: "Eat 4 golden apples today.",
      mission_runs3_name: "Warm-up",
      mission_runs3_desc: "Finish 3 runs today.",
      toastMission: "+{n} coins — goal done!",
      runSummary: "peak len {len} · best combo ×{combo}",
      lifetimeStats: "{runs} runs · {apples} apples eaten",
      lifetimeCombo: "best combo ×{n}",
      lifetimeClears: "{n} board clears",
      nearBest: "best −{n}",
      tiedBest: "tied best",
      maxSpeed: "max speed",
      toastMilestone: "{n} points!",
      toastAntidote: "Antidote cleaned the berry!",
      toastPower: "Warp berry — phase through walls!",
      powerLabel: "Warp",
      shopTabGoals: "Goals",
      shopTabBoosts: "Boosts",
      shopTabLooks: "Looks",
      skin_classic_name: "Moss",
      skin_classic_desc: "The original garden green.",
      skin_berry_name: "Berry",
      skin_berry_desc: "Soft violet-pink coils.",
      skin_sunset_name: "Sunset",
      skin_sunset_desc: "Warm orange fading to plum.",
      skin_mint_name: "Mint",
      skin_mint_desc: "Cool seafoam body.",
      skin_candy_name: "Candy",
      skin_candy_desc: "Bright raspberry stripes.",
      skin_midnight_name: "Midnight",
      skin_midnight_desc: "Deep indigo night run.",
      skin_lava_name: "Ember",
      skin_lava_desc: "Hot coals and ash.",
      skin_frost_name: "Frost",
      skin_frost_desc: "Icy blue coils.",
      skin_neon_name: "Neon",
      skin_neon_desc: "Electric lime to cyan.",
      skin_shadow_name: "Shadow",
      skin_shadow_desc: "Soft charcoal coils.",
      skin_coral_name: "Coral",
      skin_coral_desc: "Reef orange to peach.",
      skin_honey_name: "Honey",
      skin_honey_desc: "Warm amber coils.",
      skin_aurora_name: "Aurora",
      skin_aurora_desc: "Teal shifting into violet.",
      skin_plum_name: "Plum",
      skin_plum_desc: "Deep purple orchard coils.",
      skin_ivory_name: "Ivory",
      skin_ivory_desc: "Soft cream with warm tips.",
      skin_saffron_name: "Saffron",
      skin_saffron_desc: "Golden spice coils.",
      skin_jade_name: "Jade",
      skin_jade_desc: "Polished green gem coils.",
      skin_cobalt_name: "Cobalt",
      skin_cobalt_desc: "Deep blue enamel coils.",
      skin_wine_name: "Wine",
      skin_wine_desc: "Deep burgundy coils.",
      skin_pearl_name: "Pearl",
      skin_pearl_desc: "Soft ivory with cool tips.",
      skin_graphite_name: "Graphite",
      skin_graphite_desc: "Soft pencil-grey coils.",
      skin_maple_name: "Maple",
      skin_maple_desc: "Autumn red to amber coils.",
      skin_olive_name: "Olive",
      skin_olive_desc: "Muted orchard green coils.",
      skin_lilac_name: "Lilac",
      skin_lilac_desc: "Soft lavender spring coils.",
      skin_seafoam_name: "Seafoam",
      skin_seafoam_desc: "Fresh aqua to teal coils.",
      skin_cocoa_name: "Cocoa",
      skin_cocoa_desc: "Warm chocolate brown coils.",
      skin_indigo_name: "Indigo",
      skin_indigo_desc: "Deep ink-blue night coils.",
      skin_copper_name: "Copper",
      skin_copper_desc: "Warm hammered-metal coils.",
      skin_blush_name: "Blush",
      skin_blush_desc: "Soft rose-petal coils.",
      skin_amber_name: "Amber",
      skin_amber_desc: "Honey-gold resin coils.",
      skin_ice_name: "Ice",
      skin_ice_desc: "Clear glacial blue coils.",
      skin_tangerine_name: "Tangerine",
      skin_tangerine_desc: "Bright citrus orange coils.",
      skin_smoke_name: "Smoke",
      skin_smoke_desc: "Soft ash-grey coils.",
      skin_onyx_name: "Onyx",
      skin_onyx_desc: "Polished near-black coils.",
      skin_marine_name: "Marine",
      skin_marine_desc: "Deep sea blue coils.",
      skin_cedar_name: "Cedar",
      skin_cedar_desc: "Forest needle-green coils.",
      skin_ruby_name: "Ruby",
      skin_ruby_desc: "Deep gemstone red coils.",
      skin_sapphire_name: "Sapphire",
      skin_sapphire_desc: "Deep gemstone blue coils.",
      skin_topaz_name: "Topaz",
      skin_topaz_desc: "Bright citrine-gold coils.",
      skin_emerald_name: "Emerald",
      skin_emerald_desc: "Vivid jewel-green coils.",
      skin_amethyst_name: "Amethyst",
      skin_amethyst_desc: "Royal violet gem coils.",
      skin_champagne_name: "Champagne",
      skin_champagne_desc: "Pale bubbly gold coils.",
      skin_obsidian_name: "Obsidian",
      skin_obsidian_desc: "Volcanic near-black coils.",
      skin_vermilion_name: "Vermilion",
      skin_vermilion_desc: "Bright lacquer-red coils.",
      skin_cinnabar_name: "Cinnabar",
      skin_cinnabar_desc: "Warm mineral-red coils.",
      skin_periwinkle_name: "Periwinkle",
      skin_periwinkle_desc: "Soft blue-lilac coils.",
      skin_terracotta_name: "Terracotta",
      skin_terracotta_desc: "Warm clay-orange coils.",
      floor_slate_name: "Slate",
      floor_slate_desc: "Cool stone checks.",
      floor_night_name: "Night",
      floor_night_desc: "Deep indigo court.",
      floor_rose_name: "Rose",
      floor_rose_desc: "Warm blush tiles.",
      floor_zen_name: "Zen",
      floor_zen_desc: "Quiet stone garden.",
      floor_dusk_name: "Dusk",
      floor_dusk_desc: "Soft violet evening tiles.",
      floor_lagoon_name: "Lagoon",
      floor_lagoon_desc: "Seafoam shallow water.",
      floor_citrus_name: "Citrus",
      floor_citrus_desc: "Sunny lemon picnic tiles.",
      floor_clay_name: "Clay",
      floor_clay_desc: "Warm terracotta checks.",
      floor_mist_name: "Mist",
      floor_mist_desc: "Soft foggy grey-blue tiles.",
      floor_pine_name: "Pine",
      floor_pine_desc: "Forest floor greens.",
      floor_ember_name: "Ember court",
      floor_ember_desc: "Warm ash and coal tiles.",
      floor_paper_name: "Paper",
      floor_paper_desc: "Clean cream sketchpad tiles.",
      floor_inkwell_name: "Inkwell",
      floor_inkwell_desc: "Deep ink-wash tiles.",
      floor_tea_name: "Tea",
      floor_tea_desc: "Warm steeped-leaf tiles.",
      floor_pebble_name: "Pebble",
      floor_pebble_desc: "Smooth river-stone checks.",
      floor_harbor_name: "Harbor",
      floor_harbor_desc: "Cool dockside blue-green tiles.",
      floor_bloom_name: "Bloom",
      floor_bloom_desc: "Soft petal-pink garden tiles.",
      floor_reef_name: "Reef",
      floor_reef_desc: "Shallow coral-green water tiles.",
      floor_frost_name: "Frost court",
      floor_frost_desc: "Pale icy winter tiles.",
      floor_canopy_name: "Canopy",
      floor_canopy_desc: "Leafy shade-garden tiles.",
      floor_sunrise_name: "Sunrise",
      floor_sunrise_desc: "Warm dawn picnic tiles.",
      floor_twilight_name: "Twilight",
      floor_twilight_desc: "Soft evening violet tiles.",
      floor_sandstone_name: "Sandstone",
      floor_sandstone_desc: "Warm desert stone checks.",
      floor_orchid_name: "Orchid",
      floor_orchid_desc: "Soft lilac garden tiles.",
      floor_grove_name: "Grove",
      floor_grove_desc: "Quiet leafy green tiles.",
      floor_wheat_name: "Wheat",
      floor_wheat_desc: "Sunny grain-field tiles.",
      floor_ash_name: "Ash",
      floor_ash_desc: "Soft charcoal stone tiles.",
      floor_fog_name: "Fog",
      floor_fog_desc: "Pale misty morning tiles.",
      floor_canyon_name: "Canyon",
      floor_canyon_desc: "Warm sandstone canyon tiles.",
      floor_mesa_name: "Mesa",
      floor_mesa_desc: "Dry sunbaked plateau tiles.",
      floor_river_name: "River",
      floor_river_desc: "Cool stream-bank blue tiles.",
      floor_bay_name: "Bay",
      floor_bay_desc: "Calm coastal blue-grey tiles.",
      floor_dune_name: "Dune",
      floor_dune_desc: "Soft desert sand tiles.",
      floor_cove_name: "Cove",
      floor_cove_desc: "Sheltered teal shore tiles.",
      floor_glade_name: "Glade",
      floor_glade_desc: "Sunny forest clearing tiles.",
      floor_hearth_name: "Hearth",
      floor_hearth_desc: "Warm fireside clay tiles.",
      floor_marsh_name: "Marsh",
      floor_marsh_desc: "Quiet wetland green tiles.",
      floor_atelier_name: "Atelier",
      floor_atelier_desc: "Clean studio canvas tiles.",
      floor_patio_name: "Patio",
      floor_patio_desc: "Sunny stone courtyard tiles.",
      overlayPauseKeys: "space · esc · b shop · r restart",
      shop_berry_ward_name: "Berry ward",
      shop_berry_ward_desc: "Bitter berries show up less often.",
      shop_golden_luck_name: "Golden luck",
      shop_golden_luck_desc: "Golden apples appear a bit sooner.",
      shop_nibble_name: "Nibble start",
      shop_nibble_desc: "Begin the run two segments longer.",
      shop_sharp_eyes_name: "Sharp eyes",
      shop_sharp_eyes_desc: "Mouth opens sooner when food is near.",
      shop_tidy_name: "Tidy bite",
      shop_tidy_desc: "Bitter berries fade away faster.",
      shop_steady_hands_name: "Steady hands",
      shop_steady_hands_desc: "Keep combos alive a few steps longer.",
      shop_warp_linger_name: "Warp linger",
      shop_warp_linger_desc: "Warp berries last longer.",
      shop_phase_in_name: "Phase in",
      shop_phase_in_desc: "Start with a short wall-warp burst.",
      shop_rich_bite_name: "Rich bite",
      shop_rich_bite_desc: "Next coin is worth +1 extra.",
      shop_early_coin_name: "Lucky drop",
      shop_early_coin_desc: "A coin appears sooner this run.",
      toastNibble: "Nibble start — extra length!",
      toastHeadStart: "Head start — +5 points!",
      toastPhaseIn: "Phase in — slip through walls!",
      toastSlowMo: "Slow-mo — take your time!",
      toastSugarRush: "Sugar rush — zip!",
      toastRichBite: "Rich bite armed!",
      toastRichCoin: "Rich coin! +{n}",
      toastEarlyCoin: "Lucky drop — coin inbound!",
      toastFeastDone: "Feast finished!",
      toastBoostReady: "Ready next run: {name}",
      toastEquipped: "Wearing {name}",
      toastPermanent: "Unlocked forever: {name}",
      toastFloorEquipped: "Board: {name}",
      powerSteps: "Warp · {n}",
      mission_score40_name: "High roller",
      mission_score40_desc: "Score 40 in a single run.",
      mission_coins5_name: "Coin pouch",
      mission_coins5_desc: "Pick up 5 coins today.",
      mission_coins8_name: "Coin stash",
      mission_coins8_desc: "Pick up 8 coins today.",
      mission_coins10_name: "Coin vault",
      mission_coins10_desc: "Pick up 10 coins today.",
      mission_coins12_name: "Coin trove",
      mission_coins12_desc: "Pick up 12 coins today.",
      mission_apples25_name: "Big appetite",
      mission_apples25_desc: "Eat 25 apples today.",
      mission_apples30_name: "Apple orchard",
      mission_apples30_desc: "Eat 30 apples today.",
      mission_apples35_name: "Apple harvest",
      mission_apples35_desc: "Eat 35 apples today.",
      mission_combo8_name: "Combo master",
      mission_combo8_desc: "Reach a ×8 combo.",
      mission_combo10_name: "Combo legend",
      mission_combo10_desc: "Reach a ×10 combo.",
      mission_combo12_name: "Combo myth",
      mission_combo12_desc: "Reach a ×12 combo.",
      mission_combo15_name: "Combo titan",
      mission_combo15_desc: "Reach a ×15 combo.",
      mission_runs5_name: "Practice day",
      mission_runs5_desc: "Finish 5 runs today.",
      mission_runs7_name: "Long session",
      mission_runs7_desc: "Finish 7 runs today.",
      mission_runs10_name: "Marathon day",
      mission_runs10_desc: "Finish 10 runs today.",
      mission_score60_name: "Big score",
      mission_score60_desc: "Score 60 in a single run.",
      mission_score80_name: "Score storm",
      mission_score80_desc: "Score 80 in a single run.",
      mission_score100_name: "Century",
      mission_score100_desc: "Score 100 in a single run.",
      mission_score120_name: "Score surge",
      mission_score120_desc: "Score 120 in a single run.",
      mission_length16_name: "Garden hose",
      mission_length16_desc: "Grow to length 16 in one run.",
      mission_length20_name: "Python stretch",
      mission_length20_desc: "Grow to length 20 in one run.",
      mission_length24_name: "Anaconda",
      mission_length24_desc: "Grow to length 24 in one run.",
      mission_length28_name: "Leviathan",
      mission_length28_desc: "Grow to length 28 in one run.",
      ariaThemeDark: "Switch to dark mode",
      ariaThemeLight: "Switch to light mode",
      ariaLangTh: "Switch to Thai",
      ariaLangEn: "Switch to English",
      ariaPause: "Pause",
      ariaResume: "Resume",
      ariaClose: "Close",
      ariaSwipePad: "Swipe controls",
      ariaShrinkPotion: "Use shrink potion",
      ariaSourceFiles: "Source files",
      ariaAutoSpeed: "Auto speed",
    },
    th: {
      scoreNow: "ตอนนี้",
      scoreBest: "สูงสุด",
      scoreCoins: "เหรียญ",
      coinsWord: "เหรียญ",
      legendApple: "แอปเปิ้ล",
      legendGold: "ทอง",
      legendPoison: "ขม",
      legendWarp: "วาร์ป",
      pendingBoosts: "พร้อม: {list}",
      toastLuckyBite: "เหรียญโชคดี!",
      overlayTitleIdle: "หิวมั้ย?",
      overlayTextIdle:
        "ลูกศร WASD หรือปัด ทอง=คะแนนเยอะ ม่วง=อันตราย ฟ้า=วาร์ป",
      overlayTextMobile: "ปัดบนกระดานหรือแผ่นปัด ระวังเบอร์รีม่วง",
      swipePadLabel: "ปัด",
      playGo: "ไปเลย",
      auto: "ออโต้",
      stop: "หยุด",
      shop: "ร้านค้า",
      shrink: "ย่อ",
      hint: "ลูกศร / wasd · เว้นวรรค พัก · enter เล่น · r อีกครั้ง · b ร้าน",
      ariaRestart: "เล่นอีกครั้ง",
      source: "</> โค้ด",
      sourceTitle: "โค้ด",
      copy: "คัดลอก",
      buy: "ซื้อ",
      ownedForever: "มีแล้ว",
      shopPermanent: "ถาวร",
      shopActiveRun: "ใช้อยู่รอบนี้",
      shopReadyNext: "พร้อมใช้รอบถัดไป",
      again: "อีกครั้ง",
      back: "เล่นต่อ",
      endRun: "จบรอบ",
      equip: "ใส่",
      equipped: "ใส่อยู่",
      shopLooks: "ลุค",
      shopFloors: "กระดาน",
      comboLabel: "คอมโบ ×{n}",
      toastCombo: "คอมโบ ×{n}!",
      toastPoison: "เบอร์รีขม — ตัวสั้นลง!",
      overlayStats: "สูงสุด {best} · {coins} เหรียญ",
      floor_meadow_name: "ทุ่งหญ้า",
      floor_meadow_desc: "ตารางม่วงอ่อน",
      floor_sand_name: "ทราย",
      floor_sand_desc: "กระเบื้องเนินทราย",
      floor_pond_name: "บ่อน้ำ",
      floor_pond_desc: "ฟ้าเย็นๆ",
      floor_orchard_name: "สวนผลไม้",
      floor_orchard_desc: "เขียวใบปิกนิก",
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
      toastShield: "โล่กันชนไว้ — รีบเลี้ยวหนี!",
      toastRevive: "ใช้ชีวิตพิเศษแล้ว!",
      toastShieldArmed: "ติดโล่แล้ว — กันชนครั้งหนึ่ง!",
      toastReviveArmed: "พร้อมชุบ — ชีวิตเพิ่ม 1!",
      toastScoreBoost: "คะแนน x2 — แอปเปิ้ลคุ้มสองเท่า!",
      toastGhostWalls: "กำแพงผี — พันขอบกระดานได้!",
      overlayPause: "เดี๋ยวก่อน.",
      overlayPauseText: "เล่นต่อ เปิดร้าน หรือจบรอบ",
      shop_slow_start_name: "สโลว์โม",
      shop_slow_start_desc: "งูเคลื่อนช้าลง 35% ต่อรอบ",
      shop_revive_name: "ชีวิตพิเศษ",
      shop_revive_desc: "ฟื้นคืนชีพได้ครั้งเดียวหลังชน",
      shop_shrink_name: "ยาเล็ก",
      shop_shrink_desc: "ลดความยาวงูครึ่งหนึ่งระหว่างเล่น (กด X)",
      shop_score_boost_name: "คะแนน x2",
      shop_score_boost_desc: "แอปเปิ้ลได้คะแนนสองเท่าต่อรอบ",
      shop_magnet_name: "แม่เหล็กดูดเหรียญ",
      shop_magnet_desc: "เหรียญโผล่บ่อยขึ้นและลอยเข้าหาคุณ",
      shop_ghost_walls_name: "กำแพงผี",
      shop_ghost_walls_desc: "ทะลุกำแพงได้ต่อรอบ",
      shop_more_apples_name: "แอปเปิ้ลเพิ่ม",
      shop_more_apples_desc: "มี 5 แอปเปิ้ลบนกระดาน",
      shop_shield_name: "โล่",
      shop_shield_desc: "กันการชนครั้งหนึ่งโดยไม่รีเซ็ต",
      shop_head_start_name: "เริ่มนำ",
      shop_head_start_desc: "ได้ 5 คะแนนทันที",
      shop_lucky_coins_name: "เหรียญโชคดี",
      shop_lucky_coins_desc: "เหรียญอยู่บนกระดานนานขึ้น 50%",
      shop_dash_name: "ซูการ์รัช",
      shop_dash_desc: "เคลื่อนเร็วขึ้น 40% ต่อรอบ",
      shop_trail_name: "ทางประกาย",
      shop_trail_desc: "ทิ้งประกายตอนเลื้อย (ของแต่ง)",
      shop_antidote_name: "ยาแก้พิษ",
      shop_antidote_desc: "กันเบอร์รีขมได้ครั้งหนึ่ง",
      shop_sweet_tooth_name: "ฟันหวาน",
      shop_sweet_tooth_desc: "แอปเปิ้ลได้ +1 ตลอดไป",
      shop_echo_name: "เงาตาม",
      shop_echo_desc: "ทิ้งเงาจางๆ ตอนเลื้อย",
      shop_feast_name: "งานเลี้ยง",
      shop_feast_desc: "แอปเปิ้ล 3 ลูกถัดไปได้โบนัส +2",
      shop_calm_name: "ใจเย็น",
      shop_calm_desc: "ความเร็วคงที่ ไม่เร่งตอนท้าย",
      shop_surprise_name: "ถุงสุ่ม",
      shop_surprise_desc: "สุ่มบูสต์สำหรับรอบนี้",
      shop_combo_grace_name: "ต่อคอมโบ",
      shop_combo_grace_desc: "มีเวลาต่อคอมโบมากขึ้น",
      toastSurprise: "สุ่มได้: {name}!",
      toastShrink: "ยาหด — ตัวสั้นครึ่ง!",
      toastShrinkArmed: "ติดยาหด — กด X เมื่อแน่น!",
      toastAntidoteArmed: "ยาแก้พร้อมสำหรับเบอร์รีขมครั้งถัดไป!",
      toastComboGrace: "ต่อคอมโบ — กัดช้าได้นานขึ้น!",
      toastCalm: "ใจเย็น — ความเร็วคงที่!",
      tipIdle0: "แอปเปิ้ลทอง = 5 คะแนน เบอร์รีฟ้า = วาร์ปกำแพง",
      tipIdle1: "กัดต่อเนื่องเร็วๆ ได้โบนัสคอมโบ",
      tipIdle2: "B เปิดร้าน Esc หรือเว้นวรรค พักเกม",
      tipIdle3: "เคลียร์กระดานได้โบนัสเหรียญ",
      tipIdle4: "แม่เหล็กเหรียญดึงเหรียญใกล้ๆ เข้าหา",
      tipIdle5: "ใกล้คะแนนสูงสุด HUD จะบอกว่าเหลือเท่าไร",
      tipIdle6: "รับรางวัลภารกิจในร้านได้เหรียญโบนัส",
      tipIdle7: "เบอร์รีม่วงทำให้สั้น — ยาแก้หรือกัดสะอาดช่วยได้",
      tipIdle8: "โล่กันชนครั้งเดียว — รีบเลี้ยวหนีก่อนโดนรอบถัดไป",
      tipIdle9: "กด X ใช้ยาหดกลางรอบเมื่อติดอาวุธไว้",
      tipIdle10: "ของถาวรในร้านอยู่ตลอด — คุ้มที่จะเก็บเหรียญซื้อ",
      tipIdleMobile0: "ปัดบนกระดานหรือแผ่นปัด ระวังม่วง",
      tipIdleMobile1: "แตะพักได้ทุกเมื่อ ร้านใช้กลางรอบได้",
      tipIdleMobile2: "ทอง = คะแนนเยอะ ฟ้า = วาร์ปกำแพง",
      tipIdleMobile3: "Enter เริ่มเล่น แตะสองครั้งที่กระดานเพื่อพัก",
      tipIdleMobile4: "ม่วง = สั้น ทอง = คะแนน ฟ้า = วาร์ป",
      tipIdleMobile5: "โล่กันชนครั้งเดียว — เลี้ยวหนีเร็วๆ",
      tipIdleMobile6: "ปุ่มยาหดทำให้สั้นครึ่ง — แตะเมื่อจำเป็น",
      tipIdleMobile7: "ของถาวรในร้านปลดล็อกแล้วอยู่ตลอด",
      lengthLabel: "ยาว {n}",
      toastClearBonus: "เคลียร์กระดาน! +{n} เหรียญ",
      toastFeast: "งานเลี้ยงพร้อม — กัดใหญ่ๆ เลย!",
      shopMissions: "ภารกิจวันนี้",
      missionClaim: "รับรางวัล",
      missionClaimAll: "รับทั้งหมด",
      missionDone: "รับแล้ว",
      toastNewBestCoins: "สูงสุดใหม่! +{n} เหรียญ",
      toastExtraApple: "แอปเปิ้ลโบนัสบนกระดาน!",
      mission_clears1_name: "กวาดกระดาน",
      mission_clears1_desc: "เคลียร์กระดานให้ได้ 1 ครั้งวันนี้",
      mission_clears2_name: "กวาดสองครั้ง",
      mission_clears2_desc: "เคลียร์กระดานให้ได้ 2 ครั้งวันนี้",
      mission_clears3_name: "กวาดสามครั้ง",
      mission_clears3_desc: "เคลียร์กระดานให้ได้ 3 ครั้งวันนี้",
      mission_clears4_name: "กวาดสี่ครั้ง",
      mission_clears4_desc: "เคลียร์กระดานให้ได้ 4 ครั้งวันนี้",
      mission_warp1_name: "วาร์ป",
      mission_warp1_desc: "กินเบอร์รีวาร์ปให้ได้ 1 ครั้งวันนี้",
      mission_warp2_name: "วาร์ปสองครั้ง",
      mission_warp2_desc: "กินเบอร์รีวาร์ปให้ได้ 2 ครั้งวันนี้",
      mission_warp3_name: "วาร์ปสามครั้ง",
      mission_warp3_desc: "กินเบอร์รีวาร์ปให้ได้ 3 ครั้งวันนี้",
      mission_warp4_name: "วาร์ปมาราธอน",
      mission_warp4_desc: "กินเบอร์รีวาร์ปให้ได้ 4 ครั้งวันนี้",
      mission_length12_name: "ตัวยาว",
      mission_length12_desc: "ยาวถึง 12 ในรอบเดียว",
      toastDailyGift: "ของขวัญรายวัน: +{n} เหรียญ",
      missionProgress: "{cur}/{target}",
      mission_apples10_name: "ง่วนแอปเปิ้ล",
      mission_apples10_desc: "กินแอปเปิ้ล 10 ลูกวันนี้",
      mission_apples15_name: "อีกจาน",
      mission_apples15_desc: "กินแอปเปิ้ล 15 ลูกวันนี้",
      mission_apples20_name: "จานสาม",
      mission_apples20_desc: "กินแอปเปิ้ล 20 ลูกวันนี้",
      mission_score50_name: "ครึ่งร้อย",
      mission_score50_desc: "ได้คะแนน 50 ในรอบเดียว",
      mission_score20_name: "รอบแน่น",
      mission_score20_desc: "ได้ 20 คะแนนในรอบเดียว",
      mission_coins2_name: "เก็บเหรียญ",
      mission_coins2_desc: "เก็บเหรียญ 2 เหรียญวันนี้",
      mission_combo5_name: "คอมโบสุด",
      mission_combo5_desc: "ทำคอมโบถึง ×5",
      mission_golden1_name: "ล่าทอง",
      mission_golden1_desc: "กินแอปเปิ้ลทองวันนี้",
      mission_golden2_name: "ทองสองครั้ง",
      mission_golden2_desc: "กินแอปเปิ้ลทอง 2 ลูกวันนี้",
      mission_golden3_name: "ทองสามครั้ง",
      mission_golden3_desc: "กินแอปเปิ้ลทอง 3 ลูกวันนี้",
      mission_golden4_name: "ทองเต็มมือ",
      mission_golden4_desc: "กินแอปเปิ้ลทอง 4 ลูกวันนี้",
      mission_runs3_name: "วอร์มอัพ",
      mission_runs3_desc: "เล่นจบ 3 รอบวันนี้",
      toastMission: "+{n} เหรียญ — ภารกิจสำเร็จ!",
      runSummary: "ยาวสุด {len} · คอมโบสูงสุด ×{combo}",
      lifetimeStats: "{runs} รอบ · กินแอปเปิ้ล {apples} ลูก",
      lifetimeCombo: "คอมโบสูงสุด ×{n}",
      lifetimeClears: "เคลียร์กระดาน {n} ครั้ง",
      nearBest: "สูงสุด −{n}",
      tiedBest: "เสมอสูงสุด",
      maxSpeed: "เร็วสุด",
      toastMilestone: "{n} คะแนน!",
      toastAntidote: "ยาแก้พิษล้างเบอร์รีแล้ว!",
      toastPower: "เบอร์รีวาร์ป — ทะลุกำแพง!",
      powerLabel: "วาร์ป",
      shopTabGoals: "ภารกิจ",
      shopTabBoosts: "บูสต์",
      shopTabLooks: "ลุค",
      skin_classic_name: "มอส",
      skin_classic_desc: "เขียวสวนแบบดั้งเดิม",
      skin_berry_name: "เบอร์รี",
      skin_berry_desc: "ม่วงชมพูอ่อนๆ",
      skin_sunset_name: "พระอาทิตย์ตก",
      skin_sunset_desc: "ส้มอุ่นไล่ไปม่วง",
      skin_mint_name: "มิ้นต์",
      skin_mint_desc: "เขียวมิ้นต์เย็นๆ",
      skin_candy_name: "ลูกกวาด",
      skin_candy_desc: "ชมพูสดใส",
      skin_midnight_name: "เที่ยงคืน",
      skin_midnight_desc: "ครามเข้มยามค่ำ",
      skin_lava_name: "ถ่านไฟ",
      skin_lava_desc: "ถ่านร้อนกับเถ้า",
      skin_frost_name: "น้ำแข็ง",
      skin_frost_desc: "ขดตัวฟ้าเย็น",
      skin_neon_name: "นีออน",
      skin_neon_desc: "เขียวไฟฟ้าไล่ฟ้า",
      skin_shadow_name: "เงา",
      skin_shadow_desc: "ขดตัวเทาเข้มนุ่ม",
      skin_coral_name: "ปะการัง",
      skin_coral_desc: "ส้มแนวปะการัง",
      skin_honey_name: "น้ำผึ้ง",
      skin_honey_desc: "ขดตัวสีอำพันอุ่น",
      skin_aurora_name: "ออโรร่า",
      skin_aurora_desc: "เขียวฟ้าไล่ไปม่วง",
      skin_plum_name: "พลัม",
      skin_plum_desc: "ม่วงเข้มแบบสวนพลัม",
      skin_ivory_name: "งาช้าง",
      skin_ivory_desc: "ครีมอ่อนปลายอุ่น",
      skin_saffron_name: "หญ้าฝรั่น",
      skin_saffron_desc: "ขดตัวสีเครื่องเทศทอง",
      skin_jade_name: "หยก",
      skin_jade_desc: "ขดตัวเขียวมรกต",
      skin_cobalt_name: "โคบอลต์",
      skin_cobalt_desc: "ขดตัวน้ำเงินเข้ม",
      skin_wine_name: "ไวน์",
      skin_wine_desc: "ขดตัวแดงเข้ม",
      skin_pearl_name: "ไข่มุก",
      skin_pearl_desc: "งาช้างอ่อนปลายเย็น",
      skin_graphite_name: "กราไฟต์",
      skin_graphite_desc: "ขดตัวเทาดินสอ",
      skin_maple_name: "เมเปิล",
      skin_maple_desc: "แดงใบไม้ไล่ไปอำพัน",
      skin_olive_name: "มะกอก",
      skin_olive_desc: "เขียวสวนอ่อนๆ",
      skin_lilac_name: "ไลแลค",
      skin_lilac_desc: "ขดตัวม่วงลาเวนเดอร์อ่อน",
      skin_seafoam_name: "โฟมทะเล",
      skin_seafoam_desc: "ขดตัวฟ้าน้ำทะเลสด",
      skin_cocoa_name: "โกโก้",
      skin_cocoa_desc: "ขดตัวน้ำตาลอุ่นๆ",
      skin_indigo_name: "อินดิโก",
      skin_indigo_desc: "ขดตัวน้ำเงินหมึกเข้ม",
      skin_copper_name: "ทองแดง",
      skin_copper_desc: "ขดตัวโลหะอุ่นๆ",
      skin_blush_name: "บลัช",
      skin_blush_desc: "ขดตัวชมพูดอกกุหลาบ",
      skin_amber_name: "อำพัน",
      skin_amber_desc: "ขดตัวทองน้ำผึ้ง",
      skin_ice_name: "น้ำแข็ง",
      skin_ice_desc: "ขดตัวฟ้าน้ำแข็งใส",
      skin_tangerine_name: "ส้มแมนดาริน",
      skin_tangerine_desc: "ขดตัวส้มสดใส",
      skin_smoke_name: "ควัน",
      skin_smoke_desc: "ขดตัวเทาเถ้าอ่อน",
      skin_onyx_name: "โอนิกซ์",
      skin_onyx_desc: "ขดตัวดำเงา",
      skin_marine_name: "ทะเลลึก",
      skin_marine_desc: "ขดตัวน้ำเงินทะเล",
      skin_cedar_name: "ซีดาร์",
      skin_cedar_desc: "ขดตัวเขียวป่าสน",
      skin_ruby_name: "ทับทิม",
      skin_ruby_desc: "ขดตัวแดงอัญมณี",
      skin_sapphire_name: "แซฟไฟร์",
      skin_sapphire_desc: "ขดตัวน้ำเงินอัญมณี",
      skin_topaz_name: "โทแพซ",
      skin_topaz_desc: "ขดตัวทองซิทริน",
      skin_emerald_name: "มรกต",
      skin_emerald_desc: "ขดตัวเขียวอัญมณี",
      skin_amethyst_name: "อเมทิสต์",
      skin_amethyst_desc: "ขดตัวม่วงอัญมณี",
      skin_champagne_name: "แชมเปญ",
      skin_champagne_desc: "ขดตัวทองฟองอ่อน",
      skin_obsidian_name: "อบซิเดียน",
      skin_obsidian_desc: "ขดตัวดำภูเขาไฟ",
      skin_vermilion_name: "ชาด",
      skin_vermilion_desc: "ขดตัวแดงสด",
      skin_cinnabar_name: "ซินนาบาร์",
      skin_cinnabar_desc: "ขดตัวแดงแร่ร้อน",
      skin_periwinkle_name: "เพริวิงเคิล",
      skin_periwinkle_desc: "ขดตัวฟ้าม่วงอ่อน",
      skin_terracotta_name: "ดินเผา",
      skin_terracotta_desc: "ขดตัวส้มดินเผาอุ่น",
      floor_slate_name: "หินชนวน",
      floor_slate_desc: "ตารางหินเย็นๆ",
      floor_night_name: "กลางคืน",
      floor_night_desc: "สนามครามเข้ม",
      floor_rose_name: "กุหลาบ",
      floor_rose_desc: "ชมพูอุ่นๆ",
      floor_zen_name: "เซน",
      floor_zen_desc: "สวนหินเงียบๆ",
      floor_dusk_name: "ยามเย็น",
      floor_dusk_desc: "ตารางม่วงยามเย็น",
      floor_lagoon_name: "ทะเลสาบ",
      floor_lagoon_desc: "น้ำตื้นสีเขียวฟ้า",
      floor_citrus_name: "ซิตรัส",
      floor_citrus_desc: "ตารางเลมอนแดดอุ่น",
      floor_clay_name: "ดินเหนียว",
      floor_clay_desc: "ตารางดินเผาอุ่น",
      floor_mist_name: "หมอก",
      floor_mist_desc: "ตารางเทาฟ้าหมอกบาง",
      floor_pine_name: "สน",
      floor_pine_desc: "พื้นป่าเขียวๆ",
      floor_ember_name: "ถ่านไฟ",
      floor_ember_desc: "ตารางเถ้าถ่านอุ่น",
      floor_paper_name: "กระดาษ",
      floor_paper_desc: "ตารางครีมแบบสมุดวาด",
      floor_inkwell_name: "หมึก",
      floor_inkwell_desc: "ตารางหมึกเข้ม",
      floor_tea_name: "ชา",
      floor_tea_desc: "ตารางใบชาอุ่นๆ",
      floor_pebble_name: "กรวด",
      floor_pebble_desc: "ตารางหินแม่น้ำเรียบ",
      floor_harbor_name: "ท่าเรือ",
      floor_harbor_desc: "ตารางฟ้าเขียวแบบท่าเรือ",
      floor_bloom_name: "ดอกบาน",
      floor_bloom_desc: "ตารางชมพูดอกไม้สวน",
      floor_reef_name: "ปะการัง",
      floor_reef_desc: "ตารางน้ำตื้นเขียวปะการัง",
      floor_frost_name: "น้ำแข็ง",
      floor_frost_desc: "ตารางน้ำแข็งอ่อนๆ",
      floor_canopy_name: "เรือนยอดไม้",
      floor_canopy_desc: "ตารางร่มเงาใบไม้",
      floor_sunrise_name: "ยามเช้า",
      floor_sunrise_desc: "ตารางแดดเช้าอุ่นๆ",
      floor_twilight_name: "สนธยา",
      floor_twilight_desc: "ตารางม่วงยามเย็น",
      floor_sandstone_name: "หินทราย",
      floor_sandstone_desc: "ตารางหินทะเลทรายอุ่น",
      floor_orchid_name: "กล้วยไม้",
      floor_orchid_desc: "ตารางม่วงอ่อนแบบสวน",
      floor_grove_name: "ดงไม้",
      floor_grove_desc: "ตารางเขียวเงียบๆ",
      floor_wheat_name: "ข้าวสาลี",
      floor_wheat_desc: "ตารางทุ่งทองแดดอุ่น",
      floor_ash_name: "เถ้า",
      floor_ash_desc: "ตารางหินเทาอ่อน",
      floor_fog_name: "หมอกบาง",
      floor_fog_desc: "ตารางหมอกเช้าจางๆ",
      floor_canyon_name: "หุบเขา",
      floor_canyon_desc: "ตารางหุบเขาหินทรายอุ่น",
      floor_mesa_name: "เมซา",
      floor_mesa_desc: "ตารางที่ราบสูงแดดแรง",
      floor_river_name: "แม่น้ำ",
      floor_river_desc: "ตารางริมลำธารเย็นๆ",
      floor_bay_name: "อ่าว",
      floor_bay_desc: "ตารางฟ้าเท่าริมทะเล",
      floor_dune_name: "เนินทราย",
      floor_dune_desc: "ตารางทรายทะเลทรายอ่อน",
      floor_cove_name: "อ่าวเล็ก",
      floor_cove_desc: "ตารางเขียวฟ้าชายฝั่ง",
      floor_glade_name: "ลานโล่งป่า",
      floor_glade_desc: "ตารางโล่งป่าแดดอุ่น",
      floor_hearth_name: "เตาไฟ",
      floor_hearth_desc: "ตารางดินเผาริมไฟอุ่น",
      floor_marsh_name: "หนองน้ำ",
      floor_marsh_desc: "ตารางเขียวพื้นที่ชื้น",
      floor_atelier_name: "ห้องวาด",
      floor_atelier_desc: "ตารางผ้าใบห้องทำงาน",
      floor_patio_name: "ลานบ้าน",
      floor_patio_desc: "ตารางลานหินแดดอุ่น",
      overlayPauseKeys: "space · esc · b ร้าน · r เริ่มใหม่",
      shop_berry_ward_name: "เกราะเบอร์รี",
      shop_berry_ward_desc: "เบอร์รีขมโผล่น้อยลง",
      shop_golden_luck_name: "โชคทอง",
      shop_golden_luck_desc: "แอปเปิ้ลทองโผล่เร็วขึ้นนิดหน่อย",
      shop_nibble_name: "เริ่มยาว",
      shop_nibble_desc: "เริ่มรอบยาวขึ้น 2 ท่อน",
      shop_sharp_eyes_name: "ตาคม",
      shop_sharp_eyes_desc: "อ้าปากเร็วขึ้นเมื่ออาหารใกล้",
      shop_tidy_name: "กัดสะอาด",
      shop_tidy_desc: "เบอร์รีขมหายเร็วขึ้น",
      shop_steady_hands_name: "มือนิ่ง",
      shop_steady_hands_desc: "คอมโบอยู่ได้นานขึ้นอีกนิด",
      shop_warp_linger_name: "วาร์ปยาว",
      shop_warp_linger_desc: "เบอร์รีวาร์ปอยู่ได้นานขึ้น",
      shop_phase_in_name: "วาร์ปเข้า",
      shop_phase_in_desc: "เริ่มรอบด้วยวาร์ปกำแพงสั้นๆ",
      shop_rich_bite_name: "เหรียญพิเศษ",
      shop_rich_bite_desc: "เหรียญถัดไปได้ +1 เพิ่ม",
      shop_early_coin_name: "เหรียญเร็ว",
      shop_early_coin_desc: "เหรียญโผล่เร็วขึ้นในรอบนี้",
      toastNibble: "เริ่มยาว — ตัวยาวขึ้น!",
      toastHeadStart: "เริ่มนำ — +5 คะแนน!",
      toastPhaseIn: "วาร์ปเข้า — ทะลุกำแพงได้!",
      toastSlowMo: "สโลว์โม — ค่อยๆ ไป!",
      toastSugarRush: "ซูการ์รัช — ลุย!",
      toastRichBite: "ติดเหรียญพิเศษแล้ว!",
      toastRichCoin: "เหรียญพิเศษ! +{n}",
      toastEarlyCoin: "เหรียญเร็ว — กำลังมา!",
      toastFeastDone: "เลี้ยงเสร็จแล้ว!",
      toastBoostReady: "พร้อมรอบหน้า: {name}",
      toastEquipped: "ใส่ {name}",
      toastPermanent: "ปลดล็อกถาวร: {name}",
      toastFloorEquipped: "กระดาน: {name}",
      powerSteps: "วาร์ป · {n}",
      mission_score40_name: "คะแนนสูง",
      mission_score40_desc: "ได้ 40 คะแนนในรอบเดียว",
      mission_coins5_name: "ถุงเหรียญ",
      mission_coins5_desc: "เก็บเหรียญให้ได้ 5 วันนี้",
      mission_coins8_name: "กองเหรียญ",
      mission_coins8_desc: "เก็บเหรียญให้ได้ 8 วันนี้",
      mission_coins10_name: "คลังเหรียญ",
      mission_coins10_desc: "เก็บเหรียญให้ได้ 10 วันนี้",
      mission_coins12_name: "สมบัติเหรียญ",
      mission_coins12_desc: "เก็บเหรียญให้ได้ 12 วันนี้",
      mission_apples25_name: "หิวมาก",
      mission_apples25_desc: "กินแอปเปิ้ล 25 ลูกวันนี้",
      mission_apples30_name: "สวนแอปเปิ้ล",
      mission_apples30_desc: "กินแอปเปิ้ล 30 ลูกวันนี้",
      mission_apples35_name: "เก็บเกี่ยวแอปเปิ้ล",
      mission_apples35_desc: "กินแอปเปิ้ล 35 ลูกวันนี้",
      mission_combo8_name: "คอมโบโปร",
      mission_combo8_desc: "ทำคอมโบถึง ×8",
      mission_combo10_name: "คอมโบตำนาน",
      mission_combo10_desc: "ทำคอมโบถึง ×10",
      mission_combo12_name: "คอมโบเทพ",
      mission_combo12_desc: "ทำคอมโบถึง ×12",
      mission_combo15_name: "คอมโบไททัน",
      mission_combo15_desc: "ทำคอมโบถึง ×15",
      mission_runs5_name: "ซ้อมวันนี้",
      mission_runs5_desc: "เล่นจบ 5 รอบวันนี้",
      mission_runs7_name: "เซสชันยาว",
      mission_runs7_desc: "เล่นจบ 7 รอบวันนี้",
      mission_runs10_name: "มาราธอน",
      mission_runs10_desc: "เล่นจบ 10 รอบวันนี้",
      mission_score60_name: "คะแนนใหญ่",
      mission_score60_desc: "ได้ 60 คะแนนในรอบเดียว",
      mission_score80_name: "พายุคะแนน",
      mission_score80_desc: "ได้ 80 คะแนนในรอบเดียว",
      mission_score100_name: "ร้อยคะแนน",
      mission_score100_desc: "ได้ 100 คะแนนในรอบเดียว",
      mission_score120_name: "คลื่นคะแนน",
      mission_score120_desc: "ได้ 120 คะแนนในรอบเดียว",
      mission_length16_name: "สายยางสวน",
      mission_length16_desc: "ยาวถึง 16 ในรอบเดียว",
      mission_length20_name: "ยืดยาว",
      mission_length20_desc: "ยาวถึง 20 ในรอบเดียว",
      mission_length24_name: "อนาคอนดา",
      mission_length24_desc: "ยาวถึง 24 ในรอบเดียว",
      mission_length28_name: "เลไวอาธาน",
      mission_length28_desc: "ยาวถึง 28 ในรอบเดียว",
      ariaThemeDark: "เปลี่ยนเป็นโหมดมืด",
      ariaThemeLight: "เปลี่ยนเป็นโหมดสว่าง",
      ariaLangTh: "เปลี่ยนเป็นภาษาไทย",
      ariaLangEn: "Switch to English",
      ariaPause: "หยุดชั่วคราว",
      ariaResume: "เล่นต่อ",
      ariaClose: "ปิด",
      ariaSwipePad: "แผ่นปัดควบคุมทิศทาง",
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

  function shopItemName(id) {
    return t(`shop_${id}_name`);
  }

  function shopItemDesc(id) {
    return t(`shop_${id}_desc`);
  }

  function skinName(id) {
    return t(`skin_${id}_name`);
  }

  function skinDesc(id) {
    return t(`skin_${id}_desc`);
  }

  function floorName(id) {
    return t(`floor_${id}_name`);
  }

  function floorDesc(id) {
    return t(`floor_${id}_desc`);
  }

  function setOverlayMenuMode(mode) {
    const pauseMode = mode === "pause";
    const lobbyMode = mode === "lobby" || pauseMode;
    overlayShopBtn.hidden = !lobbyMode;
    overlayQuitBtn.hidden = !pauseMode;
    if (lobbyMode) overlayShopBtn.textContent = t("shop");
    if (pauseMode) overlayQuitBtn.textContent = t("endRun");
  }

  function idleOverlayKeys() {
    const tips = idleOverlayMobile
      ? [
          "tipIdleMobile0",
          "tipIdleMobile1",
          "tipIdleMobile2",
          "tipIdleMobile3",
          "tipIdleMobile4",
          "tipIdleMobile5",
          "tipIdleMobile6",
          "tipIdleMobile7",
        ]
      : [
          "tipIdle0",
          "tipIdle1",
          "tipIdle2",
          "tipIdle3",
          "tipIdle4",
          "tipIdle5",
          "tipIdle6",
          "tipIdle7",
          "tipIdle8",
          "tipIdle9",
          "tipIdle10",
        ];
    const tipKey = tips[Math.floor(Math.random() * tips.length)];
    return {
      titleKey: "overlayTitleIdle",
      textKey: tipKey,
      btnKey: "playGo",
      menuMode: "lobby",
      vars: { best: highScore, coins },
    };
  }

  function refreshOverlay() {
    if (!overlayState) return;
    overlayTitle.textContent = t(overlayState.titleKey, overlayState.vars);
    overlayText.textContent = t(overlayState.textKey, overlayState.vars);
    playBtn.textContent = t(overlayState.btnKey);
    setOverlayMenuMode(overlayState.menuMode || "default");
    if (overlayStatsEl) {
      const overKeys = ["overlayOuch", "overlayNewBest", "overlayAiRun"];
      const isOver = overKeys.includes(overlayState.titleKey);
      const showStats =
        overlayState.menuMode === "lobby" ||
        overlayState.menuMode === "pause" ||
        isOver;
      if (showStats) {
        overlayStatsEl.hidden = false;
        if (isOver && !aiAssisted) {
          overlayStatsEl.textContent = [
            t("overlayStats", { best: highScore, coins }),
            t("runSummary", {
              len: runPeakLength || snake?.length || 3,
              combo: runMaxCombo || 0,
            }),
          ].join(" · ");
        } else if (overlayState.menuMode === "pause") {
          overlayStatsEl.textContent = [
            `${t("scoreNow")} ${score} · ${coins} ${t("coinsWord")}`,
            t("overlayPauseKeys"),
          ].join(" · ");
        } else {
          const parts = [
            t("overlayStats", {
              best: highScore,
              coins,
            }),
          ];
          if (lifetime.runs > 0 || lifetime.apples > 0) {
            parts.push(
              t("lifetimeStats", {
                runs: lifetime.runs,
                apples: lifetime.apples,
              }),
            );
          }
          if (lifetime.bestCombo > 1) {
            parts.push(t("lifetimeCombo", { n: lifetime.bestCombo }));
          }
          if (lifetime.clears > 0) {
            parts.push(t("lifetimeClears", { n: lifetime.clears }));
          }
          const ready = CONSUMABLE_KEYS.filter((key) => pending[key]).map(
            (key) => shopItemName(key),
          );
          if (ready.length) {
            parts.push(
              t("pendingBoosts", {
                list: ready.slice(0, 3).join(", "),
              }),
            );
          }
          overlayStatsEl.textContent = parts.join(" · ");
        }
      } else {
        overlayStatsEl.hidden = true;
      }
    }
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
    if (desktopPauseBtn) {
      desktopPauseBtn.setAttribute(
        "aria-label",
        t(state === "paused" ? "ariaResume" : "ariaPause"),
      );
      desktopPauseBtn.textContent = t(
        state === "paused" ? "back" : "ariaPause",
      );
    }
    shrinkBtn.setAttribute("aria-label", t("ariaShrinkPotion"));
    document
      .getElementById("swipe-pad")
      .setAttribute("aria-label", t("ariaSwipePad"));
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
  const PENDING_KEY = "mumu-pending";
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
    magnet: 0,
    more_apples: 0,
    lucky_coins: 0,
    trail: 0,
    sweet_tooth: 0,
    echo: 0,
    berry_ward: 0,
    golden_luck: 0,
    sharp_eyes: 0,
    tidy: 0,
    steady_hands: 0,
    warp_linger: 0,
  };

  const SKINS = [
    {
      id: "classic",
      price: 0,
      from: [143, 188, 74],
      to: [58, 106, 48],
    },
    {
      id: "berry",
      price: 20,
      from: [210, 130, 188],
      to: [118, 58, 112],
    },
    {
      id: "sunset",
      price: 24,
      from: [240, 156, 78],
      to: [156, 68, 98],
    },
    {
      id: "mint",
      price: 24,
      from: [120, 210, 186],
      to: [42, 128, 118],
    },
    {
      id: "candy",
      price: 32,
      from: [255, 130, 162],
      to: [196, 64, 110],
    },
    {
      id: "midnight",
      price: 36,
      from: [130, 146, 220],
      to: [48, 52, 110],
    },
    {
      id: "lava",
      price: 40,
      from: [255, 120, 64],
      to: [140, 40, 36],
    },
    {
      id: "frost",
      price: 40,
      from: [170, 220, 255],
      to: [60, 110, 170],
    },
    {
      id: "neon",
      price: 44,
      from: [180, 255, 80],
      to: [40, 200, 210],
    },
    {
      id: "shadow",
      price: 36,
      from: [120, 120, 140],
      to: [40, 40, 55],
    },
    {
      id: "coral",
      price: 32,
      from: [255, 140, 110],
      to: [200, 80, 90],
    },
    {
      id: "honey",
      price: 36,
      from: [240, 190, 70],
      to: [170, 100, 30],
    },
    {
      id: "aurora",
      price: 44,
      from: [80, 220, 200],
      to: [120, 70, 190],
    },
    {
      id: "plum",
      price: 36,
      from: [180, 110, 170],
      to: [90, 40, 100],
    },
    {
      id: "ivory",
      price: 32,
      from: [245, 236, 220],
      to: [200, 160, 120],
    },
    {
      id: "saffron",
      price: 40,
      from: [255, 200, 70],
      to: [190, 110, 30],
    },
    {
      id: "jade",
      price: 36,
      from: [90, 200, 140],
      to: [30, 110, 80],
    },
    {
      id: "cobalt",
      price: 40,
      from: [80, 130, 220],
      to: [30, 50, 120],
    },
    {
      id: "wine",
      price: 36,
      from: [190, 70, 100],
      to: [100, 30, 55],
    },
    {
      id: "pearl",
      price: 32,
      from: [240, 236, 248],
      to: [160, 170, 200],
    },
    {
      id: "graphite",
      price: 28,
      from: [160, 160, 168],
      to: [70, 72, 80],
    },
    {
      id: "maple",
      price: 36,
      from: [220, 90, 60],
      to: [180, 120, 40],
    },
    {
      id: "olive",
      price: 30,
      from: [170, 180, 90],
      to: [80, 100, 50],
    },
    {
      id: "lilac",
      price: 34,
      from: [210, 170, 230],
      to: [120, 80, 160],
    },
    {
      id: "seafoam",
      price: 32,
      from: [140, 220, 200],
      to: [50, 130, 140],
    },
    {
      id: "cocoa",
      price: 30,
      from: [190, 130, 90],
      to: [90, 55, 40],
    },
    {
      id: "indigo",
      price: 36,
      from: [120, 110, 210],
      to: [45, 40, 110],
    },
    {
      id: "copper",
      price: 32,
      from: [220, 140, 80],
      to: [130, 70, 40],
    },
    {
      id: "blush",
      price: 30,
      from: [240, 160, 170],
      to: [170, 80, 110],
    },
    {
      id: "amber",
      price: 34,
      from: [245, 180, 70],
      to: [180, 100, 30],
    },
    {
      id: "ice",
      price: 32,
      from: [200, 235, 255],
      to: [70, 130, 190],
    },
    {
      id: "tangerine",
      price: 30,
      from: [255, 160, 70],
      to: [200, 80, 40],
    },
    {
      id: "smoke",
      price: 28,
      from: [190, 190, 198],
      to: [90, 92, 100],
    },
    {
      id: "onyx",
      price: 36,
      from: [80, 85, 95],
      to: [25, 28, 35],
    },
    {
      id: "marine",
      price: 34,
      from: [70, 160, 200],
      to: [25, 70, 120],
    },
    {
      id: "cedar",
      price: 30,
      from: [110, 170, 100],
      to: [40, 90, 55],
    },
    {
      id: "ruby",
      price: 36,
      from: [230, 70, 90],
      to: [130, 25, 45],
    },
    {
      id: "sapphire",
      price: 36,
      from: [70, 120, 230],
      to: [25, 45, 130],
    },
    {
      id: "topaz",
      price: 34,
      from: [245, 200, 80],
      to: [180, 120, 30],
    },
    {
      id: "emerald",
      price: 36,
      from: [60, 200, 130],
      to: [20, 100, 70],
    },
    {
      id: "amethyst",
      price: 36,
      from: [180, 120, 230],
      to: [90, 40, 140],
    },
    {
      id: "champagne",
      price: 32,
      from: [245, 230, 190],
      to: [190, 150, 100],
    },
    {
      id: "obsidian",
      price: 38,
      from: [70, 75, 85],
      to: [20, 22, 28],
    },
    {
      id: "vermilion",
      price: 34,
      from: [240, 90, 70],
      to: [150, 35, 40],
    },
    {
      id: "cinnabar",
      price: 34,
      from: [220, 100, 80],
      to: [140, 45, 50],
    },
    {
      id: "periwinkle",
      price: 32,
      from: [160, 170, 230],
      to: [70, 80, 160],
    },
    {
      id: "terracotta",
      price: 30,
      from: [220, 130, 90],
      to: [140, 70, 50],
    },
  ];

  const BOARD_FLOORS = [
    {
      id: "meadow",
      price: 0,
      board: null,
      felt: null,
    },
    {
      id: "sand",
      price: 16,
      board: "#efe0c4",
      felt: "#e4d0a8",
      boardDark: "#3a3224",
      feltDark: "#4a4030",
    },
    {
      id: "pond",
      price: 20,
      board: "#c8dde8",
      felt: "#b4d0de",
      boardDark: "#1e2e3a",
      feltDark: "#274050",
    },
    {
      id: "orchard",
      price: 24,
      board: "#d8e8c4",
      felt: "#c4dcae",
      boardDark: "#243020",
      feltDark: "#30402a",
    },
    {
      id: "slate",
      price: 28,
      board: "#c8ced8",
      felt: "#b4bcc8",
      boardDark: "#222830",
      feltDark: "#2e3640",
    },
    {
      id: "night",
      price: 32,
      board: "#2a3148",
      felt: "#343c58",
      boardDark: "#1a2030",
      feltDark: "#242c40",
    },
    {
      id: "rose",
      price: 28,
      board: "#f0d6de",
      felt: "#e4c4d0",
      boardDark: "#3a2830",
      feltDark: "#4a3440",
    },
    {
      id: "zen",
      price: 30,
      board: "#d8ddd4",
      felt: "#c8d0c0",
      boardDark: "#2a3028",
      feltDark: "#363e32",
    },
    {
      id: "dusk",
      price: 32,
      board: "#d8cee8",
      felt: "#c8bcdc",
      boardDark: "#2a2438",
      feltDark: "#38304a",
    },
    {
      id: "lagoon",
      price: 30,
      board: "#c4e4de",
      felt: "#b0d8d0",
      boardDark: "#1e3434",
      feltDark: "#2a4444",
    },
    {
      id: "citrus",
      price: 28,
      board: "#f0e8b8",
      felt: "#e4d8a0",
      boardDark: "#3a3420",
      feltDark: "#4a4430",
    },
    {
      id: "clay",
      price: 26,
      board: "#e8d0bc",
      felt: "#dcc0a8",
      boardDark: "#3a2c24",
      feltDark: "#4a3a30",
    },
    {
      id: "mist",
      price: 28,
      board: "#d4dce4",
      felt: "#c4ced8",
      boardDark: "#262e38",
      feltDark: "#323c48",
    },
    {
      id: "pine",
      price: 30,
      board: "#c8d8c0",
      felt: "#b4c8ac",
      boardDark: "#243028",
      feltDark: "#304038",
    },
    {
      id: "ember",
      price: 32,
      board: "#e8c8b0",
      felt: "#dcb498",
      boardDark: "#3a241c",
      feltDark: "#4a3028",
    },
    {
      id: "paper",
      price: 24,
      board: "#f4f0e4",
      felt: "#e8e2d4",
      boardDark: "#2e2c28",
      feltDark: "#3c3a34",
    },
    {
      id: "inkwell",
      price: 32,
      board: "#c8d0dc",
      felt: "#b4becc",
      boardDark: "#1c222c",
      feltDark: "#282e3a",
    },
    {
      id: "tea",
      price: 28,
      board: "#e4d8c4",
      felt: "#d8ccb4",
      boardDark: "#32281e",
      feltDark: "#403428",
    },
    {
      id: "pebble",
      price: 26,
      board: "#d8d4cc",
      felt: "#cac6be",
      boardDark: "#2c2a28",
      feltDark: "#3a3834",
    },
    {
      id: "harbor",
      price: 30,
      board: "#b8d4dc",
      felt: "#a4c8d0",
      boardDark: "#1e3038",
      feltDark: "#2a4048",
    },
    {
      id: "bloom",
      price: 28,
      board: "#e8d4e0",
      felt: "#dcc4d4",
      boardDark: "#382830",
      feltDark: "#483840",
    },
    {
      id: "reef",
      price: 30,
      board: "#c8e0d8",
      felt: "#b4d4c8",
      boardDark: "#1e3430",
      feltDark: "#2a4440",
    },
    {
      id: "frost",
      price: 28,
      board: "#dce8f0",
      felt: "#c8dce8",
      boardDark: "#243038",
      feltDark: "#303c48",
    },
    {
      id: "canopy",
      price: 30,
      board: "#c8dcb4",
      felt: "#b4d0a0",
      boardDark: "#243028",
      feltDark: "#304034",
    },
    {
      id: "sunrise",
      price: 28,
      board: "#f0dcc8",
      felt: "#e4d0b4",
      boardDark: "#3a3024",
      feltDark: "#4a4030",
    },
    {
      id: "twilight",
      price: 30,
      board: "#d0c8e0",
      felt: "#c0b4d4",
      boardDark: "#2a2438",
      feltDark: "#38304a",
    },
    {
      id: "sandstone",
      price: 26,
      board: "#e8dcc8",
      felt: "#dccfb8",
      boardDark: "#383028",
      feltDark: "#483e34",
    },
    {
      id: "orchid",
      price: 30,
      board: "#e4d0e8",
      felt: "#d8c0dc",
      boardDark: "#342838",
      feltDark: "#443848",
    },
    {
      id: "grove",
      price: 28,
      board: "#d0e0c4",
      felt: "#bcd4b0",
      boardDark: "#283428",
      feltDark: "#344034",
    },
    {
      id: "wheat",
      price: 26,
      board: "#ece0c0",
      felt: "#e0d4b0",
      boardDark: "#383024",
      feltDark: "#483e30",
    },
    {
      id: "ash",
      price: 28,
      board: "#d8d6d2",
      felt: "#cac8c4",
      boardDark: "#2c2c2a",
      feltDark: "#3a3a38",
    },
    {
      id: "fog",
      price: 28,
      board: "#dde4ea",
      felt: "#cdd6de",
      boardDark: "#2a3238",
      feltDark: "#384048",
    },
    {
      id: "canyon",
      price: 30,
      board: "#e8d0b8",
      felt: "#dcc4a8",
      boardDark: "#3a2c20",
      feltDark: "#4a3a2c",
    },
    {
      id: "mesa",
      price: 28,
      board: "#e4c8a8",
      felt: "#d8bc9c",
      boardDark: "#3a2e22",
      feltDark: "#4a3c2e",
    },
    {
      id: "river",
      price: 30,
      board: "#c4d8e4",
      felt: "#b0ccd8",
      boardDark: "#1e3038",
      feltDark: "#2a4048",
    },
    {
      id: "bay",
      price: 28,
      board: "#c8dce8",
      felt: "#b4d0dc",
      boardDark: "#223038",
      feltDark: "#2e4048",
    },
    {
      id: "dune",
      price: 26,
      board: "#efe0c8",
      felt: "#e4d4b4",
      boardDark: "#3a3224",
      feltDark: "#4a4030",
    },
    {
      id: "cove",
      price: 30,
      board: "#b8d8d4",
      felt: "#a4ccc8",
      boardDark: "#1e3434",
      feltDark: "#2a4444",
    },
    {
      id: "glade",
      price: 28,
      board: "#d4e4c8",
      felt: "#c0d8b4",
      boardDark: "#283428",
      feltDark: "#344034",
    },
    {
      id: "hearth",
      price: 30,
      board: "#e8d0bc",
      felt: "#dcc4a8",
      boardDark: "#3a2820",
      feltDark: "#4a382c",
    },
    {
      id: "marsh",
      price: 28,
      board: "#d0dcc4",
      felt: "#bcd0b0",
      boardDark: "#283028",
      feltDark: "#343c34",
    },
    {
      id: "atelier",
      price: 28,
      board: "#e8e4dc",
      felt: "#dcd8d0",
      boardDark: "#2e2c28",
      feltDark: "#3c3a34",
    },
    {
      id: "patio",
      price: 26,
      board: "#e4dcc8",
      felt: "#d8d0bc",
      boardDark: "#342e24",
      feltDark: "#443c30",
    },
  ];

  const SHOP_ITEMS = [
    { id: "slow_start", price: 6 },
    { id: "shrink", price: 6 },
    { id: "head_start", price: 6 },
    { id: "dash", price: 10 },
    { id: "revive", price: 12 },
    { id: "score_boost", price: 10 },
    { id: "ghost_walls", price: 12 },
    { id: "shield", price: 10 },
    { id: "antidote", price: 10 },
    { id: "feast", price: 16 },
    { id: "calm", price: 10 },
    { id: "surprise", price: 10 },
    { id: "combo_grace", price: 10 },
    { id: "nibble", price: 6 },
    { id: "phase_in", price: 10 },
    { id: "rich_bite", price: 10 },
    { id: "early_coin", price: 6 },
    { id: "magnet", price: 72, permanent: true },
    { id: "lucky_coins", price: 60, permanent: true },
    { id: "more_apples", price: 88, permanent: true },
    { id: "trail", price: 56, permanent: true },
    { id: "echo", price: 48, permanent: true },
    { id: "sweet_tooth", price: 100, permanent: true },
    { id: "berry_ward", price: 80, permanent: true },
    { id: "golden_luck", price: 88, permanent: true },
    { id: "sharp_eyes", price: 64, permanent: true },
    { id: "tidy", price: 72, permanent: true },
    { id: "steady_hands", price: 80, permanent: true },
    { id: "warp_linger", price: 72, permanent: true },
  ];

  const CONSUMABLE_KEYS = [
    "slow_start",
    "revive",
    "score_boost",
    "ghost_walls",
    "shrink",
    "shield",
    "head_start",
    "dash",
    "antidote",
    "feast",
    "calm",
    "surprise",
    "combo_grace",
    "nibble",
    "phase_in",
    "rich_bite",
    "early_coin",
  ];

  // Consumables bought outside a run; auto-applied when the next run starts.
  const DEFAULT_PENDING = Object.fromEntries(
    CONSUMABLE_KEYS.map((key) => [key, false]),
  );

  const COSMETICS_KEY = "mumu-cosmetics";
  const STATS_KEY = "mumu-stats";
  const DEFAULT_COSMETICS = {
    owned: { classic: 1 },
    equipped: "classic",
    floorsOwned: { meadow: 1 },
    floor: "meadow",
  };
  const DEFAULT_STATS = { runs: 0, apples: 0, bestCombo: 0, clears: 0 };

  let coins = loadSecure(COINS_KEY, 0);
  let inventory = loadSecureObject(INVENTORY_KEY, DEFAULT_INVENTORY);
  let pending = loadSecureObject(PENDING_KEY, DEFAULT_PENDING);
  let cosmetics = loadSecureObject(COSMETICS_KEY, DEFAULT_COSMETICS);
  let lifetime = loadSecureObject(STATS_KEY, DEFAULT_STATS);
  if (!Number.isFinite(lifetime.runs) || lifetime.runs < 0) lifetime.runs = 0;
  if (!Number.isFinite(lifetime.apples) || lifetime.apples < 0)
    lifetime.apples = 0;
  if (!Number.isFinite(lifetime.bestCombo) || lifetime.bestCombo < 0)
    lifetime.bestCombo = 0;
  if (!Number.isFinite(lifetime.clears) || lifetime.clears < 0)
    lifetime.clears = 0;
  if (!cosmetics.owned || typeof cosmetics.owned !== "object") {
    cosmetics.owned = { classic: 1 };
  }
  if (!cosmetics.owned.classic) cosmetics.owned.classic = 1;
  if (!cosmetics.floorsOwned || typeof cosmetics.floorsOwned !== "object") {
    cosmetics.floorsOwned = { meadow: 1 };
  }
  if (!cosmetics.floorsOwned.meadow) cosmetics.floorsOwned.meadow = 1;
  if (
    !SKINS.some((s) => s.id === cosmetics.equipped && cosmetics.owned[s.id])
  ) {
    cosmetics.equipped = "classic";
  }
  if (
    !BOARD_FLOORS.some(
      (f) => f.id === cosmetics.floor && cosmetics.floorsOwned[f.id],
    )
  ) {
    cosmetics.floor = "meadow";
  }

  const MISSIONS_KEY = "mumu-missions";
  const DAILY_MISSIONS = [
    { id: "apples10", track: "apples", target: 10, reward: 2 },
    { id: "apples15", track: "apples", target: 15, reward: 3 },
    { id: "apples20", track: "apples", target: 20, reward: 3 },
    { id: "apples25", track: "apples", target: 25, reward: 4 },
    { id: "apples30", track: "apples", target: 30, reward: 5 },
    { id: "apples35", track: "apples", target: 35, reward: 6 },
    { id: "score20", track: "bestScore", target: 20, reward: 2 },
    { id: "score40", track: "bestScore", target: 40, reward: 4 },
    { id: "score50", track: "bestScore", target: 50, reward: 5 },
    { id: "score60", track: "bestScore", target: 60, reward: 5 },
    { id: "score80", track: "bestScore", target: 80, reward: 6 },
    { id: "score100", track: "bestScore", target: 100, reward: 7 },
    { id: "score120", track: "bestScore", target: 120, reward: 8 },
    { id: "coins2", track: "coins", target: 2, reward: 2 },
    { id: "coins5", track: "coins", target: 5, reward: 3 },
    { id: "coins8", track: "coins", target: 8, reward: 4 },
    { id: "coins10", track: "coins", target: 10, reward: 5 },
    { id: "coins12", track: "coins", target: 12, reward: 6 },
    { id: "combo5", track: "maxCombo", target: 5, reward: 3 },
    { id: "combo8", track: "maxCombo", target: 8, reward: 4 },
    { id: "combo10", track: "maxCombo", target: 10, reward: 5 },
    { id: "combo12", track: "maxCombo", target: 12, reward: 6 },
    { id: "combo15", track: "maxCombo", target: 15, reward: 7 },
    { id: "golden1", track: "golden", target: 1, reward: 3 },
    { id: "golden2", track: "golden", target: 2, reward: 4 },
    { id: "golden3", track: "golden", target: 3, reward: 5 },
    { id: "golden4", track: "golden", target: 4, reward: 6 },
    { id: "runs3", track: "runs", target: 3, reward: 2 },
    { id: "runs5", track: "runs", target: 5, reward: 3 },
    { id: "runs7", track: "runs", target: 7, reward: 4 },
    { id: "runs10", track: "runs", target: 10, reward: 5 },
    { id: "clears1", track: "clears", target: 1, reward: 4 },
    { id: "clears2", track: "clears", target: 2, reward: 5 },
    { id: "clears3", track: "clears", target: 3, reward: 6 },
    { id: "clears4", track: "clears", target: 4, reward: 7 },
    { id: "warp1", track: "warp", target: 1, reward: 3 },
    { id: "warp2", track: "warp", target: 2, reward: 4 },
    { id: "warp3", track: "warp", target: 3, reward: 5 },
    { id: "warp4", track: "warp", target: 4, reward: 6 },
    { id: "length12", track: "peakLen", target: 12, reward: 3 },
    { id: "length16", track: "peakLen", target: 16, reward: 4 },
    { id: "length20", track: "peakLen", target: 20, reward: 5 },
    { id: "length24", track: "peakLen", target: 24, reward: 6 },
    { id: "length28", track: "peakLen", target: 28, reward: 7 },
  ];

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function defaultMissions() {
    return {
      day: todayKey(),
      progress: {
        apples: 0,
        coins: 0,
        maxCombo: 0,
        bestScore: 0,
        golden: 0,
        runs: 0,
        clears: 0,
        warp: 0,
        peakLen: 0,
      },
      claimed: {},
    };
  }

  let missions = loadSecureObject(MISSIONS_KEY, defaultMissions());

  function ensureMissionsDay() {
    const day = todayKey();
    if (missions.day !== day) {
      missions = defaultMissions();
      saveMissions();
    }
    if (!missions.progress) missions.progress = defaultMissions().progress;
    if (!missions.claimed) missions.claimed = {};
    if (typeof missions.progress.golden !== "number") {
      missions.progress.golden = 0;
    }
    if (typeof missions.progress.runs !== "number") {
      missions.progress.runs = 0;
    }
    if (typeof missions.progress.clears !== "number") {
      missions.progress.clears = 0;
    }
    if (typeof missions.progress.warp !== "number") {
      missions.progress.warp = 0;
    }
    if (typeof missions.progress.peakLen !== "number") {
      missions.progress.peakLen = 0;
    }
  }

  function saveMissions() {
    saveSecureObject(MISSIONS_KEY, missions);
  }

  function bumpMission(track, amount = 1, mode = "add") {
    if (aiAssisted) return;
    ensureMissionsDay();
    const cur = missions.progress[track] || 0;
    missions.progress[track] =
      mode === "max" ? Math.max(cur, amount) : cur + amount;
    saveMissions();
    updateShopBadge();
  }

  function missionName(id) {
    return t(`mission_${id}_name`);
  }

  function missionDesc(id) {
    return t(`mission_${id}_desc`);
  }

  function claimMission(id, quiet = false) {
    ensureMissionsDay();
    const def = DAILY_MISSIONS.find((m) => m.id === id);
    if (!def || missions.claimed[id]) return 0;
    const cur = missions.progress[def.track] || 0;
    if (cur < def.target) return 0;
    missions.claimed[id] = true;
    saveMissions();
    addCoins(def.reward);
    if (!quiet) {
      showBoardToast(t("toastMission", { n: def.reward }));
      pulseCoinValue();
      haptic(16);
    }
    updateShopBadge();
    if (!quiet) renderShop();
    return def.reward;
  }

  function claimAllMissions() {
    let total = 0;
    for (const def of DAILY_MISSIONS) {
      total += claimMission(def.id, true);
    }
    if (total > 0) {
      showBoardToast(t("toastMission", { n: total }));
      pulseCoinValue();
      haptic([12, 30, 12]);
      updateShopBadge();
      renderShop();
    }
  }

  // Migrate stockpiled consumables from the old inventory system into
  // pending boosts, so previously bought items aren't lost.
  {
    let migrated = false;
    for (const key of CONSUMABLE_KEYS) {
      if (inventory[key] > 0) pending[key] = true;
      if (key in inventory) {
        delete inventory[key];
        migrated = true;
      }
    }
    if (migrated) {
      saveInventory();
      savePending();
    }
    try {
      localStorage.removeItem("mumu-loadout");
    } catch (e) {}
  }

  function saveCoins() {
    saveSecure(COINS_KEY, coins);
    updateCoinUI();
  }

  function saveInventory() {
    saveSecureObject(INVENTORY_KEY, inventory);
  }

  function savePending() {
    saveSecureObject(PENDING_KEY, pending);
  }

  function saveCosmetics() {
    saveSecureObject(COSMETICS_KEY, cosmetics);
  }

  function saveLifetime() {
    saveSecureObject(STATS_KEY, lifetime);
  }

  function equippedSkin() {
    return SKINS.find((s) => s.id === cosmetics.equipped) || SKINS[0];
  }

  function ownsSkin(id) {
    return !!cosmetics.owned[id];
  }

  function equippedFloor() {
    return (
      BOARD_FLOORS.find((f) => f.id === cosmetics.floor) || BOARD_FLOORS[0]
    );
  }

  function haptic(ms = 12) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {}
  }

  function syncTitleSkin() {
    if (!titleSkinEl) return;
    const skin = equippedSkin();
    titleSkinEl.style.setProperty(
      "--swatch-from",
      `rgb(${skin.from.join(",")})`,
    );
    titleSkinEl.style.setProperty("--swatch-to", `rgb(${skin.to.join(",")})`);
  }

  function ownsFloor(id) {
    return !!cosmetics.floorsOwned[id];
  }

  function addCoins(n) {
    coins += n;
    saveCoins();
  }

  function updateCoinUI() {
    coinBalanceEl.textContent = coins;
    if (shopCoinBalanceEl) shopCoinBalanceEl.textContent = coins;
  }

  function pulseCoinValue() {
    coinBalanceEl.classList.remove("is-bump");
    void coinBalanceEl.offsetWidth;
    coinBalanceEl.classList.add("is-bump");
  }

  function pulseBoardEat() {
    const wrap = canvas.parentElement;
    if (!wrap) return;
    wrap.classList.remove("is-eat-pulse");
    void wrap.offsetWidth;
    wrap.classList.add("is-eat-pulse");
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
    poisonBerry,
    poisonNextSpawnAt,
    powerBerry,
    powerNextSpawnAt,
    score,
    tickMs,
    state,
    lastTick,
    aiAssisted,
    run,
    comboCount,
    stepsSinceEat,
    runPeakLength,
    runMaxCombo;
  let highScore = loadHighScore();
  highScoreEl.textContent = highScore;
  updateCoinUI();

  const COMBO_WINDOW_STEPS = 10;

  function comboWindowSteps() {
    let steps = COMBO_WINDOW_STEPS;
    if (run?.comboGrace) steps += 8;
    if (inventory.steady_hands > 0) steps += 4;
    return steps;
  }

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
      headStartApplied: false,
      sparkleTrail: false,
      echoTrail: false,
      antidote: 0,
      tempGhost: 0,
      feastLeft: 0,
      calm: false,
      comboGrace: false,
      nibbleApplied: false,
      richBite: false,
      earlyCoinArmed: false,
      earlyCoinPending: false,
      bonusAppleGranted: false,
      // After a shield blocks a crash, the snake freezes in place until the
      // player steers away, instead of instantly crashing again.
      shieldHold: false,
    };
  }

  let boardToastTimer = null;

  function showBoardToast(msg) {
    boardToast.textContent = msg;
    boardToast.hidden = false;
    boardToast.classList.remove("is-live");
    void boardToast.offsetWidth;
    boardToast.classList.add("is-live");
    clearTimeout(boardToastTimer);
    boardToastTimer = setTimeout(() => {
      boardToast.hidden = true;
    }, 1900);
  }

  function occupiedCells() {
    const set = new Set();
    for (const s of snake) set.add(`${s.x},${s.y}`);
    for (const f of foods) set.add(`${f.x},${f.y}`);
    if (coin) set.add(`${coin.x},${coin.y}`);
    if (goldenApple) set.add(`${goldenApple.x},${goldenApple.y}`);
    if (poisonBerry) set.add(`${poisonBerry.x},${poisonBerry.y}`);
    if (powerBerry) set.add(`${powerBerry.x},${powerBerry.y}`);
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
    const now = performance.now();
    while (foods.length < target && free.length) {
      const idx = Math.floor(Math.random() * free.length);
      const cell = free.splice(idx, 1)[0];
      foods.push({ x: cell.x, y: cell.y, bornAt: now });
    }
  }

  function scheduleNextCoin(fromTime) {
    let min = run.coinBoost ? 5000 : 10000;
    let max = run.coinBoost ? 8000 : 16000;
    if (run.earlyCoinPending) {
      min = 700;
      max = 1600;
      run.earlyCoinPending = false;
    }
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
      } else {
        maybeMagnetPullCoin();
      }
    } else if (coinNextSpawnAt && time >= coinNextSpawnAt) {
      spawnCoin();
      coinNextSpawnAt = null;
    }
  }

  function maybeMagnetPullCoin() {
    if (!coin || !run?.coinBoost || !snake?.length) return;
    if (Math.random() > 0.55) return;
    const head = snake[0];
    const dx = head.x - coin.x;
    const dy = head.y - coin.y;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist === 0 || dist > 6) return;
    const stepX = dx === 0 ? 0 : Math.sign(dx);
    const stepY = dy === 0 ? 0 : Math.sign(dy);
    const preferX = Math.abs(dx) >= Math.abs(dy);
    const nx = coin.x + (preferX ? stepX : 0);
    const ny = coin.y + (preferX ? 0 : stepY);
    const blocked = occupiedCells();
    blocked.delete(`${coin.x},${coin.y}`);
    if (
      nx >= 0 &&
      ny >= 0 &&
      nx < GRID &&
      ny < GRID &&
      !blocked.has(`${nx},${ny}`)
    ) {
      spawnTrailSpark(coin.x, coin.y, true);
      coin.x = nx;
      coin.y = ny;
    }
  }

  function scheduleNextGoldenApple(fromTime) {
    let min = 20000;
    let span = 15000;
    if (inventory.golden_luck > 0) {
      min = 14000;
      span = 11000;
    }
    goldenNextSpawnAt = fromTime + min + Math.random() * span;
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

  function scheduleNextPoisonBerry(fromTime) {
    const pressure = Math.min(0.45, (score || 0) / 80);
    let min = 14000 - pressure * 6000;
    let span = 16000 - pressure * 5000;
    if (inventory.berry_ward > 0) {
      min *= 1.45;
      span *= 1.35;
    }
    poisonNextSpawnAt = fromTime + min + Math.random() * span;
  }

  function spawnPoisonBerry() {
    const free = freeCells();
    if (!free.length) {
      scheduleNextPoisonBerry(performance.now());
      return;
    }
    const cell = free[Math.floor(Math.random() * free.length)];
    const now = performance.now();
    let life = 8000;
    if (inventory.tidy > 0) life = 4800;
    poisonBerry = {
      x: cell.x,
      y: cell.y,
      spawnAt: now,
      expiresAt: now + life,
    };
  }

  function updatePoisonBerryTimers(time) {
    if (state !== "playing" || aiAssisted) return;
    if (poisonBerry) {
      if (time >= poisonBerry.expiresAt) {
        poisonBerry = null;
        scheduleNextPoisonBerry(time);
      }
    } else if (poisonNextSpawnAt && time >= poisonNextSpawnAt) {
      spawnPoisonBerry();
      poisonNextSpawnAt = null;
    }
  }

  function wallsAreGhost() {
    return !!(run && (run.ghostWalls || run.tempGhost > 0));
  }

  function scheduleNextPowerBerry(fromTime) {
    powerNextSpawnAt = fromTime + 18000 + Math.random() * 18000;
  }

  function spawnPowerBerry() {
    const free = freeCells();
    if (!free.length) {
      scheduleNextPowerBerry(performance.now());
      return;
    }
    const cell = free[Math.floor(Math.random() * free.length)];
    const now = performance.now();
    powerBerry = {
      x: cell.x,
      y: cell.y,
      spawnAt: now,
      expiresAt: now + 7500,
    };
  }

  function updatePowerBerryTimers(time) {
    if (state !== "playing" || aiAssisted) return;
    if (powerBerry) {
      if (time >= powerBerry.expiresAt) {
        powerBerry = null;
        scheduleNextPowerBerry(time);
      }
    } else if (powerNextSpawnAt && time >= powerNextSpawnAt) {
      spawnPowerBerry();
      powerNextSpawnAt = null;
    }
  }

  function applyRunBoosts() {
    run = defaultRun();
    if (aiAssisted) return;

    if (pending.slow_start) {
      run.speedFactor = 0.65;
      showBoardToast(t("toastSlowMo"));
    }
    if (pending.dash) {
      run.speedFactor = 1.4;
      showBoardToast(t("toastSugarRush"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 8 + Math.random() * 20);
      }
    }
    if (pending.revive) {
      run.revives = 1;
      showBoardToast(t("toastReviveArmed"));
    }
    if (pending.score_boost) {
      run.scorePerApple = 2;
      showBoardToast(t("toastScoreBoost"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 330 + Math.random() * 30);
      }
    }
    if (pending.ghost_walls) {
      run.ghostWalls = true;
      showBoardToast(t("toastGhostWalls"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 195 + Math.random() * 25);
      }
    }
    if (pending.shield) {
      run.shield = 1;
      showBoardToast(t("toastShieldArmed"));
    }
    if (pending.head_start) {
      run.headStartApplied = true;
      score = 5;
      scoreEl.textContent = score;
      pulseScoreValue();
      showBoardToast(t("toastHeadStart"));
      if (snake?.[0]) {
        spawnScoreFloat(snake[0].x, snake[0].y, "+5", palette.gold);
        spawnTrailSpark(snake[0].x, snake[0].y, true, 45 + Math.random() * 20);
      }
    }
    if (pending.shrink) {
      run.shrinkArmed = true;
      showBoardToast(t("toastShrinkArmed"));
    }
    if (pending.antidote) {
      run.antidote = 1;
      showBoardToast(t("toastAntidoteArmed"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 110 + Math.random() * 25);
      }
    }
    if (pending.feast) {
      run.feastLeft = 3;
      showBoardToast(t("toastFeast"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 45 + Math.random() * 20);
      }
    }
    if (pending.calm) {
      run.calm = true;
      showBoardToast(t("toastCalm"));
    }
    if (pending.combo_grace) {
      run.comboGrace = true;
      showBoardToast(t("toastComboGrace"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 30 + Math.random() * 25);
      }
    }
    if (pending.nibble) {
      run.nibbleApplied = true;
      const tail = snake[snake.length - 1];
      snake.push({ x: tail.x, y: tail.y }, { x: tail.x, y: tail.y });
      syncPrevSnake();
      runPeakLength = Math.max(runPeakLength || 0, snake.length);
      showBoardToast(t("toastNibble"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 100 + Math.random() * 30);
      }
    }
    if (pending.phase_in) {
      run.tempGhost = Math.max(run.tempGhost, 10);
      showBoardToast(t("toastPhaseIn"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 195 + Math.random() * 30);
        spawnTrailSpark(snake[0].x, snake[0].y, true, 200 + Math.random() * 25);
      }
    }
    if (pending.rich_bite) {
      run.richBite = true;
      showBoardToast(t("toastRichBite"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 42 + Math.random() * 20);
      }
    }
    if (pending.early_coin) {
      run.earlyCoinArmed = true;
      run.earlyCoinPending = true;
      showBoardToast(t("toastEarlyCoin"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 48 + Math.random() * 18);
      }
    }
    const hadSurprise = !!pending.surprise;
    tickMs = computeTickMs();

    if (CONSUMABLE_KEYS.some((key) => pending[key])) {
      for (const key of CONSUMABLE_KEYS) pending[key] = false;
      savePending();
    }

    if (inventory.magnet > 0) run.coinBoost = true;
    if (inventory.more_apples > 0) run.appleTarget = 5;
    if (inventory.trail > 0) run.sparkleTrail = true;
    if (inventory.echo > 0) run.echoTrail = true;
    if (hadSurprise) grantSurpriseBoost();
    updateRunHud();
  }

  const SURPRISE_POOL = [
    "shield",
    "dash",
    "feast",
    "antidote",
    "calm",
    "ghost_walls",
    "revive",
    "score_boost",
    "shrink",
    "combo_grace",
    "nibble",
    "phase_in",
    "rich_bite",
    "early_coin",
  ];

  function grantSurpriseBoost() {
    const pool = SURPRISE_POOL.filter((id) => !boostActive(id));
    const pick =
      pool[Math.floor(Math.random() * pool.length)] || SURPRISE_POOL[0];
    applyBoostNow(pick);
    showBoardToast(t("toastSurprise", { name: shopItemName(pick) }));
    if (snake?.[0]) {
      spawnTrailSpark(snake[0].x, snake[0].y, true, 280 + Math.random() * 40);
      spawnTrailSpark(snake[0].x, snake[0].y, true, 260 + Math.random() * 50);
    }
    haptic([10, 20, 10]);
  }

  // Shorter tick = faster snake. Score speeds it up until MIN_TICK_MS.
  // Slow-mo sets speedFactor < 1, which stretches the tick (slower run).
  // Auto speed chips multiply further while autopilot is on.
  function computeTickMs() {
    const scoreForSpeed = run?.calm ? 0 : score;
    const base = Math.max(
      MIN_TICK_MS,
      BASE_TICK_MS - scoreForSpeed * SPEEDUP_MS_PER_SCORE,
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
    poisonBerry = null;
    poisonNextSpawnAt = null;
    powerBerry = null;
    powerNextSpawnAt = null;
    comboCount = 0;
    stepsSinceEat = 0;
    runPeakLength = 3;
    runMaxCombo = 0;
    trailSparks.length = 0;
    eatBursts.length = 0;
    scoreFloats.length = 0;
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
    comboCount = 0;
    stepsSinceEat = 0;
    tickMs = computeTickMs();
    spawnApples();
    syncPrevSnake();
    updateRunHud();
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
    poisonBerry = null;
    poisonNextSpawnAt = null;
    powerBerry = null;
    powerNextSpawnAt = null;
    if (!aiAssisted) {
      const bonus = 2 + Math.min(6, Math.floor(score / 25));
      addCoins(bonus);
      bumpMission("clears", 1);
      lifetime.clears += 1;
      saveLifetime();
      showBoardToast(t("toastClearBonus", { n: bonus }));
      haptic(22);
      const mid = Math.floor(GRID / 2);
      spawnEatBurst(mid, mid, palette.gold || "#e8c547");
      spawnEatBurst(mid - 1, mid, palette.apple);
      spawnEatBurst(mid + 1, mid, "#2f8fc4");
    }
    if (boardTransition) {
      const label = boardTransition.querySelector("span");
      if (label) label.textContent = t("boardCleared");
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
      scheduleNextPoisonBerry(lastTick);
      scheduleNextPowerBerry(lastTick);
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
    if (poisonBerry) {
      const occ = occupiedCells();
      if (occ.has(`${poisonBerry.x},${poisonBerry.y}`)) poisonBerry = null;
    }
    if (powerBerry) {
      const occ = occupiedCells();
      if (occ.has(`${powerBerry.x},${powerBerry.y}`)) powerBerry = null;
    }
    syncPrevSnake();
  }

  function useShrink() {
    if (state !== "playing" || aiAssisted || !run.shrinkArmed) return;
    if (snake.length <= 3) return;
    const head = snake[0];
    const newLen = Math.max(3, Math.floor(snake.length / 2));
    snake = snake.slice(0, newLen);
    run.shrinkArmed = false;
    updateShrinkBtn();
    updateRunHud();
    syncPrevSnake();
    showBoardToast(t("toastShrink"));
    spawnEatBurst(head.x, head.y, "#8fbc4a");
    spawnTrailSpark(head.x, head.y, true, 100 + Math.random() * 30);
    haptic(16);
    shakeBoard();
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

    if (wallsAreGhost()) {
      if (head.x < 0) head.x = GRID - 1;
      else if (head.x >= GRID) head.x = 0;
      if (head.y < 0) head.y = GRID - 1;
      else if (head.y >= GRID) head.y = 0;
    }

    const hitWall =
      !wallsAreGhost() &&
      (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID);
    const hitSelf = snake.some(
      (s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y,
    );
    if (hitWall || hitSelf) {
      if (!aiAssisted && run.shieldHold) return;
      if (run.shield > 0 && !aiAssisted) {
        run.shield--;
        run.shieldHold = true;
        showBoardToast(t("toastShield"));
        spawnScoreFloat(snake[0].x, snake[0].y, "OK", "#a8b8f5");
        spawnTrailSpark(snake[0].x, snake[0].y, true, 210 + Math.random() * 30);
        spawnTrailSpark(snake[0].x, snake[0].y, true, 200 + Math.random() * 35);
        haptic(20);
        updateRunHud();
        return;
      }
      if (run.revives > 0 && !aiAssisted) {
        run.revives--;
        reviveSnake();
        showBoardToast(t("toastRevive"));
        spawnScoreFloat(snake[0].x, snake[0].y, "+", "#9ad4a0");
        spawnTrailSpark(snake[0].x, snake[0].y, true, 110 + Math.random() * 30);
        spawnTrailSpark(snake[0].x, snake[0].y, true, 100 + Math.random() * 35);
        haptic([15, 40, 20]);
        updateRunHud();
        return;
      }
      gameOver();
      return;
    }

    run.shieldHold = false;
    snake.unshift(head);
    if (snake.length > (runPeakLength || 0)) runPeakLength = snake.length;
    spawnTrailSpark(head.x, head.y);

    let ate = false;
    for (let i = 0; i < foods.length; i++) {
      if (head.x === foods[i].x && head.y === foods[i].y) {
        foods.splice(i, 1);
        const gained = awardApplePoints(head, false);
        const prev = score;
        score += gained;
        scoreEl.textContent = score;
        tickMs = computeTickMs();
        maybeMilestoneToast(prev, score);
        maybeGrantBonusApple();
        ate = true;
        break;
      }
    }

    if (coin && head.x === coin.x && head.y === coin.y) {
      if (!aiAssisted) {
        let gained = 1;
        if (run.richBite) {
          gained += 1;
          run.richBite = false;
          showBoardToast(t("toastRichCoin", { n: gained }));
        }
        addCoins(gained);
        bumpMission("coins", gained);
        pulseCoinValue();
        spawnScoreFloat(head.x, head.y, `+${gained}`, palette.coin);
      }
      spawnEatBurst(head.x, head.y, palette.coin || "#d4a017");
      coin = null;
      scheduleNextCoin(performance.now());
    }

    let ateGolden = false;
    if (goldenApple && head.x === goldenApple.x && head.y === goldenApple.y) {
      const gained = awardApplePoints(head, true);
      const prev = score;
      score += gained;
      scoreEl.textContent = score;
      tickMs = computeTickMs();
      maybeMilestoneToast(prev, score);
      goldenApple = null;
      scheduleNextGoldenApple(performance.now());
      ateGolden = true;
      spawnTrailSpark(head.x, head.y, true, 45 + Math.random() * 20);
      spawnTrailSpark(head.x, head.y, true, 40 + Math.random() * 25);
      maybeGrantBonusApple();
    }

    let atePoison = false;
    if (poisonBerry && head.x === poisonBerry.x && head.y === poisonBerry.y) {
      poisonBerry = null;
      scheduleNextPoisonBerry(performance.now());
      atePoison = true;
      if (!aiAssisted) {
        if (run.antidote > 0) {
          run.antidote--;
          spawnEatBurst(head.x, head.y, "#9ad4a0");
          spawnScoreFloat(head.x, head.y, "OK", "#9ad4a0");
          spawnTrailSpark(head.x, head.y, true, 100 + Math.random() * 30);
          spawnTrailSpark(head.x, head.y, true, 90 + Math.random() * 35);
          showBoardToast(t("toastAntidote"));
          updateRunHud();
        } else {
          comboCount = 0;
          stepsSinceEat = comboWindowSteps() + 1;
          if (snake.length > 3) {
            const newLen = Math.max(3, snake.length - 3);
            snake = snake.slice(0, newLen);
            syncPrevSnake();
          }
          spawnEatBurst(head.x, head.y, "#7a3d8a");
          spawnTrailSpark(head.x, head.y, true, 280 + Math.random() * 30);
          showBoardToast(t("toastPoison"));
          haptic(25);
          updateRunHud();
        }
      }
    }

    let atePower = false;
    if (powerBerry && head.x === powerBerry.x && head.y === powerBerry.y) {
      powerBerry = null;
      scheduleNextPowerBerry(performance.now());
      atePower = true;
      if (!aiAssisted) {
        run.tempGhost = Math.max(
          run.tempGhost,
          16 + (inventory.warp_linger > 0 ? 8 : 0),
        );
        spawnEatBurst(head.x, head.y, "#3d9ad4");
        spawnScoreFloat(head.x, head.y, t("powerLabel"), "#2f8fc4");
        spawnTrailSpark(head.x, head.y, true);
        spawnTrailSpark(head.x, head.y, true);
        showBoardToast(t("toastPower"));
        bumpMission("warp", 1);
        haptic(14);
        updateRunHud();
      }
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
    } else if (!atePoison && !atePower) {
      stepsSinceEat = (stepsSinceEat || 0) + 1;
      if (stepsSinceEat > comboWindowSteps()) {
        comboCount = 0;
        updateRunHud();
      }
      snake.pop();
    }

    if (run.tempGhost > 0) {
      run.tempGhost--;
      if (run.tempGhost === 0) updateRunHud();
    }
  }

  function awardApplePoints(cell, golden) {
    const sweet = inventory.sweet_tooth > 0 ? 1 : 0;
    let feastBonus = 0;
    if (!aiAssisted && run.feastLeft > 0 && !golden) {
      feastBonus = 2;
      run.feastLeft--;
      if (run.feastLeft === 0) {
        showBoardToast(t("toastFeastDone"));
        spawnTrailSpark(cell.x, cell.y, true, 45 + Math.random() * 20);
      }
    }
    const base = (golden ? 5 : 1) * run.scorePerApple + sweet + feastBonus;
    if (aiAssisted) {
      spawnEatBurst(cell.x, cell.y, golden ? palette.gold : palette.apple);
      spawnScoreFloat(
        cell.x,
        cell.y,
        `+${base}`,
        golden ? palette.gold : undefined,
      );
      return base;
    }
    if (stepsSinceEat <= comboWindowSteps() && comboCount > 0) comboCount += 1;
    else comboCount = 1;
    stepsSinceEat = 0;
    if (comboCount > runMaxCombo) runMaxCombo = comboCount;
    if (snake.length > runPeakLength) runPeakLength = snake.length;
    bumpMission("peakLen", snake.length, "max");
    const bonus = Math.floor((comboCount - 1) / 2);
    const gained = base + bonus;
    spawnEatBurst(cell.x, cell.y, golden ? palette.gold : palette.apple);
    const floatColor =
      golden || comboCount >= 4
        ? palette.gold
        : feastBonus > 0
          ? "#e8c547"
          : undefined;
    spawnScoreFloat(cell.x, cell.y, `+${gained}`, floatColor);
    pulseScoreValue();
    pulseBoardEat();
    haptic(10);
    if (comboCount >= 3 && comboCount % 2 === 1) {
      showBoardToast(t("toastCombo", { n: comboCount }));
    }
    bumpMission("apples", 1);
    bumpMission("maxCombo", comboCount, "max");
    if (golden) bumpMission("golden", 1);
    if (!aiAssisted) {
      lifetime.apples += 1;
      if (comboCount > lifetime.bestCombo) {
        lifetime.bestCombo = comboCount;
      }
      saveLifetime();
      if (inventory.magnet > 0 && Math.random() < 0.18) {
        addCoins(1);
        bumpMission("coins", 1);
        pulseCoinValue();
        spawnEatBurst(cell.x, cell.y, palette.coin || "#d4a017");
        spawnScoreFloat(cell.x, cell.y - 0.35, "+1", palette.coin);
        showBoardToast(t("toastLuckyBite"));
      }
    }
    updateRunHud();
    return gained;
  }

  function maybeMilestoneToast(prev, next) {
    const marks = [10, 25, 35, 50, 75, 100, 125, 150, 175, 200];
    for (const m of marks) {
      if (prev < m && next >= m) {
        showBoardToast(t("toastMilestone", { n: m }));
        if (snake?.[0]) {
          spawnScoreFloat(snake[0].x, snake[0].y, `${m}!`, palette.gold);
        }
        haptic(18);
        break;
      }
    }
  }

  function pulseScoreValue() {
    scoreEl.classList.remove("is-bump");
    void scoreEl.offsetWidth;
    scoreEl.classList.add("is-bump");
  }

  function pulseHighScore() {
    highScoreEl.classList.remove("is-bump");
    void highScoreEl.offsetWidth;
    highScoreEl.classList.add("is-bump");
    const card = highScoreEl.closest(".score-card");
    if (card) {
      card.classList.remove("is-best-glow");
      void card.offsetWidth;
      card.classList.add("is-best-glow");
      setTimeout(() => card.classList.remove("is-best-glow"), 2200);
    }
  }

  function maybeGrantBonusApple() {
    if (aiAssisted || !run || run.bonusAppleGranted) return;
    if (score < 30) return;
    if (run.appleTarget >= 5) return;
    run.appleTarget += 1;
    run.bonusAppleGranted = true;
    spawnApples();
    showBoardToast(t("toastExtraApple"));
    if (snake?.[0]) {
      spawnTrailSpark(snake[0].x, snake[0].y, true, 120 + Math.random() * 30);
      spawnScoreFloat(snake[0].x, snake[0].y, "+1", palette.apple);
    }
    updateRunHud();
  }

  function shakeBoard() {
    const wrap = canvas.parentElement;
    if (!wrap) return;
    wrap.classList.remove("is-shake");
    void wrap.offsetWidth;
    wrap.classList.add("is-shake");
  }

  function missionsClaimableCount() {
    ensureMissionsDay();
    let n = 0;
    for (const def of DAILY_MISSIONS) {
      if (missions.claimed[def.id]) continue;
      if ((missions.progress[def.track] || 0) >= def.target) n++;
    }
    return n;
  }

  function updateShopBadge() {
    if (!shopBtn) return;
    const n = missionsClaimableCount();
    shopBtn.classList.toggle("has-claim", n > 0);
    shopBtn.dataset.claimCount = n > 0 ? String(n) : "";
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
      ink: read("--ink"),
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
    const floor = equippedFloor();
    const dark = currentTheme() === "dark";
    let boardColor = palette.board;
    let feltColor = palette.felt;
    if (floor.board) {
      boardColor = dark && floor.boardDark ? floor.boardDark : floor.board;
      feltColor = dark && floor.feltDark ? floor.feltDark : floor.felt;
    }
    ctx.fillStyle = boardColor;
    ctx.fillRect(0, 0, boardSize, boardSize);
    ctx.fillStyle = feltColor;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
    const vignette = ctx.createRadialGradient(
      boardSize * 0.5,
      boardSize * 0.5,
      boardSize * 0.35,
      boardSize * 0.5,
      boardSize * 0.5,
      boardSize * 0.72,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, dark ? "rgba(0,0,0,0.22)" : "rgba(52,48,86,0.08)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, boardSize, boardSize);
    if (wallDangerAhead()) {
      ctx.fillStyle = "rgba(196, 69, 54, 0.14)";
      ctx.fillRect(0, 0, boardSize, boardSize);
      ctx.strokeStyle = "rgba(196, 69, 54, 0.45)";
      ctx.lineWidth = Math.max(3, CELL * 0.12);
      ctx.strokeRect(
        ctx.lineWidth / 2,
        ctx.lineWidth / 2,
        boardSize - ctx.lineWidth,
        boardSize - ctx.lineWidth,
      );
      const ahead = cellAhead(1);
      if (ahead.x >= 0 && ahead.y >= 0 && ahead.x < GRID && ahead.y < GRID) {
        ctx.fillStyle = "rgba(196, 69, 54, 0.28)";
        ctx.fillRect(ahead.x * CELL, ahead.y * CELL, CELL, CELL);
      }
    } else if (wallsAreGhost()) {
      ctx.strokeStyle = "rgba(47, 143, 196, 0.4)";
      ctx.setLineDash([CELL * 0.35, CELL * 0.25]);
      ctx.lineWidth = Math.max(2.5, CELL * 0.1);
      ctx.strokeRect(
        ctx.lineWidth / 2,
        ctx.lineWidth / 2,
        boardSize - ctx.lineWidth,
        boardSize - ctx.lineWidth,
      );
      ctx.setLineDash([]);
    }
  }

  function drawApple(cell, time) {
    const cx = (cell.x + 0.5) * CELL;
    const cy = (cell.y + 0.5) * CELL;
    const pulse = 1 + 0.05 * Math.sin(time / 280);
    let pop = 1;
    if (cell.bornAt != null) {
      const age = time - cell.bornAt;
      if (age < 280) {
        const t = age / 280;
        pop = 0.55 + 0.55 * Math.sin(t * Math.PI * 0.5);
      }
    }
    const r = CELL * 0.3 * pulse * pop;

    ctx.beginPath();
    ctx.fillStyle = palette.apple;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, CELL * 0.07);
    ctx.strokeStyle = palette.snakeLine;
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.28, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.fillStyle = "rgba(90, 160, 70, 0.85)";
    ctx.beginPath();
    ctx.ellipse(
      cx - r * 0.15,
      cy - r * 0.95,
      r * 0.22,
      r * 0.12,
      0.55,
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
    let pop = 1;
    if (coin.spawnAt != null) {
      const age = time - coin.spawnAt;
      if (age < 260) {
        const t = age / 260;
        pop = 0.5 + 0.6 * Math.sin(t * Math.PI * 0.5);
      }
    }
    const r = CELL * 0.26 * pulse * pop;

    if (run?.coinBoost) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(212, 160, 23, 0.4)";
      ctx.lineWidth = Math.max(1.2, CELL * 0.05);
      ctx.arc(cx, cy, r * (1.55 + 0.08 * Math.sin(time / 160)), 0, Math.PI * 2);
      ctx.stroke();
    }

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

  function spawnPopScale(spawnAt, time, duration = 260) {
    if (spawnAt == null) return 1;
    const age = time - spawnAt;
    if (age >= duration || age < 0) return 1;
    const t = age / duration;
    return 0.5 + 0.6 * Math.sin(t * Math.PI * 0.5);
  }

  function drawGoldenApple(time) {
    if (!goldenApple) return;
    const remaining = goldenApple.expiresAt - time;
    if (remaining <= 2000 && Math.floor(time / 120) % 2 === 0) return;

    const cx = (goldenApple.x + 0.5) * CELL;
    const cy = (goldenApple.y + 0.5) * CELL;
    const pulse = 1 + 0.07 * Math.sin(time / 220);
    const r = CELL * 0.32 * pulse * spawnPopScale(goldenApple.spawnAt, time);

    ctx.beginPath();
    ctx.strokeStyle = "rgba(232, 197, 71, 0.45)";
    ctx.lineWidth = Math.max(1.2, CELL * 0.06);
    ctx.arc(cx, cy, r * (1.35 + 0.08 * Math.sin(time / 180)), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = palette.gold;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, CELL * 0.07);
    ctx.strokeStyle = palette.snakeLine;
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.26, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.fillStyle = "rgba(120, 170, 70, 0.9)";
    ctx.beginPath();
    ctx.ellipse(
      cx - r * 0.12,
      cy - r * 0.95,
      r * 0.2,
      r * 0.11,
      0.5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  function drawPoisonBerry(time) {
    if (!poisonBerry) return;
    const remaining = poisonBerry.expiresAt - time;
    if (remaining <= 2000 && Math.floor(time / 100) % 2 === 0) return;

    const cx = (poisonBerry.x + 0.5) * CELL;
    const cy = (poisonBerry.y + 0.5) * CELL;
    const pulse = 1 + 0.08 * Math.sin(time / 180);
    const r = CELL * 0.28 * pulse * spawnPopScale(poisonBerry.spawnAt, time);

    ctx.beginPath();
    ctx.strokeStyle = "rgba(122, 61, 138, 0.4)";
    ctx.lineWidth = Math.max(1.2, CELL * 0.06);
    ctx.arc(cx, cy, r * (1.32 + 0.1 * Math.sin(time / 160)), 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(180, 100, 200, 0.35)";
    ctx.lineWidth = Math.max(1, CELL * 0.04);
    ctx.beginPath();
    ctx.arc(cx, cy, r * (1.58 + 0.08 * Math.sin(time / 130)), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = "#7a3d8a";
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, CELL * 0.07);
    ctx.strokeStyle = palette.snakeLine;
    ctx.stroke();

    ctx.fillStyle = "#c4a0d4";
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.2, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPowerBerry(time) {
    if (!powerBerry) return;
    const remaining = powerBerry.expiresAt - time;
    if (remaining <= 2000 && Math.floor(time / 110) % 2 === 0) return;

    const cx = (powerBerry.x + 0.5) * CELL;
    const cy = (powerBerry.y + 0.5) * CELL;
    const pulse = 1 + 0.09 * Math.sin(time / 160);
    const r = CELL * 0.3 * pulse * spawnPopScale(powerBerry.spawnAt, time);

    ctx.beginPath();
    ctx.strokeStyle = "rgba(47, 143, 196, 0.45)";
    ctx.lineWidth = Math.max(1.2, CELL * 0.06);
    ctx.arc(cx, cy, r * (1.34 + 0.09 * Math.sin(time / 150)), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = "#2f8fc4";
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, CELL * 0.07);
    ctx.strokeStyle = palette.snakeLine;
    ctx.stroke();

    ctx.fillStyle = "#a8dff5";
    ctx.beginPath();
    ctx.arc(cx - r * 0.22, cy - r * 0.22, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(168, 223, 245, 0.55)";
    ctx.lineWidth = Math.max(1, CELL * 0.04);
    ctx.beginPath();
    ctx.arc(cx, cy, r * (1.55 + 0.06 * Math.sin(time / 140)), 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawFoods(time) {
    for (const f of foods) drawApple(f, time);
    drawGoldenApple(time);
    drawPoisonBerry(time);
    drawPowerBerry(time);
    drawCoin(time);
  }

  function segmentColor(i, total) {
    const skin = equippedSkin();
    const t = total <= 1 ? 0 : i / (total - 1);
    const lerp = (a, b) => Math.round(a + (b - a) * t);
    const [fr, fg, fb] = skin.from;
    const [tr, tg, tb] = skin.to;
    return `rgb(${lerp(fr, tr)}, ${lerp(fg, tg)}, ${lerp(fb, tb)})`;
  }

  const trailSparks = [];
  const eatBursts = [];
  const scoreFloats = [];

  function spawnTrailSpark(x, y, force = false, hueOverride = null) {
    const dashTrail = run?.speedFactor > 1;
    if ((!force && !run?.sparkleTrail && !dashTrail) || aiAssisted) return;
    trailSparks.push({
      x: (x + 0.35 + Math.random() * 0.3) * CELL,
      y: (y + 0.35 + Math.random() * 0.3) * CELL,
      life: 1,
      hue:
        hueOverride != null
          ? hueOverride
          : force
            ? 190 + Math.random() * 40
            : dashTrail && !run.sparkleTrail
              ? 8 + Math.random() * 24
              : 40 + Math.random() * 40,
    });
    if (trailSparks.length > 40) trailSparks.splice(0, trailSparks.length - 40);
  }

  function spawnEatBurst(x, y, color) {
    const cx = (x + 0.5) * CELL;
    const cy = (y + 0.5) * CELL;
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
      const speed = CELL * (0.04 + Math.random() * 0.06);
      eatBursts.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: 1,
        color: color || palette.apple,
      });
    }
    if (eatBursts.length > 64) eatBursts.splice(0, eatBursts.length - 64);
  }

  function spawnScoreFloat(x, y, text, color) {
    scoreFloats.push({
      x: (x + 0.5) * CELL,
      y: (y + 0.2) * CELL,
      text,
      life: 1,
      color: color || null,
    });
    if (scoreFloats.length > 12) scoreFloats.splice(0, scoreFloats.length - 12);
  }

  function drawTrailSparks() {
    for (let i = trailSparks.length - 1; i >= 0; i--) {
      const s = trailSparks[i];
      s.life -= 0.035;
      if (s.life <= 0) {
        trailSparks.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = s.life * 0.85;
      ctx.fillStyle = `hsl(${s.hue} 85% 62%)`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(1.2, CELL * 0.08 * s.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawEatBursts() {
    for (let i = eatBursts.length - 1; i >= 0; i--) {
      const p = eatBursts[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
      if (p.life <= 0) {
        eatBursts.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1.4, CELL * 0.1 * p.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawScoreFloats() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.max(12, CELL * 0.55)}px Palatino, Georgia, serif`;
    for (let i = scoreFloats.length - 1; i >= 0; i--) {
      const f = scoreFloats[i];
      f.y -= CELL * 0.03;
      f.life -= 0.03;
      if (f.life <= 0) {
        scoreFloats.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = f.life;
      ctx.fillStyle = f.color || palette.ink || "#343056";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  }

  function updateRunHud() {
    if (!runHud || !runHudBoosts) return;
    const chips = [];
    const push = (label, tone = "") => chips.push({ label, tone });
    if (state === "playing" || state === "paused") {
      if (snake?.length) push(t("lengthLabel", { n: snake.length }));
      if (!aiAssisted && comboCount >= 2) {
        push(t("comboLabel", { n: comboCount }), comboCount >= 5 ? "hot" : "");
      }
      if (!aiAssisted && highScore > 0 && score < highScore) {
        const gap = highScore - score;
        if (gap > 0 && gap <= 10) push(t("nearBest", { n: gap }), "gold");
      } else if (!aiAssisted && highScore > 0 && score === highScore) {
        push(t("tiedBest"), "gold");
      }
      if (
        !aiAssisted &&
        !run.calm &&
        Number.isFinite(tickMs) &&
        tickMs <= MIN_TICK_MS + 0.5
      ) {
        push(t("maxSpeed"), "hot");
      }
      if (!aiAssisted) {
        if (run.speedFactor < 1) push(shopItemName("slow_start"));
        if (run.speedFactor > 1) push(shopItemName("dash"), "hot");
        if (run.revives > 0) push(shopItemName("revive"));
        if (run.shield > 0) push(shopItemName("shield"));
        if (run.scorePerApple > 1) push(shopItemName("score_boost"));
        if (run.ghostWalls) push(shopItemName("ghost_walls"));
        else if (run.tempGhost > 0)
          push(t("powerSteps", { n: run.tempGhost }), "hot");
        if (run.shrinkArmed) push(shopItemName("shrink"));
        if (run.antidote > 0) push(shopItemName("antidote"));
        if (run.feastLeft > 0)
          push(`${shopItemName("feast")} ${run.feastLeft}`);
        if (run.calm) push(shopItemName("calm"));
        if (run.comboGrace) push(shopItemName("combo_grace"));
        if (run.richBite) push(shopItemName("rich_bite"));
        if (run.sparkleTrail) push(shopItemName("trail"));
        if (run.echoTrail) push(shopItemName("echo"));
      }
    }
    if (!chips.length) {
      runHud.hidden = true;
      runHudBoosts.innerHTML = "";
      return;
    }
    runHud.hidden = false;
    runHudBoosts.innerHTML = chips
      .map((c) => {
        const cls =
          c.tone === "hot" ? " is-hot" : c.tone === "gold" ? " is-gold" : "";
        return `<span class="run-hud-chip${cls}">${c.label}</span>`;
      })
      .join("");
  }

  function cellAhead(steps) {
    let x = snake[0].x + dir.x * steps;
    let y = snake[0].y + dir.y * steps;
    if (wallsAreGhost()) {
      if (x < 0) x = GRID - 1;
      else if (x >= GRID) x = 0;
      if (y < 0) y = GRID - 1;
      else if (y >= GRID) y = 0;
    }
    return { x, y };
  }

  function appleAheadOfHead() {
    const reach = MOUTH_OPEN_CELLS + (inventory.sharp_eyes > 0 ? 1 : 0);
    for (let steps = 1; steps <= reach; steps++) {
      const ahead = cellAhead(steps);
      for (const f of foods) {
        if (f.x === ahead.x && f.y === ahead.y) return true;
      }
      if (goldenApple && goldenApple.x === ahead.x && goldenApple.y === ahead.y)
        return true;
      if (powerBerry && powerBerry.x === ahead.x && powerBerry.y === ahead.y)
        return true;
      if (coin && coin.x === ahead.x && coin.y === ahead.y) return true;
    }
    return false;
  }

  function wallDangerAhead() {
    if (!run || wallsAreGhost() || state !== "playing") return false;
    const ahead = cellAhead(1);
    return (
      ahead.x < 0 ||
      ahead.y < 0 ||
      ahead.x >= GRID ||
      ahead.y >= GRID ||
      snake.some(
        (s, i) =>
          i > 0 && i < snake.length - 1 && s.x === ahead.x && s.y === ahead.y,
      )
    );
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
    const bulk = 1 + Math.min(0.18, Math.max(0, (view.length - 3) * 0.012));

    const drawBody = (widthExtra, colorFn) => {
      for (let i = view.length - 1; i >= 1; i--) {
        const a = view[i];
        const b = view[i - 1];
        const taper = 1 - 0.32 * (i / (view.length - 1));
        ctx.strokeStyle = colorFn(i);
        ctx.lineWidth = CELL * 0.72 * taper * bulk + widthExtra;

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
    if (run?.tempGhost > 0) {
      drawBody(CELL * 0.22, () => "rgba(47, 143, 196, 0.35)");
    }
    if (run?.echoTrail && prevSnake?.length) {
      ctx.globalAlpha = 0.28;
      const echoView = prevSnake.map((s) => ({ x: s.x, y: s.y }));
      const savedView = view;
      // draw faded previous pose using same body helper on echo coords
      for (let i = echoView.length - 1; i >= 1; i--) {
        const a = echoView[i];
        const b = echoView[i - 1];
        if (!segmentsAdjacent(a, b)) continue;
        const taper = 1 - 0.32 * (i / (echoView.length - 1));
        ctx.strokeStyle = segmentColor(i, echoView.length);
        ctx.lineWidth = CELL * 0.55 * taper;
        ctx.beginPath();
        ctx.moveTo((a.x + 0.5) * CELL, (a.y + 0.5) * CELL);
        ctx.lineTo((b.x + 0.5) * CELL, (b.y + 0.5) * CELL);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      void savedView;
    }
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
    drawTrailSparks();
    drawEatBursts();
    drawSnake(view, headAngle);
    drawScoreFloats();
  }

  // --- Game flow ---

  function loop(time) {
    if (state === "playing") {
      updateCoinTimers(time);
      updateGoldenAppleTimers(time);
      updatePoisonBerryTimers(time);
      updatePowerBerryTimers(time);
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
    } else {
      // Keep drawing in idle/paused/over states too, so food pulses stay
      // alive and effects spawned at game over (crash burst) are visible.
      render(time);
    }
    requestAnimationFrame(loop);
  }

  // Item lifetimes and spawn schedules use absolute timestamps, so a pause
  // would silently eat them. Track when the pause began and shift every
  // timer forward by the paused duration on resume.
  let pauseStartedAt = null;

  function pauseRunClock() {
    if (pauseStartedAt == null) pauseStartedAt = performance.now();
  }

  function resumeRunClock() {
    const now = performance.now();
    if (pauseStartedAt != null) {
      const delta = now - pauseStartedAt;
      pauseStartedAt = null;
      if (coin) {
        coin.spawnAt += delta;
        coin.expiresAt += delta;
      }
      if (coinNextSpawnAt) coinNextSpawnAt += delta;
      if (goldenApple) {
        goldenApple.spawnAt += delta;
        goldenApple.expiresAt += delta;
      }
      if (goldenNextSpawnAt) goldenNextSpawnAt += delta;
      if (poisonBerry) {
        poisonBerry.spawnAt += delta;
        poisonBerry.expiresAt += delta;
      }
      if (poisonNextSpawnAt) poisonNextSpawnAt += delta;
      if (powerBerry) {
        powerBerry.spawnAt += delta;
        powerBerry.expiresAt += delta;
      }
      if (powerNextSpawnAt) powerNextSpawnAt += delta;
    }
    lastTick = now;
  }

  function setPausedChrome(paused) {
    pauseBtn.classList.toggle("is-paused", paused);
    pauseBtn.setAttribute("aria-label", t(paused ? "ariaResume" : "ariaPause"));
    const wrap = canvas.parentElement;
    if (wrap) wrap.classList.toggle("is-run-paused", paused);
    if (desktopPauseBtn) {
      desktopPauseBtn.classList.toggle("is-paused", paused);
      desktopPauseBtn.setAttribute(
        "aria-label",
        t(paused ? "ariaResume" : "ariaPause"),
      );
      desktopPauseBtn.textContent = t(paused ? "back" : "ariaPause");
    }
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
    pauseStartedAt = null;
    lastTick = performance.now();
    scheduleNextCoin(lastTick);
    scheduleNextGoldenApple(lastTick);
    scheduleNextPoisonBerry(lastTick);
    scheduleNextPowerBerry(lastTick);
    setPausedChrome(false);
    overlayState = null;
    overlay.classList.remove("visible");
    setOverlayMenuMode("default");
    updateShrinkBtn();
    updateRunHud();
    if (manual && snake?.[0]) {
      spawnTrailSpark(snake[0].x, snake[0].y, true, 90 + Math.random() * 40);
      spawnTrailSpark(snake[0].x, snake[0].y, true, 40 + Math.random() * 30);
      haptic(12);
    }
  }

  function showOverlay(
    titleKey,
    textKey,
    btnKey,
    vars = {},
    menuMode = "default",
  ) {
    overlayState = { titleKey, textKey, btnKey, vars, menuMode };
    refreshOverlay();
    overlay.classList.add("visible");
  }

  function gameOver() {
    state = "over";
    pauseStartedAt = null;
    setAutoPlay(false);
    setPausedChrome(false);
    if (snake?.[0]) {
      spawnEatBurst(snake[0].x, snake[0].y, "#c44536");
      spawnTrailSpark(snake[0].x, snake[0].y, true, 8 + Math.random() * 20);
      spawnTrailSpark(snake[0].x, snake[0].y, true, 0 + Math.random() * 25);
    }
    coin = null;
    coinNextSpawnAt = null;
    goldenApple = null;
    goldenNextSpawnAt = null;
    poisonBerry = null;
    poisonNextSpawnAt = null;
    powerBerry = null;
    powerNextSpawnAt = null;
    updateRunHud();
    shakeBoard();
    haptic([30, 40, 30]);
    if (!aiAssisted) {
      bumpMission("bestScore", score, "max");
      bumpMission("runs", 1);
      lifetime.runs += 1;
      saveLifetime();
    }
    if (aiAssisted) {
      showOverlay(
        "overlayAiRun",
        "overlayAiRunText",
        "again",
        { score },
        "lobby",
      );
    } else if (score > highScore) {
      highScore = score;
      saveSecure(HIGH_SCORE_KEY, highScore);
      highScoreEl.textContent = highScore;
      pulseHighScore();
      const bonus = Math.max(2, Math.min(8, Math.floor(score / 10) + 1));
      addCoins(bonus);
      pulseCoinValue();
      showBoardToast(t("toastNewBestCoins", { n: bonus }));
      celebrateNewBest();
      showOverlay(
        "overlayNewBest",
        "overlayNewBestText",
        "again",
        { score },
        "lobby",
      );
    } else {
      showOverlay(
        "overlayOuch",
        "overlayOuchText",
        "again",
        {
          score,
          best: highScore,
        },
        "lobby",
      );
    }
    updateShrinkBtn();
  }

  function celebrateNewBest() {
    const mid = Math.floor(GRID / 2);
    for (let i = 0; i < 6; i++) {
      const x = mid - 2 + (i % 3);
      const y = mid - 1 + Math.floor(i / 3);
      spawnEatBurst(x, y, palette.gold || "#e8c547");
      spawnScoreFloat(x, y, "!");
    }
    haptic([20, 30, 20, 30, 40]);
  }

  function endRunFromPause() {
    if (state !== "paused") return;
    gameOver();
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      pauseRunClock();
      setPausedChrome(true);
      showOverlay("overlayPause", "overlayPauseText", "back", {}, "pause");
      updateRunHud();
    } else if (state === "paused") {
      state = "playing";
      setPausedChrome(false);
      overlayState = null;
      resumeRunClock();
      overlay.classList.remove("visible");
      setOverlayMenuMode("default");
      updateRunHud();
    }
  }

  // --- Shop UI ---

  function runActive() {
    return state === "playing" || state === "paused" || state === "transition";
  }

  function boostActive(id) {
    if (runActive() && !aiAssisted) {
      switch (id) {
        case "slow_start":
          return run.speedFactor < 1;
        case "dash":
          return run.speedFactor > 1;
        case "revive":
          return run.revives > 0;
        case "score_boost":
          return run.scorePerApple > 1;
        case "ghost_walls":
          return run.ghostWalls;
        case "shield":
          return run.shield > 0;
        case "head_start":
          return run.headStartApplied;
        case "shrink":
          return run.shrinkArmed;
        case "antidote":
          return run.antidote > 0;
        case "feast":
          return run.feastLeft > 0;
        case "calm":
          return !!run.calm;
        case "combo_grace":
          return !!run.comboGrace;
        case "nibble":
          return !!run.nibbleApplied;
        case "phase_in":
          return run.tempGhost > 0;
        case "rich_bite":
          return !!run.richBite;
        case "early_coin":
          return !!run.earlyCoinArmed;
        case "surprise":
          return false;
      }
    }
    return !!pending[id];
  }

  function updateShrinkBtn() {
    const show = run.shrinkArmed && state === "playing" && !aiAssisted;
    shrinkBtn.hidden = !show;
    shrinkBtn.textContent = `${t("shrink")} (X)`;
  }

  const SHOP_ACCENTS = {
    slow_start: "#7d96e0",
    shrink: "#8fbc4a",
    head_start: "#e8c547",
    dash: "#e05648",
    revive: "#9ad4a0",
    score_boost: "#f0a8c0",
    ghost_walls: "#2f8fc4",
    shield: "#a8b8f5",
    antidote: "#9ad4a0",
    feast: "#f0d080",
    calm: "#b9a7ee",
    surprise: "#c9a8f5",
    combo_grace: "#f0a8c0",
    nibble: "#8fbc4a",
    phase_in: "#2f8fc4",
    rich_bite: "#d4a017",
    early_coin: "#e8c547",
    magnet: "#d4a017",
    lucky_coins: "#e8b830",
    more_apples: "#c44536",
    trail: "#f0d080",
    echo: "#8aa4ee",
    sweet_tooth: "#ff82a2",
    berry_ward: "#9ad4a0",
    golden_luck: "#e8c547",
    sharp_eyes: "#7d96e0",
    tidy: "#9ad4a0",
    steady_hands: "#b9a7ee",
    warp_linger: "#2f8fc4",
  };

  function renderShopItem(item) {
    const isOwnedPermanent = item.permanent && inventory[item.id] > 0;
    const active = !item.permanent && boostActive(item.id);
    const canBuy = !isOwnedPermanent && !active && coins >= item.price;
    const statusLabel = isOwnedPermanent
      ? t("ownedForever")
      : active
        ? t(runActive() && !aiAssisted ? "shopActiveRun" : "shopReadyNext")
        : "";
    const btnLabel = isOwnedPermanent ? t("ownedForever") : t("buy");
    const accent = SHOP_ACCENTS[item.id] || "var(--moss)";
    return `<div class="shop-item">
        <div class="shop-item-row">
          <span class="shop-item-dot" style="background:${accent}"></span>
          <div class="shop-item-info">
            <div class="shop-item-name">${shopItemName(item.id)} — ${item.price} ${t("coinsWord")}</div>
            <div class="shop-item-desc">${shopItemDesc(item.id)}</div>
            ${statusLabel ? `<div class="shop-item-owned">${statusLabel}</div>` : ""}
          </div>
        </div>
        <button class="shop-buy-btn" data-item="${item.id}" ${canBuy ? "" : "disabled"}>${btnLabel}</button>
      </div>`;
  }

  function renderSkinItem(skin) {
    const owned = ownsSkin(skin.id);
    const equipped = cosmetics.equipped === skin.id;
    const canBuy = !owned && coins >= skin.price;
    const priceLabel =
      skin.price === 0 ? t("ownedForever") : `${skin.price} ${t("coinsWord")}`;
    const action = owned
      ? `<button class="shop-equip-btn" data-equip="${skin.id}" aria-pressed="${equipped}">${equipped ? t("equipped") : t("equip")}</button>`
      : `<button class="shop-buy-btn" data-skin="${skin.id}" ${canBuy ? "" : "disabled"}>${t("buy")}</button>`;
    return `<div class="shop-item${equipped ? " is-wearing" : ""}">
        <div class="shop-item-row">
          <span class="shop-skin-swatch" style="--swatch-from: rgb(${skin.from.join(",")}); --swatch-to: rgb(${skin.to.join(",")})"></span>
          <div class="shop-item-info">
            <div class="shop-item-name">${skinName(skin.id)} — ${priceLabel}</div>
            <div class="shop-item-desc">${skinDesc(skin.id)}</div>
            ${equipped ? `<div class="shop-item-owned">${t("equipped")}</div>` : ""}
          </div>
        </div>
        ${action}
      </div>`;
  }

  function renderFloorItem(floor) {
    const owned = ownsFloor(floor.id);
    const equipped = cosmetics.floor === floor.id;
    const canBuy = !owned && coins >= floor.price;
    const priceLabel =
      floor.price === 0
        ? t("ownedForever")
        : `${floor.price} ${t("coinsWord")}`;
    const from = floor.board || "#d8e4f7";
    const to = floor.felt || "#ded6f5";
    const action = owned
      ? `<button class="shop-equip-btn" data-equip-floor="${floor.id}" aria-pressed="${equipped}">${equipped ? t("equipped") : t("equip")}</button>`
      : `<button class="shop-buy-btn" data-floor="${floor.id}" ${canBuy ? "" : "disabled"}>${t("buy")}</button>`;
    return `<div class="shop-item${equipped ? " is-wearing" : ""}">
        <div class="shop-item-row">
          <span class="shop-skin-swatch" style="--swatch-from: ${from}; --swatch-to: ${to}"></span>
          <div class="shop-item-info">
            <div class="shop-item-name">${floorName(floor.id)} — ${priceLabel}</div>
            <div class="shop-item-desc">${floorDesc(floor.id)}</div>
            ${equipped ? `<div class="shop-item-owned">${t("equipped")}</div>` : ""}
          </div>
        </div>
        ${action}
      </div>`;
  }

  function renderMissionItem(def) {
    ensureMissionsDay();
    const cur = Math.min(missions.progress[def.track] || 0, def.target);
    const claimed = !!missions.claimed[def.id];
    const ready = !claimed && cur >= def.target;
    const pct = Math.round((cur / def.target) * 100);
    const status = claimed
      ? t("missionDone")
      : t("missionProgress", { cur, target: def.target });
    const btn = claimed
      ? `<button class="shop-buy-btn" disabled>${t("missionDone")}</button>`
      : ready
        ? `<button class="shop-buy-btn" data-claim="${def.id}">${t("missionClaim")} · ${def.reward}</button>`
        : `<button class="shop-buy-btn" disabled>${status}</button>`;
    const bar = claimed
      ? ""
      : `<div class="mission-bar" aria-hidden="true"><div class="mission-bar-fill${ready ? " is-ready" : ""}" style="width:${pct}%"></div></div>`;
    return `<div class="shop-item${ready ? " is-ready" : ""}">
        <div class="shop-item-info">
          <div class="shop-item-name">${missionName(def.id)} — ${def.reward} ${t("coinsWord")}</div>
          <div class="shop-item-desc">${missionDesc(def.id)}</div>
          <div class="shop-item-owned">${status}</div>
          ${bar}
        </div>
        ${btn}
      </div>`;
  }

  let shopTab = "boosts";

  function syncShopTabs() {
    if (!shopTabsEl) return;
    const claimable = missionsClaimableCount();
    shopTabsEl.querySelectorAll("[data-shop-tab]").forEach((btn) => {
      const id = btn.dataset.shopTab;
      const labelKey =
        id === "goals"
          ? "shopTabGoals"
          : id === "looks"
            ? "shopTabLooks"
            : "shopTabBoosts";
      let label = t(labelKey);
      if (id === "goals" && claimable > 0) label = `${label} · ${claimable}`;
      btn.textContent = label;
      const on = id === shopTab;
      btn.classList.toggle("is-active", on);
      btn.classList.toggle("has-claims", id === "goals" && claimable > 0);
      btn.setAttribute("aria-selected", String(on));
    });
  }

  function renderShop() {
    ensureMissionsDay();
    syncShopTabs();
    const consumables = SHOP_ITEMS.filter((item) => !item.permanent).sort(
      (a, b) => {
        const aq = boostActive(a.id) ? 0 : pending[a.id] ? 1 : 2;
        const bq = boostActive(b.id) ? 0 : pending[b.id] ? 1 : 2;
        if (aq !== bq) return aq - bq;
        return a.price - b.price;
      },
    );
    const permanents = SHOP_ITEMS.filter((item) => item.permanent);
    let sections = [];
    if (shopTab === "goals") {
      const canClaimAll = missionsClaimableCount() > 0;
      const missionsSorted = [...DAILY_MISSIONS].sort((a, b) => {
        const rank = (def) => {
          const claimed = !!missions.claimed[def.id];
          const cur = missions.progress[def.track] || 0;
          if (claimed) return 2;
          if (cur >= def.target) return 0;
          return 1;
        };
        const d = rank(a) - rank(b);
        return d !== 0 ? d : a.reward - b.reward;
      });
      sections = [
        `<h3 class="shop-section-title">${t("shopMissions")}</h3>`,
        `<button class="shop-claim-all" type="button" data-claim-all ${canClaimAll ? "" : "disabled"}>${t("missionClaimAll")}</button>`,
        ...missionsSorted.map(renderMissionItem),
      ];
    } else if (shopTab === "looks") {
      const skinsSorted = [...SKINS].sort((a, b) => {
        const aq =
          (cosmetics.equipped === a.id ? 0 : ownsSkin(a.id) ? 1 : 2) * 1000 +
          a.price;
        const bq =
          (cosmetics.equipped === b.id ? 0 : ownsSkin(b.id) ? 1 : 2) * 1000 +
          b.price;
        return aq - bq;
      });
      const floorsSorted = [...BOARD_FLOORS].sort((a, b) => {
        const aq =
          (cosmetics.floor === a.id ? 0 : ownsFloor(a.id) ? 1 : 2) * 1000 +
          a.price;
        const bq =
          (cosmetics.floor === b.id ? 0 : ownsFloor(b.id) ? 1 : 2) * 1000 +
          b.price;
        return aq - bq;
      });
      sections = [
        `<h3 class="shop-section-title">${t("shopLooks")}</h3>`,
        ...skinsSorted.map(renderSkinItem),
        `<h3 class="shop-section-title">${t("shopFloors")}</h3>`,
        ...floorsSorted.map(renderFloorItem),
      ];
    } else {
      sections = [
        ...consumables.map(renderShopItem),
        `<h3 class="shop-section-title">${t("shopPermanent")}</h3>`,
        ...permanents.map(renderShopItem),
      ];
    }
    shopItemsEl.innerHTML = sections.join("");

    shopItemsEl.querySelectorAll(".shop-buy-btn[data-item]").forEach((btn) => {
      btn.addEventListener("click", () => buyItem(btn.dataset.item));
    });
    shopItemsEl.querySelectorAll(".shop-buy-btn[data-skin]").forEach((btn) => {
      btn.addEventListener("click", () => buySkin(btn.dataset.skin));
    });
    shopItemsEl.querySelectorAll(".shop-buy-btn[data-floor]").forEach((btn) => {
      btn.addEventListener("click", () => buyFloor(btn.dataset.floor));
    });
    shopItemsEl.querySelectorAll(".shop-buy-btn[data-claim]").forEach((btn) => {
      btn.addEventListener("click", () => claimMission(btn.dataset.claim));
    });
    shopItemsEl.querySelectorAll("[data-claim-all]").forEach((btn) => {
      btn.addEventListener("click", () => claimAllMissions());
    });
    shopItemsEl
      .querySelectorAll(".shop-equip-btn[data-equip]")
      .forEach((btn) => {
        btn.addEventListener("click", () => equipSkin(btn.dataset.equip));
      });
    shopItemsEl
      .querySelectorAll(".shop-equip-btn[data-equip-floor]")
      .forEach((btn) => {
        btn.addEventListener("click", () => equipFloor(btn.dataset.equipFloor));
      });
  }

  function applyBoostNow(id) {
    if (id === "slow_start") {
      run.speedFactor = 0.65;
      tickMs = computeTickMs();
      showBoardToast(t("toastSlowMo"));
    } else if (id === "dash") {
      run.speedFactor = 1.4;
      tickMs = computeTickMs();
      showBoardToast(t("toastSugarRush"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 8 + Math.random() * 20);
      }
    } else if (id === "revive") {
      run.revives = 1;
      showBoardToast(t("toastReviveArmed"));
    } else if (id === "score_boost") {
      run.scorePerApple = 2;
      showBoardToast(t("toastScoreBoost"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 330 + Math.random() * 30);
      }
    } else if (id === "ghost_walls") {
      run.ghostWalls = true;
      showBoardToast(t("toastGhostWalls"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 195 + Math.random() * 25);
      }
    } else if (id === "shield") {
      run.shield = 1;
      showBoardToast(t("toastShieldArmed"));
    } else if (id === "head_start") {
      run.headStartApplied = true;
      score += 5;
      scoreEl.textContent = score;
      tickMs = computeTickMs();
      pulseScoreValue();
      showBoardToast(t("toastHeadStart"));
      if (snake?.[0]) {
        spawnScoreFloat(snake[0].x, snake[0].y, "+5", palette.gold);
        spawnTrailSpark(snake[0].x, snake[0].y, true, 45 + Math.random() * 20);
      }
    } else if (id === "shrink") {
      run.shrinkArmed = true;
      updateShrinkBtn();
      showBoardToast(t("toastShrinkArmed"));
    } else if (id === "antidote") {
      run.antidote = 1;
      showBoardToast(t("toastAntidoteArmed"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 110 + Math.random() * 25);
      }
    } else if (id === "feast") {
      run.feastLeft = 3;
      showBoardToast(t("toastFeast"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 45 + Math.random() * 20);
      }
    } else if (id === "calm") {
      run.calm = true;
      tickMs = computeTickMs();
      showBoardToast(t("toastCalm"));
    } else if (id === "combo_grace") {
      run.comboGrace = true;
      showBoardToast(t("toastComboGrace"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 30 + Math.random() * 25);
      }
    } else if (id === "nibble") {
      if (!run.nibbleApplied && snake?.length) {
        run.nibbleApplied = true;
        const tail = snake[snake.length - 1];
        snake.push({ x: tail.x, y: tail.y }, { x: tail.x, y: tail.y });
        syncPrevSnake();
        runPeakLength = Math.max(runPeakLength || 0, snake.length);
        showBoardToast(t("toastNibble"));
        spawnTrailSpark(snake[0].x, snake[0].y, true, 100 + Math.random() * 30);
      }
    } else if (id === "phase_in") {
      run.tempGhost = Math.max(run.tempGhost || 0, 10);
      showBoardToast(t("toastPhaseIn"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 195 + Math.random() * 30);
        spawnTrailSpark(snake[0].x, snake[0].y, true, 200 + Math.random() * 25);
      }
    } else if (id === "rich_bite") {
      run.richBite = true;
      showBoardToast(t("toastRichBite"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 42 + Math.random() * 20);
      }
    } else if (id === "early_coin") {
      run.earlyCoinArmed = true;
      run.earlyCoinPending = true;
      if (!coin && state === "playing") {
        scheduleNextCoin(performance.now());
      }
      showBoardToast(t("toastEarlyCoin"));
      if (snake?.[0]) {
        spawnTrailSpark(snake[0].x, snake[0].y, true, 48 + Math.random() * 18);
      }
    } else if (id === "surprise") {
      grantSurpriseBoost();
      return;
    }
    updateRunHud();
  }

  function buyItem(id) {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item || coins < item.price) return;
    if (item.permanent) {
      if (inventory[id] > 0) return;
      coins -= item.price;
      inventory[id]++;
      saveCoins();
      saveInventory();
      if (id === "trail" && runActive() && !aiAssisted) {
        run.sparkleTrail = true;
        updateRunHud();
        if (snake?.[0]) {
          spawnTrailSpark(
            snake[0].x,
            snake[0].y,
            true,
            40 + Math.random() * 30,
          );
        }
      }
      if (id === "echo" && runActive() && !aiAssisted) {
        run.echoTrail = true;
        updateRunHud();
        if (snake?.[0]) {
          spawnTrailSpark(
            snake[0].x,
            snake[0].y,
            true,
            210 + Math.random() * 30,
          );
        }
      }
      showBoardToast(t("toastPermanent", { name: shopItemName(id) }));
      pulseCoinValue();
      haptic(14);
    } else {
      if (boostActive(id)) return;
      coins -= item.price;
      saveCoins();
      if (runActive() && !aiAssisted) {
        applyBoostNow(id);
      } else {
        pending[id] = true;
        savePending();
        showBoardToast(t("toastBoostReady", { name: shopItemName(id) }));
      }
    }
    renderShop();
  }

  function buySkin(id) {
    const skin = SKINS.find((s) => s.id === id);
    if (!skin || ownsSkin(id) || coins < skin.price) return;
    coins -= skin.price;
    cosmetics.owned[id] = 1;
    cosmetics.equipped = id;
    saveCoins();
    saveCosmetics();
    renderShop();
    syncTitleSkin();
    showBoardToast(t("toastEquipped", { name: skinName(id) }));
    haptic(12);
    if (snake) render(performance.now());
  }

  function equipSkin(id) {
    if (!ownsSkin(id)) return;
    cosmetics.equipped = id;
    saveCosmetics();
    renderShop();
    syncTitleSkin();
    showBoardToast(t("toastEquipped", { name: skinName(id) }));
    haptic(10);
    if (snake) render(performance.now());
  }

  function buyFloor(id) {
    const floor = BOARD_FLOORS.find((f) => f.id === id);
    if (!floor || ownsFloor(id) || coins < floor.price) return;
    coins -= floor.price;
    cosmetics.floorsOwned[id] = 1;
    cosmetics.floor = id;
    saveCoins();
    saveCosmetics();
    renderShop();
    showBoardToast(t("toastFloorEquipped", { name: floorName(id) }));
    haptic(12);
    if (snake) render(performance.now());
  }

  function equipFloor(id) {
    if (!ownsFloor(id)) return;
    cosmetics.floor = id;
    saveCosmetics();
    renderShop();
    showBoardToast(t("toastFloorEquipped", { name: floorName(id) }));
    haptic(10);
    if (snake) render(performance.now());
  }

  let pausedForShop = false;

  function openShop() {
    if (missionsClaimableCount() > 0) shopTab = "goals";
    renderShop();
    shopModal.hidden = false;
    document.body.classList.add("shop-open");
    if (state === "playing") {
      state = "paused";
      pausedForShop = true;
      pauseRunClock();
      setPausedChrome(true);
      overlay.classList.remove("visible");
    } else if (state === "paused") {
      overlay.classList.remove("visible");
    }
  }

  function closeShop() {
    shopModal.hidden = true;
    document.body.classList.remove("shop-open");
    if (pausedForShop && state === "paused") {
      state = "playing";
      setPausedChrome(false);
      resumeRunClock();
      pausedForShop = false;
    } else if (state === "paused") {
      showOverlay("overlayPause", "overlayPauseText", "back", {}, "pause");
    }
    updateShrinkBtn();
  }

  shopBtn.addEventListener("click", openShop);
  shopCloseBtn.addEventListener("click", closeShop);
  shopBackdrop.addEventListener("click", closeShop);
  if (shopTabsEl) {
    shopTabsEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-shop-tab]");
      if (!btn || !shopTabsEl.contains(btn)) return;
      shopTab = btn.dataset.shopTab;
      renderShop();
    });
  }
  shrinkBtn.addEventListener("click", useShrink);
  overlayShopBtn.addEventListener("click", () => {
    if (state === "paused" || state === "idle" || state === "over") openShop();
  });
  overlayQuitBtn.addEventListener("click", endRunFromPause);

  playBtn.addEventListener("click", () => {
    if (state === "paused") {
      togglePause();
      return;
    }
    start();
  });

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
    if (poisonBerry && cell.x === poisonBerry.x && cell.y === poisonBerry.y) {
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
    const tail = body[body.length - 1];
    const tailIdx = cycleIndex[tail.y][tail.x];
    const rel = (cell) =>
      (cycleIndex[cell.y][cell.x] - tailIdx + CELLS) % CELLS;
    const relHead = rel(body[0]);

    const specials = [];
    if (goldenApple) specials.push(goldenApple);
    if (powerBerry) specials.push(powerBerry);
    let bestSpecial = null;
    let bestSpecialRel = Infinity;
    for (const s of specials) {
      const r = rel(s);
      if (r > relHead && r < bestSpecialRel) {
        bestSpecialRel = r;
        bestSpecial = s;
      }
    }
    if (bestSpecial) return bestSpecial;

    if (!foods.length) return specials[0] || null;
    let best = null;
    let bestRel = Infinity;
    for (const f of foods) {
      const r = rel(f);
      if (r > relHead && r < bestRel) {
        bestRel = r;
        best = f;
      }
    }
    return best || foods[0] || specials[0] || null;
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
    // While the shop or source modal is open, don't steer or un-pause the
    // game underneath it. Only the shop close shortcuts stay active
    // (the source viewer handles its own Escape).
    if (!shopModal.hidden || document.body.classList.contains("source-open")) {
      if (
        !shopModal.hidden &&
        (e.key === "Escape" ||
          ((e.key === "b" || e.key === "B") &&
            !e.metaKey &&
            !e.ctrlKey &&
            !e.altKey))
      ) {
        e.preventDefault();
        closeShop();
      }
      return;
    }
    const name = KEY_DIRS[e.key] || KEY_DIRS[e.key.toLowerCase()];
    if (name) {
      e.preventDefault();
      if (state === "playing") {
        if (!autoPlayEnabled) setDirection(name);
      } else if (state === "paused") {
        togglePause();
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
      (e.key === "r" || e.key === "R") &&
      (state === "idle" ||
        state === "over" ||
        (state === "paused" && shopModal.hidden)) &&
      !e.metaKey &&
      !e.ctrlKey
    ) {
      e.preventDefault();
      setAutoPlay(false);
      start();
    } else if (
      (e.key === "x" || e.key === "X") &&
      state === "playing" &&
      !autoPlayEnabled
    ) {
      useShrink();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (!shopModal.hidden) closeShop();
      else if (state === "playing" || state === "paused") togglePause();
    } else if (e.key === "b" || e.key === "B") {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      if (!shopModal.hidden) closeShop();
      else if (state === "idle" || state === "over" || state === "paused")
        openShop();
      else if (state === "playing") openShop();
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
  canvas.addEventListener("dblclick", (e) => {
    e.preventDefault();
    if (state === "playing" || state === "paused") togglePause();
  });
  bindSwipeTarget(swipePadSurface, {
    onTap: () => {
      if (state === "idle" || state === "over") start();
    },
  });

  pauseBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state === "playing" || state === "paused") togglePause();
  });

  if (desktopPauseBtn) {
    desktopPauseBtn.addEventListener("click", () => {
      if (state === "playing" || state === "paused") togglePause();
      else if (state === "idle" || state === "over") start();
    });
  }

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
      pauseRunClock();
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
      resumeRunClock();
    }
  };

  function maybeDailyGift() {
    const key = "mumu-daily-gift";
    const day = todayKey();
    try {
      if (localStorage.getItem(key) === day) return;
      localStorage.setItem(key, day);
    } catch (e) {
      return;
    }
    if (coins >= 4) return;
    const gift = coins <= 0 ? 2 : 1;
    addCoins(gift);
    pulseCoinValue();
    showBoardToast(t("toastDailyGift", { n: gift }));
  }

  run = defaultRun();
  foods = [];
  reset();
  state = "idle";
  currentLang =
    document.documentElement.dataset.lang === "th" ? "th" : detectLang();
  overlayState = idleOverlayKeys();
  applyLanguage(currentLang);
  updateShrinkBtn();
  updateShopBadge();
  syncTitleSkin();
  maybeDailyGift();
  faceImg.onload = () => render(performance.now());
  faceOpenImg.onload = () => render(performance.now());
  render(performance.now());
  requestAnimationFrame(loop);
})();
