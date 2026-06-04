import { DOMAINS } from "./config.js";
import { todayKey } from "./utils.js";

/**
 * 21-дневный план «Cognitive Strengthening».
 * Принцип: 3 недели по 7 дней.
 *   Week 1 — Foundation: устанавливаем baseline, формируем привычку.
 *   Week 2 — Build: повышаем нагрузку и разнообразие.
 *   Week 3 — Consolidate: вариативная практика, retrieval, recovery.
 *
 * Каждый день — конкретный протокол + краткий научный фокус.
 */
export const PROGRAM_DAYS = [
  // --- Week 1: Foundation ---
  { day: 1,  week: 1, protocol: "adaptive", focus: "Baseline", note: "Сегодня замеряем, где ты сейчас. Не гонись за результатом — это точка отсчёта." },
  { day: 2,  week: 1, protocol: "sprint",   focus: "Скорость", note: "Острая нагрузка повышает катехоламины и BDNF на 30-60 мин. Идеально утром." },
  { day: 3,  week: 1, protocol: "memory",   focus: "Память", note: "Karpicke 2008: retrieval-практика даёт +1 SD к удержанию через неделю." },
  { day: 4,  week: 1, protocol: "adaptive", focus: "Адаптация", note: "Система подберёт слабые зоны. Доверяй алгоритму." },
  { day: 5,  week: 1, protocol: "executive",focus: "Контроль", note: "Тормозный контроль — фундамент дисциплины и решений." },
  { day: 6,  week: 1, protocol: "recovery", focus: "Восстановление", note: "Дыхание + recall. Активирует парасимпатику, консолидирует неделю." },
  { day: 7,  week: 1, protocol: "flow",     focus: "Длинная сессия", note: "Полный 26-минутный цикл. Csikszentmihalyi — challenge-skill balance." },

  // --- Week 2: Build ---
  { day: 8,  week: 2, protocol: "memory",   focus: "WM-нагрузка", note: "N-back растёт. Jaeggi 2008: WM-тренировка влияет на удержание формул." },
  { day: 9,  week: 2, protocol: "sprint",   focus: "Реакция + торможение", note: "Парные паттерны: реакция и stop-signal. Тренируешь go/no-go." },
  { day: 10, week: 2, protocol: "executive",focus: "Переключение", note: "Trail B и antisaccade. Cognitive flexibility — предиктор успеха в учёбе." },
  { day: 11, week: 2, protocol: "adaptive", focus: "Слабая зона", note: "Сегодня — индивидуальный фокус по результатам недели." },
  { day: 12, week: 2, protocol: "memory",   focus: "Глубокая память", note: "Активное вспоминание + RSVP. Запоминаешь в темпе." },
  { day: 13, week: 2, protocol: "flow",     focus: "Поток", note: "Длинная разнообразная. Контроль вариативности — interleaving > blocking." },
  { day: 14, week: 2, protocol: "recovery", focus: "Чек-пойнт", note: "Половина пути. Подумай: что стало легче?" },

  // --- Week 3: Consolidate ---
  { day: 15, week: 3, protocol: "executive",focus: "Исполнение", note: "Diamond 2013: EF (working memory + inhibition + flexibility) > IQ как предиктор успеха." },
  { day: 16, week: 3, protocol: "adaptive", focus: "Personalized", note: "Алгоритм видит, где ты вырос, и подкидывает следующий вызов." },
  { day: 17, week: 3, protocol: "memory",   focus: "Spaced retrieval", note: "Карточки сегодня будут наиболее ценные — на пороге забывания." },
  { day: 18, week: 3, protocol: "sprint",   focus: "Пиковая скорость", note: "Хорошо отдохни перед — холодный душ или активная разминка 5 мин." },
  { day: 19, week: 3, protocol: "flow",     focus: "Длинный flow", note: "Цель — войти в состояние потока на 5+ раундов. Это редко и ценно." },
  { day: 20, week: 3, protocol: "executive",focus: "Финальный контроль", note: "Последний день с EF-нагрузкой. Завтра — измерение." },
  { day: 21, week: 3, protocol: "adaptive", focus: "Финальный замер", note: "Тот же протокол, что в день 1. Сравним до и после." },
];

