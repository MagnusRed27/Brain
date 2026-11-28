import { MODE_META } from "./config.js";
import { adaptDifficulty } from "./progression.js";
import { compareText, escapeHtml, randomInt, shuffle, sleep } from "./utils.js";
import { renderDrillShell, renderSidePanel } from "./ui.js";
import { runReaction, runStroop, runTrail, runAnback } from "./drills.extra.js";
import { runMentalMath, runSchulte, runAntiSaccade, runRSVP, runStopSignal, runFlanker, runBackwardsSpan, runVerbalFluency, runTowerOfLondon, runDigitSymbol, runEpisodicVault, runRuleHunt, runSynapsePath, runQuantumPattern, runOrbitTrack, runChronoPulse } from "./drills.lab.js";
import { createVoiceListener, isVoiceSupported, speak } from "./voice.js";

export const DRILL_DEFINITIONS = {
  nback: { id: "nback", ...MODE_META.nback },
  grid: { id: "grid", ...MODE_META.grid },
  focus: { id: "focus", ...MODE_META.focus },
  logic: { id: "logic", ...MODE_META.logic },
  recall: { id: "recall", ...MODE_META.recall },
  scan: { id: "scan", ...MODE_META.scan },
  rotate: { id: "rotate", ...MODE_META.rotate },
  reaction: { id: "reaction", ...MODE_META.reaction },
  trail: { id: "trail", ...MODE_META.trail },
  stroop: { id: "stroop", ...MODE_META.stroop },
  anback: { id: "anback", ...MODE_META.anback },
  math: { id: "math", ...MODE_META.math },
  schulte: { id: "schulte", ...MODE_META.schulte },
  antisaccade: { id: "antisaccade", ...MODE_META.antisaccade },
  rsvp: { id: "rsvp", ...MODE_META.rsvp },
  stopsig: { id: "stopsig", ...MODE_META.stopsig },
  flanker: { id: "flanker", ...MODE_META.flanker },
  bspan: { id: "bspan", ...MODE_META.bspan },
  vfluency: { id: "vfluency", ...MODE_META.vfluency },
  tower: { id: "tower", ...MODE_META.tower },
  dsst: { id: "dsst", ...MODE_META.dsst },
  evault: { id: "evault", ...MODE_META.evault },
  rulehunt: { id: "rulehunt", ...MODE_META.rulehunt },
  synpath: { id: "synpath", ...MODE_META.synpath },
  qpattern: { id: "qpattern", ...MODE_META.qpattern },
  orbit: { id: "orbit", ...MODE_META.orbit },
  chrono: { id: "chrono", ...MODE_META.chrono },
};

export function startDrill(mode, context) {
  const runners = {
    nback: runNback,
    grid: runGrid,
    focus: runFocus,
    logic: runLogic,
    recall: runRecall,
    scan: runScan,
    rotate: runRotate,
    reaction: runReaction,
    trail: runTrail,
    stroop: runStroop,
    anback: runAnback,
    math: runMentalMath,
    schulte: runSchulte,
    antisaccade: runAntiSaccade,
    rsvp: runRSVP,
    stopsig: runStopSignal,
    flanker: runFlanker,
    bspan: runBackwardsSpan,
    vfluency: runVerbalFluency,
    tower: runTowerOfLondon,
    dsst: runDigitSymbol,
    evault: runEpisodicVault,
    rulehunt: runRuleHunt,
    synpath: runSynapsePath,
    qpattern: runQuantumPattern,
    orbit: runOrbitTrack,
    chrono: runChronoPulse,
  };
  return (runners[mode] || runNback)(context);
}

