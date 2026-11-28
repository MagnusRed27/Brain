import { MODE_META } from "./config.js";
import { adaptDifficulty } from "./progression.js";
import { randomInt, shuffle, sleepSignal, isAbortError } from "./utils.js";
import { renderDrillShell } from "./ui.js";

function makeResult(mode, accuracy, xp, mistakes, level, rt) {
  return {
    mode,
    label: MODE_META[mode].title,
    accuracy,
    xp,
    rt,
    mistakes,
    difficultyBefore: level,
    difficultyAfter: adaptDifficulty(level, accuracy),
    timestamp: Date.now(),
    date: new Date().toISOString().slice(0, 10),
  };
}

/* Mental Math Sprint — арифметика под давлением (типизация ИЛИ выбор вариантов) */
export function runMentalMath(ctx) {
  const state = ctx.getState();
  const mode = "math";
  const level = state.levels[mode] || 1;
  const total = 10 + level * 2;
  const deadline = Math.max(2200, 5500 - level * 280);
  const inputMode = "choice"; // always fast mouse/tap choice tiles (no typing)

  const inputHtml = inputMode === "choice"
    ? `<div class="math-choices" id="mathChoices"></div>
       <div class="hint-line" id="mathHint">кликни верный вариант (или 1-4 на клавиатуре)</div>`
    : `<input class="math-input" id="mathAnswer" type="text" inputmode="numeric" autocomplete="off" placeholder="ответ" />
       <div class="hint-line" id="mathHint">введи число и нажми Enter</div>`;

  renderDrillShell(ctx.refs, state, mode, `
    <div class="math-board">
      <div class="math-question" id="mathQ">—</div>
      ${inputHtml}
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);

  const qEl = ctx.refs.arena.querySelector("#mathQ");
  const hintEl = ctx.refs.arena.querySelector("#mathHint");
  const inEl = ctx.refs.arena.querySelector("#mathAnswer");
  const choicesEl = ctx.refs.arena.querySelector("#mathChoices");
  ctx.startCountdown(Math.ceil((total * deadline) / 1000));

  let trial = 0;
  let correct = 0;
  let mistakes = 0;
  let totalRt = 0;
  let current = null;
  let startedAt = 0;
  let timer = null;
  let answered = false;

  function generate() {
    const ops = level < 2 ? ["+", "-"] : level < 4 ? ["+", "-", "×"] : ["+", "-", "×", "÷"];
    const op = ops[randomInt(0, ops.length - 1)];
    let a, b, answer;
    if (op === "+") { a = randomInt(8, 20 + level * 8); b = randomInt(8, 20 + level * 8); answer = a + b; }
    else if (op === "-") { a = randomInt(20, 50 + level * 10); b = randomInt(4, a - 1); answer = a - b; }
    else if (op === "×") { a = randomInt(3, 7 + Math.min(8, level)); b = randomInt(3, 7 + Math.min(8, level)); answer = a * b; }
    else { b = randomInt(3, 9); answer = randomInt(3, 9 + level); a = b * answer; }
    return { text: `${a} ${op} ${b}`, answer, op };
  }

  function distractors(answer, op) {
    // Plausible wrong answers depending on operation
    const set = new Set();
    const tries = [];
    // off-by-one and off-by-small
    tries.push(answer + 1, answer - 1, answer + 2, answer - 2);
    // common arithmetic mistakes
    if (op === "+") tries.push(answer + 10, answer - 10);
    if (op === "-") tries.push(answer * -1, answer + 9);
    if (op === "×") tries.push(answer + 5, answer - 5, Math.round(answer * 1.1));
    if (op === "÷") tries.push(answer + 1, answer * 2, Math.max(1, Math.floor(answer / 2)));
    // random nearby
    tries.push(answer + randomInt(3, 8), answer - randomInt(3, 8));
    for (const v of tries) {
      if (v !== answer && v >= 0 && !set.has(v)) set.add(v);
      if (set.size >= 3) break;
    }
    while (set.size < 3) set.add(answer + (set.size + 1) * 3);
    return [...set];
  }

  function renderChoices() {
    if (!choicesEl) return;
    const opts = shuffle([current.answer, ...distractors(current.answer, current.op)]);
    current.options = opts;
    choicesEl.innerHTML = opts.map((v, i) => `
      <button class="math-choice" type="button" data-v="${v}">
        <span class="mc-key">${i + 1}</span>
        <span class="mc-value">${v}</span>
      </button>
    `).join("");
    choicesEl.querySelectorAll("[data-v]").forEach((btn) => {
      btn.addEventListener("click", () => evaluate(Number(btn.dataset.v), btn));
    });
  }

  function next() {
    if (ctx.signal.aborted) return;
    if (trial >= total) return finish();
    answered = false;
    current = generate();
    qEl.textContent = current.text;
    if (inputMode === "choice") {
      renderChoices();
    } else {
      inEl.value = "";
      window.requestAnimationFrame(() => { try { inEl.focus({ preventScroll: true }); } catch { inEl.focus(); } });
    }
    startedAt = performance.now();
    trial += 1;
    ctx.setProgress(((trial - 1) / total) * 100);
    timer = window.setTimeout(() => evaluate(null, null), deadline);
  }

  function evaluate(rawValue, button) {
    if (!current || answered || ctx.signal.aborted) return;
    answered = true;
    if (timer) window.clearTimeout(timer);
    let value;
    if (rawValue === null || rawValue === undefined) value = NaN;
    else value = Number(rawValue);
    const hit = Number.isFinite(value) && value === current.answer;
    if (hit) {
      correct += 1;
      totalRt += performance.now() - startedAt;
      hintEl.textContent = `верно: ${current.answer}`;
    } else {
      mistakes += 1;
      hintEl.textContent = `было: ${current.answer}`;
    }
    if (button) button.classList.add(hit ? "is-good" : "is-bad");
    if (inputMode === "choice" && choicesEl) {
      // Mark correct button if user clicked wrong
      if (!hit) {
        const correctBtn = choicesEl.querySelector(`[data-v="${current.answer}"]`);
        if (correctBtn) correctBtn.classList.add("is-correct-reveal");
      }
      // Disable all buttons
      choicesEl.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    }
    ctx.feedback(hit, hit ? "счёт" : "почти");
    current = null;
    ctx.setProgress((trial / total) * 100);
    window.setTimeout(next, 450);
  }

  if (inEl) {
    inEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") evaluate(inEl.value, null);
    });
  }
  // numeric hotkeys 1-4 for choice mode
  const onKey = (event) => {
    if (inputMode !== "choice") return;
    if (ctx.signal.aborted || !current) return;
    const n = Number(event.key);
    if (n >= 1 && n <= 4 && current.options) {
      evaluate(current.options[n - 1], choicesEl?.querySelectorAll("button")[n - 1]);
    }
  };
  window.addEventListener("keydown", onKey);
  ctx.signal.addEventListener("abort", () => {
    window.clearTimeout(timer);
    window.removeEventListener("keydown", onKey);
  }, { once: true });

  function finish() {
    const accuracy = correct / total;
    ctx.finish(makeResult(mode, accuracy, Math.round(18 + accuracy * 34 + level * 2), mistakes, level, correct ? totalRt / correct : deadline));
  }

  next();
}

/* Schulte Tables — поиск чисел по сетке */
/**
 * Schulte with FIXED SEEDS for valid longitudinal comparison.
 * 3 layouts (A, B, C) per board size, rotated by day-of-week:
 *   Mon/Thu → A; Tue/Fri → B; Wed/Sat/Sun → C.
 * This eliminates layout-variance as confound — measures peripheral attention
 * speed itself, not "did you get an easy random seed today".
 */
function seededShuffle(arr, seed) {
  // Mulberry32 PRNG
  let t = seed >>> 0;
  const rng = () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const SCHULTE_SEEDS = {
  5: { A: 0x5A1135, B: 0x5B2235, C: 0x5C3335 },
  6: { A: 0x6A11_44, B: 0x6B22_44, C: 0x6C33_44 },
  7: { A: 0x7A11_55, B: 0x7B22_55, C: 0x7C33_55 },
};

function getSchulteVariant(date = new Date()) {
  const dow = date.getDay(); // 0 Sun, 1 Mon, ..., 6 Sat
  if (dow === 1 || dow === 4) return "A";
  if (dow === 2 || dow === 5) return "B";
  return "C";
}

export async function runSchulte(ctx) {
  const state = ctx.getState();
  const mode = "schulte";
  const level = state.levels[mode] || 1;
  const size = level < 3 ? 5 : level < 6 ? 6 : 7;
  const total = size * size;
  const variant = getSchulteVariant();
  const seed = SCHULTE_SEEDS[size]?.[variant] || 0x12345;
  const numbers = seededShuffle(Array.from({ length: total }, (_, i) => i + 1), seed);

  renderDrillShell(ctx.refs, state, mode, `
    <div class="schulte-board">
      <div class="schulte-target" id="schulteTarget">
        Найди: <strong>1</strong>
        <span class="schulte-variant" data-tooltip="фиксированная раскладка дня для сравнения">вариант ${variant}</span>
      </div>
      <div class="schulte-grid" id="schulteGrid" style="grid-template-columns:repeat(${size}, 1fr)">
        ${numbers.map((n, i) => `<button class="schulte-cell" type="button" data-n="${n}">${n}</button>`).join("")}
      </div>
      <div class="hint-line">Смотри в центр. Ищи периферийным зрением. Раскладка фиксирована по дню недели — твоё время напрямую сравнимо.</div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);

  const targetEl = ctx.refs.arena.querySelector("#schulteTarget strong");
  const gridEl = ctx.refs.arena.querySelector("#schulteGrid");
  let nextNumber = 1;
  let mistakes = 0;
  const startedAt = performance.now();
  ctx.startCountdown(60 + size * 12);

  gridEl.addEventListener("click", (event) => {
    if (ctx.signal.aborted) return;
    const button = event.target.closest(".schulte-cell");
    if (!button) return;
    const n = Number(button.dataset.n);
    if (n === nextNumber) {
      button.classList.add("is-found");
      button.disabled = true;
      nextNumber += 1;
      targetEl.textContent = String(Math.min(nextNumber, total));
      ctx.feedback(true, `${nextNumber - 1}/${total}`);
      ctx.setProgress(((nextNumber - 1) / total) * 100);
      if (nextNumber > total) finish(true);
    } else {
      mistakes += 1;
      button.classList.add("is-wrong");
      window.setTimeout(() => button.classList.remove("is-wrong"), 280);
      ctx.feedback(false, "не та цифра");
    }
  });

  function finish(success) {
    const rt = performance.now() - startedAt;
    const accuracy = Math.max(0.3, 1 - mistakes * 0.05);
    const xp = Math.round(16 + accuracy * 32 + level * 2);
    ctx.finish(makeResult(mode, accuracy, xp, mistakes, level, rt));
  }
}

