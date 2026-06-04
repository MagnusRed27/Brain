const STORE_KEY = "neuroforge:v1";

const COLORS = {
  mint: "#65e6b7",
  amber: "#f5c45f",
  coral: "#ff756b",
  cyan: "#66d9e8",
  violet: "#b59cff",
  lime: "#c4e86b",
  red: "#ff5d7d",
  text: "#f5f7f2",
  muted: "#a6b3b5",
  panel: "#0f161e",
};

const DOMAINS = [
  { id: "memory", label: "Память", color: COLORS.mint },
  { id: "wm", label: "Рабочая", color: COLORS.amber },
  { id: "focus", label: "Внимание", color: COLORS.cyan },
  { id: "logic", label: "Логика", color: COLORS.coral },
  { id: "speed", label: "Скорость", color: COLORS.lime },
  { id: "spatial", label: "Образы", color: COLORS.violet },
];

const MODE_META = {
  circuit: {
    title: "Точная сессия на 12 минут",
    kicker: "сегодняшний маршрут",
    domain: "memory",
  },
  nback: {
    title: "Dual Stream",
    kicker: "рабочая память",
    domain: "wm",
    skill: "обновление",
  },
  grid: {
    title: "Memory Grid",
    kicker: "пространственная память",
    domain: "spatial",
    skill: "последовательность",
  },
  focus: {
    title: "Focus Switch",
    kicker: "контроль внимания",
    domain: "focus",
    skill: "торможение",
  },
  logic: {
    title: "Logic Forge",
    kicker: "паттерны и выводы",
    domain: "logic",
    skill: "закономерность",
  },
  recall: {
    title: "Recall Vault",
    kicker: "активное воспроизведение",
    domain: "memory",
    skill: "повторение",
  },
};

const DRILL_DOMAINS = {
  nback: ["wm", "focus", "speed"],
  grid: ["spatial", "memory", "focus"],
  focus: ["focus", "speed"],
  logic: ["logic", "spatial"],
  recall: ["memory"],
};

const MODE_VISUALS = {
  circuit: { code: "NF", accent: COLORS.mint, glow: "rgba(101, 230, 183, 0.22)", sprite: "./assets/sprites/speed-wave.png" },
  nback: { code: "WM", accent: COLORS.amber, glow: "rgba(245, 196, 95, 0.22)", sprite: "./assets/sprites/working-memory.png" },
  grid: { code: "SP", accent: COLORS.violet, glow: "rgba(181, 156, 255, 0.22)", sprite: "./assets/sprites/spatial-grid.png" },
  focus: { code: "FC", accent: COLORS.cyan, glow: "rgba(102, 217, 232, 0.22)", sprite: "./assets/sprites/focus-reticle.png" },
  logic: { code: "LG", accent: COLORS.coral, glow: "rgba(255, 117, 107, 0.22)", sprite: "./assets/sprites/logic-prism.png" },
  recall: { code: "RC", accent: COLORS.mint, glow: "rgba(101, 230, 183, 0.22)", sprite: "./assets/sprites/recall-crystal.png" },
};

const DEFAULT_CARDS = [
  {
    front: "Что сильнее укрепляет долгую память: перечитывание или попытка вспомнить?",
    back: "попытка вспомнить",
  },
  {
    front: "Как называется тренировка с растущими интервалами между повторами?",
    back: "интервальное повторение",
  },
  {
    front: "Что измеряет n-back?",
    back: "рабочую память",
  },
  {
    front: "Что помогает удерживать фокус при конфликте слова и цвета?",
    back: "тормозной контроль",
  },
];

const els = {
  arena: document.querySelector("#arena"),
  modeTitle: document.querySelector("#modeTitle"),
  modeKicker: document.querySelector("#modeKicker"),
  levelLabel: document.querySelector("#levelLabel"),
  roundTimer: document.querySelector("#roundTimer"),
  comboLabel: document.querySelector("#comboLabel"),
  todayXp: document.querySelector("#todayXp"),
  streakDays: document.querySelector("#streakDays"),
  sessionFocus: document.querySelector("#sessionFocus"),
  overallScore: document.querySelector("#overallScore"),
  domainBars: document.querySelector("#domainBars"),
  radarCanvas: document.querySelector("#radarCanvas"),
  trendCanvas: document.querySelector("#trendCanvas"),
  coachPlan: document.querySelector("#coachPlan"),
  coachSignal: document.querySelector("#coachSignal"),
  startCircuitBtn: document.querySelector("#startCircuitBtn"),
  weekLoad: document.querySelector("#weekLoad"),
  loadStrip: document.querySelector("#loadStrip"),
  historyCount: document.querySelector("#historyCount"),
  recentLog: document.querySelector("#recentLog"),
  toast: document.querySelector("#toast"),
};

let state = loadState();
let activeMode = "circuit";
let taskToken = 0;
let countdownTimer = null;
let countdownEndsAt = 0;
let circuitQueue = [];
let circuitActive = false;
let combo = 1;

init();

function init() {
  refreshDailyState();
  bindGlobalEvents();
  renderChrome();
  setMode("circuit");
}

function bindGlobalEvents() {
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => {
      circuitActive = false;
      circuitQueue = [];
      setMode(button.dataset.mode);
    });
  });

  els.startCircuitBtn.addEventListener("click", startCircuit);
}

function loadState() {
  const fallback = createDefaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!saved || typeof saved !== "object") return fallback;
    return normalizeState({ ...fallback, ...saved });
  } catch {
    return fallback;
  }
}

function createDefaultState() {
  const now = Date.now();
  return {
    createdAt: now,
    lastActiveDate: todayKey(),
    todayXp: 0,
    streakDays: 1,
    comboBest: 1,
    domains: {
      memory: 42,
      wm: 38,
      focus: 44,
      logic: 40,
      speed: 43,
      spatial: 39,
    },
    levels: {
      nback: 1,
      grid: 1,
      focus: 1,
      logic: 1,
      recall: 1,
    },
    history: [],
    cards: DEFAULT_CARDS.map((card, index) => ({
      id: `starter-${index + 1}`,
      front: card.front,
      back: card.back,
      due: now - 1000 + index,
      interval: 0,
      ease: 2.35,
      seen: 0,
    })),
  };
}

