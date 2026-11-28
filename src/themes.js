import { bus, EVENTS } from "./lib/events.js";

export const THEMES = {
  aurora: {
    id: "aurora",
    label: "Paper",
    description: "Тёплая бумага · Vermilion",
    palette: {
      bg: "#f4f2ed",
      surface: "#ffffff",
      text: "#111110",
      muted: "#6c6962",
      accent: "#e8451e",
      accentSoft: "#167a5b",
      warm: "#111110",
      success: "#167a5b",
      warning: "#c96a0b",
      danger: "#d92d20",
    },
    sceneMood: "halo",
  },
  citrus: {
    id: "citrus",
    label: "Atelier",
    description: "Тёплый лён · Охра",
    palette: {
      bg: "#f6f1e4",
      surface: "#fffdf8",
      text: "#1c1712",
      muted: "#766a5c",
      accent: "#c96a0b",
      accentSoft: "#247855",
      warm: "#1c1712",
      success: "#247855",
      warning: "#c96a0b",
      danger: "#c93b2b",
    },
    sceneMood: "filaments",
  },
  tide: {
    id: "tide",
    label: "Slate",
    description: "Архитектурный камень · Кобальт",
    palette: {
      bg: "#eef1f5",
      surface: "#ffffff",
      text: "#0f172a",
      muted: "#64748b",
      accent: "#1b4dff",
      accentSoft: "#0f8a75",
      warm: "#0f172a",
      success: "#0f8a75",
      warning: "#d97706",
      danger: "#dc2626",
    },
    sceneMood: "deepwave",
  },
  obsidian: {
    id: "obsidian",
    label: "Carbon",
    description: "Матовый карбон · Тёмная студия",
    palette: {
      bg: "#0b0b0c",
      surface: "#131315",
      text: "#f3f1ec",
      muted: "#8c8a83",
      accent: "#ff5429",
      accentSoft: "#24a87e",
      warm: "#f3f1ec",
      success: "#24a87e",
      warning: "#e59324",
      danger: "#ff4d4f",
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