const STORE_KEY = "program";

export function startProgram(state) {
  const baselines = {};
  DOMAINS.forEach((d) => { baselines[d.id] = Math.round(state.domains[d.id] || 0); });
  return {
    ...state,
    [STORE_KEY]: {
      startedAt: Date.now(),
      startDate: todayKey(),
      baselines,
      completedDays: [],
      dailyLogs: [],
      currentDay: 1,
    },
  };
}

export function getProgram(state) {
  return state.program || null;
}

/** Какой день программы пользователь должен делать сегодня (1-21+). */
export function getCurrentProgramDay(state) {
  const p = state.program;
  if (!p) return null;
  const start = new Date(p.startedAt);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const elapsed = Math.floor((now.setHours(0,0,0,0) - start.setHours(0,0,0,0)) / dayMs);
  return Math.min(22, Math.max(1, elapsed + 1));
}

/** Получить запись плана для конкретного дня. */
export function getProgramDay(day) {
  return PROGRAM_DAYS.find((d) => d.day === day) || null;
}

/** Завершить сегодняшний день программы. */
export function completeToday(state) {
  if (!state.program) return state;
  const day = getCurrentProgramDay(state);
  if (state.program.completedDays.includes(day)) return state;
  if (day > 21) return state;

  // snapshot domain values for today
  const snapshot = {};
  DOMAINS.forEach((d) => { snapshot[d.id] = Math.round(state.domains[d.id] || 0); });

  return {
    ...state,
    program: {
      ...state.program,
      completedDays: [...state.program.completedDays, day],
      dailyLogs: [
        ...state.program.dailyLogs,
        { day, date: todayKey(), snapshot, completedAt: Date.now() },
      ],
      currentDay: Math.min(22, day + 1),
    },
  };
}

/** Считается ли сегодня завершённым. */
export function isTodayDone(state) {
  if (!state.program) return false;
  const day = getCurrentProgramDay(state);
  return state.program.completedDays.includes(day);
}

/** Считаем streak — последовательность подряд сделанных дней. */
export function getProgramStreak(state) {
  if (!state.program) return 0;
  const sorted = [...state.program.completedDays].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const currentDay = getCurrentProgramDay(state);
  let streak = 0;
  for (let d = currentDay; d >= 1; d -= 1) {
    if (sorted.includes(d)) streak += 1;
    else if (d === currentDay) continue;
    else break;
  }
  return streak;
}

/** Сводка прогресса по программе. */
export function getProgramSummary(state) {
  if (!state.program) return null;
  const completed = state.program.completedDays.length;
  const day = getCurrentProgramDay(state);
  const progress = Math.min(100, (completed / 21) * 100);

  const before = state.program.baselines || {};
  const now = {};
  DOMAINS.forEach((d) => { now[d.id] = Math.round(state.domains[d.id] || 0); });

  const deltas = DOMAINS.map((d) => ({
    id: d.id,
    label: d.label,
    color: d.color,
    before: before[d.id] || 0,
    now: now[d.id] || 0,
    delta: (now[d.id] || 0) - (before[d.id] || 0),
  }));

  const totalDelta = deltas.reduce((s, d) => s + d.delta, 0);
  const meanDelta = Math.round(totalDelta / DOMAINS.length);

  return {
    completed,
    currentDay: day,
    progress: Math.round(progress),
    isDone: completed >= 21,
    streak: getProgramStreak(state),
    deltas,
    meanDelta,
    daysRemaining: Math.max(0, 21 - completed),
  };
}

export function resetProgram(state) {
  return { ...state, program: null };
}
