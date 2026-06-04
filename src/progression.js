import { DOMAINS, DRILL_IDS, MODE_META } from "./config.js";
import { avg, clamp, todayKey } from "./utils.js";

export function getAverageLevel(state) {
  return Math.round(avg(Object.values(state.levels)));
}

export function getOverallScore(state) {
  return Math.round(avg(DOMAINS.map((domain) => state.domains[domain.id] || 0)));
}

export function getWeakestDomain(state) {
  return DOMAINS.reduce((weakest, domain) => {
    return (state.domains[domain.id] || 0) < (state.domains[weakest.id] || 0) ? domain : weakest;
  }, DOMAINS[0]);
}

export function getRecentAccuracy(state, mode, limit = 5) {
  const rounds = state.history.filter((item) => item.mode === mode).slice(-limit);
  if (!rounds.length) return 0;
  return Math.round(avg(rounds.map((item) => item.accuracy || 0)) * 100);
}

export function getModeNeed(state, mode) {
  const weights = MODE_META[mode]?.domainWeights || { memory: 1 };
  const domainNeed = Object.keys(weights).map((domain) => 100 - (state.domains[domain] || 40));
  const recentPenalty = 100 - getRecentAccuracy(state, mode);
  return clamp(avg(domainNeed) * 0.72 + recentPenalty * 0.28, 0, 100);
}

export function getRecommendedPlan(state) {
  const fatigue = getFatigueSignal(state);
  const modes = fatigue.active ? ["recall", ...DRILL_IDS.filter((mode) => mode !== "recall")] : DRILL_IDS;
  return modes
    .map((mode) => ({ mode, need: getModeNeed(state, mode) + (mode === "recall" && fatigue.active ? 14 : 0) }))
    .sort((a, b) => b.need - a.need)
    .map((item) => item.mode);
}

export function adaptDifficulty(current, accuracy, history = []) {
  if (!history || history.length === 0) {
    // Baseline staircase: 3-down-1-up Levitt approximation
    if (accuracy >= 0.85) return Math.min(10, current + 1);
    if (accuracy < 0.60) return Math.max(1, current - 1);
    return current;
  }

  // 1. Within-session Staircase Contours (Levitt 1971):
  // Let's analyze consecutive correctness on recent trials:
  // If the user's accuracy on this round is high (>= 0.80), we check history.
  // If the preceding 2 sessions also had high accuracy (>= 0.80) - i.e., 3 consecutive correct rounds - we raise difficulty.
  // If the accuracy on this round is low (< 0.60), we lower difficulty.
  if (accuracy < 0.60) {
    return Math.max(1, current - 1);
  }

  if (accuracy >= 0.80) {
    const lastRounds = history.slice(-2);
    const consecutiveHigh = lastRounds.length === 2 && lastRounds.every(r => (r.accuracy || 0) >= 0.80);
    if (consecutiveHigh) {
      return Math.min(10, current + 1);
    }
  }

  // 2. Cross-session Calibration (2-PL Item Response Theory):
  // We approximate the latent cognitive ability (theta) for this specific drill.
  // P(correct | theta, b, a) = 1 / (1 + exp(-a * (theta - b)))
  // where a (item discrimination) is assumed to be 1.7 (standard normalization)
  // b is the difficulty level of each item (from 1 to 10)
  // theta starts at the current difficulty level.
  let theta = current;
  const K_base = 0.4;
  const n = history.length;
  const K = K_base / Math.sqrt(1 + n / 50);

  // Run a single-step gradient update for theta based on the latest round
  const b = current; // difficulty of this round
  const p_hat = 1 / (1 + Math.exp(-1.7 * (theta - b)));
  
  // We treat the round outcome as success (1.0) if accuracy >= 0.794 (Levitt baseline), else failure (0.0)
  const y = accuracy >= 0.794 ? 1.0 : 0.0;
  theta = theta + K * (y - p_hat);

  // Convert theta back to a bounded integer level
  const nextLevel = Math.max(1, Math.min(10, Math.round(theta)));
  
  return nextLevel;
}