function normalizeState(next) {
  next.domains = { ...createDefaultState().domains, ...(next.domains || {}) };
  next.levels = { ...createDefaultState().levels, ...(next.levels || {}) };
  next.history = Array.isArray(next.history) ? next.history.slice(-120) : [];
  next.cards = Array.isArray(next.cards) && next.cards.length ? next.cards : createDefaultState().cards;
  next.todayXp = Number.isFinite(next.todayXp) ? next.todayXp : 0;
  next.streakDays = Number.isFinite(next.streakDays) ? next.streakDays : 1;
  return next;
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function refreshDailyState() {
  const today = todayKey();
  if (state.lastActiveDate === today) return;
  const yesterday = dateKey(addDays(new Date(), -1));
  state.streakDays = state.lastActiveDate === yesterday ? state.streakDays + 1 : 1;
  state.lastActiveDate = today;
  state.todayXp = 0;
  saveState();
}

function todayKey() {
  return dateKey(new Date());
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function renderChrome() {
  const today = todayKey();
  const todayRounds = state.history.filter((item) => item.date === today);
  const averageAccuracy = todayRounds.length
    ? Math.round(avg(todayRounds.map((item) => item.accuracy)) * 100)
    : 0;
  const overall = Math.round(avg(DOMAINS.map((domain) => state.domains[domain.id])));

  els.todayXp.textContent = Math.round(state.todayXp);
  els.streakDays.textContent = state.streakDays;
  els.sessionFocus.textContent = `${averageAccuracy}%`;
  els.overallScore.textContent = overall;
  els.historyCount.textContent = state.history.length;
  els.comboLabel.textContent = `x${combo.toFixed(1)}`;

  renderDomainBars();
  drawRadar();
  drawTrend();
  renderCoach();
  renderLoadStrip();
  renderRecentLog();
  updateLevelHeader();
}

function renderDomainBars() {
  els.domainBars.innerHTML = DOMAINS.map((domain) => {
    const value = Math.round(state.domains[domain.id]);
    return `
      <div class="domain-row">
        <span>${domain.label}</span>
        <div class="bar-track"><div class="bar-fill" style="width: ${value}%; background: ${domain.color}"></div></div>
        <strong>${value}</strong>
      </div>
    `;
  }).join("");
}

function drawRadar() {
  const canvas = els.radarCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2 + 6;
  const radius = Math.min(width, height) * 0.36;
  const axes = DOMAINS.length;

  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";

  for (let ring = 1; ring <= 4; ring += 1) {
    ctx.beginPath();
    for (let i = 0; i < axes; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / axes;
      const r = (radius * ring) / 4;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  DOMAINS.forEach((domain, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axes;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = domain.color;
    ctx.font = "600 11px Inter, sans-serif";
    ctx.textAlign = x < centerX - 5 ? "right" : x > centerX + 5 ? "left" : "center";
    ctx.fillText(domain.label, x + Math.cos(angle) * 10, y + Math.sin(angle) * 10 + 4);
  });

  ctx.beginPath();
  DOMAINS.forEach((domain, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axes;
    const value = clamp(state.domains[domain.id], 0, 100) / 100;
    const x = centerX + Math.cos(angle) * radius * value;
    const y = centerY + Math.sin(angle) * radius * value;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(75, 214, 163, 0.18)";
  ctx.strokeStyle = "rgba(75, 214, 163, 0.78)";
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
}

function drawTrend() {
  const canvas = els.trendCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const items = state.history.slice(-14);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  for (let y = 24; y < height; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  if (!items.length) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = "600 13px Inter, sans-serif";
    ctx.fillText("первые данные появятся после раунда", 18, 74);
    return;
  }

  const pad = 18;
  const step = items.length > 1 ? (width - pad * 2) / (items.length - 1) : 0;
  ctx.beginPath();
  items.forEach((item, index) => {
    const x = pad + step * index;
    const y = height - pad - clamp(item.accuracy, 0, 1) * (height - pad * 2);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = COLORS.amber;
  ctx.lineWidth = 3;
  ctx.stroke();

  items.forEach((item, index) => {
    const x = pad + step * index;
    const y = height - pad - clamp(item.accuracy, 0, 1) * (height - pad * 2);
    ctx.fillStyle = item.accuracy >= 0.75 ? COLORS.mint : item.accuracy >= 0.55 ? COLORS.amber : COLORS.red;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderCoach() {
  const plan = getRecommendedPlan();
  const weakest = getWeakestDomain();
  els.coachSignal.textContent = `${weakest.label.toLowerCase()} ${Math.round(state.domains[weakest.id])}`;
  els.coachPlan.innerHTML = plan.map((mode, index) => {
    const meta = MODE_META[mode];
    const load = Math.round(getModeNeed(mode));
    return `
      <div class="coach-step">
        <div>
          <span>${index + 1}. ${meta.title}</span>
          <small>${meta.kicker}</small>
        </div>
        <strong>${load}</strong>
      </div>
    `;
  }).join("");
}

function renderLoadStrip() {
  const today = new Date();
  const day = today.getDay() || 7;
  const monday = addDays(today, 1 - day);
  const deepDays = new Set(
    state.history
      .filter((item) => item.xp >= 22)
      .map((item) => item.date)
  );
  let weekCount = 0;
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(monday, i);
    const key = dateKey(date);
    const done = deepDays.has(key);
    if (done) weekCount += 1;
    days.push({ key, done, isToday: key === todayKey(), label: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i] });
  }
  els.weekLoad.textContent = `${weekCount}/3`;
  els.loadStrip.innerHTML = days.map((dayItem) => `
    <div class="load-day ${dayItem.done ? "is-done" : ""} ${dayItem.isToday ? "is-today" : ""}" title="${dayItem.key}">
      <small>${dayItem.label}</small>
    </div>
  `).join("");
}

function renderRecentLog() {
  const items = state.history.slice(-5).reverse();
  if (!items.length) {
    els.recentLog.innerHTML = `<div class="recent-item"><span>нет раундов</span><strong>0</strong></div>`;
    return;
  }
  els.recentLog.innerHTML = items.map((item) => `
    <div class="recent-item">
      <span>${item.label}</span>
      <strong>${Math.round(item.accuracy * 100)}%</strong>
    </div>
  `).join("");
}

function setMode(mode, options = {}) {
  activeMode = mode;
  clearTask();
  const visual = getModeVisual(mode);
  document.body.dataset.mode = mode;
  document.body.style.setProperty("--mode-accent", visual.accent);
  document.body.style.setProperty("--mode-glow", visual.glow);
  document.body.style.setProperty("--mode-sprite", `url("${visual.sprite}")`);
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
  const meta = MODE_META[mode];
  els.modeTitle.textContent = meta.title;
  els.modeKicker.textContent = meta.kicker;
  updateLevelHeader();

  if (mode === "circuit") renderCircuit();
  if (mode === "nback") renderNbackIntro(options.autoStart);
  if (mode === "grid") renderGridIntro(options.autoStart);
  if (mode === "focus") renderFocusIntro(options.autoStart);
  if (mode === "logic") renderLogicIntro(options.autoStart);
  if (mode === "recall") renderRecall();
}

function clearTask() {
  taskToken += 1;
  if (countdownTimer) window.clearInterval(countdownTimer);
  countdownTimer = null;
  countdownEndsAt = 0;
  els.roundTimer.textContent = "00:00";
}

function updateLevelHeader() {
  const level = activeMode === "circuit" ? getAverageLevel() : (state.levels[activeMode] || 1);
  els.levelLabel.textContent = `L${level}`;
}

function getAverageLevel() {
  const values = Object.values(state.levels);
  return Math.round(avg(values));
}

function renderCircuit() {
  const plan = getRecommendedPlan();
  const weakest = getWeakestDomain();
  const overall = Math.round(avg(DOMAINS.map((domain) => state.domains[domain.id])));
  els.arena.innerHTML = `
    <div class="hero-console">
      <section class="circuit-board">
        <div class="circuit-title">
          <h3>Маршрут под текущий профиль</h3>
          <p>Баланс: память, контроль внимания, скорость, логика и перенос между форматами.</p>
        </div>
        <div class="route-list">
          ${plan.map((mode, index) => {
            const meta = MODE_META[mode];
            const need = Math.round(getModeNeed(mode));
            const visual = getModeVisual(mode);
            const level = state.levels[mode] || getAverageLevel();
            const recent = getRecentAccuracy(mode);
            return `
              <div class="route-item" style="--route-accent: ${visual.accent}; --route-glow: ${visual.glow}; --route-sprite: url('${visual.sprite}')">
                <div class="route-rank"><img src="${visual.sprite}" alt="" /><span>${visual.code}</span></div>
                <div>
                  <strong>${index + 1}. ${meta.title}</strong>
                  <small>${meta.kicker}</small>
                </div>
                <div class="route-meta">
                  <span>L${level}</span>
                  <span>${recent ? `${recent}%` : "NEW"}</span>
                </div>
                <div class="route-meter"><span style="width: ${need}%"></span></div>
              </div>
            `;
          }).join("")}
        </div>
      </section>
      <section class="live-brief">
        <div class="pulse-ring">
          <div>
            <strong>${overall}</strong>
            <small>нейроиндекс</small>
          </div>
        </div>
        <div class="pulse-caption">
          <span>Adaptive core</span>
          <strong>${Math.round(getModeNeed(plan[0]))}%</strong>
        </div>
        <div class="mini-stats">
          <div class="mini-stat"><span>${weakest.label}</span><small>главная зона</small></div>
          <div class="mini-stat"><span>${state.history.length}</span><small>раундов</small></div>
          <div class="mini-stat"><span>${dueCards().length}</span><small>карточек к повтору</small></div>
        </div>
        <button class="primary-action" type="button" id="arenaStartCircuit">Запустить маршрут</button>
      </section>
    </div>
  `;
  document.querySelector("#arenaStartCircuit").addEventListener("click", startCircuit);
}

function startCircuit() {
  circuitActive = true;
  circuitQueue = getRecommendedPlan();
  toast("Маршрут собран. Начинаем с самого полезного раунда.");
  runNextCircuit();
}

function runNextCircuit() {
  if (!circuitQueue.length) {
    circuitActive = false;
    setMode("circuit");
    showCircuitComplete();
    return;
  }
  const next = circuitQueue.shift();
  setMode(next, { autoStart: true });
}

function showCircuitComplete() {
  const recent = state.history.slice(-5);
  const acc = recent.length ? Math.round(avg(recent.map((item) => item.accuracy)) * 100) : 0;
  els.arena.innerHTML = `
    <div class="result-panel">
      <h3>Маршрут завершен</h3>
      <div class="result-grid">
        <div><span>${acc}%</span><small>точность</small></div>
        <div><span>${Math.round(state.todayXp)}</span><small>XP сегодня</small></div>
        <div><span>${getAverageLevel()}</span><small>средний уровень</small></div>
        <div><span>${getWeakestDomain().label}</span><small>следующий фокус</small></div>
      </div>
      <button class="primary-action" type="button" id="finishAgain">Новый маршрут</button>
    </div>
  `;
  document.querySelector("#finishAgain").addEventListener("click", startCircuit);
}

function renderNbackIntro(autoStart = false) {
  const level = state.levels.nback;
  const n = Math.min(6, Math.max(1, level));
  els.arena.innerHTML = `
    <div class="task-shell">
      <section class="task-zone">
        <div class="task-title">
          <div>
            <h3>Dual Stream</h3>
            <p>Отмечай совпадение позиции и символа с тем, что было ${n} назад.</p>
          </div>
          <span class="badge">n=${n}</span>
        </div>
        <div class="task-main">
          <div class="nback-display">
            <div class="nback-grid">${Array.from({ length: 9 }, (_, i) => `<div class="nback-cell" data-cell="${i}"></div>`).join("")}</div>
            <div class="answer-actions">
              <button class="answer-button" type="button" data-choice="pos">Позиция</button>
              <button class="answer-button" type="button" data-choice="sym">Символ</button>
              <button class="answer-button" type="button" data-choice="both">Оба</button>
              <button class="answer-button" type="button" data-choice="none">Нет</button>
            </div>
            <div class="progress-track"><span id="taskProgress"></span></div>
          </div>
        </div>
        <button class="primary-action" id="startNback" type="button">Старт</button>
      </section>
      ${sidePanel("wm")}
    </div>
  `;
  document.querySelector("#startNback").addEventListener("click", startNbackRound);
  if (autoStart) startNbackRound();
}

function startNbackRound() {
  clearTask();
  const token = taskToken;
  const level = state.levels.nback;
  const n = Math.min(6, Math.max(1, level));
  const total = 10 + Math.min(8, level * 2);
  const pace = Math.max(1250, 2500 - level * 130);
  const letters = "КЛМНРСТФХ";
  const cells = [...document.querySelectorAll(".nback-cell")];
  const choiceButtons = [...document.querySelectorAll(".answer-button[data-choice]")];
  const startButton = document.querySelector("#startNback");
  if (startButton) startButton.hidden = true;

  let sequence = [];
  let trial = 0;
  let correct = 0;
  let totalRt = 0;
  let firstActionAt = 0;
  let selected = { pos: false, sym: false };
  let answered = false;
  let trialTimeout = null;

  startCountdown(Math.ceil((total * pace) / 1000));

  choiceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!sequence.length || answered) return;
      const choice = button.dataset.choice;
      if (!firstActionAt) firstActionAt = performance.now();
      if (choice === "none") {
        selected = { pos: false, sym: false };
        evaluate();
        return;
      }
      if (choice === "both") {
        selected = { pos: true, sym: true };
        choiceButtons.forEach((item) => item.classList.remove("is-selected"));
        button.classList.add("is-selected");
        evaluate();
        return;
      }
      selected[choice] = !selected[choice];
      button.classList.toggle("is-selected", selected[choice]);
    });
  });

  function nextTrial() {
    if (token !== taskToken) return;
    if (trial >= total) {
      finish();
      return;
    }
    selected = { pos: false, sym: false };
    answered = false;
    firstActionAt = 0;
    choiceButtons.forEach((button) => button.classList.remove("is-selected"));
    cells.forEach((cell) => {
      cell.textContent = "";
      cell.classList.remove("is-hot");
    });

    const item = makeNbackItem(sequence, n, letters);
    sequence.push(item);
    const cell = cells[item.pos];
    cell.textContent = item.sym;
    cell.classList.add("is-hot");
    setProgress((trial / total) * 100);
    trial += 1;
    trialTimeout = window.setTimeout(evaluate, pace);
  }

  function evaluate() {
    if (answered || token !== taskToken) return;
    answered = true;
    if (trialTimeout) window.clearTimeout(trialTimeout);
    const item = sequence[sequence.length - 1];
    const hit = selected.pos === item.posMatch && selected.sym === item.symMatch;
    if (hit) {
      correct += 1;
      if (firstActionAt) totalRt += performance.now() - firstActionAt;
      else totalRt += pace;
    }
    setProgress((trial / total) * 100);
    window.setTimeout(nextTrial, 180);
  }

  function finish() {
    const accuracy = correct / total;
    const avgRt = correct ? totalRt / correct : pace;
    const xp = Math.round(18 + accuracy * 28 + level * 2);
    adaptLevel("nback", accuracy);
    recordRound({
      mode: "nback",
      label: "Dual Stream",
      accuracy,
      xp,
      rt: avgRt,
      domains: { wm: 1, focus: 0.45, speed: 0.25 },
    });
    showRoundResult("Dual Stream", accuracy, xp, [
      ["n-back", n],
      ["попаданий", `${correct}/${total}`],
      ["реакция", `${Math.round(avgRt)} мс`],
      ["уровень", `L${state.levels.nback}`],
    ]);
  }

  nextTrial();
}

function makeNbackItem(sequence, n, letters) {
  const hasBack = sequence.length >= n;
  const back = hasBack ? sequence[sequence.length - n] : null;
  let pos = randomInt(0, 8);
  let sym = letters[randomInt(0, letters.length - 1)];
  let posMatch = false;
  let symMatch = false;

  if (hasBack && Math.random() < 0.34) {
    pos = back.pos;
    posMatch = true;
  }
  if (hasBack && Math.random() < 0.34) {
    sym = back.sym;
    symMatch = true;
  }
  if (hasBack && !posMatch && pos === back.pos) pos = (pos + randomInt(1, 8)) % 9;
  if (hasBack && !symMatch && sym === back.sym) {
    const options = letters.replace(sym, "");
    sym = options[randomInt(0, options.length - 1)];
  }
  return { pos, sym, posMatch, symMatch };
}

function renderGridIntro(autoStart = false) {
  const level = state.levels.grid;
  const size = level >= 5 ? 5 : 4;
  const length = Math.min(10, 3 + level);
  els.arena.innerHTML = `
    <div class="task-shell">
      <section class="task-zone">
        <div class="task-title">
          <div>
            <h3>Memory Grid</h3>
            <p>Воспроизведи маршрут клеток в том же порядке.</p>
          </div>
          <span class="badge">${size}x${size} / ${length}</span>
        </div>
        <div class="task-main">
          <div class="grid-memory" style="grid-template-columns: repeat(${size}, 1fr)">
            ${Array.from({ length: size * size }, (_, i) => `<button class="grid-cell" type="button" data-cell="${i}">${i}</button>`).join("")}
          </div>
        </div>
        <button class="primary-action" id="startGrid" type="button">Старт</button>
      </section>
      ${sidePanel("spatial")}
    </div>
  `;
  document.querySelector("#startGrid").addEventListener("click", startGridRound);
  if (autoStart) startGridRound();
}

async function startGridRound() {
  clearTask();
  const token = taskToken;
  const level = state.levels.grid;
  const size = level >= 5 ? 5 : 4;
  const length = Math.min(10, 3 + level);
  const pace = Math.max(300, 650 - level * 35);
  const cells = [...document.querySelectorAll(".grid-cell")];
  const startButton = document.querySelector("#startGrid");
  if (startButton) startButton.hidden = true;

  const sequence = [];
  while (sequence.length < length) {
    const next = randomInt(0, size * size - 1);
    if (sequence[sequence.length - 1] !== next) sequence.push(next);
  }

  startCountdown(Math.ceil((length * pace + 9000) / 1000));
  cells.forEach((cell) => {
    cell.disabled = true;
    cell.classList.remove("is-picked", "is-good", "is-bad", "is-flash");
  });

  await sleep(400);
  for (const index of sequence) {
    if (token !== taskToken) return;
    cells[index].classList.add("is-flash");
    await sleep(pace);
    cells[index].classList.remove("is-flash");
    await sleep(Math.max(80, pace * 0.25));
  }
  if (token !== taskToken) return;

  let cursor = 0;
  let finished = false;
  const startedAt = performance.now();
  cells.forEach((cell) => {
    cell.disabled = false;
    cell.addEventListener("click", () => {
      if (finished || token !== taskToken) return;
      const picked = Number(cell.dataset.cell);
      cell.classList.add("is-picked");
      if (picked === sequence[cursor]) {
        cell.classList.add("is-good");
        cursor += 1;
        if (cursor === sequence.length) finish(true);
      } else {
        cell.classList.add("is-bad");
        finish(false);
      }
    });
  });

  function finish(success) {
    if (finished) return;
    finished = true;
    const accuracy = success ? 1 : cursor / sequence.length;
    const rt = performance.now() - startedAt;
    const xp = Math.round(16 + accuracy * 34 + level * 2);
    adaptLevel("grid", accuracy);
    recordRound({
      mode: "grid",
      label: "Memory Grid",
      accuracy,
      xp,
      rt,
      domains: { spatial: 1, memory: 0.65, focus: 0.35 },
    });
    showRoundResult("Memory Grid", accuracy, xp, [
      ["длина", sequence.length],
      ["точно", `${cursor}/${sequence.length}`],
      ["время", `${Math.round(rt / 1000)} с`],
      ["уровень", `L${state.levels.grid}`],
    ]);
  }
}

function renderFocusIntro(autoStart = false) {
  const level = state.levels.focus;
  const total = 12 + level * 2;
  els.arena.innerHTML = `
    <div class="task-shell">
      <section class="task-zone">
        <div class="task-title">
          <div>
            <h3>Focus Switch</h3>
            <p>Переключайся между значением слова и цветом шрифта.</p>
          </div>
          <span class="badge">${total} стимулов</span>
        </div>
        <div class="task-main">
          <div class="focus-card">
            <div class="focus-rule" id="focusRule">цвет</div>
            <div class="focus-word" id="focusWord">КРАСНЫЙ</div>
            <div class="color-choices" id="colorChoices"></div>
            <div class="progress-track"><span id="taskProgress"></span></div>
          </div>
        </div>
        <button class="primary-action" id="startFocus" type="button">Старт</button>
      </section>
      ${sidePanel("focus")}
    </div>
  `;
  document.querySelector("#startFocus").addEventListener("click", startFocusRound);
  if (autoStart) startFocusRound();
}

function startFocusRound() {
  clearTask();
  const token = taskToken;
  const level = state.levels.focus;
  const total = 12 + level * 2;
  const deadline = Math.max(900, 2200 - level * 115);
  const colors = [
    { id: "red", label: "КРАСНЫЙ", value: "#ff5370" },
    { id: "green", label: "ЗЕЛЕНЫЙ", value: "#4bd6a3" },
    { id: "blue", label: "СИНИЙ", value: "#57c7d4" },
    { id: "yellow", label: "ЖЕЛТЫЙ", value: "#f2b84b" },
  ];
  const ruleEl = document.querySelector("#focusRule");
  const wordEl = document.querySelector("#focusWord");
  const choicesEl = document.querySelector("#colorChoices");
  const startButton = document.querySelector("#startFocus");
  if (startButton) startButton.hidden = true;
  choicesEl.innerHTML = colors.map((color) => `
    <button class="color-choice" type="button" data-color="${color.id}" style="background:${color.value}">${color.label}</button>
  `).join("");

  let trial = 0;
  let correct = 0;
  let totalRt = 0;
  let current = null;
  let trialStarted = 0;
  let timeout = null;

  startCountdown(Math.ceil((total * deadline) / 1000));
  document.querySelectorAll(".color-choice").forEach((button) => {
    button.addEventListener("click", () => {
      if (!current || token !== taskToken) return;
      evaluate(button.dataset.color);
    });
  });

  function nextTrial() {
    if (token !== taskToken) return;
    if (trial >= total) {
      finish();
      return;
    }
    const word = colors[randomInt(0, colors.length - 1)];
    let ink = colors[randomInt(0, colors.length - 1)];
    if (Math.random() < 0.72 && ink.id === word.id) {
      ink = colors.find((color) => color.id !== word.id);
    }
    const useInk = Math.random() < (0.48 + Math.min(0.2, level * 0.02));
    current = {
      word,
      ink,
      rule: useInk ? "ЦВЕТ" : "СЛОВО",
      answer: useInk ? ink.id : word.id,
    };
    ruleEl.textContent = current.rule;
    wordEl.textContent = word.label;
    wordEl.style.color = ink.value;
    trialStarted = performance.now();
    setProgress((trial / total) * 100);
    trial += 1;
    timeout = window.setTimeout(() => evaluate(null), deadline);
  }

  function evaluate(answer) {
    if (!current) return;
    if (timeout) window.clearTimeout(timeout);
    const hit = answer === current.answer;
    if (hit) {
      correct += 1;
      totalRt += performance.now() - trialStarted;
    }
    current = null;
    setProgress((trial / total) * 100);
    window.setTimeout(nextTrial, 160);
  }

  function finish() {
    const accuracy = correct / total;
    const avgRt = correct ? totalRt / correct : deadline;
    const xp = Math.round(15 + accuracy * 30 + level * 2);
    adaptLevel("focus", accuracy);
    recordRound({
      mode: "focus",
      label: "Focus Switch",
      accuracy,
      xp,
      rt: avgRt,
      domains: { focus: 1, speed: 0.75 },
    });
    showRoundResult("Focus Switch", accuracy, xp, [
      ["точно", `${correct}/${total}`],
      ["реакция", `${Math.round(avgRt)} мс`],
      ["лимит", `${deadline} мс`],
      ["уровень", `L${state.levels.focus}`],
    ]);
  }

  nextTrial();
}

function renderLogicIntro(autoStart = false) {
  const level = state.levels.logic;
  els.arena.innerHTML = `
    <div class="task-shell">
      <section class="task-zone">
        <div class="task-title">
          <div>
            <h3>Logic Forge</h3>
            <p>Находи правило в числах и визуальных матрицах.</p>
          </div>
          <span class="badge">L${level}</span>
        </div>
        <div class="task-main" id="logicMount"></div>
        <button class="primary-action" id="startLogic" type="button">Старт</button>
      </section>
      ${sidePanel("logic")}
    </div>
  `;
  document.querySelector("#startLogic").addEventListener("click", startLogicRound);
  if (autoStart) startLogicRound();
}

function startLogicRound() {
  clearTask();
  const token = taskToken;
  const level = state.levels.logic;
  const total = 7 + Math.min(5, level);
  const mount = document.querySelector("#logicMount");
  const startButton = document.querySelector("#startLogic");
  if (startButton) startButton.hidden = true;

  let index = 0;
  let correct = 0;
  let totalRt = 0;
  let startedAt = 0;
  let current = null;

  startCountdown(75 + level * 5);
  nextPuzzle();

  function nextPuzzle() {
    if (token !== taskToken) return;
    if (index >= total) {
      finish();
      return;
    }
    current = Math.random() < 0.58 ? generateSequencePuzzle(level) : generateMatrixPuzzle(level);
    startedAt = performance.now();
    mount.innerHTML = current.html;
    mount.querySelectorAll("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => {
        const hit = button.dataset.answer === String(current.answer);
        if (hit) {
          correct += 1;
          totalRt += performance.now() - startedAt;
          button.classList.add("is-selected");
        } else {
          button.classList.add("is-selected");
        }
        index += 1;
        setProgress((index / total) * 100);
        window.setTimeout(nextPuzzle, 360);
      });
    });
  }

  function finish() {
    const accuracy = correct / total;
    const avgRt = correct ? totalRt / correct : 0;
    const xp = Math.round(18 + accuracy * 34 + level * 2);
    adaptLevel("logic", accuracy);
    recordRound({
      mode: "logic",
      label: "Logic Forge",
      accuracy,
      xp,
      rt: avgRt,
      domains: { logic: 1, spatial: 0.45 },
    });
    showRoundResult("Logic Forge", accuracy, xp, [
      ["точно", `${correct}/${total}`],
      ["реакция", `${Math.round(avgRt)} мс`],
      ["тип", "микс"],
      ["уровень", `L${state.levels.logic}`],
    ]);
  }
}

function generateSequencePuzzle(level) {
  const type = randomInt(0, Math.min(3, Math.floor(level / 2) + 1));
  let sequence = [];
  let answer = 0;
  let rule = "";

  if (type === 0) {
    const start = randomInt(2, 12);
    const step = randomInt(2, 5 + level);
    sequence = [0, 1, 2, 3].map((i) => start + i * step);
    answer = start + 4 * step;
    rule = `+${step}`;
  } else if (type === 1) {
    const start = randomInt(3, 14);
    const a = randomInt(2, 5);
    const b = randomInt(4, 8 + level);
    sequence = [start, start + a, start + a + b, start + a + b + a];
    answer = start + a + b + a + b;
    rule = `+${a}, +${b}`;
  } else if (type === 2) {
    const start = randomInt(2, 7);
    const mul = randomInt(2, 3);
    const add = randomInt(1, 4);
    sequence = [start];
    for (let i = 1; i < 4; i += 1) sequence.push(sequence[i - 1] * mul + add);
    answer = sequence[3] * mul + add;
    rule = `x${mul} + ${add}`;
  } else {
    const shift = randomInt(0, 4);
    sequence = [1, 2, 3, 4].map((i) => i * i + shift);
    answer = 25 + shift;
    rule = `n² + ${shift}`;
  }

  const options = shuffle([answer, answer + randomInt(1, 4), answer - randomInt(1, 4), answer + randomInt(5, 9)]);
  return {
    answer,
    html: `
      <div class="logic-board">
        <div class="sequence-line">
          ${sequence.map((item) => `<span>${item}</span>`).join("")}
          <span>?</span>
        </div>
        <div class="logic-options">
          ${options.map((option) => `<button class="answer-button" type="button" data-answer="${option}">${option}</button>`).join("")}
        </div>
        <div class="logic-rule">правило скрыто: ${rule.replace(/\d/g, "•")}</div>
        <div class="progress-track"><span id="taskProgress"></span></div>
      </div>
    `,
  };
}

function generateMatrixPuzzle(level) {
  const shapes = ["●", "■", "▲", "◆"];
  const colors = [COLORS.mint, COLORS.amber, COLORS.coral, COLORS.cyan];
  const offsetShape = randomInt(0, shapes.length - 1);
  const offsetColor = randomInt(0, colors.length - 1);
  const matrix = [];
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      const shapeIndex = (offsetShape + r + c) % shapes.length;
      const colorIndex = (offsetColor + r * (level > 3 ? 2 : 1) + c) % colors.length;
      matrix.push({ shape: shapes[shapeIndex], color: colors[colorIndex], key: `${shapeIndex}-${colorIndex}` });
    }
  }
  const answerItem = matrix[8];
  const answer = answerItem.key;
  const optionPool = [answerItem];
  while (optionPool.length < 4) {
    const item = {
      shape: shapes[randomInt(0, shapes.length - 1)],
      color: colors[randomInt(0, colors.length - 1)],
    };
    item.key = `${shapes.indexOf(item.shape)}-${colors.indexOf(item.color)}`;
    if (!optionPool.some((option) => option.key === item.key)) optionPool.push(item);
  }
  const options = shuffle(optionPool);
  return {
    answer,
    html: `
      <div class="logic-board">
        <div class="matrix-grid">
          ${matrix.map((item, index) => {
            if (index === 8) return `<div class="matrix-cell">?</div>`;
            return `<div class="matrix-cell" style="color:${item.color}">${item.shape}</div>`;
          }).join("")}
        </div>
        <div class="matrix-options">
          ${options.map((item) => `<button class="matrix-option" type="button" data-answer="${item.key}" style="color:${item.color}">${item.shape}</button>`).join("")}
        </div>
        <div class="progress-track"><span id="taskProgress"></span></div>
      </div>
    `,
  };
}