function runNback(ctx) {
  const state = ctx.getState();
  const mode = "nback";
  const level = state.levels[mode] || 1;
  const n = Math.min(6, Math.max(1, level));
  const total = 10 + Math.min(10, level * 2);
  const pace = Math.max(1100, 2400 - level * 125);
  renderDrillShell(ctx.refs, state, mode, `
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
  `);

  const letters = "КЛМНРСТФХ";
  const cells = [...ctx.refs.arena.querySelectorAll(".nback-cell")];
  const buttons = [...ctx.refs.arena.querySelectorAll("[data-choice]")];
  let sequence = [];
  let trial = 0;
  let correct = 0;
  let mistakes = 0;
  let totalRt = 0;
  let firstActionAt = 0;
  let selected = { pos: false, sym: false };
  let answered = false;
  let timeout = null;
  // SDT counters per channel (position, symbol)
  let posHits = 0, posSignals = 0, posFA = 0, posNoise = 0;
  let symHits = 0, symSignals = 0, symFA = 0, symNoise = 0;
  let lureFA = 0, lureTrials = 0;

  ctx.startCountdown(Math.ceil((total * pace) / 1000));
  buttons.forEach((button) => {
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
        buttons.forEach((item) => item.classList.remove("is-selected"));
        button.classList.add("is-selected");
        evaluate();
        return;
      }
      selected[choice] = !selected[choice];
      button.classList.toggle("is-selected", selected[choice]);
    });
  });

  next();

  function next() {
    if (!ctx.isCurrent()) return;
    if (trial >= total) return finish();
    selected = { pos: false, sym: false };
    answered = false;
    firstActionAt = 0;
    buttons.forEach((button) => button.classList.remove("is-selected"));
    cells.forEach((cell) => {
      cell.textContent = "";
      cell.classList.remove("is-hot", "is-good", "is-bad");
    });
    const item = makeNbackItem(sequence, n, letters);
    sequence.push(item);
    cells[item.pos].textContent = item.sym;
    cells[item.pos].classList.add("is-hot");
    ctx.setProgress((trial / total) * 100);
    trial += 1;
    timeout = window.setTimeout(evaluate, pace);
  }

  function evaluate() {
    if (answered || !ctx.isCurrent()) return;
    answered = true;
    if (timeout) window.clearTimeout(timeout);
    const item = sequence[sequence.length - 1];
    const hit = selected.pos === item.posMatch && selected.sym === item.symMatch;
    cells[item.pos].classList.add(hit ? "is-good" : "is-bad");

    // SDT tracking for position channel
    if (item.posMatch) {
      posSignals += 1;
      if (selected.pos) posHits += 1;
    } else {
      posNoise += 1;
      if (selected.pos) posFA += 1;
    }
    // SDT tracking for symbol channel
    if (item.symMatch) {
      symSignals += 1;
      if (selected.sym) symHits += 1;
    } else {
      symNoise += 1;
      if (selected.sym) symFA += 1;
    }
    // Lure trial: did user fall for the n±1 trap?
    if (item.posLure || item.symLure) {
      lureTrials += 1;
      if ((item.posLure && selected.pos) || (item.symLure && selected.sym)) lureFA += 1;
    }

    if (hit) {
      correct += 1;
      totalRt += firstActionAt ? performance.now() - firstActionAt : pace;
    } else {
      mistakes += 1;
    }
    ctx.feedback(hit, hit ? "совпало" : (item.posLure || item.symLure) ? "это лур, не n!" : "проверь n");
    ctx.setProgress((trial / total) * 100);
    window.setTimeout(next, 170);
  }

  function finish() {
    const accuracy = correct / total;
    const avgRt = correct ? totalRt / correct : pace;
    const posSDT = dprime(posHits, posSignals, posFA, posNoise);
    const symSDT = dprime(symHits, symSignals, symFA, symNoise);
    const lureRate = lureTrials > 0 ? lureFA / lureTrials : 0;
    const history = ctx.getState().history.filter((r) => r.mode === mode);
    const result = makeResult(mode, accuracy, Math.round(18 + accuracy * 30 + level * 2), mistakes, level, avgRt, history);
    // Attach SDT metrics — the scientifically meaningful ones
    result.sdt = {
      posDprime: Number(posSDT.dprime.toFixed(2)),
      symDprime: Number(symSDT.dprime.toFixed(2)),
      avgDprime: Number(((posSDT.dprime + symSDT.dprime) / 2).toFixed(2)),
      bias: Number(((posSDT.criterion + symSDT.criterion) / 2).toFixed(2)),
      lureResistance: Number((1 - lureRate).toFixed(2)),
      lureTrials,
    };
    ctx.finish(result);
  }
}

