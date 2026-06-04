import { bus, EVENTS } from "./lib/events.js";

export const THEMES = {
  aurora: {
    id: "aurora",
    label: "Aurora",
    description: "Иридесцентный рассвет",
    palette: {
      bg: "#f6f7ff",
      surface: "rgba(255,255,255,0.74)",
      text: "#101935",
      muted: "#5a6480",
      accent: "#7c5cff",
      accentSoft: "#4fd1a8",
      warm: "#ff7da6",
      success: "#34c997",
      warning: "#ffba2e",
      danger: "#ff5a7a",
    },
    sceneMood: "halo",
  },
  citrus: {
    id: "citrus",
    label: "Citrus",
    description: "Солнечный заряд",
    palette: {
      bg: "#fffdf6",
      surface: "rgba(255,255,255,0.72)",
      text: "#1b2230",
      muted: "#5b6072",
      accent: "#ffba2e",
      accentSoft: "#5fc36a",
      warm: "#ff6f5e",
      success: "#46b566",
      warning: "#f5a623",
      danger: "#e8504c",
    },
    sceneMood: "filaments",
  },
  tide: {
    id: "tide",
    label: "Tide",
    description: "Кобальт-перл",
    palette: {
      bg: "#f4f7fb",
      surface: "rgba(255,255,255,0.78)",
      text: "#0d2540",
      muted: "#4a5d75",
      accent: "#2a73ff",
      accentSoft: "#2fd0d8",
      warm: "#7aa8ff",
      success: "#0f9d8a",
      warning: "#ffaa1f",
      danger: "#ef4d6b",
    },
    sceneMood: "deepwave",
  },
  obsidian: {
    id: "obsidian",
    label: "Obsidian",
    description: "Тёмная — для вечера",
    palette: {
      bg: "#0d1117",
      surface: "rgba(22,28,40,0.78)",
      text: "#e8eaf2",
      muted: "#8b95ad",
      accent: "#8b7dff",
      accentSoft: "#5ddfb7",
      warm: "#ff8fab",
      success: "#3ddc97",
      warning: "#ffc35a",
      danger: "#ff6a8a",
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
