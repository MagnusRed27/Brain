import { DRILL_IDS, MODE_META } from "./config.js";
import { getModeNeed, getFatigueSignal } from "./progression.js";

/**
 * Protocol — именованный план тренировки.
 * pick(state) → массив drill ids в порядке выполнения.
 */
export const PROTOCOLS = {
  adaptive: {
    id: "adaptive",
    name: "Адаптив",
    short: "smart default",
    description: "Подбор по слабым зонам, точности и текущей усталости. Универсальный режим дня.",
    duration: 18,
    rounds: 5,
    accent: "#7c5cff",
    research: "Cepeda 2008 — chunked variable practice > blocked",
    pick(state) {
      const fatigue = getFatigueSignal(state);
      const order = DRILL_IDS
        .map((mode) => ({ mode, need: getModeNeed(state, mode) + (mode === "recall" && fatigue.active ? 14 : 0) }))
        .sort((a, b) => b.need - a.need)
        .map((x) => x.mode);
      return order.slice(0, 5);
    },
  },

  sprint: {
    id: "sprint",
    name: "Спринт",
    short: "fast & focused",
    description: "8 минут интенсивно: скорость, внимание, торможение. Утром или перед задачей.",
    duration: 8,
    rounds: 3,
    accent: "#5fc36a",
    research: "Roig 2013 — acute exercise & inhibition spike",
    pick() {
      return shuffleStable(["reaction", "stroop", "stopsig", "scan", "trail", "antisaccade"]).slice(0, 3);
    },
  },

  memory: {
    id: "memory",
    name: "Memory Lab",
    short: "consolidation",
    description: "Память и активное вспоминание: 5 раундов на удержание и retrieval. Эффективно перед сном.",
    duration: 18,
    rounds: 5,
    accent: "#4fd1a8",
    research: "Karpicke 2008 — testing > rereading",
    pick(state) {
      const wmHeavy = ["nback", "anback", "grid", "rsvp"];
      const recall = ["recall"];
      const sorted = wmHeavy
        .map((mode) => ({ mode, need: getModeNeed(state, mode) }))
        .sort((a, b) => b.need - a.need)
        .map((x) => x.mode);
      return [recall[0], sorted[0], recall[0], sorted[1] || sorted[0], sorted[2] || "rsvp"];
    },
  },

  executive: {
    id: "executive",
    name: "Executive",
    short: "control + logic",
    description: "Тормозный контроль, логика, переключение задач. Для рабочих дней с принятием решений.",
    duration: 20,
    rounds: 5,
    accent: "#ff7da6",
    research: "Diamond 2013 — executive function taxonomy",
    pick() {
      return ["antisaccade", "math", "logic", "trail", "stroop"];
    },
  },

  flow: {
    id: "flow",
    name: "Flow",
    short: "long varied",
    description: "Длинная сессия 7 раундов: разогрев → пик → охлаждение. Для глубокой тренировки.",
    duration: 26,
    rounds: 7,
    accent: "#ffba2e",
    research: "Csikszentmihalyi — challenge-skill balance",
    pick(state) {
      const easy = ["scan", "reaction", "recall"];
      const peak = ["nback", "anback", "math", "logic"];
      const cooldown = ["rsvp", "recall"];
      const peakSorted = peak
        .map((mode) => ({ mode, need: getModeNeed(state, mode) }))
        .sort((a, b) => b.need - a.need)
        .map((x) => x.mode);
      return [easy[0], easy[1], peakSorted[0], peakSorted[1], peakSorted[2], cooldown[0], cooldown[1]];
    },
  },

  recovery: {
    id: "recovery",
    name: "Recovery",
    short: "low-intensity",
    description: "Мягкая сессия: recall + образы + дыхание. После плохой ночи или эмоционального стресса.",
    duration: 12,
    rounds: 4,
    accent: "#2fd0d8",
    research: "Russo 2017 — 4-7-8 breathing & vagal tone",
    pick() {
      return ["recall", "rotate", "recall", "grid"];
    },
  },
};

export const PROTOCOL_IDS = Object.keys(PROTOCOLS);

export function getProtocol(id) {
  return PROTOCOLS[id] || PROTOCOLS.adaptive;
}

export function suggestProtocol(state) {
  const fatigue = getFatigueSignal(state);
  if (fatigue.active) return "recovery";
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) return "sprint";
  if (hour >= 10 && hour < 14) return "executive";
  if (hour >= 14 && hour < 18) return "adaptive";
  if (hour >= 18 && hour < 22) return "memory";
  return "flow";
}

function shuffleStable(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
