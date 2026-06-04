import { MODE_META } from "./config.js";

/** среднее и стандартное отклонение */
function meanStd(values) {
  if (!values.length) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Анализ только что завершённого раунда.
 * Возвращает структуру со сравнениями с личной историей.
 */
export function analyzeRound(state, result) {
  const historyAll = state.history.filter((r) => r.mode === result.mode && r !== result);
  const last10 = historyAll.slice(-10);
  const accStats = meanStd(last10.map((r) => r.accuracy || 0));
  const rtStats = meanStd(last10.filter((r) => r.rt).map((r) => r.rt || 0));

  const zAcc = accStats.std > 0 ? (result.accuracy - accStats.mean) / accStats.std : 0;
  const zRt = rtStats.std > 0 && result.rt ? (result.rt - rtStats.mean) / rtStats.std : 0;

  // Speed-Accuracy quadrant
  const speedQ = result.rt && rtStats.mean ? (result.rt < rtStats.mean ? "fast" : "slow") : "neutral";
  const accQ = result.accuracy >= (accStats.mean || 0.6) ? "precise" : "sloppy";
  const quadrant = `${speedQ}-${accQ}`;

  // Personal best?
  const bestAcc = Math.max(0, ...historyAll.map((r) => r.accuracy || 0));
  const bestRt = result.rt && historyAll.some((r) => r.rt) ? Math.min(...historyAll.filter((r) => r.rt).map((r) => r.rt)) : null;
  const newAccBest = result.accuracy > bestAcc && historyAll.length >= 3;
  const newRtBest = bestRt !== null && result.rt && result.rt < bestRt && historyAll.length >= 3;

  // Flow indicator: 65-85% accuracy + RT in 0.7-1.3 of baseline
  const inAccZone = result.accuracy >= 0.65 && result.accuracy < 0.86;
  const inRtZone = !result.rt || !rtStats.mean || (result.rt >= rtStats.mean * 0.7 && result.rt <= rtStats.mean * 1.3);
  const flow = inAccZone && inRtZone;

  // Cognitive load estimate (0-100): based on level, accuracy near threshold, mistakes spread
  const load = clamp(
    20 + result.difficultyBefore * 8 + (1 - result.accuracy) * 30 + (result.mistakes / Math.max(1, result.attempts || result.mistakes + 1)) * 30,
    0, 100
  );

  // Classification
  let label, tone, insight;
  if (result.accuracy >= 0.9 && (zRt < 0 || !result.rt)) {
    label = "Прорыв"; tone = "good";
    insight = "Точность ≥90% при сохранённой скорости. Уровень адаптируется выше — будь готов к большему вызову.";
  } else if (newAccBest || newRtBest) {
    label = "Личный рекорд"; tone = "good";
    insight = newAccBest && newRtBest ? "Лучшая точность и лучшее время одновременно — редкая сцепка." : newAccBest ? "Лучшая точность за всю историю модуля." : "Лучшее время реакции при достаточной точности.";
  } else if (flow) {
    label = "Flow"; tone = "good";
    insight = "Точность в зоне 65–85%, скорость в норме. Это «challenge-skill balance» — где обучение идёт лучше всего (Csikszentmihalyi).";
  } else if (result.accuracy >= 0.85) {
    label = "Усиление"; tone = "good";
    insight = "Выше верхней зоны адаптации. Следующий раунд станет плотнее.";
  } else if (quadrant === "fast-sloppy") {
    label = "Спешка"; tone = "warn";
    insight = "RT ниже среднего, но точность тоже. Замедлись на одно дыхание — отдай скорость качеству.";
  } else if (quadrant === "slow-sloppy") {
    label = "Перегруз"; tone = "bad";
    insight = "И медленнее, и менее точно. Сделай Recall или восстановительный режим.";
  } else if (quadrant === "slow-precise") {
    label = "Аккуратно"; tone = "warn";
    insight = "Точность есть, скорость просела. Это нормально на сложных уровнях — следующие раунды ускорят моторику.";
  } else if (result.accuracy >= 0.6) {
    label = "Зона тренировки"; tone = "warn";
    insight = "Рабочий диапазон 60–85% — мозг адаптируется. Продолжай.";
  } else {
    label = "Восстановление"; tone = "bad";
    insight = "Точность под 60% — задача шумнее ресурса. Спусти уровень или перейди в Recovery-протокол.";
  }

  return {
    label,
    tone,
    insight,
    accBaseline: Math.round(accStats.mean * 100),
    rtBaseline: rtStats.mean ? Math.round(rtStats.mean) : null,
    accDelta: Math.round((result.accuracy - accStats.mean) * 100),
    rtDelta: rtStats.mean && result.rt ? Math.round(result.rt - rtStats.mean) : null,
    zAcc: Number(zAcc.toFixed(2)),
    zRt: Number(zRt.toFixed(2)),
    quadrant,
    flow,
    newAccBest,
    newRtBest,
    bestAcc: Math.round(bestAcc * 100),
    bestRt: bestRt ? Math.round(bestRt) : null,
    samples: last10.length,
    cognitiveLoad: Math.round(load),
  };
}

/**
 * Анализ всей сессии (нескольких раундов протокола).
 */
export function analyzeSession(state, sessionResults) {
  if (!sessionResults.length) return null;
  const totalXp = sessionResults.reduce((s, r) => s + (r.xp || 0), 0);
  const avgAcc = sessionResults.reduce((s, r) => s + (r.accuracy || 0), 0) / sessionResults.length;
  const accPerRound = sessionResults.map((r) => r.accuracy || 0);
  const accSlope = slope(accPerRound);
  const best = sessionResults.reduce((a, b) => (b.accuracy > a.accuracy ? b : a));
  const worst = sessionResults.reduce((a, b) => (b.accuracy < a.accuracy ? b : a));
  const fatigueDetected = accSlope < -0.04;
  const consistency = 1 - standardDeviation(accPerRound);

  let summary;
  if (avgAcc >= 0.85 && !fatigueDetected) {
    summary = "Сильная сессия. Точность держалась стабильно высоко. На завтра — можешь поднять интенсивность.";
  } else if (fatigueDetected) {
    summary = "Замечено снижение точности к концу. Это нормально — мозг устаёт. На следующую сессию сократи до 3–4 раундов или начни с Recovery.";
  } else if (avgAcc >= 0.65) {
    summary = "Рабочая сессия в зоне адаптации. Прогресс идёт там, где задача чуть выше навыка.";
  } else {
    summary = "Сложная сессия. Возможно, был перегруз. Сделай ночной сон 7–9 часов и Recall-карточки утром — память консолидируется во сне.";
  }

  return {
    rounds: sessionResults.length,
    totalXp,
    avgAccuracy: Math.round(avgAcc * 100),
    best: { mode: best.mode, label: best.label, accuracy: Math.round(best.accuracy * 100) },
    worst: { mode: worst.mode, label: worst.label, accuracy: Math.round(worst.accuracy * 100) },
    fatigueDetected,
    consistency: Math.max(0, Math.round(consistency * 100)),
    slopePerRound: Number(accSlope.toFixed(3)),
    summary,
  };
}

/**
 * Скорость+точность квадрант — для визуала.
 */
export const QUADRANT_META = {
  "fast-precise":  { label: "Быстро + точно",  icon: "⚡", tone: "good", note: "пик исполнительности" },
  "fast-sloppy":   { label: "Быстро, но шумно", icon: "💨", tone: "warn", note: "снижай темп ради качества" },
  "slow-precise":  { label: "Точно, спокойно",  icon: "🎯", tone: "warn", note: "аккуратность в приоритете" },
  "slow-sloppy":   { label: "Перегруз",          icon: "⚠",  tone: "bad",  note: "снизь уровень или передохни" },
  "neutral-precise":{ label: "Точно",            icon: "🎯", tone: "good", note: "" },
  "neutral-sloppy": { label: "Шум",              icon: "⚠",  tone: "warn", note: "" },
};

function slope(values) {
  const n = values.length;
  if (n < 2) return 0;
  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - meanX) * (values[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den ? num / den : 0;
}

function standardDeviation(values) {
  return meanStd(values).std;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/* ========================================================================
   NARRATIVE ENGINE — 6 templates
   Generates long-form insights from history aggregates.
   Returns array of { id, severity, icon, title, text, drill?, value? }.
   ======================================================================== */

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  let sx = 0, sy = 0, sxy = 0, sx2 = 0, sy2 = 0;
  for (let i = 0; i < n; i += 1) {
    sx += xs[i]; sy += ys[i];
    sxy += xs[i] * ys[i]; sx2 += xs[i] * xs[i]; sy2 += ys[i] * ys[i];
  }
  const num = n * sxy - sx * sy;
  const den = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));
  return den ? num / den : 0;
}

