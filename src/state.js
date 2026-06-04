import {
  BACKUP_KEY,
  DEFAULT_CARDS,
  DEFAULT_DOMAINS,
  DEFAULT_LEVELS,
  DEFAULT_SETTINGS,
  STORE_V1,
  STORE_V2,
} from "./config.js";
import { addDays, todayKey } from "./utils.js";

const STORE_V3 = "neuroforge:v3";
const BACKUP_V2 = "neuroforge:v2:backup-before-v3";

export function createDefaultState() {
  const now = Date.now();
  return {
    version: 3,
    profile: {
      createdAt: now,
      lastActiveDate: todayKey(),
      todayXp: 0,
      streakDays: 1,
      comboBest: 1,
      totalXp: 0,
    },
    domains: { ...DEFAULT_DOMAINS },
    levels: { ...DEFAULT_LEVELS },
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
    settings: { ...DEFAULT_SETTINGS },
    achievements: [],
    dailyProtocol: {
      date: todayKey(),
      completed: [],
      targetMinutes: DEFAULT_SETTINGS.sessionLength,
    },
    protocols: { lastUsed: "adaptive", runs: 0 },
    metacog: { pending: null, history: [] },
    reflections: [],
    program: null,
    drillBests: {},
    goals: [],
    favorites: { drills: [] },
    sleep: { hoursToday: null, lastUpdate: null },
    streakInsurance: { used: false, lastApplied: null },
    bigFive: null,
  };
}

export function loadState() {
  const v3 = readJson(STORE_V3);
  if (v3) return normalizeState(v3);

  const v2Raw = localStorage.getItem(STORE_V2);
  if (v2Raw) {
    try {
      const v2parsed = JSON.parse(v2Raw);
      if (!localStorage.getItem(BACKUP_V2)) localStorage.setItem(BACKUP_V2, v2Raw);
      const upgraded = normalizeState(v2parsed);
      saveState(upgraded);
      return upgraded;
    } catch {
      /* fall through */
    }
  }

  const v1Raw = localStorage.getItem(STORE_V1);
  if (v1Raw) {
    try {
      const migrated = migrateV1ToV2(JSON.parse(v1Raw));
      if (!localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, v1Raw);
      saveState(migrated);
      return migrated;
    } catch {
      if (!localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, v1Raw);
    }
  }

  const fallback = createDefaultState();
  saveState(fallback);
  return fallback;
}

export function saveState(state) {
  try {
    localStorage.setItem(STORE_V3, JSON.stringify(normalizeState(state)));
  } catch (error) {
    console.warn("[state] persist failed", error);
    throw error;
  }
}

export function refreshDailyState(state) {
  const today = todayKey();
  if (state.profile.lastActiveDate === today) return state;

  const yesterday = todayKey(addDays(new Date(), -1));
  const dayBeforeYesterday = todayKey(addDays(new Date(), -2));

  // Streak insurance: если активность была позавчера, но не вчера —
  // streak не ломается, если в течение СЕГОДНЯ страховка ещё не использована.
  let streakDays;
  let insurance = state.streakInsurance || { used: false, lastApplied: null };
  if (state.profile.lastActiveDate === yesterday) {
    streakDays = state.profile.streakDays + 1;
  } else if (state.profile.lastActiveDate === dayBeforeYesterday && !insurance.used) {
    // используем страховку — серия растёт, флаг ставится
    streakDays = state.profile.streakDays + 1;
    insurance = { used: true, lastApplied: today };
  } else {
    streakDays = 1;
    insurance = { used: false, lastApplied: null };
  }

  return {
    ...state,
    profile: {
      ...state.profile,
      streakDays,
      lastActiveDate: today,
      todayXp: 0,
    },
    dailyProtocol: {
      date: today,
      completed: [],
      targetMinutes: state.settings.sessionLength,
    },
    streakInsurance: insurance,
  };
}

export function exportState(state) {
  return JSON.stringify(normalizeState(state), null, 2);
}

export function importState(raw) {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") throw new Error("Некорректный файл прогресса");
  return normalizeState(parsed);
}

