import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "../styles.css";
import "./studio-theme.css";
import { DRILL_IDS, MODE_META } from "./config.js";
import { startDrill } from "./drills.js";
import { applyRoundResult, getRecommendedPlan } from "./progression.js";
import { exportState, importState, loadState, refreshDailyState, saveState } from "./state.js";
import { createSensory } from "./sensory.js";
import { createNeuroScene } from "./neuroScene.js";
import { applyTheme, getStoredTheme, listThemes, getThemeMood } from "./themes.js";
import { bus, EVENTS } from "./lib/events.js";
import { createStore } from "./lib/store.js";
import { throttle } from "./utils.js";
import { createPulseDetector, isBiometricSupported } from "./biometric.js";
import { createStimController, STIM_PRESETS as STIM_PRESETS_MAP } from "./stim.js";
import { createFactRotator } from "./facts.js";
import { createRouter } from "./router.js";
import { getProtocol } from "./protocols.js";
import { getTodayChallenge, isChallengeCompletedToday, markChallengeCompleted } from "./daily-challenge.js";
import { recordPrediction, recordOutcome } from "./metacog.js";
import { startProgram as startProgramFn, completeToday as completeProgramDayFn, getProgram, getCurrentProgramDay, isTodayDone } from "./program.js";
import { buildLaunchItems, searchItems } from "./quick-launch.js";
import { addGoal as addGoalFn, removeGoal as removeGoalFn, GOAL_TEMPLATES } from "./goals.js";
import { applyRating } from "./fsrs.js";
import {
  applyModeTheme,
  createRefs,
  renderPageCenter,
  renderPageKnowledge,
  renderPageDrills,
  renderPageDrillDetail,
  renderPageProgress,
  renderPageStim,
  renderPageSettings,
  renderPageRecords,
  renderModeIntro,
  renderResult,
  renderDrillShell,
  renderPhoticConsent,
  renderFactCard,
  renderOnboarding,
  setActiveNavRoute,
  setPageHeader,
  toast,
  updateTopMetrics,
} from "./ui.js";

const store = createStore(refreshDailyState(loadState()));
const getState = () => store.get();
const bootStartedAt = performance.now();

let currentRoute = "center";
let activeDrill = null;       // mode id when in drill execution
let drillPhase = null;        // "intro" | "running" | "result" | null
let circuitQueue = [];
let circuitActive = false;
let combo = 1;
let abortController = new AbortController();
let countdownTimer = null;
let countdownEndsAt = 0;
let roundStats = emptyRoundStats();
let pulseDetector = null;

const refs = createRefs();
const sensoryCore = createSensory(() => getState().settings);
const scene = createNeuroScene(document.querySelector("#neuroCanvas"), {
  getAnalyser: () => sensoryCore.engine.analyser,
});
const stimController = createStimController(sensoryCore.engine);
const factRotator = createFactRotator(15000);

const sensory = {
  cue(type, options) {
    sensoryCore.cue(type, options);
    scene.burst(type);
    flashFeedback(type);
  },
  unlock: sensoryCore.unlock,
  engine: sensoryCore.engine,
};

const persist = throttle((state) => {
  try {
    saveState(state);
    bus.emit(EVENTS.STATE_SAVED);
  } catch (error) {
    bus.emit(EVENTS.STATE_SAVE_FAILED, error);
  }
}, 800);

store.subscribe((next) => persist(next));
store.subscribe((next) => updateTopMetrics(refs, next, combo));

bus.on(EVENTS.AUDIO_UNLOCK, () => {
  applyAudioPreferences(getState().settings);
  if (getState().settings.musicEnabled) {
    const music = sensoryCore.engine.music?.();
    music?.setTheme(getState().settings.theme || "aurora");
    music?.setMode(activeDrill || "circuit");
    music?.start();
  }
});

bus.on(EVENTS.THEME_CHANGE, ({ theme, mood }) => {
  scene.setMood(mood);
  sensoryCore.engine.music?.()?.setTheme(theme || getState().settings.theme || "aurora");
  syncQuickThemeDots(theme || getState().settings.theme || "aurora");
});

function syncQuickThemeDots(activeId) {
  document.querySelectorAll("#quickThemeSwitcher [data-qt]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.qt === activeId);
    btn.setAttribute("aria-pressed", btn.dataset.qt === activeId ? "true" : "false");
  });
}

const router = createRouter({
  onChange(route, param) {
    onRoute(route, param);
  },
});

init();

function init() {
  updateBootStatus("Загружаю тему и состояние...");
  const theme = getState().settings.theme || getStoredTheme() || "obsidian";
  applyTheme(theme);
  scene.setMood(getThemeMood(theme));
  updateBootStatus("Собираю интерфейс и маршруты...");
  bindGlobalEvents();
  updateTopMetrics(refs, getState(), combo);
  router.init();
  if (!getState().settings.onboarded) {
    renderOnboarding({
      finish: (payload) => {
        updateSettings({ onboarded: true });
        if (payload) {
          store.set((s) => ({
            ...s,
            profile: {
              ...s.profile,
              onboarding: {
                reactionBaseline: payload.reactionBaseline,
                weakDomain: payload.weakDomain,
                goal: payload.goal,
                completedAt: Date.now(),
              },
            },
          }));
        }
      },
    });
  }
  factRotator.onChange((fact) => {
    if (refs.factHost) renderFactCard(refs.factHost, fact, () => factRotator.pick());
  });
  factRotator.start();
  updateBootStatus("Готово. Включаю станцию.");
  hideBootScreen();
}