async function runGrid(ctx) {
  const state = ctx.getState();
  const mode = "grid";
  const level = state.levels[mode] || 1;
  const size = level >= 5 ? 5 : 4;
  const length = Math.min(11, 3 + level);
  const pace = Math.max(280, 620 - level * 34);
  renderDrillShell(ctx.refs, state, mode, `
    <div class="grid-memory" style="grid-template-columns:repeat(${size}, 1fr)">
      ${Array.from({ length: size * size }, (_, i) => `<button class="grid-cell" type="button" data-cell="${i}">${i}</button>`).join("")}
    </div>
  `);

  const cells = [...ctx.refs.arena.querySelectorAll(".grid-cell")];
  const sequence = [];
  while (sequence.length < length) {
    const next = randomInt(0, size * size - 1);
    if (sequence[sequence.length - 1] !== next) sequence.push(next);
  }

  ctx.startCountdown(Math.ceil((length * pace + 9000) / 1000));
  cells.forEach((cell) => (cell.disabled = true));
  await sleep(350);
  for (const index of sequence) {
    if (!ctx.isCurrent()) return;
    cells[index].classList.add("is-flash");
    await sleep(pace);
    cells[index].classList.remove("is-flash");
    await sleep(Math.max(70, pace * 0.22));
  }
  if (!ctx.isCurrent()) return;

  let cursor = 0;
  let finished = false;
  const startedAt = performance.now();
  cells.forEach((cell) => {
    cell.disabled = false;
    cell.addEventListener("click", () => {
      if (finished || !ctx.isCurrent()) return;
      const picked = Number(cell.dataset.cell);
      if (picked === sequence[cursor]) {
        cell.classList.add("is-good");
        cursor += 1;
        ctx.feedback(true, `${cursor}/${sequence.length}`);
        if (cursor === sequence.length) finish(true);
      } else {
        cell.classList.add("is-bad");
        ctx.feedback(false, "маршрут");
        finish(false);
      }
    });
  });

  function finish(success) {
    finished = true;
    const accuracy = success ? 1 : cursor / sequence.length;
    const mistakes = success ? 0 : 1;
    const history = ctx.getState().history.filter((r) => r.mode === mode);
    ctx.finish(makeResult(mode, accuracy, Math.round(16 + accuracy * 34 + level * 2), mistakes, level, performance.now() - startedAt, history));
  }
}