function renderRecall() {
  clearTask();
  const due = dueCards();
  const current = due[0] || state.cards[0];
  els.arena.innerHTML = `
    <div class="task-shell">
      <section class="task-zone">
        <div class="task-title">
          <div>
            <h3>Recall Vault</h3>
            <p>Сначала достань ответ из памяти, потом оцени качество воспроизведения.</p>
          </div>
          <span class="badge">${due.length} к повтору</span>
        </div>
        <div class="task-main">
          <div class="recall-layout">
            <div class="recall-card">
              <div class="recall-prompt">${escapeHtml(current.front)}</div>
              <input class="recall-input" id="recallAnswer" autocomplete="off" placeholder="ответ" />
              <div class="recall-actions">
                <button class="secondary-action" type="button" id="checkRecall">Проверить</button>
                <button class="ghost-action" type="button" id="showRecall">Показать</button>
              </div>
              <div id="recallFeedback" class="hint-line"></div>
              <div class="rating-row" id="ratingRow" hidden>
                <button class="rating-button" type="button" data-rating="bad">Слабо</button>
                <button class="rating-button" type="button" data-rating="ok">Почти</button>
                <button class="rating-button" type="button" data-rating="good">Чисто</button>
              </div>
            </div>
            <form class="recall-form" id="addCardForm">
              <input id="cardFront" placeholder="вопрос" />
              <textarea id="cardBack" placeholder="ответ"></textarea>
              <button class="primary-action" type="submit">Добавить</button>
            </form>
          </div>
        </div>
      </section>
      ${sidePanel("memory")}
    </div>
  `;

  const answerEl = document.querySelector("#recallAnswer");
  const feedbackEl = document.querySelector("#recallFeedback");
  const ratingRow = document.querySelector("#ratingRow");
  document.querySelector("#checkRecall").addEventListener("click", () => {
    const score = compareText(answerEl.value, current.back);
    feedbackEl.innerHTML = score >= 0.68
      ? `<span class="feedback-pill good">похоже</span> ${escapeHtml(current.back)}`
      : `<span class="feedback-pill warn">проверь</span> ${escapeHtml(current.back)}`;
    ratingRow.hidden = false;
  });
  document.querySelector("#showRecall").addEventListener("click", () => {
    feedbackEl.innerHTML = `<span class="feedback-pill warn">ответ</span> ${escapeHtml(current.back)}`;
    ratingRow.hidden = false;
  });
  ratingRow.querySelectorAll("[data-rating]").forEach((button) => {
    button.addEventListener("click", () => rateRecallCard(current.id, button.dataset.rating));
  });
  document.querySelector("#addCardForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const front = document.querySelector("#cardFront").value.trim();
    const back = document.querySelector("#cardBack").value.trim();
    if (!front || !back) {
      toast("Нужны вопрос и ответ.");
      return;
    }
    state.cards.push({
      id: `card-${Date.now()}`,
      front,
      back,
      due: Date.now(),
      interval: 0,
      ease: 2.35,
      seen: 0,
    });
    saveState();
    toast("Карточка добавлена в хранилище.");
    renderRecall();
    renderChrome();
  });
}