/* Anti-Saccade — тормозный контроль глазодвижений */
export async function runAntiSaccade(ctx) {
  const state = ctx.getState();
  const mode = "antisaccade";
  const level = state.levels[mode] || 1;
  const total = 10 + level;
  const cueDuration = Math.max(160, 420 - level * 24);
  const targetDuration = Math.max(220, 380 - level * 16);

  renderDrillShell(ctx.refs, state, mode, `
    <div class="saccade-board">
      <div class="saccade-rail">
        <span class="saccade-side" id="saccadeLeft"></span>
        <span class="saccade-center" id="saccadeCenter">+</span>
        <span class="saccade-side" id="saccadeRight"></span>
      </div>
      <div class="hint-line">Когда мигнёт сторона — назови букву на ПРОТИВОПОЛОЖНОЙ стороне. Кнопками или клавишами.</div>
      <div class="answer-actions" id="saccadeOptions"></div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);

  const leftEl = ctx.refs.arena.querySelector("#saccadeLeft");
  const rightEl = ctx.refs.arena.querySelector("#saccadeRight");
  const options = ctx.refs.arena.querySelector("#saccadeOptions");
  ctx.startCountdown(Math.ceil(total * (cueDuration + targetDuration + 1200) / 1000));

  const letters = ["Б", "В", "К", "М", "Н", "П", "Р"];
  let trial = 0, correct = 0, mistakes = 0, totalRt = 0;

  try {
    while (trial < total) {
      if (ctx.signal.aborted) return;
      const cueSide = Math.random() < 0.5 ? "left" : "right";
      const oppositeSide = cueSide === "left" ? "right" : "left";
      const targetLetter = letters[randomInt(0, letters.length - 1)];
      const distractors = shuffle(letters.filter((l) => l !== targetLetter)).slice(0, 3);
      const all = shuffle([targetLetter, ...distractors]);

      options.innerHTML = "";
      leftEl.classList.remove("is-cue", "is-target");
      rightEl.classList.remove("is-cue", "is-target");

      await sleepSignal(700, ctx.signal);

      const cueEl = cueSide === "left" ? leftEl : rightEl;
      cueEl.classList.add("is-cue");
      await sleepSignal(cueDuration, ctx.signal);
      cueEl.classList.remove("is-cue");

      const targetEl = oppositeSide === "left" ? leftEl : rightEl;
      targetEl.classList.add("is-target");
      targetEl.textContent = targetLetter;
      await sleepSignal(targetDuration, ctx.signal);
      targetEl.textContent = "";
      targetEl.classList.remove("is-target");

      const start = performance.now();
      options.innerHTML = all.map((l) => `<button class="answer-button" type="button" data-l="${l}">${l}</button>`).join("");

      const answer = await new Promise((resolve) => {
        let resolved = false;
        const onClick = (e) => {
          const button = e.target.closest("[data-l]");
          if (!button || resolved) return;
          resolved = true;
          resolve({ letter: button.dataset.l, rt: performance.now() - start });
        };
        options.addEventListener("click", onClick);
        const timeout = window.setTimeout(() => { if (!resolved) { resolved = true; resolve({ letter: null, rt: 2000 }); } }, 2200);
        ctx.signal.addEventListener("abort", () => { window.clearTimeout(timeout); resolved = true; resolve({ letter: null, rt: 0 }); }, { once: true });
      });

      const hit = answer.letter === targetLetter;
      if (hit) { correct += 1; totalRt += answer.rt; }
      else mistakes += 1;
      trial += 1;
      ctx.feedback(hit, hit ? "тормоз" : "автопилот");
      ctx.setProgress((trial / total) * 100);
    }
  } catch (e) {
    if (!isAbortError(e)) throw e;
    return;
  }

  const accuracy = correct / total;
  ctx.finish(makeResult(mode, accuracy, Math.round(18 + accuracy * 34 + level * 2), mistakes, level, correct ? totalRt / correct : 0));
}

/* RSVP Reading — скорость восприятия + понимание */
export async function runRSVP(ctx) {
  const state = ctx.getState();
  const mode = "rsvp";
  const level = state.levels[mode] || 1;
  const wpm = Math.min(550, 220 + level * 32);
  const wordMs = Math.round(60000 / wpm);

  const passages = [
    {
      text: "Гиппокамп — структура, расположенная в медиальной височной доле, играющая ключевую роль в формировании эпизодической памяти. У лондонских таксистов его задняя часть увеличивается пропорционально стажу навигации в городе.",
      question: "Что увеличивается у лондонских таксистов?",
      options: ["задняя часть гиппокампа", "префронтальная кора", "миндалевидное тело", "мозжечок"],
      correct: 0,
    },
    {
      text: "Розовый шум, поданный в фазе медленных волн NREM-сна, синхронизируется с эндогенным ритмом и усиливает консолидацию декларативной памяти, что было показано в работе Papalambros 2017.",
      question: "Что усиливает розовый шум во сне?",
      options: ["скорость реакции", "эпизодическую память", "консолидацию декларативной памяти", "REM-сон"],
      correct: 2,
    },
    {
      text: "Острая физическая нагрузка вызывает выброс катехоламинов и нейротрофического фактора BDNF, который поддерживает синаптическую пластичность и облегчает обучение в окне 30-60 минут после упражнения.",
      question: "Какой фактор поддерживает синаптическую пластичность?",
      options: ["GABA", "BDNF", "Дофамин", "Серотонин"],
      correct: 1,
    },
  ];

  const passage = passages[randomInt(0, passages.length - 1)];
  renderDrillShell(ctx.refs, state, mode, `
    <div class="rsvp-board">
      <div class="rsvp-stage" id="rsvpStage">—</div>
      <div class="hint-line">Темп: ${wpm} слов/мин · смотри на центральную точку</div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);

  const stage = ctx.refs.arena.querySelector("#rsvpStage");
  const words = passage.text.split(/\s+/);

  try {
    for (let i = 0; i < words.length; i += 1) {
      if (ctx.signal.aborted) return;
      stage.textContent = words[i];
      ctx.setProgress(((i + 1) / words.length) * 80);
      await sleepSignal(wordMs, ctx.signal);
    }
  } catch (e) { if (!isAbortError(e)) throw e; return; }

  stage.textContent = "?";
  await sleepSignal(450, ctx.signal).catch(() => {});

  const answer = await new Promise((resolve) => {
    if (ctx.signal.aborted) { resolve({ idx: -1, rt: 0 }); return; }
    ctx.refs.arena.querySelector(".rsvp-stage").outerHTML = `
      <div class="rsvp-question">
        <strong>${passage.question}</strong>
        <div class="answer-actions" id="rsvpOptions">
          ${passage.options.map((opt, idx) => `<button class="answer-button" type="button" data-i="${idx}">${opt}</button>`).join("")}
        </div>
      </div>
    `;
    const start = performance.now();
    ctx.refs.arena.querySelector("#rsvpOptions").addEventListener("click", (event) => {
      const button = event.target.closest("[data-i]");
      if (!button) return;
      resolve({ idx: Number(button.dataset.i), rt: performance.now() - start });
    });
  });

  const hit = answer.idx === passage.correct;
  ctx.feedback(hit, hit ? "понял" : "проверь");
  ctx.setProgress(100);
  const accuracy = hit ? 1 : 0;
  ctx.finish(makeResult(mode, accuracy, Math.round(20 + accuracy * 30 + level * 2), hit ? 0 : 1, level, answer.rt));
}

