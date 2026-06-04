import { DOMAINS, DRILL_IDS } from "./config.js";
import { getModeNeed, getOverallScore, getRecentAccuracy, getWeakestDomain, getWeekDeepSessions } from "./progression.js";

export function getDashboardModel(state) {
  const plan = DRILL_IDS.map((mode) => ({ mode, need: Math.round(getModeNeed(state, mode)) }))
    .sort((a, b) => b.need - a.need);
  return {
    overall: getOverallScore(state),
    weakest: getWeakestDomain(state),
    plan,
    week: getWeekDeepSessions(state),
    domains: DOMAINS.map((domain) => ({ ...domain, value: Math.round(state.domains[domain.id] || 0) })),
    recent: state.history.slice(-5).reverse(),
  };
}

export function getModeBrief(state, mode) {
  return {
    level: state.levels[mode] || 1,
    need: Math.round(getModeNeed(state, mode)),
    recentAccuracy: getRecentAccuracy(state, mode),
    rounds: state.history.filter((item) => item.mode === mode).length,
  };
}