function updateBootStatus(message) {
  const boot = document.querySelector("#bootScreen");
  const line = boot?.querySelector(".boot-copy p:last-child");
  if (line) line.textContent = message;
}

function hideBootScreen() {
  const boot = document.querySelector("#bootScreen");
  if (!boot) return;
  let scheduled = false;
  const closeBoot = () => {
    if (scheduled) return;
    scheduled = true;
    const elapsed = performance.now() - bootStartedAt;
    const wait = Math.max(120, 380 - elapsed);
    window.setTimeout(() => {
      boot.classList.add("is-hidden");
      document.body.classList.add("app-ready");
      window.setTimeout(() => boot.remove(), 520);
    }, wait);
  };
  window.requestAnimationFrame(closeBoot);
  window.setTimeout(closeBoot, 80);
}

function bindGlobalEvents() {
  document.querySelectorAll(".sidenav-item, .bn-item, .brand-home-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.dataset.route;
      if (route) router.navigate(route);
    });
  });
  document.querySelector("#qlTrigger")?.addEventListener("click", () => toggleQuickLaunch());
  document.querySelectorAll("#quickThemeSwitcher [data-qt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextTheme = btn.dataset.qt;
      onSettingChange("theme", nextTheme);
      syncQuickThemeDots(nextTheme);
    });
  });
  syncQuickThemeDots(getState().settings.theme || getStoredTheme() || "aurora");
  document.querySelector("#npStop")?.addEventListener("click", () => {
    stimController.stop();
    hideNowPlaying();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (closeQuickLaunch()) return;
      if (fsActive) { exitFullscreenFocus(); return; }
      sensoryCore.engine.stopBreath();
      hideBreathOverlay();
      stimController.stop();
      hideNowPlaying();
      if (activeDrill && drillPhase === "running") abortDrill();
    }
    if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K")) {
      event.preventDefault();
      toggleQuickLaunch();
    }
    // Fullscreen focus mode toggle (F key, only when drill running or intro)
    if ((event.key === "f" || event.key === "F") && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const tag = (event.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (drillPhase === "running" || drillPhase === "intro") {
        event.preventDefault();
        toggleFullscreenFocus();
      }
    }
  });
  initQuickLaunch();
}

/* ---------------- Fullscreen Focus Mode ---------------- */
let fsActive = false;
let cursorIdleTimer = 0;
let cursorMoveHandler = null;

function isStandaloneDisplay() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

function enterFullscreenFocus() {
  if (fsActive) return;
  fsActive = true;
  document.body.classList.add("fs-focus");
  // Browser-level fullscreen (optional)
  const root = document.documentElement;
  try {
    if (root.requestFullscreen) root.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
  } catch { /* noop */ }
  // Cursor idle hide
  const resetCursor = () => {
    document.body.classList.remove("fs-cursor-idle");
    window.clearTimeout(cursorIdleTimer);
    cursorIdleTimer = window.setTimeout(() => document.body.classList.add("fs-cursor-idle"), 2400);
  };
  cursorMoveHandler = resetCursor;
  window.addEventListener("pointermove", resetCursor, { passive: true });
  resetCursor();
  const btn = document.querySelector("#focusFsBtn");
  if (btn) { btn.classList.add("is-active"); btn.title = "Выйти из фокус-режима (Esc)"; }
}

function exitFullscreenFocus() {
  if (!fsActive) return;
  fsActive = false;
  document.body.classList.remove("fs-focus", "fs-cursor-idle");
  window.clearTimeout(cursorIdleTimer);
  if (cursorMoveHandler) {
    window.removeEventListener("pointermove", cursorMoveHandler);
    cursorMoveHandler = null;
  }
  if (isStandaloneDisplay()) {
    try { document.exitFullscreen?.(); document.webkitExitFullscreen?.(); } catch { /* noop */ }
  }
  const btn = document.querySelector("#focusFsBtn");
  if (btn) { btn.classList.remove("is-active"); btn.title = "Фокус-режим (F)"; }
}

function toggleFullscreenFocus() {
  if (fsActive) exitFullscreenFocus();
  else enterFullscreenFocus();
}

document.addEventListener("fullscreenchange", () => {
  if (!isStandaloneDisplay() && fsActive) exitFullscreenFocus();
});