function rateRecallCard(cardId, rating) {
  const card = state.cards.find((item) => item.id === cardId);
  if (!card) return;
  const now = Date.now();
  const scoreMap = { bad: 0.35, ok: 0.72, good: 1 };
  const accuracy = scoreMap[rating] || 0.5;
  card.seen += 1;
  if (rating === "bad") {
    card.interval = 0.5;
    card.ease = Math.max(1.4, card.ease - 0.18);
  } else if (rating === "ok") {
    card.interval = Math.max(1, card.interval ? card.interval * 1.65 : 1);
  } else {
    card.interval = Math.max(2, card.interval ? card.interval * card.ease : 2);
    card.ease = Math.min(3.1, card.ease + 0.08);
  }
  card.due = now + card.interval * 24 * 60 * 60 * 1000;
  const xp = Math.round(10 + accuracy * 20);
  adaptLevel("recall", accuracy);
  recordRound({
    mode: "recall",
    label: "Recall Vault",
    accuracy,
    xp,
    rt: 0,
    domains: { memory: 1 },
  });
  toast("Повтор запланирован.");
  if (circuitActive) {
    showRoundResult("Recall Vault", accuracy, xp, [
      ["карточка", "1"],
      ["интервал", `${Math.round(card.interval * 10) / 10} дн`],
      ["оценка", rating],
      ["уровень", `L${state.levels.recall}`],
    ]);
  } else {
    renderRecall();
    renderChrome();
  }
}