/**
 * Mastery Tiers — Bronze / Silver / Gold / Platinum per drill.
 * Tier criteria: level reached + sustained accuracy on last N rounds.
 *   Bronze:   L≥3, last10 mean ≥ 70%
 *   Silver:   L≥5, last10 mean ≥ 78%
 *   Gold:     L≥7, last10 mean ≥ 85%
 *   Platinum: L≥9, last10 mean ≥ 90%
 * Prestige: after L10, user can "Ascend" → reset to L7 with permanent +15% XP modifier on this drill.
 */
export const MASTERY_TIERS = [
  { id: "none",     label: "—",        order: 0, icon: "○", color: "var(--muted)" },
  { id: "bronze",   label: "Bronze",   order: 1, icon: "●", color: "#cd7f32" },
  { id: "silver",   label: "Silver",   order: 2, icon: "◆", color: "#9aa6b8" },
  { id: "gold",     label: "Gold",     order: 3, icon: "★", color: "#ffba2e" },
  { id: "platinum", label: "Platinum", order: 4, icon: "◈", color: "#7c5cff" },
];

const TIER_BY_ID = Object.fromEntries(MASTERY_TIERS.map((t) => [t.id, t]));
const TIER_ORDER = ["none", "bronze", "silver", "gold", "platinum"];

export function getDrillMastery(state, mode) {
  const level = (state.levels && state.levels[mode]) || 1;
  const rounds = (state.history || []).filter((r) => r.mode === mode).slice(-10);
  const meanAcc = rounds.length >= 5 ? rounds.reduce((s, r) => s + (r.accuracy || 0), 0) / rounds.length : 0;
  const prestige = state.prestige?.[mode] || 0;
  let tier = "none";
  if (level >= 9 && meanAcc >= 0.90 && rounds.length >= 10) tier = "platinum";
  else if (level >= 7 && meanAcc >= 0.85 && rounds.length >= 8) tier = "gold";
  else if (level >= 5 && meanAcc >= 0.78 && rounds.length >= 6) tier = "silver";
  else if (level >= 3 && meanAcc >= 0.70 && rounds.length >= 5) tier = "bronze";
  const nextThresh = { none: { L: 3, acc: 0.70, id: "bronze" }, bronze: { L: 5, acc: 0.78, id: "silver" }, silver: { L: 7, acc: 0.85, id: "gold" }, gold: { L: 9, acc: 0.90, id: "platinum" }, platinum: null };
  const next = nextThresh[tier];
  let progress = 100;
  if (next) {
    const levelPart = Math.min(1, level / next.L);
    const accPart = meanAcc > 0 ? Math.min(1, meanAcc / next.acc) : 0;
    progress = Math.round((levelPart * 0.5 + accPart * 0.5) * 100);
  }
  return { tier, tierMeta: TIER_BY_ID[tier], level, meanAccuracy: meanAcc, rounds: rounds.length, prestige, progress, next };
}

export function ascendPrestige(state, mode) {
  const lvl = state.levels?.[mode] || 1;
  if (lvl < 10) return state;
  const prestige = state.prestige || {};
  const nextRank = (prestige[mode] || 0) + 1;
  return {
    ...state,
    levels: { ...state.levels, [mode]: 7 },
    prestige: { ...prestige, [mode]: nextRank },
  };
}

export function getPrestigeBonus(state, mode) {
  const rank = state.prestige?.[mode] || 0;
  return 1 + rank * 0.15;
}

export function applyRoundResult(state, result, domainWeights) {
  const next = { ...state };
  next.history = [...state.history, result].slice(-180);
  next.profile = {
    ...state.profile,
    todayXp: state.profile.todayXp + result.xp,
    totalXp: state.profile.totalXp + result.xp,
    comboBest: Math.max(state.profile.comboBest, result.combo || 1),
  };
  next.levels = {
    ...state.levels,
    [result.mode]: result.difficultyAfter,
  };
  next.domains = { ...state.domains };
  Object.entries(domainWeights).forEach(([domain, weight]) => {
    const base = next.domains[domain] || 40;
    const target = 35 + result.accuracy * 65;
    const delta = (target - base) * 0.12 * weight + result.xp * 0.018 * weight;
    next.domains[domain] = clamp(base + delta, 5, 100);
  });
  next.dailyProtocol = {
    ...state.dailyProtocol,
    completed: [...new Set([...(state.dailyProtocol.completed || []), result.mode])],
  };
  next.achievements = updateAchievements(next);
  return next;
}