/* ---------------- Level-Up Overlay ---------------- */
function showLevelUpOverlay(mode, from, to) {
  const meta = MODE_META[mode];
  if (!meta) return;
  const overlay = document.createElement("div");
  overlay.className = "levelup-overlay";
  overlay.innerHTML = `
    <div class="levelup-card">
      <div class="levelup-kicker">${escapeHtmlSafe(meta.kicker || mode)}</div>
      <div class="levelup-title">${escapeHtmlSafe(meta.title || mode)}</div>
      <div class="levelup-jump">
        <span class="levelup-from">L${from}</span>
        <span class="levelup-arrow">→</span>
        <span class="levelup-to">L${to}</span>
      </div>
      <div class="levelup-hint">Сложность поднимется на следующем раунде</div>
      <div class="levelup-burst" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  window.requestAnimationFrame(() => overlay.classList.add("is-visible"));
  window.setTimeout(() => {
    overlay.classList.remove("is-visible");
    window.setTimeout(() => overlay.remove(), 320);
  }, 1500);
}

/* ---------------- Now-Playing pill ---------------- */
function showNowPlaying(title, sub = "stim · идёт") {
  const el = document.querySelector("#nowPlaying");
  if (!el) return;
  const t = document.querySelector("#npTitle");
  const s = document.querySelector("#npSub");
  if (t) t.textContent = title;
  if (s) s.textContent = sub;
  el.hidden = false;
  window.requestAnimationFrame(() => el.classList.add("is-visible"));
}
function hideNowPlaying() {
  const el = document.querySelector("#nowPlaying");
  if (!el) return;
  el.classList.remove("is-visible");
  window.setTimeout(() => { el.hidden = true; }, 220);
}

/* ---------------- Achievement Toast ---------------- */
let lastAchievementCount = 0;
function showAchievement(label) {
  const el = document.querySelector("#achievementToast");
  if (!el) return;
  const t = document.querySelector("#achTitle");
  const s = document.querySelector("#achSub");
  if (t) t.textContent = label;
  if (s) s.textContent = "новое достижение";
  el.hidden = false;
  window.requestAnimationFrame(() => el.classList.add("is-visible"));
  window.setTimeout(() => {
    el.classList.remove("is-visible");
    window.setTimeout(() => { el.hidden = true; }, 320);
  }, 3400);
  try { sensoryCore.engine.cue("level-up"); } catch { /* noop */ }
}

function checkAchievementUnlock(prevCount, nextState) {
  const next = nextState.achievements?.length || 0;
  if (next > prevCount) {
    const newest = nextState.achievements[nextState.achievements.length - 1];
    if (newest) showAchievement(newest.label);
  }
}

/* ---------------- Quick Launch (Cmd+K) ---------------- */
let qlOpen = false;
let qlItems = [];
let qlIndex = 0;
let qlMatches = [];

function initQuickLaunch() {
  const overlay = document.querySelector("#quickLaunch");
  if (!overlay) return;
  const input = overlay.querySelector("#qlInput");
  const list = overlay.querySelector("#qlList");
  overlay.querySelector("#qlClose").addEventListener("click", closeQuickLaunch);
  overlay.querySelector(".ql-backdrop").addEventListener("click", closeQuickLaunch);
  input.addEventListener("input", () => renderQuickLaunchList(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); qlIndex = Math.min(qlMatches.length - 1, qlIndex + 1); highlightQl(); }
    if (e.key === "ArrowUp")   { e.preventDefault(); qlIndex = Math.max(0, qlIndex - 1); highlightQl(); }
    if (e.key === "Enter")     { e.preventDefault(); commitQuickLaunch(); }
  });
}

function openQuickLaunch() {
  const overlay = document.querySelector("#quickLaunch");
  if (!overlay) return;
  qlItems = buildLaunchItems();
  qlOpen = true;
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-open");
  const input = overlay.querySelector("#qlInput");
  input.value = "";
  input.focus();
  renderQuickLaunchList("");
}

function closeQuickLaunch() {
  const overlay = document.querySelector("#quickLaunch");
  if (!overlay || !qlOpen) return false;
  qlOpen = false;
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  window.setTimeout(() => { overlay.hidden = true; }, 180);
  return true;
}

function toggleQuickLaunch() {
  if (qlOpen) closeQuickLaunch();
  else openQuickLaunch();
}

function renderQuickLaunchList(query) {
  const list = document.querySelector("#qlList");
  if (!list) return;
  qlMatches = searchItems(qlItems, query, 12);
  qlIndex = 0;
  if (!qlMatches.length) {
    list.innerHTML = `<div class="ql-empty">Ничего не найдено</div>`;
    return;
  }
  list.innerHTML = qlMatches.map((it, i) => `
    <button class="ql-item ${i === 0 ? "is-active" : ""}" type="button" data-i="${i}">
      <span class="ql-icon">${it.icon}</span>
      <span class="ql-text">
        <strong>${escapeHtmlSafe(it.label)}</strong>
        <small>${escapeHtmlSafe(it.hint)}</small>
      </span>
      <span class="ql-kind">${it.kind}</span>
    </button>
  `).join("");
  list.querySelectorAll(".ql-item").forEach((btn) => {
    btn.addEventListener("mouseenter", () => { qlIndex = Number(btn.dataset.i); highlightQl(); });
    btn.addEventListener("click", () => { qlIndex = Number(btn.dataset.i); commitQuickLaunch(); });
  });
}

function highlightQl() {
  const list = document.querySelector("#qlList");
  if (!list) return;
  list.querySelectorAll(".ql-item").forEach((b, i) => {
    b.classList.toggle("is-active", i === qlIndex);
    if (i === qlIndex) b.scrollIntoView({ block: "nearest" });
  });
}

function commitQuickLaunch() {
  const item = qlMatches[qlIndex];
  if (!item) return;
  closeQuickLaunch();
  if (item.kind === "route") router.navigate(item.id);
  else if (item.kind === "drill") openDrill(item.id);
  else if (item.kind === "protocol") startCircuit(item.id);
  else if (item.kind === "stim") {
    router.navigate("stim");
    window.setTimeout(() => {
      stimController.start(item.id);
      const preset = STIM_PRESETS_MAP[item.id];
      if (preset) showNowPlaying(preset.label, preset.kind || "stim");
    }, 200);
  }
}

function escapeHtmlSafe(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function onRoute(route, param = null) {
  const wasDifferent = currentRoute !== route;
  currentRoute = route;
  setActiveNavRoute(route);

  if (activeDrill && drillPhase === "running") abortDrill();
  activeDrill = null;
  drillPhase = null;
  circuitActive = false;
  circuitQueue = [];
  document.body.classList.remove("stage-focus");

  // subtle navigation sound (only if audio unlocked)
  if (wasDifferent && sensoryCore.engine.ready() && getState().settings.soundEnabled) {
    sensoryCore.engine.cue("recall-flip", { amp: 0.06 });
  }

  if (route === "center") {
    renderPageCenter(refs, getState(), {
      startCircuit: (protocolId) => startCircuit(protocolId),
      openMode: openDrill,
      openProgress: () => router.navigate("progress"),
      openDrills: () => router.navigate("drills"),
      setSessionLength,
      selectProtocol: (id) => {
        store.set((s) => ({ ...s, protocols: { ...(s.protocols || {}), lastUsed: id } }));
        onRoute("center");
      },
      startProgram: () => {
        store.set((s) => startProgramFn(s));
        toast(refs, "21-дневная программа запущена. Замер сделан — будем сравнивать.");
        onRoute("center");
      },
      completeProgramDay: () => {
        store.set((s) => completeProgramDayFn(s));
        toast(refs, "День отмечен. Streak растёт.");
        onRoute("center");
      },
      setSleepHours: (hours) => {
        store.set((s) => ({ ...s, sleep: { hoursToday: hours, lastUpdate: Date.now() } }));
      },
      setMood: (value) => {
        store.set((s) => ({ ...s, mood: { ...(s.mood || {}), value, lastUpdate: Date.now() } }));
      },
      setEnergy: (energy) => {
        store.set((s) => ({ ...s, mood: { ...(s.mood || {}), energy, lastUpdate: Date.now() } }));
      },
      addGoal: (templateId) => {
        const tpl = GOAL_TEMPLATES.find((t) => t.id === templateId);
        if (!tpl) return;
        store.set((s) => addGoalFn(s, tpl));
        toast(refs, `Цель добавлена: ${tpl.label}`);
        onRoute("center");
      },
      removeGoal: (id) => {
        store.set((s) => removeGoalFn(s, id));
        onRoute("center");
      },
      toggleAmbientMusic: () => {
        sensoryCore.engine.unlock();
        const next = !getState().settings.musicEnabled;
        onSettingChange("musicEnabled", next);
        toast(refs, next ? "Фоновый ambient включён." : "Фоновая музыка выключена.");
        return next;
      },
      saveKnowledgeToFsrs: (card) => {
        const exists = (getState().cards || []).some((c) => c.front === card.question);
        if (exists) {
          toast(refs, "Эта карточка уже в твоей колоде FSRS-5.");
          return;
        }
        addCard(card.question, `${card.answer} (${card.source || card.tag})`);
      },
      markKnowledgeStudied: (cardId) => {
        const today = new Date().toISOString().slice(0, 10);
        store.set((s) => {
          const prev = s.knowledgeLog?.[today] || [];
          if (prev.includes(cardId)) return s;
          return {
            ...s,
            knowledgeLog: { ...(s.knowledgeLog || {}), [today]: [...prev, cardId] },
            profile: {
              ...s.profile,
              todayXp: (s.profile.todayXp || 0) + 10,
              totalXp: (s.profile.totalXp || 0) + 10,
            },
          };
        });
        sensory.cue("hit");
        toast(refs, "+10 XP · Карточка изучена и закреплена.");
      },
      addCustomKnowledgeCard: (front, back) => {
        if (!front.trim() || !back.trim()) return;
        addCard(front.trim(), back.trim());
      },
      openKnowledge: () => router.navigate("knowledge"),
      quickLaunchMode: (mode) => {
        if (!MODE_META[mode]) return;
        beginRound(mode);
      },
    });
    // re-render fact host in center
    if (refs.factHost) {
      renderFactCard(refs.factHost, factRotator.current, () => factRotator.pick());
    }
  } else if (route === "knowledge") {
    renderPageKnowledge(refs, getState(), {
      saveKnowledgeToFsrs: (card) => {
        const exists = (getState().cards || []).some((c) => c.front === card.question);
        if (exists) {
          toast(refs, "Эта карточка уже в твоей колоде FSRS-5.");
          return;
        }
        addCard(card.question, `${card.answer} (${card.source || card.tag})`);
      },
      markKnowledgeStudied: (cardId) => {
        const today = new Date().toISOString().slice(0, 10);
        store.set((s) => {
          const prev = s.knowledgeLog?.[today] || [];
          if (prev.includes(cardId)) return s;
          return {
            ...s,
            knowledgeLog: { ...(s.knowledgeLog || {}), [today]: [...prev, cardId] },
            profile: {
              ...s.profile,
              todayXp: (s.profile.todayXp || 0) + 10,
              totalXp: (s.profile.totalXp || 0) + 10,
            },
          };
        });
        sensory.cue("hit");
        toast(refs, "+10 XP · Стикер изучен и закреплён.");
      },
      addCustomKnowledgeCard: (front, back) => {
        if (!front.trim() || !back.trim()) return;
        addCard(front.trim(), back.trim());
      },
      openRecall: () => beginRound("recall"),
    });
  } else if (route === "drills" && param && MODE_META[param]) {
    renderPageDrillDetail(refs, getState(), param, {
      openMode: openDrill,
      backToDrills: () => router.navigate("drills"),
    });
  } else if (route === "drills") {
    renderPageDrills(refs, getState(), {
      openMode: openDrill,
      openDetail: (m) => router.navigate("drills", m),
      toggleFavorite: (mode) => {
        store.set((s) => {
          const current = new Set(s.favorites?.drills || []);
          if (current.has(mode)) current.delete(mode);
          else current.add(mode);
          return { ...s, favorites: { ...(s.favorites || {}), drills: [...current] } };
        });
        onRoute("drills");
      },
      startRecommended: () => {
        startCustomQueue(getRecommendedPlan(getState()).slice(0, getSessionRouteCount()), "Рекомендованный стек");
      },
      startFavorites: () => {
        startCustomQueue(getState().favorites?.drills || [], "Избранное");
      },
    });
  } else if (route === "records") {
    renderPageRecords(refs, getState(), { openMode: openDrill });
  } else if (route === "progress") {
    renderPageProgress(refs, getState(), {
      openMode: openDrill,
      openDrills: () => router.navigate("drills"),
      startCircuit: (protocolId) => startCircuit(protocolId),
      startRecommended: () => {
        startCustomQueue(getRecommendedPlan(getState()).slice(0, getSessionRouteCount()), "Рекомендованный стек");
      },
    });
  } else if (route === "stim") {
    renderPageStim(refs, getState(), {
      photicConfirmed: stimController.photicConfirmed,
      startStim: (id) => {
        stimController.start(id);
        const preset = STIM_PRESETS_MAP[id];
        if (preset) showNowPlaying(preset.label, preset.kind || "stim");
      },
      requestPhoticConsent: (id) => renderPhoticConsent(id, {
        confirm: (confirmedId) => {
          stimController.confirmPhotic();
          stimController.start(confirmedId);
          const preset = STIM_PRESETS_MAP[confirmedId];
          if (preset) showNowPlaying(preset.label, preset.kind || "stim");
        },
      }),
    });
  } else if (route === "settings") {
    renderPageSettings(refs, getState(), {
      change: onSettingChange,
      export: exportProgress,
      import: importProgress,
      breath: () => {
        sensoryCore.engine.unlock();
        sensoryCore.engine.startBreath();
        showBreathOverlay();
        toast(refs, "Дыхание 4-7-8 запущено. Esc — остановить.");
      },
    });
  }
}

function openDrill(mode) {
  if (!MODE_META[mode]) return;
  activeDrill = mode;
  drillPhase = "intro";
  applyModeTheme(mode);
  scene.setMode(mode);
  sensoryCore.engine.music?.()?.setMode(mode);
  renderModeIntro(refs, getState(), mode, {
    startRound: (prediction) => {
      if (prediction !== null && Number.isFinite(prediction)) {
        store.set((s) => recordPrediction(s, mode, prediction));
      }
      beginRound(mode);
    },
    back: () => router.navigate("drills"),
  });
}

function beginRound(mode) {
  activeDrill = mode;
  drillPhase = "running";
  clearTaskInternals();
  roundStats = emptyRoundStats();
  document.body.classList.add("stage-focus");
  abortController = new AbortController();
  const signal = abortController.signal;
  applyModeTheme(mode);
  scene.setMode(mode);
  sensory.cue("round-start");
  bus.emit(EVENTS.DRILL_START, { mode });
  startDrill(mode, {
    refs,
    sensory,
    signal,
    isCurrent: () => mode === activeDrill && drillPhase === "running" && !signal.aborted,
    getState,
    startCountdown,
    setProgress,
    feedback: recordAnswer,
    finish: finishRound,
    addCard,
    updateCard,
    toast: (m) => toast(refs, m),
  });
  // setup abort + fullscreen buttons
  refs.pageActions.querySelector("#abortRound")?.addEventListener("click", () => abortDrill());
  refs.pageActions.querySelector("#focusFsBtn")?.addEventListener("click", () => toggleFullscreenFocus());
}

function abortDrill() {
  if (abortController) abortController.abort();
  drillPhase = null;
  activeDrill = null;
  if (fsActive) exitFullscreenFocus();
  router.navigate("drills");
}

function finishRound(result) {
  const weights = MODE_META[result.mode]?.domainWeights || { memory: 1 };
  combo = result.accuracy >= 0.75 ? Math.min(3, combo + 0.15) : Math.max(1, combo - 0.18);
  result.combo = combo;
  result.streakBest = roundStats.bestStreak;
  result.attempts = roundStats.attempts;
  result.hits = roundStats.hits;
  // capture pending metacog prediction BEFORE applying result for renderResult to display
  const pendingMeta = getState().metacog?.pending;
  if (pendingMeta && pendingMeta.mode === result.mode) {
    result._prediction = pendingMeta.prediction;
  }
  // Variable reward: 7% Crit Round (×2 XP) — Skinner variable-ratio
  if (Math.random() < 0.07 && result.accuracy >= 0.6) {
    const baseXp = result.xp;
    result.xp = Math.round(baseXp * 2);
    result.critRound = result.xp - baseXp;
  }
  // Daily challenge bonus check (before applying result)
  const ch = getTodayChallenge();
  if (ch && result.mode === ch.mode && !isChallengeCompletedToday(getState()) && result.accuracy >= 0.6) {
    const baseXp = result.xp;
    result.xp = Math.round(baseXp * 1.5);
    result.challengeBonus = result.xp - baseXp;
  }
  // Capture level BEFORE applying result for level-up detection
  const prevLevel = getState().levels?.[result.mode] || 1;
  const prevAchievements = getState().achievements?.length || 0;
  store.set((state) => recordOutcome(applyRoundResult(state, result, weights), result));
  const nextLevel = getState().levels?.[result.mode] || prevLevel;
  if (nextLevel > prevLevel) {
    result.levelledUp = { from: prevLevel, to: nextLevel };
  }
  if (result.challengeBonus) {
    store.set((state) => markChallengeCompleted(state));
    toast(refs, `⚡ Вызов дня выполнен! +${result.challengeBonus} бонус XP`);
  }
  if (result.critRound) {
    toast(refs, `✨ Crit Round! +${result.critRound} бонус XP`);
  }
  if (result.levelledUp) {
    showLevelUpOverlay(result.mode, result.levelledUp.from, result.levelledUp.to);
  }
  checkAchievementUnlock(prevAchievements, getState());
  bus.emit(EVENTS.DRILL_FINISH, { result });
  const cueName = result.levelledUp ? "level-up" : result.accuracy >= 0.85 ? "level-up" : result.accuracy >= 0.6 ? "streak" : "miss-near";
  sensory.cue(cueName);
  sensoryCore.engine.setFatigue(Math.max(0, 1 - result.accuracy));
  drillPhase = "result";
  document.body.classList.remove("stage-focus");
  if (fsActive) exitFullscreenFocus();
  renderResult(refs, result, getState(), {
    circuitActive,
    next: () => {
      if (circuitActive) runNextCircuit();
      else beginRound(result.mode);
    },
    toDrills: () => router.navigate("drills"),
    toCenter: () => router.navigate("center"),
    openMode: (mode) => openDrill(mode),
    saveReflection: ({ mode, text, accuracy }) => {
      store.set((s) => ({
        ...s,
        reflections: [...(s.reflections || []), { mode, text, accuracy, at: Date.now() }].slice(-50),
      }));
      toast(refs, "Заметка сохранена в архив.");
    },
  });
}

function startCircuit(protocolId) {
  const id = protocolId || getState().protocols?.lastUsed || "adaptive";
  const protocol = getProtocol(id);
  circuitActive = true;
  circuitQueue = protocol.pick(getState());
  store.set((s) => ({ ...s, protocols: { ...(s.protocols || {}), lastUsed: id, runs: (s.protocols?.runs || 0) + 1 } }));
  toast(refs, `${protocol.name} · ${circuitQueue.length} раундов. Поехали.`);
  runNextCircuit();
}

function startCustomQueue(modes, label = "Стек") {
  const queue = [...new Set(modes || [])].filter((mode) => MODE_META[mode]).slice(0, 7);
  if (!queue.length) {
    toast(refs, "Сначала закрепи модули или выбери рекомендованный стек.");
    return;
  }
  circuitActive = true;
  circuitQueue = queue;
  toast(refs, `${label} · ${queue.length} раундов. Поехали.`);
  runNextCircuit();
}

function runNextCircuit() {
  if (!circuitQueue.length) {
    circuitActive = false;
    bus.emit(EVENTS.CIRCUIT_DONE);
    // auto-complete program day if program is active
    if (getProgram(getState()) && !isTodayDone(getState())) {
      store.set((s) => completeProgramDayFn(s));
      const day = getCurrentProgramDay(getState());
      toast(refs, `Протокол завершён. День ${day - 1}/21 в программе отмечен.`);
    } else {
      toast(refs, "Протокол завершён.");
    }
    router.navigate("center");
    return;
  }
  const next = circuitQueue.shift();
  openDrill(next);
  // auto-start
  window.setTimeout(() => beginRound(next), 250);
}

function addCard(front, back) {
  const now = Date.now();
  store.set((state) => ({
    ...state,
    cards: [...state.cards, {
      id: `card-${Date.now()}`,
      front,
      back,
      due: now,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      state: "new",
      lastReview: null,
      interval: 0,
      seen: 0
    }],
  }));
  toast(refs, "Карточка добавлена.");
}

function updateCard(cardId, rating) {
  let fsrsRating = 3;
  if (rating === "bad" || rating === 1) fsrsRating = 1;
  else if (rating === "ok" || rating === 2) fsrsRating = 2;
  else if (rating === "good" || rating === 3) fsrsRating = 3;
  else if (rating === "easy" || rating === 4) fsrsRating = 4;
  else fsrsRating = Number(rating) || 3;

  store.set((state) => ({
    ...state,
    cards: state.cards.map((card) => {
      if (card.id !== cardId) return card;
      const updated = applyRating(card, fsrsRating);
      return {
        ...updated,
        seen: (card.seen || 0) + 1
      };
    }),
  }));
}

function onSettingChange(key, value) {
  if (key === "sessionLength") value = Math.max(8, Math.min(40, Number(value) || 18));
  if (key === "theme") {
    applyTheme(value);
    scene.setMood(getThemeMood(value));
  }
  if (key === "biometricEnabled") {
    if (value) enableBiometric();
    else disableBiometric();
  }
  updateSettings({ [key]: value });
  if (currentRoute === "settings" && ["theme", "visualIntensity", "reducedMotion"].includes(key)) {
    window.setTimeout(() => onRoute("settings"), 0);
  }
}

function updateSettings(patch) {
  store.set((state) => {
    const settings = { ...state.settings, ...patch };
    return {
      ...state,
      settings,
      dailyProtocol: { ...state.dailyProtocol, targetMinutes: settings.sessionLength },
    };
  });
  applyAudioPreferences(getState().settings);
  document.body.classList.toggle("reduced-motion", getState().settings.reducedMotion);
  document.body.dataset.intensity = getState().settings.visualIntensity || "balanced";
}

function applyAudioPreferences(settings) {
  const engine = sensoryCore.engine;
  if (!engine.ready()) return;
  engine.refreshVolumes();
  engine.setReverb(settings.reverbPreset || "hall");
  engine.setReverbWet(settings.reverbWet ?? 0.42);
  const music = engine.music?.();
  if (!music) return;
  if (settings.musicEnabled) {
    music.setTheme(settings.theme || "aurora");
    music.setMode(activeDrill || "circuit");
    music.start();
  } else {
    music.stop();
  }
  if (settings.metronomeEnabled) engine.startMetronome({ bpm: 90 });
  else engine.stopMetronome();
}

function exportProgress() {
  const blob = new Blob([exportState(getState())], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `neuroforge-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importProgress(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const imported = importState(await file.text());
    store.set(imported);
    applyTheme(imported.settings.theme || "aurora");
    router.navigate("center");
    toast(refs, "Прогресс импортирован.");
  } catch (error) {
    toast(refs, error.message || "Не удалось импортировать.");
  }
}