/* Stop Signal — go/stop с прокачкой ингибиторного контроля */
export function runStopSignal(ctx) {
  const state = ctx.getState();
  const mode = "stopsig";
  const level = state.levels[mode] || 1;
  const total = 18 + level * 2;
  const goPace = Math.max(900, 1800 - level * 70);

  /**
   * Proper SSRT (Stop Signal Reaction Time) — Verbruggen et al. 2019 consensus.
   *
   * Procedure:
   *   - Every trial: green ● appears = go signal. User should press ASAP.
   *   - On 25% of trials: after SSD ms (stop-signal delay), ● turns red ■.
   *     User must inhibit pressing.
   *   - SSD staircase: +50ms after successful inhibition (harder),
   *     -50ms after failed inhibition (easier). Targets 50% inhibition rate.
   *   - Bounded SSD: [50, goPace - 100] ms.
   *
   * Output metric (the only valid one):
   *   SSRT = mean(go-RT) - mean(SSD)
   *
   * Normative SSRT: ~200-250 ms for healthy adults. Higher = worse inhibitory control.
   */
  renderDrillShell(ctx.refs, state, mode, `
    <div class="stop-board">
      <button type="button" class="stop-target is-wait" id="stopTarget">
        <span class="stop-shape" id="stopShape">·</span>
      </button>
      <div class="hint-line">Когда увидишь зелёный ● — жми как можно быстрее. Если ● внезапно станет красным ■ — НЕ нажимай (удержи).</div>
      <div class="reaction-readout">
        <div><span>попыток</span><strong id="stopAttempts">0</strong></div>
        <div><span>го-rt</span><strong id="stopAvg">— ms</strong></div>
        <div><span>SSD</span><strong id="stopSsd">— ms</strong></div>
        <div><span>SSRT</span><strong id="stopSsrt">—</strong></div>
      </div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);

  const target = ctx.refs.arena.querySelector("#stopTarget");
  const shapeEl = ctx.refs.arena.querySelector("#stopShape");
  const attEl = ctx.refs.arena.querySelector("#stopAttempts");
  const avgEl = ctx.refs.arena.querySelector("#stopAvg");
  const ssdEl = ctx.refs.arena.querySelector("#stopSsd");
  const ssrtEl = ctx.refs.arena.querySelector("#stopSsrt");
  ctx.startCountdown(Math.ceil((total * (goPace + 1200)) / 1000));

  // SSRT bookkeeping
  let trial = 0;
  let goSuccesses = 0;          // pressed during go phase
  let stopSuccesses = 0;        // inhibited on stop trial
  let stopFailures = 0;         // pressed despite stop signal
  let goOmissions = 0;          // didn't press at all on go
  const goRts = [];
  const ssds = [];
  let ssd = 250;                // initial SSD
  const SSD_MIN = 50, SSD_MAX = Math.max(150, goPace - 150);
  const STOP_RATIO = 0.25;

  let phase = "iti";            // iti | go | stop
  let appearAt = 0;
  let responded = false;
  let iti = null;
  let stopTimer = null;
  let deadlineTimer = null;

  function next() {
    if (ctx.signal.aborted) return;
    if (trial >= total) return finish();
    phase = "iti";
    responded = false;
    target.className = "stop-target is-wait";
    shapeEl.textContent = "·";
    iti = window.setTimeout(() => {
      if (ctx.signal.aborted) return;
      // Go signal: green
      phase = "go";
      target.className = "stop-target is-go";
      shapeEl.textContent = "●";
      appearAt = performance.now();
      const isStopTrial = Math.random() < STOP_RATIO;
      if (isStopTrial) {
        stopTimer = window.setTimeout(() => {
          if (ctx.signal.aborted || responded) return;
          phase = "stop";
          target.className = "stop-target is-stop";
          shapeEl.textContent = "■";
        }, ssd);
      }
      deadlineTimer = window.setTimeout(() => recordTrialEnd(null, isStopTrial), goPace + 200);
    }, randomInt(450, 1200));
  }

  function recordTrialEnd(rt, wasStopTrial) {
    if (responded) return;
    responded = true;
    window.clearTimeout(stopTimer);
    window.clearTimeout(deadlineTimer);
    trial += 1;
    if (wasStopTrial) {
      if (rt === null) {
        // Successful inhibition — no press during stop trial
        stopSuccesses += 1;
        ssds.push(ssd);
        ssd = Math.min(SSD_MAX, ssd + 50);
        ctx.feedback(true, "удержано");
      } else {
        // Failed inhibition — pressed during stop
        stopFailures += 1;
        ssds.push(ssd);
        ssd = Math.max(SSD_MIN, ssd - 50);
        ctx.feedback(false, "стоп!");
      }
    } else {
      if (rt !== null) {
        goSuccesses += 1;
        goRts.push(rt);
        ctx.feedback(rt < 500, rt < 500 ? "быстро" : "норм");
      } else {
        goOmissions += 1;
        ctx.feedback(false, "пропуск go");
      }
    }
    // Update UI
    attEl.textContent = trial;
    if (goRts.length) avgEl.textContent = `${Math.round(mean(goRts))} ms`;
    ssdEl.textContent = `${Math.round(mean(ssds.length ? ssds : [ssd]))} ms`;
    if (goRts.length && ssds.length) {
      const ssrt = Math.max(0, mean(goRts) - mean(ssds));
      ssrtEl.textContent = `${Math.round(ssrt)} ms`;
    }
    ctx.setProgress((trial / total) * 100);
    window.setTimeout(next, 320);
  }

  target.addEventListener("click", () => {
    if (ctx.signal.aborted || responded) return;
    const rt = performance.now() - appearAt;
    if (phase === "iti") {
      // Premature press during ITI — count as omission/error
      window.clearTimeout(iti);
      recordTrialEnd(null, false);
    } else if (phase === "go") {
      // Either go-success OR before stop-signal fires
      const wasStop = stopTimer && stopTimer._isStopPending !== false;
      // simplify: stopTimer existed = stop trial; cleared = already happened
      recordTrialEnd(rt, false);
    } else if (phase === "stop") {
      recordTrialEnd(rt, true);
    }
  });

  ctx.signal.addEventListener("abort", () => {
    window.clearTimeout(iti);
    window.clearTimeout(stopTimer);
    window.clearTimeout(deadlineTimer);
  }, { once: true });

  function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

  function finish() {
    const totalGoTrials = goSuccesses + goOmissions;
    const totalStopTrials = stopSuccesses + stopFailures;
    const goAcc = totalGoTrials ? goSuccesses / totalGoTrials : 0;
    const stopAcc = totalStopTrials ? stopSuccesses / totalStopTrials : 0;
    // Combined accuracy weighted by trial type frequency
    const accuracy = (goAcc * (1 - STOP_RATIO) + stopAcc * STOP_RATIO);
    const meanGoRt = goRts.length ? mean(goRts) : goPace;
    const meanSsd = ssds.length ? mean(ssds) : ssd;
    const ssrt = Math.max(0, meanGoRt - meanSsd);
    const xp = Math.round(18 + accuracy * 32 + level * 2);
    const result = makeResult(mode, accuracy, xp, stopFailures + goOmissions, level, meanGoRt);
    result.ssrt = Math.round(ssrt);
    result.meanGoRt = Math.round(meanGoRt);
    result.meanSsd = Math.round(meanSsd);
    result.goAccuracy = Number(goAcc.toFixed(2));
    result.stopInhibitionRate = Number(stopAcc.toFixed(2));
    ctx.finish(result);
  }

  next();
}

/* Flanker — selective attention with congruent/incongruent flankers (Eriksen 1974) */
export async function runFlanker(ctx) {
  const state = ctx.getState();
  const mode = "flanker";
  const level = state.levels[mode] || 1;
  const total = 18 + level * 2;
  const stimDuration = Math.max(900, 1800 - level * 70);

  renderDrillShell(ctx.refs, state, mode, `
    <div class="flanker-board">
      <div class="flanker-fix">+</div>
      <div class="flanker-row" id="flankerRow">— — — — —</div>
      <div class="answer-actions">
        <button class="answer-button flanker-key" data-dir="left" type="button">◀  L</button>
        <button class="answer-button flanker-key" data-dir="right" type="button">R  ▶</button>
      </div>
      <div class="hint-line">Жми на ЦЕНТРАЛЬНУЮ стрелку. Клавиши ← / → тоже работают.</div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);

  const row = ctx.refs.arena.querySelector("#flankerRow");
  let trial = 0, correct = 0, mistakes = 0, totalRt = 0;
  let current = null, startedAt = 0, timer = null, answered = false;
  ctx.startCountdown(Math.ceil((total * stimDuration) / 1000) + 4);

  function generate() {
    const target = Math.random() < 0.5 ? "left" : "right";
    const arrow = target === "left" ? "◀" : "▶";
    const opp = target === "left" ? "▶" : "◀";
    const kind = Math.random();
    let flankers;
    if (kind < 0.34) flankers = arrow;
    else if (kind < 0.68) flankers = opp;
    else flankers = "─";
    return {
      target,
      html: `<span class="fl-side">${flankers}${flankers}</span><span class="fl-center">${arrow}</span><span class="fl-side">${flankers}${flankers}</span>`,
    };
  }

  function next() {
    if (ctx.signal.aborted) return;
    if (trial >= total) return finish();
    answered = false;
    current = generate();
    row.innerHTML = current.html;
    row.classList.remove("is-good", "is-bad");
    startedAt = performance.now();
    trial += 1;
    ctx.setProgress(((trial - 1) / total) * 100);
    timer = window.setTimeout(() => evaluate(null), stimDuration);
  }

  function evaluate(dir) {
    if (answered || ctx.signal.aborted) return;
    answered = true;
    if (timer) window.clearTimeout(timer);
    const hit = dir === current.target;
    if (hit) { correct += 1; totalRt += performance.now() - startedAt; }
    else { mistakes += 1; }
    row.classList.add(hit ? "is-good" : "is-bad");
    ctx.feedback(hit, hit ? "центр" : "обманулся");
    ctx.setProgress((trial / total) * 100);
    window.setTimeout(next, 220);
  }

  const onKey = (e) => {
    if (ctx.signal.aborted) return;
    if (e.key === "ArrowLeft") evaluate("left");
    if (e.key === "ArrowRight") evaluate("right");
  };
  window.addEventListener("keydown", onKey);
  ctx.signal.addEventListener("abort", () => {
    window.removeEventListener("keydown", onKey);
    window.clearTimeout(timer);
  }, { once: true });
  ctx.refs.arena.querySelectorAll("[data-dir]").forEach((b) => b.addEventListener("click", () => evaluate(b.dataset.dir)));

  function finish() {
    const accuracy = correct / total;
    const avgRt = correct ? totalRt / correct : stimDuration;
    ctx.finish(makeResult(mode, accuracy, Math.round(18 + accuracy * 32 + level * 2), mistakes, level, avgRt));
  }

  next();
}