function dueCards() {
  const now = Date.now();
  return state.cards
    .filter((card) => card.due <= now)
    .sort((a, b) => a.due - b.due);
}

function sidePanel(domainId) {
  const domain = DOMAINS.find((item) => item.id === domainId) || DOMAINS[0];
  const visual = getModeVisual(activeMode);
  const linkedModes = Object.entries(DRILL_DOMAINS)
    .filter(([, domains]) => domains.includes(domainId))
    .map(([mode]) => MODE_META[mode].title)
    .slice(0, 3);
  return `
    <aside class="task-side" style="--route-accent: ${domain.color}; --route-glow: ${domain.color}33; --module-sprite: url('${visual.sprite}')">
      <div class="section-title"><span>${domain.label}</span><strong>${Math.round(state.domains[domain.id])}</strong></div>
      <div class="side-metrics">
        <div class="metric-tile"><span>${state.levels[activeMode] || getAverageLevel()}</span><small>текущий уровень</small></div>
        <div class="metric-tile"><span>${Math.round(getModeNeed(activeMode))}</span><small>потребность</small></div>
        <div class="metric-tile"><span>${getRecentAccuracy(activeMode)}%</span><small>последние раунды</small></div>
        <div class="metric-tile"><span>${linkedModes.length}</span><small>связанные навыки</small></div>
      </div>
      <div class="hint-line">${linkedModes.join(" / ")}</div>
    </aside>
  `;
}