function daysAgoKey(deltaDays) {
  const d = new Date();
  d.setDate(d.getDate() - deltaDays);
  return d.toISOString().slice(0, 10);
}

function groupByDay(history) {
  const out = new Map();
  for (const r of history) {
    if (!r.date) continue;
    if (!out.has(r.date)) out.set(r.date, []);
    out.get(r.date).push(r);
  }
  return out;
}

function dayMeanAccuracy(rounds) {
  if (!rounds.length) return null;
  return rounds.reduce((s, r) => s + (r.accuracy || 0), 0) / rounds.length;
}

const MODE_LABEL_RU = {
  nback: "Dual N-back", grid: "Memory Grid", focus: "Focus Switch", logic: "Logic Forge",
  recall: "Recall Vault", scan: "Signal Scan", rotate: "Rotation Lab",
  reaction: "Reaction Rail", trail: "Trail Making", stroop: "Stroop Plus", anback: "Audio N-back",
  math: "Mental Math", schulte: "Schulte Table", antisaccade: "Anti-Saccade",
  rsvp: "RSVP Reading", stopsig: "Stop Signal",
  flanker: "Flanker", bspan: "Backwards Span", vfluency: "Verbal Fluency",
  tower: "Tower of London", dsst: "Digit-Symbol",
};

