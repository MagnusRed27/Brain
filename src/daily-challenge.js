import { DRILL_IDS, MODE_META } from "./config.js";
import { todayKey } from "./utils.js";

/**
 * Deterministic «challenge of the day» — same drill for everyone on the same date,
 * cycled across the 19 drills. Completing it grants +50% XP bonus and a special chip.
 */

function dayIndex(date = new Date()) {
  const start = Date.UTC(2024, 0, 1);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((today - start) / 86400000);
}

const CHALLENGE_THEMES = [
  { label: "День внимания", drills: ["focus", "stroop", "flanker", "scan", "antisaccade"] },
  { label: "День памяти", drills: ["recall", "nback", "anback", "grid", "bspan"] },
  { label: "День скорости", drills: ["reaction", "scan", "stopsig", "math"] },
  { label: "День логики", drills: ["logic", "math", "rsvp", "rotate"] },
  { label: "День речи и мысли", drills: ["vfluency", "recall", "rsvp"] },
  { label: "День ингибиции", drills: ["stopsig", "antisaccade", "stroop", "flanker"] },
  { label: "День образов", drills: ["rotate", "grid", "bspan", "schulte"] },
];

export function getTodayChallenge() {
  const dKey = todayKey();
  const di = dayIndex();
  const themeIdx = di % CHALLENGE_THEMES.length;
  const theme = CHALLENGE_THEMES[themeIdx];
  const drillIdx = Math.floor(di / CHALLENGE_THEMES.length) % theme.drills.length;
  const mode = theme.drills[drillIdx];
  if (!MODE_META[mode]) return { mode: "recall", label: theme.label, date: dKey, theme: theme.label };
  return {
    mode,
    label: MODE_META[mode].title,
    theme: theme.label,
    date: dKey,
    bonus: 1.5, // +50% XP
  };
}

export function isChallengeCompletedToday(state) {
  const ch = getTodayChallenge();
  return (state.dailyChallenge?.completedOn === ch.date && state.dailyChallenge?.mode === ch.mode);
}

export function markChallengeCompleted(state) {
  const ch = getTodayChallenge();
  return {
    ...state,
    dailyChallenge: {
      mode: ch.mode,
      completedOn: ch.date,
      streak: (state.dailyChallenge?.completedOn === offsetDateKey(-1)
        ? (state.dailyChallenge?.streak || 0) + 1
        : 1),
    },
  };
}

function offsetDateKey(deltaDays) {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  return todayKey(d);
}
