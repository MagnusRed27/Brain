import { bus, EVENTS } from "./lib/events.js";

export const THEMES = {
  obsidian: {
    id: "obsidian",
    label: "Cyber Lab",
    description: "Глубокий графит · Бирюзовая телеметрия",
    palette: {
      bg: "#070b11",
      surface: "#0d131d",
      text: "#edf4fc",
      muted: "#8496ae",
      accent: "#22d3ee",
      accentSoft: "#38bdf8",
      warm: "#60a5fa",
      success: "#2dd4bf",
      warning: "#f59e0b",
      danger: "#fb7185",
    },
    sceneMood: "deepwave",
  },
  aurora: {
    id: "aurora",
    label: "Quantum",
    description: "Тёмный сапфир · Ледяной синий",
    palette: {
      bg: "#090f1c",
      surface: "#10192b",
      text: "#eef4ff",
      muted: "#8899b8",
      accent: "#38bdf8",
      accentSoft: "#818cf8",
      warm: "#38bdf8",
      success: "#34d399",
      warning: "#fbbf24",
      danger: "#f87171",
    },
    sceneMood: "halo",
  },
  citrus: {
    id: "citrus",
    label: "Solar HUD",
    description: "Обсидиан · Золотой нейро-интерфейс",
    palette: {
      bg: "#090b0f",
      surface: "#12151c",
      text: "#f5f3ee",
      muted: "#9499a6",
      accent: "#f59e0b",
      accentSoft: "#38bdf8",
      warm: "#fbbf24",
      success: "#34d399",
      warning: "#fbbf24",
      danger: "#fb7185",
    },
    sceneMood: "filaments",
  },
  tide: {
    id: "tide",
    label: "Arctic HUD",
    description: "Светлая крио-лаборатория · Кобальт",
    palette: {
      bg: "#f0f4f9",
      surface: "#ffffff",
      text: "#0c1726",
      muted: "#5b6e85",
      accent: "#0284c7",
      accentSoft: "#0891b2",
      warm: "#0284c7",
      success: "#0d9488",
      warning: "#d97706",
      danger: "#e11d48",
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
  const id = THEMES[themeId] ? themeId : "obsidian";
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