function modeName(m) { return MODE_LABEL_RU[m] || m; }

/** 1. Weekly improvement (z-test light) — per drill */
export function insightWeeklyImprovement(state) {
  const history = state.history || [];
  if (history.length < 14) return null;
  const today = new Date();
  const k = (d) => d.toISOString().slice(0, 10);
  const last7 = new Set();
  const prev7 = new Set();
  for (let i = 0; i < 7; i += 1) { const d = new Date(today); d.setDate(d.getDate() - i); last7.add(k(d)); }
  for (let i = 7; i < 14; i += 1) { const d = new Date(today); d.setDate(d.getDate() - i); prev7.add(k(d)); }
  const byMode = {};
  for (const r of history) {
    if (!r.mode || !r.date) continue;
    if (!byMode[r.mode]) byMode[r.mode] = { last: [], prev: [] };
    if (last7.has(r.date)) byMode[r.mode].last.push(r.accuracy || 0);
    else if (prev7.has(r.date)) byMode[r.mode].prev.push(r.accuracy || 0);
  }
  let best = null;
  for (const [mode, g] of Object.entries(byMode)) {
    if (g.last.length < 3 || g.prev.length < 3) continue;
    const m1 = meanStd(g.last), m2 = meanStd(g.prev);
    const pooled = Math.sqrt((m1.std ** 2 + m2.std ** 2) / 2) || 0.01;
    const z = (m1.mean - m2.mean) / pooled;
    if (Math.abs(z) > 1.2 && (!best || Math.abs(z) > Math.abs(best.z))) {
      best = { mode, z, delta: m1.mean - m2.mean };
    }
  }
  if (!best) return null;
  const up = best.delta > 0;
  return {
    id: "weekly",
    severity: up ? "good" : "warn",
    icon: up ? "↗" : "↘",
    title: `${modeName(best.mode)} ${up ? "вырос" : "просел"} на ${Math.round(Math.abs(best.delta) * 100)} п.п.`,
    text: `Сравнение прошедшей и позапрошлой недели: z = ${best.z.toFixed(1)}${Math.abs(best.z) > 2 ? ", сильный сигнал" : ", умеренный сигнал"}.`,
    drill: best.mode,
  };
}

