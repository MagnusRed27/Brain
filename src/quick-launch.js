import { DRILL_IDS, MODE_META } from "./config.js";
import { PROTOCOL_IDS, PROTOCOLS } from "./protocols.js";
import { STIM_PRESETS } from "./stim.js";
import { ROUTES } from "./router.js";

const ROUTE_LABELS = {
  center: { label: "Центр", hint: "командный центр", icon: "🏠" },
  drills: { label: "Тренировки", hint: "библиотека drills", icon: "⚡" },
  progress: { label: "Прогресс", hint: "личный кабинет", icon: "📊" },
  records: { label: "Рекорды", hint: "личные рекорды", icon: "🏆" },
  stim: { label: "Stim Lab", hint: "звук + свет + покой", icon: "✦" },
  settings: { label: "Настройки", hint: "лаборатория", icon: "⚙" },
};

const ROUTES_PLUS = [...ROUTES, "records"];

export function buildLaunchItems() {
  const items = [];
  ROUTES_PLUS.forEach((r) => {
    const meta = ROUTE_LABELS[r];
    if (meta) items.push({ kind: "route", id: r, label: meta.label, hint: meta.hint, icon: meta.icon });
  });
  DRILL_IDS.forEach((id) => {
    const meta = MODE_META[id];
    if (meta) items.push({ kind: "drill", id, label: meta.title, hint: meta.kicker, icon: "▸" });
  });
  PROTOCOL_IDS.forEach((id) => {
    const p = PROTOCOLS[id];
    items.push({ kind: "protocol", id, label: `Протокол · ${p.name}`, hint: p.short, icon: "⊕" });
  });
  Object.entries(STIM_PRESETS).forEach(([id, p]) => {
    items.push({ kind: "stim", id, label: `Stim · ${p.label}`, hint: p.kind, icon: "≈" });
  });
  return items;
}

function tokenize(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zа-я0-9 ]/g, " ").split(/\s+/).filter(Boolean);
}

function scoreItem(item, query) {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const text = `${item.label} ${item.hint} ${item.id}`.toLowerCase();
  if (text.startsWith(q)) return 100;
  if (text.includes(q)) return 60;
  const qTokens = tokenize(q);
  const tTokens = tokenize(text);
  let hit = 0;
  for (const qt of qTokens) {
    if (tTokens.some((tt) => tt.startsWith(qt))) hit += 1;
  }
  return hit ? hit * 20 : 0;
}

export function searchItems(items, query, limit = 10) {
  if (!query.trim()) return items.slice(0, limit);
  return items
    .map((it) => ({ it, score: scoreItem(it, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.it);
}
