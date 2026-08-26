(() => {
  "use strict";

  const GRID = 20;
  const BASE_TICK_MS = 220;
  const MIN_TICK_MS = 70;
  const SPEEDUP_PER_FOOD = 4;

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("high-score");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const playBtn = document.getElementById("play-btn");

  const faceImg = new Image();
  faceImg.src = "assets/snake-face.png";

  // Match the canvas bitmap to its rendered size (and device pixel ratio)
  // so the board stays crisp at any viewport size.
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

  let snake, dir, dirQueue, food, score, tickMs, state, lastTick;
  let highScore = Number(localStorage.getItem("snake-high-score")) || 0;
  highScoreEl.textContent = highScore;

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
    tickMs = BASE_TICK_MS;
    scoreEl.textContent = "0";
    placeFood();
  }

  function placeFood() {
    const free = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
      }
    }
    food = free[Math.floor(Math.random() * free.length)];
  }

  function setDirection(name) {
    const next = DIRS[name];
    if (!next) return;
    const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
    // Ignore reversals and duplicates.
    if (next.x === -last.x && next.y === -last.y) return;
    if (next.x === last.x && next.y === last.y) return;
    if (dirQueue.length < 3) dirQueue.push(next);
  }

  function step() {
    if (dirQueue.length) dir = dirQueue.shift();

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    const hitWall =
      head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
    const hitSelf = snake.some(
      (s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y,
    );
    if (hitWall || hitSelf) {
      gameOver();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      scoreEl.textContent = score;
      tickMs = Math.max(MIN_TICK_MS, BASE_TICK_MS - score * SPEEDUP_PER_FOOD);
      if (snake.length === GRID * GRID) {
        win();
        return;
      }
      placeFood();
    } else {
      snake.pop();
    }
  }

  // --- Rendering ---

  function drawBoard() {
    ctx.fillStyle = "#d8e4f7";
    ctx.fillRect(0, 0, boardSize, boardSize);
    ctx.fillStyle = "#ded6f5";
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  function drawFood(time) {
    const cx = (food.x + 0.5) * CELL;
    const cy = (food.y + 0.5) * CELL;
    const pulse = 1 + 0.05 * Math.sin(time / 280);
    const r = CELL * 0.3 * pulse;

    ctx.beginPath();
    ctx.fillStyle = "#c44536";
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, CELL * 0.07);
    ctx.strokeStyle = "#343056";
    ctx.stroke();

    ctx.fillStyle = "#3d6b3a";
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

    drawBody(CELL * 0.1, () => "#343056");
    drawBody(0, (i) => segmentColor(i, snake.length));

    // Head: the face image, rotated so its top points where the snake travels.
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
    drawFood(time);
    drawSnake();
  }

  // --- Game flow ---

  function loop(time) {
    if (state === "playing") {
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

  function start() {
    reset();
    state = "playing";
    lastTick = performance.now();
    overlay.classList.remove("visible");
  }

  function showOverlay(title, text, btnLabel) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    playBtn.textContent = btnLabel;
    overlay.classList.add("visible");
  }

  function gameOver() {
    state = "over";
    setAutoPlay(false);
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("snake-high-score", highScore);
      highScoreEl.textContent = highScore;
      showOverlay("New best.", `${score} — keep going.`, "Again");
    } else {
      showOverlay(
        "Ouch.",
        `${score} this time. Best is ${highScore}.`,
        "Again",
      );
    }
  }

  function win() {
    state = "over";
    setAutoPlay(false);
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("snake-high-score", highScore);
      highScoreEl.textContent = highScore;
    }
    showOverlay("Stuffed.", `The whole board. ${score} points.`, "Again");
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      showOverlay("Hold on.", "Mumu is waiting.", "Back");
    } else if (state === "paused") {
      state = "playing";
      lastTick = performance.now();
      overlay.classList.remove("visible");
    }
  }

  // --- Auto-play AI ---

  let autoPlayEnabled = false;
  const autoPlayBtn = document.getElementById("auto-play-btn");

  // Precomputed Hamiltonian cycle: columns 1..GRID-1 serpentine through the
  // rows, column 0 is the return path back to the start. Works because GRID
  // is even, so following the cycle visits every cell and never dies.
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

  // A cell the head can move into right now (same rule as step(): the tail
  // cell is free because it vacates on the same tick).
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

  // The guaranteed strategy below relies on the body lying in cycle order
  // (strictly increasing cycle distance from tail to head). That always holds
  // when auto play drives from the start, but not when the player steered
  // manually and then handed control over mid-game.
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

  // Body after the head moves into `cell` (growing if it eats there).
  function bodyAdvance(body, cell, eats) {
    const next = [cell, ...body];
    if (!eats) next.pop();
    return next;
  }

  // Free-cell flood-fill size from `cell` (tail counts as free).
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

  // Time-aware survivability probe: after moving the head to `cell`, run a
  // BFS where a body cell only blocks the search until the tail has retreated
  // past it. Reports whether the tail is chasable (long-term survival) and
  // how many ticks of movement are reachable at all (short-term survival).
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

  // One-step heuristic score for a candidate head cell on a virtual body.
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

  // The heuristic policy: best-scoring safe cell for a virtual body.
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

  // Deterministically play the heuristic policy forward from a first move.
  // Success means the body fell back into cycle order (the guaranteed
  // strategy takes over from there) or it survived a full board's worth of
  // ticks. Because the policy is deterministic, a surviving rollout is the
  // trajectory the real game will actually follow.
  function rollout(firstCell) {
    let foodCell = food;
    let eats = firstCell.x === foodCell.x && firstCell.y === foodCell.y;
    let body = bodyAdvance(snake, firstCell, eats);
    if (eats) foodCell = null;
    for (let s = 0; s < CELLS; s++) {
      if (isOrderedBody(body)) return { ok: true, steps: s };
      const cell = policyCell(body, foodCell);
      if (!cell) return { ok: false, steps: s };
      eats = foodCell && cell.x === foodCell.x && cell.y === foodCell.y;
      body = bodyAdvance(body, cell, eats);
      if (eats) foodCell = null;
    }
    return { ok: true, steps: CELLS };
  }

  // Recovery mode for an unordered body: pick the first move whose rollout
  // provably survives until the body is cycle-ordered again. If every rollout
  // dies, take the one that survives longest.
  function recoveryDirection() {
    const head = snake[0];
    const candidates = [];
    for (const name of Object.keys(DIRS)) {
      const d = DIRS[name];
      const cell = { x: head.x + d.x, y: head.y + d.y };
      if (!isSafeCell(cell, snake)) continue;
      candidates.push({ name, cell, score: scoreCell(cell, snake, food) });
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

  // Strategy: follow the Hamiltonian cycle, but take shortcuts forward along
  // it when the food lies ahead. Measuring every cell by its cycle distance
  // from the tail, the body is always strictly ordered tail -> head; a move
  // is safe iff it lands strictly ahead of the head without passing the tail.
  // That invariant makes collisions impossible, so the snake always wins.
  function getAutoDirection() {
    if (!isOrderedBody(snake)) return recoveryDirection();

    const head = snake[0];
    const tail = snake[snake.length - 1];
    const tailIdx = cycleIndex[tail.y][tail.x];
    const rel = (cell) =>
      (cycleIndex[cell.y][cell.x] - tailIdx + CELLS) % CELLS;

    const relHead = rel(head);
    const relFood = rel(food);

    // Shortcut: biggest forward jump that doesn't overshoot the food.
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

    // Otherwise follow the cycle. The next cell is always free or the tail
    // (which vacates this tick), so this can only fail right at the win.
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
    autoPlayBtn.textContent = on ? "Stop" : "Auto";
    autoPlayBtn.setAttribute("aria-pressed", String(on));
    if (on) dirQueue = [];
  }

  autoPlayBtn.addEventListener("click", () => {
    if (autoPlayEnabled) {
      setAutoPlay(false);
      return;
    }
    if (state === "idle" || state === "over") start();
    else if (state === "paused") togglePause();
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
    if (e.key === " ") {
      e.preventDefault();
      if (state === "playing" || state === "paused") togglePause();
      else start();
    } else if (e.key === "Enter" && state !== "playing") {
      start();
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

  // On-screen d-pad (visible on touch devices).
  document.querySelectorAll(".dpad-btn[data-dir]").forEach((btn) => {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (state === "playing") {
        if (!autoPlayEnabled) setDirection(btn.dataset.dir);
      } else if (state === "idle" || state === "over") start();
    });
  });

  document.getElementById("pause-btn").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state === "playing" || state === "paused") togglePause();
  });

  playBtn.addEventListener("click", start);

  if (window.matchMedia("(pointer: coarse)").matches) {
    overlayText.textContent = "Swipe the board or tap the arrows.";
  }

  // Initial idle render behind the start overlay.
  reset();
  state = "idle";
  faceImg.onload = () => render(performance.now());
  render(performance.now());
  requestAnimationFrame(loop);
})();