/** 2. Plateau detection — per drill */
export function insightPlateau(state) {
  const history = state.history || [];
  const last14days = daysAgoKey(14);
  const byMode = {};
  for (const r of history) {
    if (!r.mode || !r.date || r.date < last14days) continue;
    if (!byMode[r.mode]) byMode[r.mode] = [];
    byMode[r.mode].push(r.accuracy || 0);
  }
  let plateau = null;
  for (const [mode, arr] of Object.entries(byMode)) {
    if (arr.length < 8) continue;
    const s = Math.abs(slope(arr));
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    if (s < 0.005 && m > 0.55 && m < 0.85) {
      plateau = { mode, slope: s, mean: m, samples: arr.length };
      break;
    }
  }
  if (!plateau) return null;
  return {
    id: "plateau",
    severity: "warn",
    icon: "≈",
    title: `${modeName(plateau.mode)} плато ${Math.round(plateau.mean * 100)}%`,
    text: `${plateau.samples} раундов без значимого тренда. Попробуй сменить вариант (audio-вместо-визуального, или backward) либо подними уровень вручную.`,
    drill: plateau.mode,
  };
}

/** 3. Sleep × Accuracy correlation */
export function insightSleepCorrelation(state) {
  const sleepLog = state.sleepLog || [];
  if (sleepLog.length < 5) return null;
  const dayAcc = new Map();
  for (const r of (state.history || [])) {
    if (!r.date) continue;
    if (!dayAcc.has(r.date)) dayAcc.set(r.date, []);
    dayAcc.get(r.date).push(r.accuracy || 0);
  }
  const xs = [], ys = [];
  for (const entry of sleepLog) {
    if (!entry.date || typeof entry.hours !== "number") continue;
    const rounds = dayAcc.get(entry.date);
    if (!rounds || rounds.length === 0) continue;
    xs.push(entry.hours);
    ys.push(rounds.reduce((a, b) => a + b, 0) / rounds.length);
  }
  if (xs.length < 5) return null;
  const r = pearson(xs, ys);
  if (r === null || Math.abs(r) < 0.3) return null;
  const positive = r > 0;
  return {
    id: "sleep",
    severity: "good",
    icon: "😴",
    title: positive
      ? `Сильная связь сна и точности (r = ${r.toFixed(2)})`
      : `Обратная связь сна и точности (r = ${r.toFixed(2)})`,
    text: positive
      ? `Каждый дополнительный час сна заметно повышает твою точность. Цели: 7-9 ч.`
      : `Чаще бывает дрейф: меньше сна — выше показатель. Возможно, ты тренируешься в утомлённом состоянии и компенсируешь нагрузкой. Проверь честность отметок сна.`,
    value: r,
  };
}

/** 4. Chronotype detection — best vs worst hour */
export function insightChronotype(state) {
  const buckets = new Array(24).fill(null).map(() => []);
  for (const r of (state.history || [])) {
    if (!r.timestamp) continue;
    const h = new Date(r.timestamp).getHours();
    buckets[h].push(r.accuracy || 0);
  }
  const stats = buckets.map((arr, h) => ({
    hour: h,
    n: arr.length,
    mean: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null,
  })).filter((s) => s.n >= 4);
  if (stats.length < 3) return null;
  const best = stats.reduce((a, b) => (b.mean > a.mean ? b : a));
  const worst = stats.reduce((a, b) => (b.mean < a.mean ? b : a));
  if (best.mean - worst.mean < 0.12) return null;
  return {
    id: "chronotype",
    severity: "good",
    icon: "🌞",
    title: `Пик в ${best.hour}:00 (${Math.round(best.mean * 100)}%)`,
    text: `В ${best.hour}:00 ты на ${Math.round((best.mean - worst.mean) * 100)} п.п. точнее, чем в ${worst.hour}:00. Сложные drill — на пиковое окно.`,
    value: best.hour,
  };
}