/* Backwards Span — Corsi blocks backwards, executive WM */
export async function runBackwardsSpan(ctx) {
  const state = ctx.getState();
  const mode = "bspan";
  const level = state.levels[mode] || 1;
  const size = 4;
  const length = Math.min(9, 3 + level);
  const flashPace = Math.max(420, 700 - level * 30);
  renderDrillShell(ctx.refs, state, mode, `
    <div class="grid-memory" style="grid-template-columns:repeat(${size}, 1fr)">
      ${Array.from({ length: size * size }, (_, i) => `<button class="grid-cell" type="button" data-cell="${i}" disabled></button>`).join("")}
    </div>
    <p class="hint-line" id="bspanHint">Запоминай путь. После — повтори в ОБРАТНОМ порядке.</p>
    <div class="progress-track"><span id="taskProgress"></span></div>
  `);

  const cells = [...ctx.refs.arena.querySelectorAll(".grid-cell")];
  const sequence = [];
  while (sequence.length < length) {
    const next = randomInt(0, size * size - 1);
    if (sequence[sequence.length - 1] !== next) sequence.push(next);
  }
  ctx.startCountdown(Math.ceil((length * flashPace + 12000) / 1000));
  await sleepSignal(380, ctx.signal).catch(() => {});

  try {
    for (const idx of sequence) {
      if (ctx.signal.aborted) return;
      cells[idx].classList.add("is-flash");
      await sleepSignal(flashPace, ctx.signal);
      cells[idx].classList.remove("is-flash");
      await sleepSignal(Math.max(90, flashPace * 0.28), ctx.signal);
    }
  } catch (e) { if (!isAbortError(e)) throw e; return; }

  if (ctx.signal.aborted) return;
  const expected = sequence.slice().reverse();
  const hintEl = ctx.refs.arena.querySelector("#bspanHint");
  if (hintEl) hintEl.innerHTML = "Теперь — повтори в <strong>обратном</strong> порядке";

  let cursor = 0, mistakes = 0, finished = false;
  const startedAt = performance.now();
  cells.forEach((cell) => {
    cell.disabled = false;
    cell.addEventListener("click", () => {
      if (finished || ctx.signal.aborted) return;
      const picked = Number(cell.dataset.cell);
      if (picked === expected[cursor]) {
        cell.classList.add("is-good");
        cursor += 1;
        ctx.feedback(true, cursor + "/" + expected.length);
        ctx.setProgress((cursor / expected.length) * 100);
        if (cursor === expected.length) finishR(true);
      } else {
        cell.classList.add("is-bad");
        mistakes += 1;
        ctx.feedback(false, "обратно");
        finishR(false);
      }
    });
  });

  function finishR(success) {
    finished = true;
    const accuracy = success ? 1 : cursor / expected.length;
    ctx.finish(makeResult(mode, accuracy, Math.round(20 + accuracy * 34 + level * 2), mistakes, level, performance.now() - startedAt));
  }
}

