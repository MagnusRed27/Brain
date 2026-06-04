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

export async function runReaction(ctx) {
  const state = ctx.getState();
  const mode = "reaction";
  const level = state.levels[mode] || 1;
  const total = 8 + level;
  renderDrillShell(ctx.refs, state, mode, `
    <div class="reaction-board">
      <button type="button" id="reactionPad" class="reaction-pad is-wait">ЖДИ</button>
      <div class="reaction-readout">
        <div><span>попыток</span><strong id="reactionAttempts">0</strong></div>
        <div><span>среднее</span><strong id="reactionAvg">— ms</strong></div>
        <div><span>лучшее</span><strong id="reactionBest">— ms</strong></div>
      </div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);

  const pad = ctx.refs.arena.querySelector("#reactionPad");
  const attEl = ctx.refs.arena.querySelector("#reactionAttempts");
  const avgEl = ctx.refs.arena.querySelector("#reactionAvg");
  const bestEl = ctx.refs.arena.querySelector("#reactionBest");
  ctx.startCountdown(40 + level * 4);

  const times = [];
  let mistakes = 0;
  let attempt = 0;
  let goAt = 0;
  let phase = "wait";
  let earlyTimer = 0;

  function start() {
    if (ctx.signal.aborted) return;
    if (attempt >= total) {
      finish();
      return;
    }
    phase = "wait";
    pad.className = "reaction-pad is-wait";
    pad.textContent = "ЖДИ";
    const isGoNoGo = Math.random() < 0.18;
    const delay = randomInt(800, 1800 + Math.max(0, 1400 - level * 100));
    earlyTimer = window.setTimeout(() => {
      if (ctx.signal.aborted) return;
      if (isGoNoGo) {
        phase = "stop";
        pad.className = "reaction-pad is-stop";
        pad.textContent = "СТОП";
        window.setTimeout(() => {
          if (ctx.signal.aborted) return;
          attempt += 1;
          attEl.textContent = attempt;
          ctx.setProgress((attempt / total) * 100);
          ctx.feedback(true, "удержано");
          start();
        }, 900);
      } else {
        phase = "go";
        goAt = performance.now();
        pad.className = "reaction-pad is-go";
        pad.textContent = "GO";
      }
    }, delay);
  }

  pad.addEventListener("click", () => {
    if (ctx.signal.aborted) return;
    if (phase === "wait") {
      window.clearTimeout(earlyTimer);
      mistakes += 1;
      attempt += 1;
      ctx.feedback(false, "рано");
      attEl.textContent = attempt;
      ctx.setProgress((attempt / total) * 100);
      start();
      return;
    }
    if (phase === "stop") {
      window.clearTimeout(earlyTimer);
      mistakes += 1;
      attempt += 1;
      ctx.feedback(false, "стоп!");
      attEl.textContent = attempt;
      ctx.setProgress((attempt / total) * 100);
      start();
      return;
    }
    if (phase === "go") {
      const rt = performance.now() - goAt;
      times.push(rt);
      attempt += 1;
      ctx.feedback(rt < 360, rt < 360 ? "быстро" : "норм");
      attEl.textContent = attempt;
      avgEl.textContent = `${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} ms`;
      bestEl.textContent = `${Math.round(Math.min(...times))} ms`;
      ctx.setProgress((attempt / total) * 100);
      start();
    }
  });

  ctx.signal.addEventListener("abort", () => window.clearTimeout(earlyTimer), { once: true });

  function finish() {
    const valid = times.length;
    const avg = valid ? times.reduce((a, b) => a + b, 0) / valid : 600;
    const accuracy = valid / total;
    const xp = Math.round(14 + accuracy * 28 + Math.max(0, 30 - Math.min(30, avg / 18)));
    ctx.finish(makeResult(mode, accuracy, xp, mistakes, level, avg));
  }

  start();
}

/**
 * Stroop+ with PROPER block design (MacLeod 1991, Botvinick 2004).
 *
 * Standard procedure: per-block congruency RT comparison.
 *   Block 1 (12 trials): all CONGRUENT (word and ink match) — baseline
 *   Block 2 (12 trials): all INCONGRUENT (word ≠ ink) — conflict
 *   Block 3 (12 trials): mixed (50% congruent / 50% incongruent) — switching
 *
 * Real Stroop effect = mean(incongruent RT) - mean(congruent RT)
 * Typical: 50-150ms. Higher = more interference.
 *
 * The previous mixed-only design did NOT compute this — was psychometrically broken.
 */
export async function runStroop(ctx) {
  const state = ctx.getState();
  const mode = "stroop";
  const level = state.levels[mode] || 1;
  const trialsPerBlock = 8 + Math.min(8, level);  // 9-16 per block
  const deadline = Math.max(900, 2200 - level * 110);
  const colors = [
    { id: "red", label: "КРАСНЫЙ", value: "#ef4d6b" },
    { id: "green", label: "ЗЕЛЁНЫЙ", value: "#34c997" },
    { id: "blue", label: "СИНИЙ", value: "#2a73ff" },
    { id: "yellow", label: "ЖЁЛТЫЙ", value: "#ffba2e" },
  ];

  let trialsByBlock = { congruent: [], incongruent: [], mixed: [] };
  let currentBlock = "congruent";
  let trial = 0;
  let totalCorrect = 0;
  let totalMistakes = 0;
  let current = null;
  let startedAt = 0;
  let timeout = null;
  let blockTrial = 0;
  let totalCount = trialsPerBlock * 3;

  renderShell();
  ctx.startCountdown(Math.ceil((totalCount * deadline) / 1000));

  function renderShell() {
    renderDrillShell(ctx.refs, state, mode, `
      <div class="focus-card stroop-card">
        <div class="stroop-block-bar">
          <span class="stroop-block ${currentBlock === "congruent" ? "is-active" : (trialsByBlock.congruent.length >= trialsPerBlock ? "is-done" : "is-pending")}">1 · congruent baseline</span>
          <span class="stroop-block ${currentBlock === "incongruent" ? "is-active" : (trialsByBlock.incongruent.length >= trialsPerBlock ? "is-done" : "is-pending")}">2 · incongruent conflict</span>
          <span class="stroop-block ${currentBlock === "mixed" ? "is-active" : (trialsByBlock.mixed.length >= trialsPerBlock ? "is-done" : "is-pending")}">3 · mixed switching</span>
        </div>
        <div class="focus-rule" id="stroopRuleHint">ЦВЕТ ШРИФТА — игнорируй слово</div>
        <div class="focus-word" id="stroopWord">СТАРТ</div>
        <div class="color-choices">${colors.map((c) => `<button class="color-choice" type="button" style="background:${c.value}" data-color="${c.id}">${c.label}</button>`).join("")}</div>
        <div class="progress-track"><span id="taskProgress"></span></div>
      </div>
    `);
    ctx.refs.arena.querySelectorAll("[data-color]").forEach((button) => {
      button.addEventListener("click", () => current && evaluate(button.dataset.color));
    });
  }

  ctx.signal.addEventListener("abort", () => window.clearTimeout(timeout), { once: true });

  next();

  function shouldBeCongruent() {
    if (currentBlock === "congruent") return true;
    if (currentBlock === "incongruent") return false;
    return Math.random() < 0.5;  // mixed: 50/50
  }

  function next() {
    if (ctx.signal.aborted) return;
    if (blockTrial >= trialsPerBlock) {
      // Advance to next block
      if (currentBlock === "congruent") { currentBlock = "incongruent"; blockTrial = 0; renderShell(); window.setTimeout(next, 600); return; }
      if (currentBlock === "incongruent") { currentBlock = "mixed"; blockTrial = 0; renderShell(); window.setTimeout(next, 600); return; }
      return finish();
    }
    const wordEl = ctx.refs.arena.querySelector("#stroopWord");
    if (!wordEl) return;
    const word = colors[randomInt(0, colors.length - 1)];
    let ink;
    const wantCongruent = shouldBeCongruent();
    if (wantCongruent) {
      ink = word;  // same colour as word meaning
    } else {
      do { ink = colors[randomInt(0, colors.length - 1)]; } while (ink.id === word.id);
    }
    current = { answer: ink.id, congruent: wantCongruent, block: currentBlock };
    wordEl.textContent = word.label;
    wordEl.style.color = ink.value;
    wordEl.classList.remove("is-good", "is-bad");
    startedAt = performance.now();
    trial += 1;
    blockTrial += 1;
    ctx.setProgress((trial / totalCount) * 100);
    timeout = window.setTimeout(() => evaluate(null), deadline);
  }

  function evaluate(answer) {
    if (!current || ctx.signal.aborted) return;
    if (timeout) window.clearTimeout(timeout);
    const hit = answer === current.answer;
    const rt = performance.now() - startedAt;
    const wordEl = ctx.refs.arena.querySelector("#stroopWord");
    if (hit) {
      totalCorrect += 1;
      // Record RT per congruency type within block
      if (current.block === "congruent") trialsByBlock.congruent.push(rt);
      else if (current.block === "incongruent") trialsByBlock.incongruent.push(rt);
      else if (current.block === "mixed") trialsByBlock.mixed.push({ rt, congruent: current.congruent });
    } else {
      totalMistakes += 1;
    }
    if (wordEl) wordEl.classList.add(hit ? "is-good" : "is-bad");
    ctx.feedback(hit, hit ? "цвет" : (current.congruent ? "невнимательно" : "поймал слово"));
    current = null;
    window.setTimeout(next, 150);
  }

  function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

  function finish() {
    const accuracy = totalCorrect / totalCount;
    const meanCongruent = mean(trialsByBlock.congruent);
    const meanIncongruent = mean(trialsByBlock.incongruent);
    const stroopEffect = meanIncongruent - meanCongruent;
    // Mixed block: separately
    const mixedCongRts = trialsByBlock.mixed.filter((x) => x.congruent).map((x) => x.rt);
    const mixedIncRts = trialsByBlock.mixed.filter((x) => !x.congruent).map((x) => x.rt);
    const mixedEffect = mean(mixedIncRts) - mean(mixedCongRts);
    const overallRt = mean([...trialsByBlock.congruent, ...trialsByBlock.incongruent, ...trialsByBlock.mixed.map((x) => x.rt)]);

    const xp = Math.round(16 + accuracy * 32 + level * 2);
    const result = makeResult(mode, accuracy, xp, totalMistakes, level, overallRt);
    result.stroop = {
      meanCongruentRt: Math.round(meanCongruent),
      meanIncongruentRt: Math.round(meanIncongruent),
      stroopEffectMs: Math.round(stroopEffect),
      mixedEffectMs: Math.round(mixedEffect || 0),
    };
    ctx.finish(result);
    return;
  }
}

/**
 * Trail Making A + B — Reitan 1958 classic neuropsych test.
 * Phase 1 (A): connect numbers 1→2→3→…  (visuomotor speed baseline)
 * Phase 2 (B): alternate 1→А→2→Б→3→В→…  (set-shifting / executive)
 * Executive marker = Trail-B time − Trail-A time (B−A delta).
 */
export async function runTrail(ctx) {
  const state = ctx.getState();
  const mode = "trail";
  const level = state.levels[mode] || 1;
  const pairs = Math.min(8, 4 + level);
  const alphabet = ["А", "Б", "В", "Г", "Д", "Е", "Ж", "З", "И", "К"];

  // === PHASE A: numbers only (visuomotor speed baseline) ===
  const seqA = Array.from({ length: pairs }, (_, i) => ({ kind: "num", label: String(i + 1) }));
  const seqB = [];
  for (let i = 0; i < pairs; i += 1) {
    seqB.push({ kind: "num", label: String(i + 1) });
    seqB.push({ kind: "letter", label: alphabet[i] });
  }

  function makePositions(n) {
    const padding = 60;
    const w = 440;
    const h = 320;
    const positions = [];
    for (let i = 0; i < n; i += 1) {
      let attempts = 0;
      let pos;
      do {
        pos = {
          x: padding + Math.random() * (w - padding * 2),
          y: padding + Math.random() * (h - padding * 2),
        };
        attempts += 1;
      } while (attempts < 40 && positions.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < 72));
      positions.push(pos);
    }
    return { positions, w, h };
  }

  let phase = "A";
  let phaseStart = 0;
  let timeA = 0;
  let timeB = 0;
  let mistakesA = 0;
  let mistakesB = 0;
  let cursor = 0;
  let mistakes = 0;
  let linePoints = [];
  let currentNodes, currentLine, currentPositions, currentSeq;

  function renderPhase(label, sequence) {
    const { positions, w, h } = makePositions(sequence.length);
    currentPositions = positions;
    currentSeq = sequence;

    const nodesHtml = sequence.map((node, idx) => `
      <g class="trail-node" data-idx="${idx}" tabindex="0" role="button" aria-label="${node.label}, шаг ${idx + 1}" transform="translate(${positions[idx].x}, ${positions[idx].y})">
        <circle r="22"></circle>
        <text>${node.label}</text>
      </g>
    `).join("");

    renderDrillShell(ctx.refs, state, mode, `
      <div class="trail-board">
        <div class="trail-phase-bar">
          <span class="trail-phase ${phase === "A" ? "is-active" : "is-done"}">Trail A · числа</span>
          <span class="trail-phase-sep">→</span>
          <span class="trail-phase ${phase === "B" ? "is-active" : "is-pending"}">Trail B · 1→А→2→Б…</span>
        </div>
        <div class="trail-svg-wrap">
          <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" id="trailSvg">
            <polyline class="trail-line" points=""></polyline>
            ${nodesHtml}
          </svg>
        </div>
        <div class="hint-line">${label}</div>
        <div class="progress-track"><span id="taskProgress"></span></div>
      </div>
    `);

    const svg = ctx.refs.arena.querySelector("#trailSvg");
    currentNodes = [...svg.querySelectorAll(".trail-node")];
    currentLine = svg.querySelector(".trail-line");
    currentNodes[0].classList.add("is-next");
    linePoints = [];
    cursor = 0;
    mistakes = 0;
    phaseStart = performance.now();

    const activateNode = (node) => {
        if (ctx.signal.aborted) return;
        const idx = Number(node.dataset.idx);
        if (idx === cursor) {
          const pos = currentPositions[idx];
          linePoints.push(`${pos.x},${pos.y}`);
          currentLine.setAttribute("points", linePoints.join(" "));
          node.classList.add("is-done");
          node.classList.remove("is-next");
          cursor += 1;
          ctx.feedback(true, `${cursor}/${currentSeq.length}`);
          ctx.setProgress((cursor / currentSeq.length) * 100);
          if (cursor < currentSeq.length) {
            currentNodes[cursor].classList.add("is-next");
            currentNodes[cursor].focus({ preventScroll: true });
          } else {
            completePhase();
          }
        } else {
          mistakes += 1;
          node.classList.add("is-bad");
          window.setTimeout(() => node.classList.remove("is-bad"), 320);
          ctx.feedback(false, "не та очередь");
        }
    };

    currentNodes.forEach((node) => {
      node.addEventListener("click", () => activateNode(node));
      node.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        activateNode(node);
      });
    });
  }

  function completePhase() {
    const elapsed = performance.now() - phaseStart;
    if (phase === "A") {
      timeA = elapsed;
      mistakesA = mistakes;
      phase = "B";
      window.setTimeout(() => {
        renderPhase("Теперь чередуй: 1 → А → 2 → Б → 3 → В …", seqB);
      }, 700);
    } else {
      timeB = elapsed;
      mistakesB = mistakes;
      finish(true);
    }
  }

  ctx.startCountdown(60 + pairs * 16);
  renderPhase("Соединяй числа по порядку: 1 → 2 → 3 …", seqA);

  function finish(success) {
    const totalMistakes = mistakesA + mistakesB;
    // Accuracy: only B-phase mistakes really matter; A is baseline.
    const accuracy = success ? Math.max(0.4, 1 - mistakesB * 0.08) : 0.3;
    const totalTime = timeA + timeB;
    const xp = Math.round(14 + accuracy * 30 + level * 2);
    const result = makeResult(mode, accuracy, xp, totalMistakes, level, totalTime);
    // The scientifically meaningful executive marker:
    result.trailA_ms = Math.round(timeA);
    result.trailB_ms = Math.round(timeB);
    result.trailBminusA = Math.round(timeB - timeA);
    result.trailA_mistakes = mistakesA;
    result.trailB_mistakes = mistakesB;
    ctx.finish(result);
  }
}

export async function runAnback(ctx) {
  const state = ctx.getState();
  const mode = "anback";
  const level = state.levels[mode] || 1;
  const n = Math.min(4, Math.max(1, level));
  const total = 10 + Math.min(10, level * 2);
  const pace = Math.max(1500, 2800 - level * 110);
  const letters = ["А", "К", "Н", "Р", "С", "Т", "Ф", "Х"];

  renderDrillShell(ctx.refs, state, mode, `
    <div class="anback-display">
      <div class="anback-orb" id="anbackOrb">·</div>
      <div class="anback-hint">${n}-back · слушай и нажимай «Совпало», когда буква повторяется n назад</div>
      <div class="answer-actions">
        <button class="answer-button" id="anbackMatch" type="button">Совпало</button>
        <button class="answer-button" id="anbackSkip" type="button">Нет</button>
      </div>
      <div class="progress-track"><span id="taskProgress"></span></div>
    </div>
  `);

  const orb = ctx.refs.arena.querySelector("#anbackOrb");
  const matchBtn = ctx.refs.arena.querySelector("#anbackMatch");
  const skipBtn = ctx.refs.arena.querySelector("#anbackSkip");
  ctx.startCountdown(Math.ceil((total * pace) / 1000));

  const sequence = [];
  let trial = 0;
  let correct = 0;
  let mistakes = 0;
  let totalRt = 0;
  let firstAt = 0;
  let answered = false;
  let timer = null;

  function speak(letter) {
    try {
      if (!("speechSynthesis" in window)) return;
      const settings = ctx.getState().settings;
      if (!settings.soundEnabled) return;
      const utter = new SpeechSynthesisUtterance(letter);
      utter.lang = "ru-RU";
      utter.rate = 0.95;
      utter.volume = Math.max(0.1, Math.min(1, (settings.masterVolume ?? 0.7) * 0.85));
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    } catch {
      /* noop */
    }
  }

  function chooseLetter() {
    if (sequence.length >= n && Math.random() < 0.35) {
      return { letter: sequence[sequence.length - n], match: true };
    }
    let letter;
    do { letter = letters[randomInt(0, letters.length - 1)]; }
    while (sequence.length >= n && letter === sequence[sequence.length - n]);
    return { letter, match: false };
  }

  function evaluate(pickedMatch) {
    if (answered || ctx.signal.aborted) return;
    answered = true;
    if (timer) window.clearTimeout(timer);
    const item = sequence[sequence.length - 1];
    const hit = pickedMatch === item.match;
    if (hit) {
      correct += 1;
      totalRt += firstAt ? performance.now() - firstAt : pace;
    } else {
      mistakes += 1;
    }
    orb.classList.toggle("is-pulse", hit);
    ctx.feedback(hit, hit ? "слух точен" : "перепроверь");
    ctx.setProgress((trial / total) * 100);
    window.setTimeout(next, 220);
  }

  function next() {
    if (ctx.signal.aborted) return;
    if (trial >= total) return finish();
    answered = false;
    firstAt = 0;
    orb.classList.remove("is-pulse");
    const item = chooseLetter();
    sequence.push(item);
    orb.textContent = item.letter;
    orb.classList.add("is-pulse");
    speak(item.letter);
    ctx.setProgress((trial / total) * 100);
    trial += 1;
    timer = window.setTimeout(() => evaluate(false), pace);
  }

  function pressed(pickedMatch) {
    if (!firstAt) firstAt = performance.now();
    evaluate(pickedMatch);
  }

  matchBtn.addEventListener("click", () => pressed(true));
  skipBtn.addEventListener("click", () => pressed(false));
  ctx.signal.addEventListener("abort", () => {
    window.clearTimeout(timer);
    try { speechSynthesis.cancel(); } catch { /* noop */ }
  }, { once: true });

  function finish() {
    const accuracy = correct / total;
    const avgRt = correct ? totalRt / correct : pace;
    ctx.finish(makeResult(mode, accuracy, Math.round(20 + accuracy * 32 + level * 2), mistakes, level, avgRt));
  }

  next();
}
