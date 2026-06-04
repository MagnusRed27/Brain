import { DOMAINS, MODE_META } from "./config.js";
import { todayKey } from "./utils.js";

/**
 * Цели — конкретные target-метрики с дедлайном.
 * Типы:
 *   domain    — поднять домен X до значения V к дате D
 *   drill-acc — точность модуля M ≥ A% за N последних раундов
 *   drill-rt  — среднее RT модуля M ≤ T ms
 *   streak    — серия из N дней
 *   rounds    — N раундов до даты D
 */

export const GOAL_TEMPLATES = [
  { id: "memory-70", kind: "domain", domain: "memory", target: 70, days: 14, label: "Память до 70 за 2 недели" },
  { id: "wm-65", kind: "domain", domain: "wm", target: 65, days: 14, label: "Рабочая память до 65 за 2 недели" },
  { id: "focus-75", kind: "domain", domain: "focus", target: 75, days: 21, label: "Внимание до 75 за 3 недели" },
  { id: "nback-l5", kind: "drill-acc", mode: "nback", target: 80, days: 21, label: "Dual Stream 80% точности (L5+)" },
  { id: "reaction-fast", kind: "drill-rt", mode: "reaction", target: 320, days: 14, label: "Reaction < 320ms среднее" },
  { id: "streak-7", kind: "streak", target: 7, days: 7, label: "7 дней подряд" },
  { id: "rounds-50", kind: "rounds", target: 50, days: 30, label: "50 раундов за месяц" },
];

export function createGoal(template) {
  const now = Date.now();
  return {
    id: `goal-${now}`,
    template: template.id,
    kind: template.kind,
    domain: template.domain,
    mode: template.mode,
    target: template.target,
    label: template.label,
    createdAt: now,
    deadline: now + template.days * 24 * 60 * 60 * 1000,
    completedAt: null,
  };
}

export function addGoal(state, template) {
  const goal = createGoal(template);
  return { ...state, goals: [...(state.goals || []), goal] };
}

export function removeGoal(state, goalId) {
  return { ...state, goals: (state.goals || []).filter((g) => g.id !== goalId) };
}

export function evaluateGoal(state, goal) {
  let current = 0;
  let progress = 0;
  if (goal.kind === "domain") {
    current = state.domains[goal.domain] || 0;
    progress = Math.min(100, (current / goal.target) * 100);
  } else if (goal.kind === "drill-acc") {
    const rounds = state.history.filter((r) => r.mode === goal.mode).slice(-10);
    if (rounds.length) {
      current = Math.round(rounds.reduce((s, r) => s + (r.accuracy || 0), 0) / rounds.length * 100);
      progress = Math.min(100, (current / goal.target) * 100);
    }
  } else if (goal.kind === "drill-rt") {
    const rounds = state.history.filter((r) => r.mode === goal.mode && r.rt).slice(-10);
    if (rounds.length) {
      current = Math.round(rounds.reduce((s, r) => s + r.rt, 0) / rounds.length);
      // for RT, smaller is better, so progress = (target / current) capped
      progress = Math.min(100, (goal.target / current) * 100);
    }
  } else if (goal.kind === "streak") {
    current = state.profile.streakDays || 0;
    progress = Math.min(100, (current / goal.target) * 100);
  } else if (goal.kind === "rounds") {
    const cutoff = goal.createdAt;
    current = state.history.filter((r) => (r.timestamp || 0) >= cutoff).length;
    progress = Math.min(100, (current / goal.target) * 100);
  }

  const now = Date.now();
  const daysLeft = Math.max(0, Math.ceil((goal.deadline - now) / (24 * 60 * 60 * 1000)));
  const expired = now > goal.deadline;
  const reached = (() => {
    if (goal.kind === "drill-rt") return current > 0 && current <= goal.target;
    return current >= goal.target;
  })();

  return { current, progress: Math.round(progress), daysLeft, expired, reached };
}

export function getActiveGoals(state) {
  return (state.goals || []).filter((g) => !g.completedAt);
}

export function maybeMarkComplete(state, goal) {
  const result = evaluateGoal(state, goal);
  if (result.reached && !goal.completedAt) {
    return {
      ...state,
      goals: state.goals.map((g) => g.id === goal.id ? { ...g, completedAt: Date.now() } : g),
    };
  }
  return state;
}

export function describeGoal(goal) {
  if (goal.kind === "domain") {
    const d = DOMAINS.find((x) => x.id === goal.domain);
    return { icon: "🎯", short: d?.label || goal.domain, unit: `≥ ${goal.target}` };
  }
  if (goal.kind === "drill-acc") {
    const m = MODE_META[goal.mode];
    return { icon: "📊", short: m?.title || goal.mode, unit: `≥ ${goal.target}%` };
  }
  if (goal.kind === "drill-rt") {
    const m = MODE_META[goal.mode];
    return { icon: "⚡", short: m?.title || goal.mode, unit: `≤ ${goal.target}ms` };
  }
  if (goal.kind === "streak") return { icon: "🔥", short: "Серия", unit: `${goal.target} дней` };
  if (goal.kind === "rounds") return { icon: "🏋", short: "Раунды", unit: `${goal.target} шт.` };
  return { icon: "•", short: "цель", unit: "" };
}