export function getFatigueSignal(state) {
  const recent = state.history.slice(-3);
  const active = recent.length >= 3 && recent.every((item) => item.accuracy < 0.56);
  return {
    active,
    label: active ? "восстановительный режим" : "нагрузка в норме",
    suggestion: active ? "Сделай Recall Vault или снизь темп на один раунд." : "Можно держать текущую интенсивность.",
  };
}

export function getTodayAccuracy(state) {
  const today = todayKey();
  const rounds = state.history.filter((item) => item.date === today);
  if (!rounds.length) return 0;
  return Math.round(avg(rounds.map((item) => item.accuracy || 0)) * 100);
}

export function getWeekDeepSessions(state) {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + 1 - day);
  const dates = [];
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(todayKey(date));
  }
  const deepDays = new Set(state.history.filter((item) => item.xp >= 22).map((item) => item.date));
  return dates.map((date, index) => ({
    date,
    done: deepDays.has(date),
    today: date === todayKey(),
    label: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][index],
  }));
}

function updateAchievements(state) {
  const ids = new Set(state.achievements.map((item) => item.id));
  const achievements = [...state.achievements];
  const unlock = (id, label) => {
    if (!ids.has(id)) achievements.push({ id, label, at: Date.now() });
  };
  if (state.history.length >= 1) unlock("first-round", "Первый раунд");
  if (state.history.length >= 50) unlock("rounds-50", "50 раундов");
  if (state.history.length >= 200) unlock("rounds-200", "200 раундов");
  if (state.profile.streakDays >= 3) unlock("streak-3", "Серия 3 дня");
  if (state.profile.streakDays >= 7) unlock("streak-7", "Серия 7 дней");
  if (state.profile.streakDays >= 21) unlock("streak-21", "Серия 21 день");
  if (getOverallScore(state) >= 60) unlock("index-60", "Нейроиндекс 60");
  if (getOverallScore(state) >= 75) unlock("index-75", "Нейроиндекс 75");
  if (DRILL_IDS.every((mode) => (state.levels[mode] || 1) >= 3)) unlock("balanced-l3", "Все модули L3");
  if (state.metacog?.history?.length >= 20) unlock("metacog-20", "20 прогнозов");
  if (state.program?.completedDays?.length >= 21) unlock("program-done", "21-day завершён");
  return achievements;
}

/** Все достижения с прогрессом — для UI с прогресс-барами. */
export const ALL_ACHIEVEMENTS = [
  { id: "first-round", label: "Первый раунд", measure: (s) => Math.min(1, s.history.length / 1) },
  { id: "rounds-50", label: "50 раундов", measure: (s) => Math.min(1, s.history.length / 50) },
  { id: "rounds-200", label: "200 раундов", measure: (s) => Math.min(1, s.history.length / 200) },
  { id: "streak-3", label: "Серия 3 дня", measure: (s) => Math.min(1, (s.profile.streakDays || 0) / 3) },
  { id: "streak-7", label: "Серия 7 дней", measure: (s) => Math.min(1, (s.profile.streakDays || 0) / 7) },
  { id: "streak-21", label: "Серия 21 день", measure: (s) => Math.min(1, (s.profile.streakDays || 0) / 21) },
  { id: "index-60", label: "Нейроиндекс 60", measure: (s) => Math.min(1, getOverallScore(s) / 60) },
  { id: "index-75", label: "Нейроиндекс 75", measure: (s) => Math.min(1, getOverallScore(s) / 75) },
  { id: "balanced-l3", label: "Все модули L3", measure: (s) => DRILL_IDS.filter((m) => (s.levels[m] || 1) >= 3).length / DRILL_IDS.length },
  { id: "metacog-20", label: "20 прогнозов", measure: (s) => Math.min(1, (s.metacog?.history?.length || 0) / 20) },
  { id: "program-done", label: "21-day завершён", measure: (s) => Math.min(1, (s.program?.completedDays?.length || 0) / 21) },
];