export function normalizeState(input) {
  const base = createDefaultState();
  const state = input && typeof input === "object" ? input : base;
  const profile = { ...base.profile, ...(state.profile || {}) };
  const settings = { ...base.settings, ...(state.settings || {}) };
  const dailyProtocol = { ...base.dailyProtocol, ...(state.dailyProtocol || {}) };

  return {
    version: 3,
    profile: {
      ...profile,
      todayXp: numberOr(profile.todayXp, 0),
      streakDays: numberOr(profile.streakDays, 1),
      comboBest: numberOr(profile.comboBest, 1),
      totalXp: numberOr(profile.totalXp, profile.todayXp || 0),
      onboarded: Boolean(profile.onboarded || settings.onboarded),
    },
    domains: { ...base.domains, ...(state.domains || {}) },
    levels: { ...base.levels, ...(state.levels || {}) },
    history: Array.isArray(state.history) ? state.history.slice(-180) : [],
    cards: Array.isArray(state.cards) && state.cards.length ? state.cards : base.cards,
    settings,
    achievements: Array.isArray(state.achievements) ? state.achievements : [],
    dailyProtocol: {
      ...dailyProtocol,
      completed: Array.isArray(dailyProtocol.completed) ? dailyProtocol.completed : [],
      targetMinutes: numberOr(dailyProtocol.targetMinutes, settings.sessionLength),
    },
    protocols: {
      lastUsed: state.protocols?.lastUsed || "adaptive",
      runs: numberOr(state.protocols?.runs, 0),
    },
    metacog: {
      pending: state.metacog?.pending || null,
      history: Array.isArray(state.metacog?.history) ? state.metacog.history.slice(-100) : [],
    },
    reflections: Array.isArray(state.reflections) ? state.reflections.slice(-50) : [],
    program: state.program && typeof state.program === "object" ? state.program : null,
    drillBests: state.drillBests && typeof state.drillBests === "object" ? state.drillBests : {},
    goals: Array.isArray(state.goals) ? state.goals.slice(-20) : [],
    favorites: {
      drills: Array.isArray(state.favorites?.drills)
        ? [...new Set(state.favorites.drills)].slice(0, 24)
        : [],
    },
    sleep: state.sleep && typeof state.sleep === "object" ? state.sleep : { hoursToday: null, lastUpdate: null },
    streakInsurance: state.streakInsurance && typeof state.streakInsurance === "object" ? state.streakInsurance : { used: false, lastApplied: null },
    bigFive: state.bigFive && typeof state.bigFive === "object" ? state.bigFive : null,
  };
}

function migrateV1ToV2(v1) {
  const base = createDefaultState();
  return normalizeState({
    version: 2,
    profile: {
      createdAt: v1.createdAt || base.profile.createdAt,
      lastActiveDate: v1.lastActiveDate || base.profile.lastActiveDate,
      todayXp: v1.todayXp || 0,
      streakDays: v1.streakDays || 1,
      comboBest: v1.comboBest || 1,
      totalXp: Array.isArray(v1.history) ? v1.history.reduce((sum, item) => sum + (item.xp || 0), v1.todayXp || 0) : v1.todayXp || 0,
    },
    domains: { ...base.domains, ...(v1.domains || {}) },
    levels: { ...base.levels, ...(v1.levels || {}) },
    history: Array.isArray(v1.history)
      ? v1.history.map((item) => ({
          mode: item.mode,
          label: item.label,
          accuracy: item.accuracy,
          xp: item.xp,
          rt: item.rt || 0,
          mistakes: item.mistakes || 0,
          difficultyBefore: item.difficultyBefore || v1.levels?.[item.mode] || 1,
          difficultyAfter: item.difficultyAfter || v1.levels?.[item.mode] || 1,
          date: item.date,
          timestamp: item.at || Date.now(),
        }))
      : [],
    cards: Array.isArray(v1.cards) && v1.cards.length ? v1.cards : base.cards,
    settings: base.settings,
    achievements: [],
    dailyProtocol: base.dailyProtocol,
  });
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function numberOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}