function runFocus(ctx) {
  const state = ctx.getState();
  const mode = "focus";
  const level = state.levels[mode] || 1;
  const total = 12 + level * 2;
  const deadline = Math.max(820, 2100 - level * 110);
  const colors = [
    { id: "red", label: "КРАСНЫЙ", value: "#ff5d7d" },
    { id: "green", label: "ЗЕЛЕНЫЙ", value: "#65e6b7" },
    { id: "blue", label: "СИНИЙ", value: "#66d9e8" },
    { id: "yellow", label: "ЖЕЛТЫЙ", value: "#f5c45f" },
  ];

  renderDrillShell(ctx.refs, state, mode, `
    <div class="focus-card">
      <div class="focus-rule" id="focusRule">ЦВЕТ</div>
      <div class="focus-word" id="focusWord">СТАРТ</div>
      <div class="color-choices">${colors.map((color) => `<button class="color-choice" style="background:${color.value}" data-color="${color.id}" type="button">${color.label}</button>`).join("")}</div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);

  const ruleEl = ctx.refs.arena.querySelector("#focusRule");
  const wordEl = ctx.refs.arena.querySelector("#focusWord");
  let trial = 0;
  let correct = 0;
  let mistakes = 0;
  let totalRt = 0;
  let current = null;
  let startedAt = 0;
  let timeout = null;
  ctx.startCountdown(Math.ceil((total * deadline) / 1000));

  ctx.refs.arena.querySelectorAll("[data-color]").forEach((button) => {
    button.addEventListener("click", () => current && evaluate(button.dataset.color));
  });
  next();

  function next() {
    if (!ctx.isCurrent()) return;
    if (trial >= total) return finish();
    const word = colors[randomInt(0, colors.length - 1)];
    let ink = colors[randomInt(0, colors.length - 1)];
    if (Math.random() < 0.7 && ink.id === word.id) ink = colors.find((item) => item.id !== word.id);
    const useInk = Math.random() < 0.55;
    current = { answer: useInk ? ink.id : word.id };
    ruleEl.textContent = useInk ? "ЦВЕТ" : "СЛОВО";
    wordEl.textContent = word.label;
    wordEl.style.color = ink.value;
    startedAt = performance.now();
    trial += 1;
    ctx.setProgress(((trial - 1) / total) * 100);
    timeout = window.setTimeout(() => evaluate(null), deadline);
  }

  function evaluate(answer) {
    if (!current) return;
    if (timeout) window.clearTimeout(timeout);
    const hit = answer === current.answer;
    if (hit) {
      correct += 1;
      totalRt += performance.now() - startedAt;
    } else {
      mistakes += 1;
    }
    wordEl.classList.remove("is-good", "is-bad");
    wordEl.classList.add(hit ? "is-good" : "is-bad");
    ctx.feedback(hit, hit ? "чисто" : "стоп");
    current = null;
    ctx.setProgress((trial / total) * 100);
    window.setTimeout(next, 150);
  }

  function finish() {
    const accuracy = correct / total;
    const history = ctx.getState().history.filter((r) => r.mode === mode);
    ctx.finish(makeResult(mode, accuracy, Math.round(15 + accuracy * 30 + level * 2), mistakes, level, correct ? totalRt / correct : deadline, history));
  }
}

function runLogic(ctx) {
  const state = ctx.getState();
  const mode = "logic";
  const level = state.levels[mode] || 1;
  const total = 7 + Math.min(5, level);
  renderDrillShell(ctx.refs, state, mode, `<div class="logic-board" id="logicMount"></div>`);
  const mount = ctx.refs.arena.querySelector("#logicMount");
  let index = 0;
  let correct = 0;
  let mistakes = 0;
  let totalRt = 0;
  let startedAt = 0;
  let current = null;
  ctx.startCountdown(75 + level * 5);
  next();

  function next() {
    if (!ctx.isCurrent()) return;
    if (index >= total) return finish();
    current = Math.random() < 0.6 ? sequencePuzzle(level) : matrixPuzzle(level);
    mount.innerHTML = current.html;
    startedAt = performance.now();
    mount.querySelectorAll("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => {
        const hit = button.dataset.answer === String(current.answer);
        button.classList.add("is-selected");
        if (hit) {
          correct += 1;
          totalRt += performance.now() - startedAt;
        } else {
          mistakes += 1;
          button.classList.add("is-bad");
        }
        ctx.feedback(hit, hit ? "правило" : "ошибка");
        index += 1;
        ctx.setProgress((index / total) * 100);
        window.setTimeout(next, 300);
      });
    });
  }

  function finish() {
    const accuracy = correct / total;
    const history = ctx.getState().history.filter((r) => r.mode === mode);
    ctx.finish(makeResult(mode, accuracy, Math.round(18 + accuracy * 34 + level * 2), mistakes, level, correct ? totalRt / correct : 0, history));
  }
}

function runRecall(ctx) {
  const state = ctx.getState();
  const mode = "recall";
  const level = state.levels[mode] || 1;
  const due = state.cards.filter((card) => card.due <= Date.now()).sort((a, b) => a.due - b.due);
  const card = due[0] || state.cards[0];

  // Build 4 mouse-clickable choice options (1 correct + 3 distractors)
  const fallbackPool = [
    "Активное вспоминание без подсказки (retrieval practice)",
    "Консолидация памяти в фазе глубокого сна N3",
    "Снижение энтропии за счёт байесовского обновления",
    "Баланс сигнальных путей mTOR и AMPK",
    "Ускорение проведения импульса через миелинизацию",
    "Адаптивный порог сложности по методу лестницы",
  ];
  const otherBacks = state.cards
    .filter((c) => c.id !== card.id && c.back && c.back !== card.back)
    .map((c) => c.back);
  const pool = [...new Set([...otherBacks, ...fallbackPool])].filter((x) => x !== card.back);
  const distractors = shuffle(pool).slice(0, 3);
  const options = shuffle([
    { text: card.back, correct: true },
    ...distractors.map((text) => ({ text, correct: false })),
  ]);

  renderDrillShell(ctx.refs, state, mode, `
    <div class="recall-layout recall-choice-layout">
      <div class="recall-card">
        <div class="recall-head-row">
          <span class="st-label">FSRS-5 · ВЫБЕРИ ВЕРНЫЙ ОТВЕТ МЫШКОЙ</span>
          <button class="ghost-action recall-speak-mini" id="recallSpeak" type="button">Озвучить</button>
        </div>
        <div class="recall-prompt">${escapeHtml(card.front)}</div>
        <div class="recall-options-grid" id="recallOptions">
          ${options.map((opt, idx) => `
            <button class="recall-option-btn" type="button" data-idx="${idx}" data-correct="${opt.correct ? "1" : "0"}">
              <span class="ro-num">${idx + 1}</span>
              <span class="ro-text">${escapeHtml(opt.text)}</span>
            </button>
          `).join("")}
        </div>
        <div class="hint-line" id="recallFeedback"></div>
        <div class="rating-row" id="ratingRow" hidden>
          <span class="rating-prompt">Насколько легко вспомнилось? (интервал FSRS-5)</span>
          <div class="rating-btns">
            <button class="rating-button rating-fsrs" data-rating="1" type="button">Снова</button>
            <button class="rating-button rating-fsrs" data-rating="2" type="button">Трудно</button>
            <button class="rating-button rating-fsrs" data-rating="3" type="button">Хорошо</button>
            <button class="rating-button rating-fsrs" data-rating="4" type="button">Легко</button>
          </div>
        </div>
      </div>
      <details class="recall-add-drawer">
        <summary>+ Добавить свою карточку в FSRS-5</summary>
        <form class="recall-form" id="addCardForm">
          <input id="cardFront" placeholder="Вопрос или факт" />
          <textarea id="cardBack" placeholder="Ответ для запоминания"></textarea>
          <button class="primary-action" type="submit">Сохранить</button>
        </form>
      </details>
    </div>
  `, renderSidePanel(state, mode));

  const optionsEl = ctx.refs.arena.querySelector("#recallOptions");
  const feedbackEl = ctx.refs.arena.querySelector("#recallFeedback");
  const ratingRow = ctx.refs.arena.querySelector("#ratingRow");
  const speakBtn = ctx.refs.arena.querySelector("#recallSpeak");
  let picked = false;
  let startedAt = performance.now();

  speakBtn?.addEventListener("click", () => speak(card.front));

  optionsEl.querySelectorAll(".recall-option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (picked) return;
      picked = true;
      const isRight = btn.dataset.correct === "1";
      optionsEl.querySelectorAll(".recall-option-btn").forEach((b) => {
        b.disabled = true;
        if (b.dataset.correct === "1") b.classList.add("is-correct");
      });
      if (!isRight) btn.classList.add("is-wrong");
      ctx.feedback(isRight, isRight ? "точно в цель" : "запомни верный вариант");
      feedbackEl.innerHTML = isRight
        ? `<span class="feedback-pill good">верно · ${Math.round(performance.now() - startedAt)} мс</span> Оцени лёгкость для алгоритма FSRS-5:`
        : `<span class="feedback-pill warn">не совсем</span> Верный ответ подсвечен зелёным. Оцени сложность:`;
      ratingRow.hidden = false;
    });
  });

  ratingRow.querySelectorAll("[data-rating]").forEach((button) => {
    button.addEventListener("click", () => {
      const ratingVal = parseInt(button.dataset.rating, 10);
      const scoreMap = { 1: 0.2, 2: 0.6, 3: 0.9, 4: 1.0 };
      const accuracy = scoreMap[ratingVal] || 0.5;
      const hit = accuracy >= 0.6;
      
      const ratingLabelMap = { 1: "слабо", 2: "трудно", 3: "хорошо", 4: "легко" };
      const label = ratingLabelMap[ratingVal] || "повтор";

      ctx.feedback(hit, label);
      ctx.updateCard(card.id, ratingVal);
      const history = ctx.getState().history.filter((r) => r.mode === mode);
      ctx.finish(makeResult(mode, accuracy, Math.round(10 + accuracy * 20), hit ? 0 : 1, level, 0, history));
    });
  });
  ctx.refs.arena.querySelector("#addCardForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const front = ctx.refs.arena.querySelector("#cardFront").value.trim();
    const back = ctx.refs.arena.querySelector("#cardBack").value.trim();
    if (!front || !back) {
      ctx.toast("Нужны вопрос и ответ.");
      return;
    }
    ctx.addCard(front, back);
  });
}

function runScan(ctx) {
  const state = ctx.getState();
  const mode = "scan";
  const level = state.levels[mode] || 1;
  const total = 10 + level * 2;
  const grid = Math.min(8, 4 + Math.floor(level / 2));
  const symbols = ["◆", "◇", "▲", "△", "●", "○"];
  renderDrillShell(ctx.refs, state, mode, `
    <div class="scan-board">
      <div class="scan-target" id="scanTarget"></div>
      <div class="scan-grid" id="scanGrid" style="grid-template-columns:repeat(${grid}, 1fr)"></div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);
  const targetEl = ctx.refs.arena.querySelector("#scanTarget");
  const gridEl = ctx.refs.arena.querySelector("#scanGrid");
  let trial = 0;
  let correct = 0;
  let mistakes = 0;
  let totalRt = 0;
  let startedAt = 0;
  ctx.startCountdown(55 + level * 4);
  next();

  function next() {
    if (!ctx.isCurrent()) return;
    if (trial >= total) return finish();
    const target = symbols[randomInt(0, symbols.length - 1)];
    const targetIndex = randomInt(0, grid * grid - 1);
    targetEl.textContent = `Найди: ${target}`;
    gridEl.innerHTML = Array.from({ length: grid * grid }, (_, index) => {
      const symbol = index === targetIndex ? target : symbols.filter((item) => item !== target)[randomInt(0, symbols.length - 2)];
      return `<button class="scan-cell" data-hit="${index === targetIndex}" type="button">${symbol}</button>`;
    }).join("");
    startedAt = performance.now();
    gridEl.querySelectorAll(".scan-cell").forEach((button) => {
      button.addEventListener("click", () => {
        const hit = button.dataset.hit === "true";
        if (hit) {
          correct += 1;
          totalRt += performance.now() - startedAt;
          button.classList.add("is-good");
        } else {
          mistakes += 1;
          button.classList.add("is-bad");
        }
        ctx.feedback(hit, hit ? "найден" : "шум");
        trial += 1;
        ctx.setProgress((trial / total) * 100);
        window.setTimeout(next, 180);
      });
    });
  }

  function finish() {
    const accuracy = correct / total;
    const history = ctx.getState().history.filter((r) => r.mode === mode);
    ctx.finish(makeResult(mode, accuracy, Math.round(14 + accuracy * 32 + level * 2), mistakes, level, correct ? totalRt / correct : 0, history));
  }
}