/* Tower of London — planning + executive function (Shallice 1982) */
export async function runTowerOfLondon(ctx) {
  const state = ctx.getState();
  const mode = "tower";
  const level = state.levels[mode] || 1;
  const total = 4 + Math.min(6, level);

  renderDrillShell(ctx.refs, state, mode, `
    <div class="tower-board">
      <div class="tower-puzzle">
        <div class="tower-side">
          <div class="tower-label">текущее</div>
          <div class="tower-pegs" id="towerNow"></div>
        </div>
        <div class="tower-arrow">→</div>
        <div class="tower-side">
          <div class="tower-label">цель</div>
          <div class="tower-pegs" id="towerGoal"></div>
        </div>
      </div>
      <div class="tower-meta">
        <span>ход <strong id="towerMoves">0</strong></span>
        <span>задача <strong id="towerTrial">1</strong>/<strong>${total}</strong></span>
        <span>мин. ходов <strong id="towerMin">—</strong></span>
      </div>
      <div class="hint-line">Тапни шарик → тапни колонку. Цель — минимум ходов.</div>
      <button class="ghost-action" type="button" id="towerReset">↺ Сброс задачи</button>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);

  const nowEl = ctx.refs.arena.querySelector("#towerNow");
  const goalEl = ctx.refs.arena.querySelector("#towerGoal");
  const movesEl = ctx.refs.arena.querySelector("#towerMoves");
  const trialEl = ctx.refs.arena.querySelector("#towerTrial");
  const minEl = ctx.refs.arena.querySelector("#towerMin");
  const resetBtn = ctx.refs.arena.querySelector("#towerReset");

  // colors for balls (3-5 balls depending on level)
  const ballColors = ["#7c5cff", "#4fd1a8", "#ff7da6", "#ffba2e", "#2fd0d8"];
  const ballCount = Math.min(5, 3 + Math.floor(level / 2));

  let trial = 0;
  let totalMoves = 0;
  let totalMinMoves = 0;
  let totalRt = 0;
  let mistakes = 0;
  let pegs;        // [[bottom..top], [...], [...]]
  let target;
  let minSteps = 0;
  let moves = 0;
  let selectedFrom = -1;
  let trialStartedAt = 0;

  ctx.startCountdown(60 + total * 30);

  function deepCopyPegs(p) { return p.map((c) => c.slice()); }

  function generateLayout() {
    // 3 pegs. Place balls randomly. Generate target as N random moves from start.
    pegs = [[], [], []];
    const balls = [];
    for (let i = 0; i < ballCount; i += 1) balls.push(i);
    // distribute balls
    shuffle(balls).forEach((b, idx) => {
      pegs[idx % 3].push(b);
    });
    const targetSteps = Math.max(3, Math.min(7, 3 + level));
    target = deepCopyPegs(pegs);
    let prevMove = null;
    for (let step = 0; step < targetSteps; step += 1) {
      const validMoves = [];
      for (let from = 0; from < 3; from += 1) {
        if (!target[from].length) continue;
        for (let to = 0; to < 3; to += 1) {
          if (to === from) continue;
          if (target[to].length >= 3) continue;
          // avoid immediate undo of prev move
          if (prevMove && prevMove[0] === to && prevMove[1] === from && target[from][target[from].length - 1] === prevMove[2]) continue;
          validMoves.push([from, to]);
        }
      }
      if (!validMoves.length) break;
      const [from, to] = validMoves[randomInt(0, validMoves.length - 1)];
      const ball = target[from].pop();
      target[to].push(ball);
      prevMove = [from, to, ball];
    }
    minSteps = countMinMoves(pegs, target);
  }

  function countMinMoves(a, b) {
    // BFS over peg states
    const stateKey = (p) => p.map((c) => c.join(",")).join("|");
    const goal = stateKey(b);
    const visited = new Set([stateKey(a)]);
    const queue = [{ p: deepCopyPegs(a), d: 0 }];
    while (queue.length) {
      const { p, d } = queue.shift();
      if (stateKey(p) === goal) return d;
      if (d > 12) return 12;
      for (let from = 0; from < 3; from += 1) {
        if (!p[from].length) continue;
        for (let to = 0; to < 3; to += 1) {
          if (to === from) continue;
          if (p[to].length >= 3) continue;
          const np = deepCopyPegs(p);
          const ball = np[from].pop();
          np[to].push(ball);
          const k = stateKey(np);
          if (!visited.has(k)) {
            visited.add(k);
            queue.push({ p: np, d: d + 1 });
          }
        }
      }
    }
    return 99;
  }

  function renderPegs(container, pp, interactive) {
    container.innerHTML = pp.map((col, i) => `
      <div class="tower-col ${interactive ? "is-clickable" : ""}" data-col="${i}">
        ${col.map((ball) => `<span class="tower-ball" style="background:${ballColors[ball]}"></span>`).join("")}
      </div>
    `).join("");
    if (interactive) {
      container.querySelectorAll(".tower-col").forEach((col) => {
        col.addEventListener("click", () => onClickCol(Number(col.dataset.col)));
      });
    }
  }

  function paint() {
    renderPegs(nowEl, pegs, true);
    renderPegs(goalEl, target, false);
    if (selectedFrom >= 0) {
      const col = nowEl.querySelector(`[data-col="${selectedFrom}"]`);
      if (col) col.classList.add("is-selected");
    }
    movesEl.textContent = moves;
    minEl.textContent = minSteps < 99 ? minSteps : "?";
  }

  function onClickCol(idx) {
    if (ctx.signal.aborted) return;
    if (selectedFrom < 0) {
      if (!pegs[idx].length) return;
      selectedFrom = idx;
      paint();
    } else {
      if (idx === selectedFrom) { selectedFrom = -1; paint(); return; }
      if (pegs[idx].length >= 3) { selectedFrom = -1; paint(); return; }
      const ball = pegs[selectedFrom].pop();
      pegs[idx].push(ball);
      moves += 1;
      selectedFrom = -1;
      paint();
      if (equalState(pegs, target)) finishTrial(true);
    }
  }

  function equalState(a, b) {
    for (let i = 0; i < 3; i += 1) {
      if (a[i].length !== b[i].length) return false;
      for (let j = 0; j < a[i].length; j += 1) if (a[i][j] !== b[i][j]) return false;
    }
    return true;
  }

  function startTrial() {
    if (ctx.signal.aborted) return;
    if (trial >= total) return finish();
    generateLayout();
    if (minSteps === 0) { startTrial(); return; }  // skip already-solved
    moves = 0;
    selectedFrom = -1;
    trialStartedAt = performance.now();
    trial += 1;
    trialEl.textContent = trial;
    ctx.setProgress(((trial - 1) / total) * 100);
    paint();
  }

  function finishTrial(success) {
    const rt = performance.now() - trialStartedAt;
    totalRt += rt;
    totalMoves += moves;
    totalMinMoves += minSteps;
    if (success && moves <= minSteps + 1) {
      ctx.feedback(true, "оптимально");
    } else if (success) {
      mistakes += 1;
      ctx.feedback(true, `+${moves - minSteps} лишних`);
    } else {
      mistakes += 1;
      ctx.feedback(false, "сложно");
    }
    ctx.setProgress((trial / total) * 100);
    window.setTimeout(startTrial, 700);
  }

  resetBtn.addEventListener("click", () => {
    // regenerate same layout state — actually just regen new trial
    startTrial();
  });
  ctx.signal.addEventListener("abort", () => {}, { once: true });

  function finish() {
    const efficiency = totalMoves > 0 ? Math.min(1, totalMinMoves / totalMoves) : 0;
    const accuracy = Math.max(0, Math.min(1, efficiency));
    const xp = Math.round(20 + accuracy * 36 + level * 2);
    ctx.finish(makeResult(mode, accuracy, xp, mistakes, level, totalRt / Math.max(1, trial)));
  }

  startTrial();
}

/* Digit-Symbol Substitution — processing speed (Wechsler DSST) */
export function runDigitSymbol(ctx) {
  const state = ctx.getState();
  const mode = "dsst";
  const level = state.levels[mode] || 1;
  // Wechsler DSST standard: fixed 90s window (regardless of level).
  // Level affects only the *expected* items count for scoring norms,
  // not the time — so the score is psychometrically comparable across sessions.
  const duration = 90;
  const symbols = ["▲", "■", "●", "◆", "★", "♥", "♦", "♣", "♠"];
  // 9 digit-symbol pairs
  const pairs = [];
  const shuffled = shuffle(symbols.slice());
  for (let i = 1; i <= 9; i += 1) pairs.push({ digit: i, symbol: shuffled[i - 1] });

  renderDrillShell(ctx.refs, state, mode, `
    <div class="dsst-board">
      <div class="dsst-key">
        ${pairs.map((p) => `
          <div class="dsst-pair">
            <span class="dsst-digit">${p.digit}</span>
            <span class="dsst-symbol">${p.symbol}</span>
          </div>
        `).join("")}
      </div>
      <div class="dsst-target">
        <div class="dsst-question">Какой символ для <strong id="dsstDigit">—</strong>?</div>
        <div class="dsst-choices" id="dsstChoices"></div>
      </div>
      <div class="dsst-meta">
        <span>верных <strong id="dsstHits">0</strong></span>
        <span>время <strong id="dsstTime">${duration}</strong> сек</span>
      </div>
      <div class="hint-line">Смотри в шапку — там пары. Выбирай символ для текущей цифры. Чем больше за время — тем лучше.</div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);

  const digitEl = ctx.refs.arena.querySelector("#dsstDigit");
  const choicesEl = ctx.refs.arena.querySelector("#dsstChoices");
  const hitsEl = ctx.refs.arena.querySelector("#dsstHits");
  const timeEl = ctx.refs.arena.querySelector("#dsstTime");
  ctx.startCountdown(duration);

  let remaining = duration;
  let trial = 0;
  let correct = 0;
  let mistakes = 0;
  let totalRt = 0;
  let current = null;
  let startedAt = 0;

  const tick = window.setInterval(() => {
    remaining -= 1;
    timeEl.textContent = String(Math.max(0, remaining));
    ctx.setProgress(((duration - remaining) / duration) * 100);
    if (remaining <= 0) { window.clearInterval(tick); finish(); }
  }, 1000);

  function next() {
    if (ctx.signal.aborted) return;
    if (remaining <= 0) return;
    const digit = randomInt(1, 9);
    const correctPair = pairs.find((p) => p.digit === digit);
    const wrong = shuffle(pairs.filter((p) => p.digit !== digit)).slice(0, 3).map((p) => p.symbol);
    const options = shuffle([correctPair.symbol, ...wrong]);
    current = { digit, answer: correctPair.symbol };
    digitEl.textContent = String(digit);
    choicesEl.innerHTML = options.map((s) => `
      <button class="dsst-choice" type="button" data-s="${s}">${s}</button>
    `).join("");
    choicesEl.querySelectorAll("[data-s]").forEach((btn) => {
      btn.addEventListener("click", () => evaluate(btn.dataset.s, btn));
    });
    startedAt = performance.now();
    trial += 1;
  }

  function evaluate(picked, button) {
    if (!current || ctx.signal.aborted) return;
    const hit = picked === current.answer;
    if (hit) {
      correct += 1;
      totalRt += performance.now() - startedAt;
      button.classList.add("is-good");
    } else {
      mistakes += 1;
      button.classList.add("is-bad");
    }
    hitsEl.textContent = correct;
    ctx.feedback(hit, hit ? "верно" : "не та пара");
    current = null;
    window.setTimeout(next, 220);
  }

  ctx.signal.addEventListener("abort", () => window.clearInterval(tick), { once: true });

  function finish() {
    // Norms: ~25-40 correct in 90 sec for healthy adults. Score ~ correct / 35 capped.
    const accuracy = Math.max(0, Math.min(1, correct / 30));
    const avgRt = correct ? totalRt / correct : duration * 1000;
    const xp = Math.round(16 + accuracy * 38 + level * 2);
    const result = makeResult(mode, accuracy, xp, mistakes, level, avgRt);
    result.dsstCorrect = correct;
    ctx.finish(result);
  }

  next();
}