function showRoundResult(title, accuracy, xp, metrics) {
  clearTask();
  const percent = Math.round(accuracy * 100);
  const status = percent >= 82 ? "good" : percent >= 58 ? "warn" : "bad";
  const visual = getModeVisual(activeMode);
  const statusText = percent >= 82 ? "усиление" : percent >= 58 ? "адаптация" : "перенастройка";
  els.arena.innerHTML = `
    <div class="result-panel result-${status}" style="--route-accent: ${visual.accent}; --route-glow: ${visual.glow}">
      <h3>${title}</h3>
      <span class="status-pill ${status}">${statusText}</span>
      <div class="result-grid">
        <div><span>${percent}%</span><small>точность</small></div>
        <div><span>${xp}</span><small>XP</small></div>
        ${metrics.map(([label, value]) => `<div><span>${value}</span><small>${label}</small></div>`).join("")}
      </div>
      <div class="answer-actions">
        <button class="primary-action" type="button" id="resultNext">${circuitActive ? "Следующий раунд" : "Повторить"}</button>
        <button class="ghost-action" type="button" id="resultHome">Маршрут</button>
      </div>
    </div>
  `;
  document.querySelector("#resultNext").addEventListener("click", () => {
    if (circuitActive) runNextCircuit();
    else setMode(activeMode, { autoStart: true });
  });
  document.querySelector("#resultHome").addEventListener("click", () => {
    circuitActive = false;
    circuitQueue = [];
    setMode("circuit");
  });
  renderChrome();
}

