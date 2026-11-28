import { bus, EVENTS } from "./lib/events.js";

export const THEMES = {
  aurora: {
    id: "aurora",
    label: "Daylight",
    description: "Тёплый шёлк · Изумруд и янтарь",
    palette: {
      bg: "#f6f4ef",
      surface: "#ffffff",
      text: "#18222f",
      muted: "#647081",
      accent: "#0f766e",
      accentSoft: "#d97706",
      warm: "#d97706",
      success: "#15803d",
      warning: "#d97706",
      danger: "#dc2626",
    },
    sceneMood: "halo",
  },
  citrus: {
    id: "citrus",
    label: "Espresso",
    description: "Утренний кофе · Тёплый янтарь",
    palette: {
      bg: "#faf6ee",
      surface: "#fffdfa",
      text: "#271d16",
      muted: "#746559",
      accent: "#b45309",
      accentSoft: "#2f7a57",
      warm: "#d97706",
      success: "#2f7a57",
      warning: "#d97706",
      danger: "#c2410c",
    },
    sceneMood: "filaments",
  },
  tide: {
    id: "tide",
    label: "Ocean",
    description: "Свежий воздух · Сапфир и мята",
    palette: {
      bg: "#f1f6fa",
      surface: "#ffffff",
      text: "#12263a",
      muted: "#5b7083",
      accent: "#2563eb",
      accentSoft: "#0d9488",
      warm: "#0284c7",
      success: "#0d9488",
      warning: "#d97706",
      danger: "#e11d48",
    },
    sceneMood: "deepwave",
  },
  obsidian: {
    id: "obsidian",
    label: "Synapse",
    description: "Бархатная ночь · Биолюминесценция",
    palette: {
      bg: "#11151b",
      surface: "#181e27",
      text: "#f1efe9",
      muted: "#95a0b2",
      accent: "#2dd4bf",
      accentSoft: "#f59e0b",
      warm: "#f59e0b",
      success: "#34d399",
      warning: "#fbbf24",
      danger: "#fb7185",
    },
    sceneMood: "deepwave",
  },
};

const STORAGE_KEY = "neuroforge:theme";

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function applyTheme(themeId) {
  const id = THEMES[themeId] ? themeId : "aurora";
  const html = document.documentElement;
  html.setAttribute("data-theme", id);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* noop */
  }
  bus.emit(EVENTS.THEME_CHANGE, { theme: id, mood: THEMES[id].sceneMood });
  return id;
}

export function listThemes() {
  return Object.values(THEMES);
}

export function getThemeMood(themeId) {
  return THEMES[themeId]?.sceneMood || "halo";
}