/* Verbal Fluency — fast mouse-click semantic word filter (zero typing) */
export async function runVerbalFluency(ctx) {
  const state = ctx.getState();
  const mode = "vfluency";
  const level = state.levels[mode] || 1;
  const categories = [
    {
      name: "Животные",
      hint: "Кликай только живых существ — избегай лишних слов",
      targets: ["волк", "дельфин", "сова", "гепард", "ёж", "фламинго", "бобр", "пантера", "альбатрос", "лиса", "выдра", "ястреб", "медведь", "олень"],
      foils: ["берёза", "мрамор", "компас", "ветер", "молот", "гранат", "скрипка", "бархат", "маяк", "рубин"],
    },
    {
      name: "Еда и продукты",
      hint: "Выбирай только съедобное — быстро и без ошибок",
      targets: ["авокадо", "миндаль", "лосось", "гречка", "матча", "инжир", "сыр", "кефир", "корица", "шпинат", "трюфель", "манго", "мёд", "оливки"],
      foils: ["фарфор", "стекло", "клён", "песок", "глина", "свеча", "янтарь", "бронза", "лён", "кварц"],
    },
    {
      name: "Наука и технологии",
      hint: "Кликай только научные и технологические термины",
      targets: ["нейрон", "фотон", "алгоритм", "энтропия", "синапс", "геном", "матрица", "квант", "тензор", "изотоп", "миелин", "теломера", "аксон", "вектор"],
      foils: ["соната", "фреска", "акварель", "баллада", "мрамор", "гобелен", "витраж", "вальс", "эскиз", "брошь"],
    },
    {
      name: "Профессии",
      hint: "Выбирай только профессии и роли",
      targets: ["хирург", "архитектор", "физик", "пилот", "инженер", "биолог", "дизайнер", "астроном", "математик", "штурман", "акустик", "нейролог", "химик", "капитан"],
      foils: ["телескоп", "скальпель", "чертёж", "компас", "реактор", "колледж", "лаборатория", "орбита", "диплом", "атлас"],
    },
  ];
  const cat = categories[randomInt(0, categories.length - 1)];
  const targetSet = new Set(cat.targets);
  const boardWords = shuffle([...cat.targets, ...cat.foils]);
  const seconds = Math.max(25, 45 - level * 2);

  renderDrillShell(ctx.refs, state, mode, `
    <div class="vfluency-board">
      <div class="vfluency-cat">Категория: <strong>${cat.name}</strong></div>
      <div class="hint-line">${cat.hint} · Найди ${cat.targets.length} слов за ${seconds} сек.</div>
      <div class="vf-chip-grid" id="vfGrid">
        ${boardWords.map((w) => `<button type="button" class="vf-chip" data-word="${w}">${w}</button>`).join("")}
      </div>
      <div class="vfluency-stats">
        <div><span id="vfCount">0/${cat.targets.length}</span><small>найдено</small></div>
        <div><span id="vfMistakes">0</span><small>ошибок</small></div>
        <div><span id="vfTime">${seconds}</span><small>сек осталось</small></div>
      </div>
      <button class="ghost-action" type="button" id="vfFinish">Завершить</button>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);

  const grid = ctx.refs.arena.querySelector("#vfGrid");
  const countEl = ctx.refs.arena.querySelector("#vfCount");
  const errEl = ctx.refs.arena.querySelector("#vfMistakes");
  const timeEl = ctx.refs.arena.querySelector("#vfTime");
  const finishBtn = ctx.refs.arena.querySelector("#vfFinish");
  ctx.startCountdown(seconds);

  const startedAt = performance.now();
  let remaining = seconds;
  let hits = 0;
  let mistakes = 0;
  let done = false;

  const timer = window.setInterval(() => {
    remaining -= 1;
    timeEl.textContent = String(Math.max(0, remaining));
    ctx.setProgress(((seconds - remaining) / seconds) * 100);
    if (remaining <= 0) finish();
  }, 1000);

  grid.querySelectorAll(".vf-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (done || btn.disabled) return;
      btn.disabled = true;
      const isTarget = targetSet.has(btn.dataset.word);
      if (isTarget) {
        hits += 1;
        btn.classList.add("is-hit");
        countEl.textContent = `${hits}/${cat.targets.length}`;
        ctx.feedback(true, btn.dataset.word);
        if (hits >= cat.targets.length) window.setTimeout(finish, 260);
      } else {
        mistakes += 1;
        btn.classList.add("is-miss");
        errEl.textContent = String(mistakes);
        ctx.feedback(false, "не из категории");
      }
    });
  });

  finishBtn.addEventListener("click", finish);
  ctx.signal.addEventListener("abort", () => { done = true; window.clearInterval(timer); }, { once: true });

  function finish() {
    if (done) return;
    done = true;
    window.clearInterval(timer);
    const totalClicks = hits + mistakes;
    const recallRate = hits / cat.targets.length;
    const precision = totalClicks ? hits / totalClicks : 0;
    const accuracy = Math.max(0, Math.min(1, recallRate * 0.7 + precision * 0.3));
    const xp = Math.round(18 + accuracy * 36 + level * 2);
    const rt = hits ? (performance.now() - startedAt) / hits : seconds * 1000;
    const result = makeResult(mode, accuracy, xp, mistakes, level, rt);
    result.vfluencyCount = hits;
    result.vfluencyCategory = cat.name;
    ctx.finish(result);
  }
}

/**
 * Episodic Vault — Rey-AVLT-style 15-word list-learning task.
 * The most validated episodic memory paradigm in clinical neuropsychology.
 *
 * Procedure:
 *   1. Encoding: list of 15 words shown one-by-one (~2 sec/word)
 *   2. Immediate recall: type as many as you remember (60 sec)
 *   3. Distractor: 30-sec quick math (interference)
 *   4. Delayed recall: type again from memory (60 sec)
 *   5. Recognition: 30 words (15 targets + 15 lures), pick which were in the original list
 *
 * Yields THREE independent scores:
 *   • Encoding score = immediate recall hits / 15
 *   • Retention score = delayed / immediate (forgetting resistance)
 *   • Recognition d' = hit_rate - false_alarm_rate (storage vs retrieval)
 *
 * Refs:
 *   Rey 1964 — Auditory-Verbal Learning Test (AVLT) original
 *   Delis et al. 2000 — CVLT-II standardisation
 *   Brewer 2021 — diagnostic value of free vs cued vs recognition
 */
export async function runEpisodicVault(ctx) {
  const state = ctx.getState();
  const mode = "evault";
  const level = state.levels[mode] || 1;
  // Five semantically-related lists (rotation prevents proactive interference)
  const WORD_LISTS = [
    ["кофе", "стол", "ключ", "звезда", "якорь", "перо", "огонь", "молоко", "колесо", "снег", "мост", "рыба", "сад", "стрела", "карта"],
    ["лес", "часы", "дождь", "хлеб", "корабль", "лампа", "птица", "шёлк", "монета", "лук", "ветер", "башня", "сахар", "ножницы", "дорога"],
    ["окно", "лодка", "медведь", "роза", "молоток", "молния", "тень", "лента", "колодец", "сапог", "поле", "стрекоза", "гитара", "перчатка", "ключ"],
    ["скала", "берёза", "лента", "морковь", "паук", "стрела", "халат", "башня", "молот", "снег", "роса", "куст", "арфа", "перо", "стекло"],
    ["река", "карандаш", "блокнот", "облако", "монастырь", "пирамида", "велосипед", "земля", "корзина", "печать", "сабля", "молоко", "плащ", "колокол", "тень"],
  ];
  const listIdx = (state.history?.filter((r) => r.mode === "evault").length || 0) % WORD_LISTS.length;
  const targets = WORD_LISTS[listIdx];
  const distractorLures = WORD_LISTS[(listIdx + 1) % WORD_LISTS.length];
  // Pick 15 lures that overlap minimally
  const lures = distractorLures.filter((w) => !targets.includes(w)).slice(0, 15);

  // Phase state
  let phase = "encoding";
  let encodingHits = [];
  let delayedHits = [];
  let recognitionTargets = 0;
  let recognitionFAs = 0;

  // === PHASE 1: ENCODING (one word at a time)
  const wordPace = Math.max(1400, 2200 - level * 80);
  renderDrillShell(ctx.refs, state, mode, `
    <div class="evault-board">
      <div class="evault-phase-bar">
        <span class="ev-phase is-active">1 · Запоминание</span>
        <span class="ev-sep">→</span>
        <span class="ev-phase is-pending">2 · Вспомни</span>
        <span class="ev-sep">→</span>
        <span class="ev-phase is-pending">3 · Помехи</span>
        <span class="ev-sep">→</span>
        <span class="ev-phase is-pending">4 · Снова вспомни</span>
        <span class="ev-sep">→</span>
        <span class="ev-phase is-pending">5 · Узнавание</span>
      </div>
      <div class="evault-word" id="evaultWord">—</div>
      <div class="evault-counter" id="evaultCounter">0 / ${targets.length}</div>
      <div class="hint-line">Просто читай слова. Не пытайся записывать. Они появятся снова на следующем этапе.</div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);

  ctx.startCountdown(targets.length * Math.ceil(wordPace / 1000) + 200);
  const wordEl = ctx.refs.arena.querySelector("#evaultWord");
  const counterEl = ctx.refs.arena.querySelector("#evaultCounter");

  try {
    for (let i = 0; i < targets.length; i += 1) {
      if (ctx.signal.aborted) return;
      wordEl.textContent = targets[i];
      counterEl.textContent = `${i + 1} / ${targets.length}`;
      ctx.setProgress(((i + 1) / targets.length) * 20);
      await sleepSignal(wordPace, ctx.signal);
    }
  } catch (e) { if (!isAbortError(e)) throw e; return; }

  // === PHASE 2: IMMEDIATE RECALL
  phase = "immediate";
  encodingHits = await recallPhase("immediate", "Вспомни как можно больше слов", 60, 20, 40);
  if (ctx.signal.aborted) return;

  // === PHASE 3: DISTRACTOR (30-sec quick math)
  phase = "distractor";
  await distractorPhase();
  if (ctx.signal.aborted) return;

  // === PHASE 4: DELAYED RECALL
  phase = "delayed";
  delayedHits = await recallPhase("delayed", "Снова вспомни слова — через интерференцию", 60, 60, 80);
  if (ctx.signal.aborted) return;

  // === PHASE 5: RECOGNITION
  phase = "recognition";
  await recognitionPhase();
  if (ctx.signal.aborted) return;

  finish();

  // ---- helpers ----

  async function recallPhase(id, prompt, seconds, fromPct, toPct) {
    return new Promise((resolve) => {
      const chipWords = shuffle([...targets, ...lures.slice(0, 13)]);
      const selected = new Set();
      renderDrillShell(ctx.refs, state, mode, `
        <div class="evault-board">
          <div class="evault-phase-bar">
            ${makePhaseBar(id)}
          </div>
          <div class="evault-recall-prompt">${prompt} (кликай слова мышкой)</div>
          <div class="vf-chip-grid ev-chip-grid" id="evChipGrid">
            ${chipWords.map((w) => `<button type="button" class="vf-chip ev-chip" data-word="${w}">${w}</button>`).join("")}
          </div>
          <div class="evault-recall-meta">
            <span><strong id="evRecallCount">0</strong> / ${targets.length} выбрано</span>
            <span><strong id="evRecallTime">${seconds}</strong> сек</span>
            <button class="primary-action" type="button" id="evRecallDone">Готово →</button>
          </div>
          <div class="progress-track"><span id="taskProgress"></span></div>
        </div>
      `);
      const grid = ctx.refs.arena.querySelector("#evChipGrid");
      const countEl = ctx.refs.arena.querySelector("#evRecallCount");
      const timeEl = ctx.refs.arena.querySelector("#evRecallTime");
      const doneBtn = ctx.refs.arena.querySelector("#evRecallDone");
      let remaining = seconds;
      let finished = false;
      const tick = window.setInterval(() => {
        remaining -= 1;
        timeEl.textContent = String(Math.max(0, remaining));
        ctx.setProgress(fromPct + ((seconds - remaining) / seconds) * (toPct - fromPct));
        if (remaining <= 0) finalize();
      }, 1000);

      grid.querySelectorAll(".ev-chip").forEach((btn) => {
        btn.addEventListener("click", () => {
          const w = btn.dataset.word;
          if (selected.has(w)) {
            selected.delete(w);
            btn.classList.remove("is-selected");
          } else {
            selected.add(w);
            btn.classList.add("is-selected");
          }
          countEl.textContent = String(selected.size);
        });
      });

      doneBtn.addEventListener("click", finalize);
      ctx.signal.addEventListener("abort", () => { finished = true; window.clearInterval(tick); }, { once: true });

      function finalize() {
        if (finished) return;
        finished = true;
        window.clearInterval(tick);
        const targetLower = targets.map((t) => t.toLowerCase());
        const hits = [...selected].filter((w) => targetLower.includes(w.toLowerCase()));
        ctx.feedback(hits.length >= 5, `вспомнил ${hits.length}/${targets.length}`);
        resolve(hits);
      }
    });
  }

  async function distractorPhase() {
    return new Promise((resolve) => {
      renderDrillShell(ctx.refs, state, mode, `
        <div class="evault-board">
          <div class="evault-phase-bar">${makePhaseBar("distractor")}</div>
          <div class="evault-distractor">
            <p class="hint-line">30 секунд лёгкого счёта — нужно очистить рабочую память от слов</p>
            <div class="math-question" id="distMathQ">—</div>
            <div class="math-choices" id="distMathChoices"></div>
            <div class="evault-recall-meta">
              <span><strong id="distMathTime">30</strong> сек до следующего этапа</span>
            </div>
            <div class="progress-track"><span id="taskProgress"></span></div>
          </div>
        </div>
      `);
      const qEl = ctx.refs.arena.querySelector("#distMathQ");
      const choicesEl = ctx.refs.arena.querySelector("#distMathChoices");
      const timeEl = ctx.refs.arena.querySelector("#distMathTime");
      let remaining = 30;
      const tick = window.setInterval(() => {
        remaining -= 1;
        timeEl.textContent = String(Math.max(0, remaining));
        ctx.setProgress(40 + ((30 - remaining) / 30) * 20);
        if (remaining <= 0) { window.clearInterval(tick); resolve(); }
      }, 1000);

      function nextMath() {
        const a = randomInt(10, 30), b = randomInt(5, 15);
        const correct = a + b;
        const distractors = [correct + 1, correct - 1, correct + randomInt(2, 6)];
        const opts = shuffle([correct, ...distractors]);
        qEl.textContent = `${a} + ${b}`;
        choicesEl.innerHTML = opts.map((v) => `<button class="math-choice" type="button" data-v="${v}"><span class="mc-value">${v}</span></button>`).join("");
        choicesEl.querySelectorAll("[data-v]").forEach((btn) => {
          btn.addEventListener("click", () => {
            if (Number(btn.dataset.v) === correct) btn.classList.add("is-good");
            else btn.classList.add("is-bad");
            choicesEl.querySelectorAll("button").forEach((b) => { b.disabled = true; });
            window.setTimeout(nextMath, 300);
          });
        });
      }
      ctx.signal.addEventListener("abort", () => window.clearInterval(tick), { once: true });
      nextMath();
    });
  }

  async function recognitionPhase() {
    return new Promise((resolve) => {
      const items = shuffle([
        ...targets.map((w) => ({ w, isTarget: true })),
        ...lures.map((w) => ({ w, isTarget: false })),
      ]);
      renderDrillShell(ctx.refs, state, mode, `
        <div class="evault-board">
          <div class="evault-phase-bar">${makePhaseBar("recognition")}</div>
          <div class="evault-recall-prompt">Было ли это слово в исходном списке? Тапни «Да» или «Нет».</div>
          <div class="evault-recog" id="evRecog"></div>
          <div class="evault-recall-meta">
            <span>Слово <strong id="evRecogN">1</strong>/${items.length}</span>
          </div>
          <div class="progress-track"><span id="taskProgress"></span></div>
        </div>
      `);
      const host = ctx.refs.arena.querySelector("#evRecog");
      const nEl = ctx.refs.arena.querySelector("#evRecogN");
      let idx = 0;

      function renderItem() {
        if (idx >= items.length) { resolve(); return; }
        const it = items[idx];
        nEl.textContent = idx + 1;
        ctx.setProgress(80 + (idx / items.length) * 20);
        host.innerHTML = `
          <div class="evault-recog-word">${it.w}</div>
          <div class="evault-recog-actions">
            <button class="answer-button" type="button" data-yes="0">Нет</button>
            <button class="answer-button" type="button" data-yes="1">Да</button>
          </div>
        `;
        host.querySelectorAll("button").forEach((btn) => {
          btn.addEventListener("click", () => {
            const said = btn.dataset.yes === "1";
            if (it.isTarget && said) recognitionTargets += 1;
            else if (!it.isTarget && said) recognitionFAs += 1;
            btn.classList.add(it.isTarget === said ? "is-good" : "is-bad");
            window.setTimeout(() => { idx += 1; renderItem(); }, 200);
          });
        });
      }
      ctx.signal.addEventListener("abort", () => {}, { once: true });
      renderItem();
    });
  }

  function makePhaseBar(active) {
    const phases = [
      { id: "encoding",     label: "1 · Запоминание" },
      { id: "immediate",    label: "2 · Вспомни" },
      { id: "distractor",   label: "3 · Помехи" },
      { id: "delayed",      label: "4 · Снова вспомни" },
      { id: "recognition",  label: "5 · Узнавание" },
    ];
    const activeIdx = phases.findIndex((p) => p.id === active);
    return phases.map((p, i) => {
      const cls = i < activeIdx ? "is-done" : i === activeIdx ? "is-active" : "is-pending";
      return `<span class="ev-phase ${cls}">${p.label}</span>${i < phases.length - 1 ? `<span class="ev-sep">→</span>` : ""}`;
    }).join("");
  }

  function finish() {
    // Three independent scores
    const encodingScore = encodingHits.length / 15;       // 0-1
    const delayedScore = delayedHits.length / 15;         // 0-1
    const retentionScore = encodingHits.length > 0 ? delayedHits.length / encodingHits.length : 0;
    const hitRate = recognitionTargets / 15;
    const faRate = recognitionFAs / 15;
    const recognitionScore = Math.max(0, hitRate - faRate); // raw d' substitute, bounded 0-1
    const composite = (encodingScore * 0.35 + delayedScore * 0.35 + recognitionScore * 0.30);

    const xp = Math.round(22 + composite * 42 + level * 2);
    const result = makeResult(mode, composite, xp, 0, level, 0);
    result.episodic = {
      encoding: encodingHits.length,
      delayed: delayedHits.length,
      retention: Number(retentionScore.toFixed(2)),
      recognitionHits: recognitionTargets,
      recognitionFAs: recognitionFAs,
      recognitionDprimeProxy: Number(recognitionScore.toFixed(2)),
      listIdx,
    };
    ctx.finish(result);
  }
}