function recordRound({ mode, label, accuracy, xp, rt, domains }) {
  refreshDailyState();
  const entry = {
    mode,
    label,
    accuracy: clamp(accuracy, 0, 1),
    xp,
    rt,
    date: todayKey(),
    at: Date.now(),
  };
  state.history.push(entry);
  state.history = state.history.slice(-120);
  state.todayXp += xp;
  combo = accuracy >= 0.75 ? Math.min(3, combo + 0.15) : Math.max(1, combo - 0.18);
  state.comboBest = Math.max(state.comboBest || 1, combo);

  Object.entries(domains).forEach(([domain, weight]) => {
    const base = state.domains[domain] || 40;
    const target = 35 + accuracy * 65;
    const delta = (target - base) * 0.12 * weight + xp * 0.018 * weight;
    state.domains[domain] = clamp(base + delta, 5, 100);
  });
  saveState();
}

function adaptLevel(mode, accuracy) {
  const current = state.levels[mode] || 1;
  if (accuracy >= 0.82) state.levels[mode] = Math.min(9, current + 1);
  else if (accuracy < 0.52) state.levels[mode] = Math.max(1, current - 1);
  else state.levels[mode] = current;
}

function startCountdown(seconds) {
  if (countdownTimer) window.clearInterval(countdownTimer);
  countdownEndsAt = Date.now() + seconds * 1000;
  updateCountdown();
  countdownTimer = window.setInterval(updateCountdown, 250);
}