/** 5. Population context — for reaction-style drills */
const POPULATION_NORMS = {
  reaction: { mean: 290, sd: 60, source: "Deary et al. 2010" },
  stopsig:  { mean: 280, sd: 55, source: "Verbruggen 2019" },
  flanker:  { mean: 540, sd: 90, source: "Eriksen 1974" },
  stroop:   { mean: 750, sd: 120, source: "MacLeod 1991" },
};

export function insightPopulationContext(state) {
  const recent = (state.history || []).slice(-30);
  for (const [mode, norm] of Object.entries(POPULATION_NORMS)) {
    const rounds = recent.filter((r) => r.mode === mode && r.rt);
    if (rounds.length < 3) continue;
    const myMean = rounds.reduce((s, r) => s + r.rt, 0) / rounds.length;
    const z = (norm.mean - myMean) / norm.sd;
    const percentile = Math.round(normalCdf(z) * 100);
    if (percentile < 40 || percentile > 70) {
      return {
        id: "population",
        severity: percentile > 70 ? "good" : "warn",
        icon: percentile > 70 ? "🏆" : "📉",
        title: `${modeName(mode)}: топ ${100 - percentile}% популяции`,
        text: `Твой RT ${Math.round(myMean)} ms vs норма ${norm.mean} ms (${norm.source}).`,
        drill: mode,
      };
    }
  }
  return null;
}

function normalCdf(z) {
  // Abramowitz & Stegun 7.1.26
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.39894228 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

/** 6. Streak velocity — forecast next milestone */
export function insightStreakVelocity(state) {
  const overallScore = (() => {
    const ds = Object.values(state.domains || {});
    if (!ds.length) return 0;
    return ds.reduce((a, b) => a + b, 0) / ds.length;
  })();
  if (overallScore < 30) return null;
  const targets = [50, 60, 70, 80, 90];
  const nextTarget = targets.find((t) => t > overallScore);
  if (!nextTarget) return null;
  // weekly delta — compare last 7 days vs prev 7
  const history = state.history || [];
  if (history.length < 12) return null;
  const today = new Date();
  const k = (d) => d.toISOString().slice(0, 10);
  let lastWeekXp = 0, prevWeekXp = 0;
  for (const r of history) {
    if (!r.date) continue;
    const d = new Date(r.date);
    const diffDays = Math.round((today - d) / 86400000);
    if (diffDays < 7) lastWeekXp += r.xp || 0;
    else if (diffDays < 14) prevWeekXp += r.xp || 0;
  }
  // Rough growth approximation: domain index moves ~0.5 per 100 XP
  const xpPerPoint = 200;
  const weeklyDelta = (lastWeekXp / xpPerPoint);
  if (weeklyDelta < 0.3) return null;
  const days = Math.round(((nextTarget - overallScore) / weeklyDelta) * 7);
  if (days > 90) return null;
  return {
    id: "streak-velocity",
    severity: "good",
    icon: "🎯",
    title: `Цель ${nextTarget} достижима через ~${days} ${dayWord(days)}`,
    text: `При текущем темпе (${Math.round(lastWeekXp)} XP/неделя) индекс ${nextTarget} в твоём горизонте. Не сбавляй.`,
    value: nextTarget,
  };
}

function dayWord(n) {
  const last = n % 10;
  if (n >= 11 && n <= 14) return "дней";
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}

/** Master function: collect all non-null insights, ranked. */
export function generateInsights(state) {
  const out = [];
  const fns = [insightWeeklyImprovement, insightPlateau, insightSleepCorrelation,
               insightChronotype, insightPopulationContext, insightStreakVelocity];
  for (const fn of fns) {
    try {
      const r = fn(state);
      if (r) out.push(r);
    } catch (e) { /* swallow — narrative is best-effort */ }
  }
  return out;
}