async function enableBiometric() {
  if (!isBiometricSupported()) {
    toast(refs, "Биометрика не поддерживается этим браузером.");
    updateSettings({ biometricEnabled: false });
    return;
  }
  pulseDetector = await createPulseDetector({
    onUpdate: ({ bpm }) => {
      const music = sensoryCore.engine.music?.();
      if (music && bpm) music.setTempo(Math.max(60, Math.min(96, bpm * 0.85)));
    },
    onError: () => {
      toast(refs, "Камера недоступна. Биометрика отключена.");
      updateSettings({ biometricEnabled: false });
    },
  });
}

function disableBiometric() {
  if (pulseDetector) {
    pulseDetector.stop();
    pulseDetector = null;
  }
}

function setSessionLength(minutes) {
  updateSettings({ sessionLength: Math.max(8, Math.min(40, minutes || 18)) });
  if (currentRoute === "center") onRoute("center");
}

function getSessionRouteCount() {
  const minutes = Number(getState().settings.sessionLength) || 18;
  if (minutes <= 8) return 3;
  if (minutes <= 18) return 5;
  return 7;
}

function clearTaskInternals() {
  if (countdownTimer) window.clearInterval(countdownTimer);
  countdownTimer = null;
  countdownEndsAt = 0;
}

function startCountdown(seconds) {
  if (countdownTimer) window.clearInterval(countdownTimer);
  countdownEndsAt = Date.now() + seconds * 1000;
  countdownTimer = window.setInterval(() => {
    const remaining = Math.max(0, countdownEndsAt - Date.now());
    if (!remaining) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 250);
}

function setProgress(value) {
  const progress = refs.arena.querySelector("#taskProgress");
  const safe = Math.max(0, Math.min(100, value));
  if (progress) progress.style.width = `${safe}%`;
  const roundProgress = refs.arena.querySelector("#roundProgressValue");
  if (roundProgress) roundProgress.textContent = `${Math.round(safe)}%`;
}

function flashFeedback(type) {
  const isMiss = type === "miss-near" || type === "miss-bad" || type === "error";
  const isReward = type === "level-up" || type === "reward" || type === "combo" || type === "streak";
  const className = isMiss ? "feedback-bad" : isReward ? "feedback-reward" : "feedback-good";
  refs.arena.classList.remove("feedback-good", "feedback-bad", "feedback-reward");
  void refs.arena.offsetWidth;
  refs.arena.classList.add(className);

  // Combo aura on active arena when streak >= 3
  const taskMain = refs.arena.querySelector(".task-main");
  if (taskMain) {
    taskMain.classList.toggle("is-hot-streak", !isMiss && roundStats.streak >= 3);
    if (!isMiss && roundStats.streak >= 2) {
      const pop = document.createElement("span");
      pop.className = `arena-float-pop ${roundStats.streak >= 5 ? "is-fire" : ""}`;
      pop.textContent = roundStats.streak >= 5 ? `ПОТОК ×${roundStats.streak}` : `+1 · ×${roundStats.streak}`;
      taskMain.appendChild(pop);
      window.setTimeout(() => pop.remove(), 760);
    }
  }

  // Layered juice: subtle screen shake based on type
  const shakeCls = type === "miss-bad" || type === "error" ? "shake-2" :
                   type === "miss-near" ? "shake-1" :
                   type === "level-up" || type === "reward" ? "shake-pop" : "";
  if (shakeCls) {
    refs.arena.classList.remove("shake-1", "shake-2", "shake-pop");
    void refs.arena.offsetWidth;
    refs.arena.classList.add(shakeCls);
    window.setTimeout(() => refs.arena.classList.remove(shakeCls), 320);
  }
  window.setTimeout(() => refs.arena.classList.remove(className), 480);
}

/**
 * Spawn a floating "+N XP" or similar text bubble at given coordinates.
 * Auto-removes after animation.
 */
function spawnFloatText(text, x, y, tone = "good") {
  const el = document.createElement("div");
  el.className = `float-text float-text-${tone}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 1100);
}

function recordAnswer(hit, label = "") {
  roundStats.attempts += 1;
  if (hit) {
    roundStats.hits += 1;
    roundStats.streak += 1;
    roundStats.bestStreak = Math.max(roundStats.bestStreak, roundStats.streak);
    bus.emit(EVENTS.DRILL_HIT);
  } else {
    roundStats.streak = 0;
    bus.emit(EVENTS.DRILL_MISS);
  }
  const accuracy = roundStats.attempts ? Math.round((roundStats.hits / roundStats.attempts) * 100) : 0;
  const streakEl = refs.arena.querySelector("#roundStreak");
  const signalEl = refs.arena.querySelector("#roundSignal");
  if (streakEl) streakEl.textContent = roundStats.streak;
  if (signalEl) {
    signalEl.textContent = label || (hit ? `${accuracy}%` : "сбой");
    signalEl.classList.remove("is-good", "is-bad");
    signalEl.classList.add(hit ? "is-good" : "is-bad");
  }
  const live = Math.min(3, combo + roundStats.streak * 0.04);
  if (refs.comboLabel) refs.comboLabel.textContent = `x${live.toFixed(1)}`;
  try {
    sensoryCore.engine.music?.()?.setCombo?.(live);
  } catch { /* noop */ }

  // Floating +XP at last pointer position OR arena center
  if (hit) {
    const x = (window._lastPointerX || (window.innerWidth / 2));
    const y = (window._lastPointerY || (window.innerHeight / 2));
    const streakBonus = roundStats.streak >= 5 ? "🔥" : "";
    spawnFloatText(`+1 ${streakBonus}`, x, y, "good");
  }

  sensory.cue(hit ? "hit-soft" : "miss-near");
}

// Track pointer for floating text spawn points
window.addEventListener("pointerdown", (e) => {
  window._lastPointerX = e.clientX;
  window._lastPointerY = e.clientY;
}, { passive: true });

function emptyRoundStats() { return { attempts: 0, hits: 0, streak: 0, bestStreak: 0 }; }

let breathOverlayEl = null;
function showBreathOverlay() {
  if (breathOverlayEl) return;
  const overlay = document.createElement("div");
  overlay.className = "breath-overlay";
  overlay.innerHTML = `
    <div class="breath-orb" id="breathOrb">Вдох</div>
    <button class="breath-stop" type="button" id="breathStop">Остановить</button>
  `;
  document.body.appendChild(overlay);
  breathOverlayEl = overlay;
  overlay.querySelector("#breathStop").addEventListener("click", () => {
    sensoryCore.engine.stopBreath();
    hideBreathOverlay();
  });
  const phaseLabels = ["Вдох", "Задержка", "Выдох"];
  const orb = overlay.querySelector("#breathOrb");
  const phaseListener = ({ phase }) => { if (orb) orb.textContent = phaseLabels[phase] || "Вдох"; };
  bus.on("breath:phase", phaseListener);
  overlay._cleanup = () => bus.off("breath:phase", phaseListener);
}

function hideBreathOverlay() {
  if (!breathOverlayEl) return;
  breathOverlayEl._cleanup?.();
  breathOverlayEl.remove();
  breathOverlayEl = null;
}

window.NeuroForge = {
  getState,
  modes: DRILL_IDS,
  audio: sensoryCore.engine,
  bus,
  router,
};