function updateCountdown() {
  const remaining = Math.max(0, countdownEndsAt - Date.now());
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  els.roundTimer.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  if (!remaining && countdownTimer) {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function setProgress(value) {
  const progress = document.querySelector("#taskProgress");
  if (progress) progress.style.width = `${clamp(value, 0, 100)}%`;
}

function getRecommendedPlan() {
  const modes = ["nback", "grid", "focus", "logic", "recall"];
  return modes
    .map((mode) => ({ mode, need: getModeNeed(mode) }))
    .sort((a, b) => b.need - a.need)
    .map((item) => item.mode);
}

function getModeNeed(mode) {
  const domains = DRILL_DOMAINS[mode] || [MODE_META[mode]?.domain || "memory"];
  const domainNeed = domains.map((domain) => 100 - (state.domains[domain] || 40));
  const recentPenalty = 100 - getRecentAccuracy(mode);
  return clamp(avg(domainNeed) * 0.72 + recentPenalty * 0.28, 0, 100);
}

function getWeakestDomain() {
  return DOMAINS.reduce((weakest, domain) => {
    return state.domains[domain.id] < state.domains[weakest.id] ? domain : weakest;
  }, DOMAINS[0]);
}

function getRecentAccuracy(mode) {
  const items = state.history.filter((item) => item.mode === mode).slice(-5);
  if (!items.length) return 0;
  return Math.round(avg(items.map((item) => item.accuracy)) * 100);
}

function getModeVisual(mode) {
  return MODE_VISUALS[mode] || MODE_VISUALS.circuit;
}

function compareText(answer, expected) {
  const a = normalizeText(answer);
  const e = normalizeText(expected);
  if (!a || !e) return 0;
  if (a === e || a.includes(e) || e.includes(a)) return 1;
  const expectedWords = e.split(" ").filter(Boolean);
  const answerWords = new Set(a.split(" ").filter(Boolean));
  const hits = expectedWords.filter((word) => answerWords.has(word)).length;
  return hits / Math.max(1, expectedWords.length);
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/[ё]/g, "е")
    .replace(/[^a-zа-я0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