/* Rule Hunt — Wisconsin Card Sorting Test */
export function runRuleHunt(ctx) {
  const state = ctx.getState();
  const mode = "rulehunt";
  const level = state.levels[mode] || 1;
  const total = 14 + level * 2; // 16 to 34 trials
  const deadline = Math.max(2200, 6000 - level * 300);

  const colors = [
    { id: "red", label: "Красный", value: "#ef4d6b" },
    { id: "green", label: "Зелёный", value: "#34c997" },
    { id: "blue", label: "Синий", value: "#2a73ff" },
    { id: "yellow", label: "Жёлтый", value: "#ffba2e" },
  ];
  const shapes = [
    { id: "triangle", label: "▲" },
    { id: "star", label: "★" },
    { id: "cross", label: "✚" },
    { id: "circle", label: "●" },
  ];

  // 4 reference cards
  const refCards = [
    { count: 1, color: "red", shape: "triangle" },
    { count: 2, color: "green", shape: "star" },
    { count: 3, color: "blue", shape: "cross" },
    { count: 4, color: "yellow", shape: "circle" },
  ];

  const rules = ["color", "shape", "count"];
  let currentRuleIdx = 0;
  let secretRule = rules[currentRuleIdx];

  let trial = 0;
  let correct = 0;
  let mistakes = 0;
  let consecutiveCorrect = 0;
  let perseverativeErrors = 0;
  let lastRule = null;
  let currentCard = null;
  let startedAt = 0;
  let answered = false;
  let timeout = null;
  let totalRt = 0;

  renderShell();
  ctx.startCountdown(Math.ceil((total * deadline) / 1000));
  next();

  function renderCardHtml(card, interactive = false, index = null) {
    const colorObj = colors.find(c => c.id === card.color);
    const shapeObj = shapes.find(s => s.id === card.shape);
    const itemsHtml = Array.from({ length: card.count }, () => `
      <span class="rh-card-item" style="color:${colorObj.value}">${shapeObj.label}</span>
    `).join("");
    const attrString = interactive ? `data-ref="${index}"` : "";
    return `
      <button class="rh-card ${interactive ? "rh-ref-card" : "rh-main-card"}" type="button" ${attrString}>
        <div class="rh-card-content rh-count-${card.count}">
          ${itemsHtml}
        </div>
      </button>
    `;
  }

  function renderShell() {
    renderDrillShell(ctx.refs, state, mode, `
      <div class="rulehunt-board">
        <div class="rulehunt-instruction">Разгадай правило сортировки. Правило периодически меняется!</div>
        <div class="rh-ref-cards">
          ${refCards.map((c, i) => renderCardHtml(c, true, i)).join("")}
        </div>
        <div class="rh-divider"></div>
        <div class="rh-target-zone">
          <span class="rh-target-label">Твоя карта:</span>
          <div id="rhTargetContainer">—</div>
        </div>
        <div class="progress-track"><span id="taskProgress"></span></div>
      </div>
    `);

    ctx.refs.arena.querySelectorAll(".rh-ref-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!currentCard || answered) return;
        const refIndex = Number(btn.dataset.ref);
        evaluate(refIndex, btn);
      });
    });
  }

  function next() {
    if (ctx.signal.aborted) return;
    if (trial >= total) return finish();
    answered = false;

    // Generate a trial card that matches refCards in various attributes
    // Pick attributes semi-randomly
    const rndColor = colors[randomInt(0, 3)].id;
    const rndShape = shapes[randomInt(0, 3)].id;
    const rndCount = randomInt(1, 4);
    currentCard = { color: rndColor, shape: rndShape, count: rndCount };

    const targetContainer = ctx.refs.arena.querySelector("#rhTargetContainer");
    if (targetContainer) {
      targetContainer.innerHTML = renderCardHtml(currentCard);
    }

    startedAt = performance.now();
    trial += 1;
    ctx.setProgress(((trial - 1) / total) * 100);
    timeout = window.setTimeout(() => evaluate(-1, null), deadline);
  }

  function evaluate(refIndex, clickedBtn) {
    if (answered || ctx.signal.aborted) return;
    answered = true;
    if (timeout) window.clearTimeout(timeout);

    const rt = performance.now() - startedAt;
    let hit = false;
    let perseverative = false;

    if (refIndex >= 0) {
      const ref = refCards[refIndex];
      // Check if it matches according to secret rule
      if (secretRule === "color" && currentCard.color === ref.color) hit = true;
      else if (secretRule === "shape" && currentCard.shape === ref.shape) hit = true;
      else if (secretRule === "count" && currentCard.count === ref.count) hit = true;

      // Track perseverative error: did user sort by the PREVIOUS secret rule (if we had one) and fail?
      if (!hit && lastRule) {
        let matchedPrev = false;
        if (lastRule === "color" && currentCard.color === ref.color) matchedPrev = true;
        else if (lastRule === "shape" && currentCard.shape === ref.shape) matchedPrev = true;
        else if (lastRule === "count" && currentCard.count === ref.count) matchedPrev = true;
        if (matchedPrev) {
          perseverative = true;
          perseverativeErrors += 1;
        }
      }
    }

    if (hit) {
      correct += 1;
      consecutiveCorrect += 1;
      totalRt += rt;
      ctx.feedback(true, `верно (${consecutiveCorrect}/6)`);
      if (clickedBtn) {
        clickedBtn.classList.add("is-good");
        window.setTimeout(() => clickedBtn.classList.remove("is-good"), 200);
      }
    } else {
      mistakes += 1;
      consecutiveCorrect = 0;
      ctx.feedback(false, perseverative ? "персеверация (старое правило)" : "неверно");
      if (clickedBtn) {
        clickedBtn.classList.add("is-bad");
        window.setTimeout(() => clickedBtn.classList.remove("is-bad"), 250);
      }
    }

    // Rule change threshold: 6 correct in a row!
    if (consecutiveCorrect === 6) {
      lastRule = secretRule;
      currentRuleIdx = (currentRuleIdx + 1) % rules.length;
      secretRule = rules[currentRuleIdx];
      consecutiveCorrect = 0;
      ctx.toast("Правило изменилось!");
    }

    ctx.setProgress((trial / total) * 100);
    window.setTimeout(next, 350);
  }

  function finish() {
    const accuracy = correct / total;
    const avgRt = correct ? totalRt / correct : deadline;
    const xp = Math.round(18 + accuracy * 32 + level * 2);
    const result = makeResult(mode, accuracy, xp, mistakes, level, avgRt);
    result.rulehunt = {
      perseverativeErrors,
      rulesDiscovered: currentRuleIdx + (consecutiveCorrect >= 1 ? 0.5 : 0),
      totalCorrect: correct,
    };
    ctx.finish(result);
  }
}