function runRotate(ctx) {
  const state = ctx.getState();
  const mode = "rotate";
  const level = state.levels[mode] || 1;
  const total = 8 + Math.min(6, level);
  renderDrillShell(ctx.refs, state, mode, `
    <div class="rotate-board">
      <div class="rotate-sample" id="rotateSample"></div>
      <div class="matrix-options" id="rotateOptions"></div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);
  const sampleEl = ctx.refs.arena.querySelector("#rotateSample");
  const optionsEl = ctx.refs.arena.querySelector("#rotateOptions");
  let trial = 0;
  let correct = 0;
  let mistakes = 0;
  let totalRt = 0;
  let startedAt = 0;
  ctx.startCountdown(70 + level * 4);
  next();

  function next() {
    if (!ctx.isCurrent()) return;
    if (trial >= total) return finish();
    const base = shapePattern();
    const answerRotation = [90, 180, 270][randomInt(0, 2)];
    sampleEl.innerHTML = shapeHtml(base, 0);
    const options = shuffle([
      { pattern: base, rotation: answerRotation, answer: true },
      { pattern: shapePattern(), rotation: answerRotation, answer: false },
      { pattern: base.slice().reverse(), rotation: answerRotation, answer: false },
      { pattern: shapePattern(), rotation: [90, 180, 270][randomInt(0, 2)], answer: false },
    ]);
    optionsEl.innerHTML = options.map((option) => `
      <button class="matrix-option rotate-option" data-answer="${option.answer}" type="button">${shapeHtml(option.pattern, option.rotation)}</button>
    `).join("");
    startedAt = performance.now();
    optionsEl.querySelectorAll("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => {
        const hit = button.dataset.answer === "true";
        if (hit) {
          correct += 1;
          totalRt += performance.now() - startedAt;
          button.classList.add("is-selected");
        } else {
          mistakes += 1;
          button.classList.add("is-selected", "is-bad");
        }
        ctx.feedback(hit, hit ? "силуэт" : "поворот");
        trial += 1;
        ctx.setProgress((trial / total) * 100);
        window.setTimeout(next, 260);
      });
    });
  }

  function finish() {
    const accuracy = correct / total;
    const history = ctx.getState().history.filter((r) => r.mode === mode);
    ctx.finish(makeResult(mode, accuracy, Math.round(16 + accuracy * 34 + level * 2), mistakes, level, correct ? totalRt / correct : 0, history));
  }
}

function makeResult(mode, accuracy, xp, mistakes, difficultyBefore, rt, history = []) {
  return {
    mode,
    label: MODE_META[mode].title,
    accuracy,
    xp,
    rt,
    mistakes,
    difficultyBefore,
    difficultyAfter: adaptDifficulty(difficultyBefore, accuracy, history),
    timestamp: Date.now(),
    date: new Date().toISOString().slice(0, 10),
  };
}

/**
 * N-back item with LURES (Kane et al. 2007) — measures interference resolution,
 * not just familiarity. Without lures, ceiling is reached in ~2 weeks.
 *
 * Trial distribution:
 *   25% target (true n-back match)
 *   15% lure   (n±1 match — feels familiar but wrong)
 *   60% non-match
 *
 * Lure types: position-lure (matches n-1 OR n+1 pos), symbol-lure (n±1 sym).
 * Lures stress prefrontal interference resolution.
 */
function makeNbackItem(sequence, n, letters) {
  const hasBack = sequence.length >= n;
  const back = hasBack ? sequence[sequence.length - n] : null;
  // candidate lure neighbours (n-1 and n+1):
  const lureBackPos = sequence.length >= n - 1 ? sequence[sequence.length - (n - 1)] : null;
  const lureBackNeg = sequence.length >= n + 1 ? sequence[sequence.length - (n + 1)] : null;

  let pos = randomInt(0, 8);
  let sym = letters[randomInt(0, letters.length - 1)];
  let posMatch = false;
  let symMatch = false;
  let posLure = false;
  let symLure = false;

  if (hasBack) {
    // POSITION channel
    const posRoll = Math.random();
    if (posRoll < 0.25) {
      // true target
      pos = back.pos;
      posMatch = true;
    } else if (posRoll < 0.40 && (lureBackPos || lureBackNeg)) {
      // lure — matches n-1 or n+1 but NOT n
      const lureSrc = lureBackPos || lureBackNeg;
      if (lureSrc && lureSrc.pos !== back.pos) {
        pos = lureSrc.pos;
        posLure = true;
      }
    }

    // SYMBOL channel (independent)
    const symRoll = Math.random();
    if (symRoll < 0.25) {
      sym = back.sym;
      symMatch = true;
    } else if (symRoll < 0.40 && (lureBackPos || lureBackNeg)) {
      const lureSrc = lureBackPos || lureBackNeg;
      if (lureSrc && lureSrc.sym !== back.sym) {
        sym = lureSrc.sym;
        symLure = true;
      }
    }
  }

  // Avoid accidental matches when intent is non-match
  if (hasBack && !posMatch && !posLure && pos === back.pos) {
    pos = (pos + randomInt(1, 8)) % 9;
  }
  if (hasBack && !symMatch && !symLure && sym === back.sym) {
    const options = letters.replace(sym, "");
    sym = options[randomInt(0, options.length - 1)];
  }
  return { pos, sym, posMatch, symMatch, posLure, symLure };
}

/**
 * Signal Detection Theory metrics from hit/false-alarm rates.
 * d' (sensitivity) = z(hit) - z(FA) — bias-free measure of discrimination.
 * c (criterion)   = -(z(hit) + z(FA)) / 2 — response bias.
 */
export function dprime(hits, signals, falseAlarms, noiseTrials) {
  // Avoid 0/1 — apply Macmillan loglinear correction
  const hitRate = (hits + 0.5) / (signals + 1);
  const faRate  = (falseAlarms + 0.5) / (noiseTrials + 1);
  // inverse normal CDF approximation (Beasley-Springer-Moro)
  const z = (p) => {
    if (p <= 0 || p >= 1) return 0;
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    const plow = 0.02425, phigh = 1 - plow;
    let q, r;
    if (p < plow) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    if (p <= phigh) { q = p - 0.5; r = q*q; return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1); }
    q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  };
  const zHit = z(hitRate);
  const zFA = z(faRate);
  return { dprime: zHit - zFA, criterion: -(zHit + zFA) / 2, hitRate, faRate };
}

function sequencePuzzle(level) {
  const type = randomInt(0, Math.min(3, Math.floor(level / 2) + 1));
  let sequence = [];
  let answer = 0;
  if (type === 0) {
    const start = randomInt(2, 12);
    const step = randomInt(2, 5 + level);
    sequence = [0, 1, 2, 3].map((i) => start + i * step);
    answer = start + 4 * step;
  } else if (type === 1) {
    const start = randomInt(3, 14);
    const a = randomInt(2, 5);
    const b = randomInt(4, 8 + level);
    sequence = [start, start + a, start + a + b, start + a + b + a];
    answer = start + a + b + a + b;
  } else if (type === 2) {
    const start = randomInt(2, 7);
    const mul = randomInt(2, 3);
    const add = randomInt(1, 4);
    sequence = [start];
    for (let i = 1; i < 4; i += 1) sequence.push(sequence[i - 1] * mul + add);
    answer = sequence[3] * mul + add;
  } else {
    const shift = randomInt(0, 4);
    sequence = [1, 2, 3, 4].map((i) => i * i + shift);
    answer = 25 + shift;
  }
  const options = shuffle([answer, answer + randomInt(1, 4), answer - randomInt(1, 4), answer + randomInt(5, 9)]);
  return {
    answer,
    html: `
      <div class="sequence-line">${sequence.map((item) => `<span>${item}</span>`).join("")}<span>?</span></div>
      <div class="logic-options">${options.map((option) => `<button class="answer-button" type="button" data-answer="${option}">${option}</button>`).join("")}</div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    `,
  };
}

function matrixPuzzle(level) {
  const shapes = ["●", "■", "▲", "◆"];
  const colors = ["#65e6b7", "#f5c45f", "#ff756b", "#66d9e8"];
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
  const optionPool = [answerItem];
  while (optionPool.length < 4) {
    const item = { shape: shapes[randomInt(0, shapes.length - 1)], color: colors[randomInt(0, colors.length - 1)] };
    item.key = `${shapes.indexOf(item.shape)}-${colors.indexOf(item.color)}`;
    if (!optionPool.some((option) => option.key === item.key)) optionPool.push(item);
  }
  return {
    answer: answerItem.key,
    html: `
      <div class="matrix-grid">
        ${matrix.map((item, index) => index === 8 ? `<div class="matrix-cell">?</div>` : `<div class="matrix-cell" style="color:${item.color}">${item.shape}</div>`).join("")}
      </div>
      <div class="matrix-options">${shuffle(optionPool).map((item) => `<button class="matrix-option" type="button" data-answer="${item.key}" style="color:${item.color}">${item.shape}</button>`).join("")}</div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    `,
  };
}

function shapePattern() {
  const cells = Array.from({ length: 9 }, () => false);
  while (cells.filter(Boolean).length < 4) cells[randomInt(0, 8)] = true;
  return cells;
}

function shapeHtml(pattern, rotation) {
  return `<span class="shape-token" style="transform:rotate(${rotation}deg)">${pattern.map((filled) => `<i class="${filled ? "filled" : ""}"></i>`).join("")}</span>`;
}
