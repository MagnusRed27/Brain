import { ASSETS, DOMAINS, DRILL_IDS, MODE_META } from "./config.js";
import { getModeVisual } from "./assets.js";
import { getAchievementArt, getChallengeBanner, getDomainIcon, getHeroBackdrop, getProtocolArt, getResultArt, getV6Banner } from "./assets-v4.js";
import { getDashboardModel, getModeBrief } from "./analytics.js";
import { getAverageLevel, getFatigueSignal, getOverallScore, getTodayAccuracy, getModeNeed, getRecommendedPlan, getWeakestDomain, getWeekDeepSessions, ALL_ACHIEVEMENTS } from "./progression.js";
import { escapeHtml } from "./utils.js";
import { STIM_PRESETS } from "./stim.js";
import { listThemes } from "./themes.js";
import { PROTOCOLS, PROTOCOL_IDS, getProtocol, suggestProtocol } from "./protocols.js";
import { getTodayChallenge, isChallengeCompletedToday } from "./daily-challenge.js";

/* Estimated round duration in minutes per drill mode */
const DRILL_DURATION_MIN = {
  nback: 4, anback: 4, grid: 3, focus: 3, stroop: 3,
  logic: 4, recall: 2, scan: 2, rotate: 3,
  reaction: 2, trail: 3, math: 3, schulte: 2,
  antisaccade: 3, rsvp: 2, stopsig: 3,
  flanker: 3, bspan: 3, vfluency: 2,
  tower: 4, dsst: 2, evault: 6,
};
export function getDrillDuration(mode) { return DRILL_DURATION_MIN[mode] || 3; }
import { analyzeRound, QUADRANT_META, generateInsights } from "./analysis.js";
import { getDrillMastery } from "./progression.js";
import { getCalibration } from "./metacog.js";
import { getCircadianTip } from "./facts.js";
import { getScience } from "./drill-science.js";
import { getProgram, getCurrentProgramDay, getProgramDay, getProgramSummary, getProgramStreak, isTodayDone, PROGRAM_DAYS } from "./program.js";
import { GOAL_TEMPLATES, evaluateGoal, getActiveGoals, describeGoal } from "./goals.js";
import { KNOWLEDGE_DOMAINS, KNOWLEDGE_CARDS, getKnowledgeByDomain, getRitualContext } from "./knowledge-feed.js";

export function createRefs() {
  return {
    arena: document.querySelector("#arena"),
    pageTitle: document.querySelector("#pageTitle"),
    pageKicker: document.querySelector("#pageKicker"),
    pageActions: document.querySelector("#pageActions"),
    todayXp: document.querySelector("#todayXp"),
    streakDays: document.querySelector("#streakDays"),
    sessionFocus: document.querySelector("#sessionFocus"),
    comboLabel: document.querySelector("#comboLabel"),
    toast: document.querySelector("#toast"),
    body: document.body,
  };
}

export function setPageHeader(refs, kicker, title, actionsHtml = "") {
  document.body.classList.remove("is-ritual-home");
  if (refs.pageKicker) refs.pageKicker.textContent = kicker;
  if (refs.pageTitle) refs.pageTitle.textContent = title;
  if (refs.pageActions) refs.pageActions.innerHTML = actionsHtml;
}

export function applyModeTheme(mode) {
  const visual = getModeVisual(mode);
  document.body.dataset.mode = mode;
  document.body.style.setProperty("--mode-accent", visual.accent);
  document.body.style.setProperty("--mode-glow", visual.glow);
}

export function updateTopMetrics(refs, state, combo) {
  if (!refs.todayXp) return;
  animateNumber(refs.todayXp, Math.round(state.profile.todayXp));
  animateNumber(refs.streakDays, state.profile.streakDays);
  refs.sessionFocus.textContent = `${getTodayAccuracy(state)}%`;
  refs.comboLabel.textContent = `x${(combo || 1).toFixed(1)}`;
  // Streak shield: visible if user has unused insurance OR streak >= 7
  const shieldPill = document.querySelector("#streakShieldPill");
  const shieldCount = document.querySelector("#streakShieldCount");
  if (shieldPill && shieldCount) {
    const hasUnused = state.streakInsurance && !state.streakInsurance.used;
    const earned = state.profile.streakDays >= 7;
    if (hasUnused || earned) {
      shieldPill.hidden = false;
      shieldCount.textContent = hasUnused ? "🛡" : "🛡̇";  // diff: filled vs spent
      shieldPill.classList.toggle("is-spent", !hasUnused);
    } else {
      shieldPill.hidden = true;
    }
  }
}

export function setActiveNavRoute(route) {
  document.querySelectorAll(".sidenav-item, .bn-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.route === route);
  });
}

/* === Page: Центр ======================================================== */
function getTimeGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Доброе утро. Включаем фокус?";
  if (h >= 12 && h < 18) return "Продуктивного дня. Готов к раунду?";
  if (h >= 18 && h < 23) return "Вечерний фокус. Закрепим ритм?";
  return "Ночная лаборатория. Мягкий темп.";
}

function pluralRu(n, forms) {
  const abs = Math.abs(Number(n) || 0) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

function getRitualSvg(period) {
  if (period === "morning") {
    return `
      <svg class="ritual-svg is-coffee" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path class="steam-1" d="M16 14c0-2.5 2-3.5 2-6"/>
        <path class="steam-2" d="M22 13c0-2.5 2-3.5 2-6"/>
        <path class="steam-3" d="M28 14c0-2.5 2-3.5 2-6"/>
        <path d="M11 20h21v12a9 9 0 0 1-9 9h-3a9 9 0 0 1-9-9V20z"/>
        <path d="M32 23h4a4 4 0 0 1 0 8h-4"/>
        <line x1="8" y1="44" x2="36" y2="44"/>
      </svg>`;
  }
  if (period === "day") {
    return `
      <svg class="ritual-svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="24" cy="24" r="9"/>
        <line x1="24" y1="6" x2="24" y2="11"/>
        <line x1="24" y1="37" x2="24" y2="42"/>
        <line x1="6" y1="24" x2="11" y2="24"/>
        <line x1="37" y1="24" x2="42" y2="24"/>
        <line x1="11.3" y1="11.3" x2="14.8" y2="14.8"/>
        <line x1="33.2" y1="33.2" x2="36.7" y2="36.7"/>
        <line x1="36.7" y1="11.3" x2="33.2" y2="14.8"/>
        <line x1="14.8" y1="33.2" x2="11.3" y2="36.7"/>
      </svg>`;
  }
  if (period === "evening") {
    return `
      <svg class="ritual-svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14 28a10 10 0 0 1 20 0"/>
        <line x1="6" y1="28" x2="42" y2="28"/>
        <line x1="12" y1="35" x2="36" y2="35"/>
        <line x1="18" y1="41" x2="30" y2="41"/>
        <line x1="24" y1="10" x2="24" y2="14"/>
      </svg>`;
  }
  return `
    <svg class="ritual-svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M31 12a13 13 0 1 0 5 21 10 10 0 1 1-5-21z"/>
      <circle cx="34" cy="14" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="39" cy="21" r="1" fill="currentColor" stroke="none"/>
    </svg>`;
}

function renderRitualBar(state) {
  const ritual = getRitualContext();
  const musicOn = Boolean(state.settings?.musicEnabled);
  const nowStr = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return `
    <section class="studio-ritual-bar" data-period="${ritual.period}">
      <div class="srb-left">
        <div class="srb-icon" aria-hidden="true">${getRitualSvg(ritual.period)}</div>
        <div class="srb-copy">
          <div class="srb-kicker-row">
            <span class="st-label">${ritual.kicker}</span>
            <span class="srb-clock">${nowStr}</span>
          </div>
          <h4>${ritual.title}</h4>
          <p>${ritual.sub}</p>
        </div>
      </div>
      <div class="srb-controls">
        <button type="button" class="srb-music-btn ${musicOn ? "is-playing" : ""}" id="ritualMusicBtn" aria-pressed="${musicOn ? "true" : "false"}">
          <span class="srb-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="srb-music-text">
            <strong>${musicOn ? "Ambient играет" : "Фоновая музыка"}</strong>
            <small>${musicOn ? "WebAudio · выключить" : "Спокойный фокус · вкл."}</small>
          </span>
        </button>
        <button type="button" class="ghost-action srb-jump" id="ritualJumpLearn">Изучить сегодня ↓</button>
      </div>
    </section>
  `;
}

function renderLearnTodayShell(state) {
  const today = new Date().toISOString().slice(0, 10);
  const studiedIds = state.knowledgeLog?.[today] || [];
  return `
    <section class="studio-learn-section" id="learnTodaySection">
      <div class="sls-header">
        <div class="sls-title-wrap">
          <span class="st-label">ИЗУЧИТЬ СЕГОДНЯ · ПЕРСОНАЛЬНЫЙ БРИФ</span>
          <h4>Наука, математика, ИИ и антиэйджинг</h4>
        </div>
        <div class="sls-head-actions">
          <span class="sls-progress-pill" id="learnProgressPill">${studiedIds.length} / 4 ИЗУЧЕНО</span>
          <button type="button" class="ghost-action sls-btn" id="learnShuffleBtn">Другая подборка ↻</button>
          <button type="button" class="ghost-action sls-btn" id="learnAddToggle">+ Своя карточка</button>
        </div>
      </div>

      <div class="sls-tabs" id="learnDomainTabs" role="tablist" aria-label="Темы изучения">
        ${KNOWLEDGE_DOMAINS.map((d, idx) => `
          <button type="button" class="sls-tab ${idx === 0 ? "is-active" : ""}" data-kdomain="${d.id}" role="tab" aria-selected="${idx === 0 ? "true" : "false"}">
            <span>${d.code}</span> ${d.label}
          </button>
        `).join("")}
      </div>

      <form class="sls-custom-form" id="learnCustomForm" hidden>
        <div class="sls-cf-grid">
          <input type="text" id="learnCustomFront" placeholder="Вопрос или заголовок новости (например: Что такое test-time compute?)" required />
          <input type="text" id="learnCustomBack" placeholder="Ключевой ответ / суть для запоминания в FSRS-5" required />
        </div>
        <div class="sls-cf-actions">
          <button type="submit" class="primary-action">Сохранить в Recall Vault (FSRS-5)</button>
          <button type="button" class="ghost-action" id="learnCustomCancel">Отмена</button>
        </div>
      </form>

      <div class="sls-cards-grid" id="learnCardsGrid"></div>
    </section>
  `;
}

function renderKnowledgeCardHtml(card, state) {
  const today = new Date().toISOString().slice(0, 10);
  const studied = (state.knowledgeLog?.[today] || []).includes(card.id);
  const inFsrs = (state.cards || []).some((c) => c.front === card.question);
  const domInfo = KNOWLEDGE_DOMAINS.find((d) => d.id === card.domain) || KNOWLEDGE_DOMAINS[1];

  return `
    <article class="kcard ${studied ? "is-studied" : ""}" data-kid="${card.id}" data-domain="${card.domain}">
      <div class="kcard-face kcard-front">
        <div class="kcard-top">
          <span class="kcard-domain">${domInfo.code} / ${domInfo.label.toUpperCase()}</span>
          <span class="kcard-tag">${escapeHtml(card.tag)}</span>
        </div>
        <h5>${escapeHtml(card.title)}</h5>
        <p class="kcard-body">${escapeHtml(card.body)}</p>
        <div class="kcard-takeaway">
          <span>ПРИНЦИП</span>
          <p>${escapeHtml(card.takeaway)}</p>
        </div>
        <cite class="kcard-source">${escapeHtml(card.source)}</cite>
        <div class="kcard-actions">
          <button type="button" class="kcard-btn is-flip" data-kflip="${card.id}">Проверить память ↻</button>
          <button type="button" class="kcard-btn ${inFsrs ? "is-saved" : ""}" data-kfsrs="${card.id}">
            ${inFsrs ? "✓ В FSRS-5" : "+ В FSRS-5"}
          </button>
          <button type="button" class="kcard-btn ${studied ? "is-done" : ""}" data-kdone="${card.id}">
            ${studied ? "✓ Изучено" : "Изучено"}
          </button>
        </div>
      </div>

      <div class="kcard-face kcard-back" hidden>
        <div class="kcard-top">
          <span class="kcard-domain is-accent">АКТИВНОЕ ВСПОМИНАНИЕ</span>
          <button type="button" class="kcard-back-close" data-kflip="${card.id}">← К карточке</button>
        </div>
        <div class="kcard-q-block">
          <span class="st-label">ВОПРОС ДЛЯ ПРОВЕРКИ</span>
          <h5>${escapeHtml(card.question)}</h5>
        </div>
        <div class="kcard-a-block" data-kanswer="${card.id}" hidden>
          <span class="st-label">ОТВЕТ</span>
          <p>${escapeHtml(card.answer)}</p>
        </div>
        <div class="kcard-actions">
          <button type="button" class="primary-action kcard-reveal-btn" data-kreveal="${card.id}">Показать ответ</button>
          <button type="button" class="kcard-btn ${inFsrs ? "is-saved" : ""}" data-kfsrs="${card.id}">
            ${inFsrs ? "✓ В FSRS-5" : "+ В FSRS-5"}
          </button>
          <button type="button" class="kcard-btn ${studied ? "is-done" : ""}" data-kdone="${card.id}">
            ${studied ? "✓ Запомнил" : "Запомнил (+10 XP)"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderLivingBrainSvg(domains = {}, overall = 41, readiness = 72) {
  const d = {
    focus: Math.round(domains.focus ?? 44),
    wm: Math.round(domains.wm ?? 38),
    logic: Math.round(domains.logic ?? 40),
    memory: Math.round(domains.memory ?? 42),
    speed: Math.round(domains.speed ?? 43),
    spatial: Math.round(domains.spatial ?? 39),
  };
  const nodes = [
    { id: "focus",   code: "ATT", label: "Внимание",    x: 74,  y: 66,  val: d.focus,   mode: "stroop" },
    { id: "wm",      code: "WM",  label: "Раб. память", x: 118, y: 42,  val: d.wm,      mode: "nback" },
    { id: "logic",   code: "LOG", label: "Логика",      x: 168, y: 64,  val: d.logic,   mode: "logic" },
    { id: "memory",  code: "MEM", label: "Память",      x: 148, y: 110, val: d.memory,  mode: "recall" },
    { id: "spatial", code: "VIS", label: "Образы",      x: 192, y: 98,  val: d.spatial, mode: "rotate" },
    { id: "speed",   code: "SPD", label: "Скорость",    x: 96,  y: 112, val: d.speed,   mode: "reaction" },
  ];
  const curves = [
    "M74 66 Q96 44 118 42",
    "M118 42 Q146 42 168 64",
    "M168 64 Q188 76 192 98",
    "M192 98 Q174 116 148 110",
    "M148 110 Q122 120 96 112",
    "M96 112 Q74 94 74 66",
    "M74 66 Q116 84 148 110",
    "M118 42 Q128 76 148 110",
    "M118 42 Q102 76 96 112",
    "M168 64 Q152 88 148 110",
  ];
  return `
    <div class="living-brain-widget cyber-cortex-hud">
      <div class="lb-head">
        <span class="lb-kicker">CORTEX TELEMETRY // 06 ZONES</span>
        <span class="lb-ready">SYNC ${readiness}%</span>
      </div>
      <svg class="living-brain-svg" viewBox="0 0 248 164" role="img" aria-label="Футуристическая нейронная телеметрия 6 зон мозга">
        <defs>
          <radialGradient id="brainAura" cx="50%" cy="48%" r="52%">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.24"/>
            <stop offset="55%" stop-color="var(--accent-2)" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="128" cy="82" rx="112" ry="70" fill="url(#brainAura)"/>
        <!-- Holographic telemetry radar rings & axis hairlines -->
        <line x1="20" y1="82" x2="236" y2="82" stroke="var(--accent)" stroke-opacity="0.10" stroke-width="0.6"/>
        <line x1="128" y1="12" x2="128" y2="152" stroke="var(--accent)" stroke-opacity="0.10" stroke-width="0.6"/>
        <circle cx="128" cy="82" r="56" fill="none" stroke="var(--accent)" stroke-opacity="0.14" stroke-width="0.7" stroke-dasharray="2 4"/>
        <circle class="hud-scanner" cx="128" cy="82" r="68" fill="none" stroke="var(--accent)" stroke-opacity="0.28" stroke-width="0.9" stroke-dasharray="18 54 6 30"/>
        <!-- Fine holographic cortex contour -->
        <path class="lb-silhouette" d="M66 116 C44 110 38 86 48 66 C54 48 72 36 92 32 C108 20 136 18 156 28 C178 28 200 44 206 66 C216 80 212 104 196 116 C182 126 164 128 148 124 C140 134 128 142 122 150 C118 140 112 132 106 128 C90 128 76 122 66 116 Z" />
        <path class="lb-fold" d="M80 54 C96 62 110 60 124 52 M138 44 C154 54 168 54 182 48 M68 86 C86 82 104 88 118 96 M140 84 C156 80 174 84 190 92" />
        <!-- Flowing cyan/blue synaptic energy paths -->
        ${curves.map((pathD, idx) => `<path class="lb-synapse" d="${pathD}" fill="none" style="--d:${(idx * 0.35).toFixed(2)}s" />`).join("")}
        <!-- Interactive telemetry nodes -->
        ${nodes.map((n, idx) => {
          const r = 3.8 + (Math.min(100, Math.max(20, n.val)) / 100) * 2.6;
          return `
            <g class="lb-node" data-center-mode="${n.mode}" style="--d:${(idx * 0.4).toFixed(2)}s" tabindex="0" role="button" aria-label="${n.label}: ${n.val}">
              <circle class="lb-node-halo" cx="${n.x}" cy="${n.y}" r="${(r + 7).toFixed(1)}" />
              <circle cx="${n.x}" cy="${n.y}" r="${(r + 3.2).toFixed(1)}" fill="none" stroke="var(--accent)" stroke-opacity="0.45" stroke-width="0.7"/>
              <circle class="lb-node-core" cx="${n.x}" cy="${n.y}" r="${r.toFixed(1)}" />
              <text x="${n.x}" y="${(n.y - r - 5).toFixed(1)}" text-anchor="middle" class="hud-node-tag">${n.code}</text>
              <title>${n.label} — ${n.val}/100 (клик для тренировки)</title>
            </g>
          `;
        }).join("")}
      </svg>
      <div class="lb-legend">
        ${nodes.map((n) => `
          <button type="button" class="lb-pill" data-center-mode="${n.mode}">
            <span>${n.label}</span>
            <strong>${n.val}</strong>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function attachSpotlightEffects(root) {
  if (!root) return;
  root.querySelectorAll(".js-spotlight").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mx", `${x.toFixed(1)}%`);
      el.style.setProperty("--my", `${y.toFixed(1)}%`);
    }, { passive: true });
  });
}

function renderStickerCardHtml(card, state, idx = 0) {
  const today = new Date().toISOString().slice(0, 10);
  const studied = (state.knowledgeLog?.[today] || []).includes(card.id);
  const inFsrs = (state.cards || []).some((c) => c.front === card.question);
  const domInfo = KNOWLEDGE_DOMAINS.find((d) => d.id === card.domain) || KNOWLEDGE_DOMAINS[1];
  const tilts = [-1.15, 0.85, -0.75, 1.05, -0.9, 0.7];
  const tilt = tilts[idx % tilts.length];

  return `
    <article class="sticker-card js-spotlight ${studied ? "is-studied" : ""}" data-kid="${card.id}" data-domain="${card.domain}" style="--tilt:${tilt}deg">
      <div class="sticker-tape" aria-hidden="true"></div>
      <div class="sticker-inner">
        <div class="sticker-face sticker-front">
          <div class="st-top">
            <span class="st-domain">${domInfo.code} · ${domInfo.label}</span>
            <span class="st-tag">${escapeHtml(card.tag)}</span>
          </div>
          <h5>${escapeHtml(card.title)}</h5>
          <p class="st-body">${escapeHtml(card.body)}</p>
          <div class="st-note">
            <span>ГЛАВНАЯ МЫСЛЬ</span>
            <p>${escapeHtml(card.takeaway)}</p>
          </div>
          <cite class="st-src">${escapeHtml(card.source)}</cite>
          <div class="st-actions">
            <button type="button" class="st-btn is-flip" data-kflip="${card.id}">Проверить ↻</button>
            <button type="button" class="st-btn ${inFsrs ? "is-saved" : ""}" data-kfsrs="${card.id}">${inFsrs ? "✓ FSRS-5" : "+ FSRS-5"}</button>
            <button type="button" class="st-btn ${studied ? "is-done" : ""}" data-kdone="${card.id}">${studied ? "✓ Изучено" : "Изучено"}</button>
          </div>
        </div>

        <div class="sticker-face sticker-back" hidden>
          <div class="st-top">
            <span class="st-domain">АКТИВНОЕ ВСПОМИНАНИЕ</span>
            <button type="button" class="st-back-btn" data-kflip="${card.id}">← Назад</button>
          </div>
          <div class="st-q">
            <span class="st-label">ВОПРОС</span>
            <h5>${escapeHtml(card.question)}</h5>
          </div>
          <div class="st-a" data-kanswer="${card.id}" hidden>
            <span class="st-label">ОТВЕТ</span>
            <p>${escapeHtml(card.answer)}</p>
          </div>
          <div class="st-actions">
            <button type="button" class="primary-action st-reveal-btn" data-kreveal="${card.id}">Показать ответ</button>
            <button type="button" class="st-btn ${inFsrs ? "is-saved" : ""}" data-kfsrs="${card.id}">${inFsrs ? "✓ FSRS-5" : "+ FSRS-5"}</button>
            <button type="button" class="st-btn ${studied ? "is-done" : ""}" data-kdone="${card.id}">${studied ? "✓ Запомнил" : "+10 XP"}</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function bindStickerGrid(grid, state, handlers, onProgressChange) {
  if (!grid) return;
  attachSpotlightEffects(grid);

  grid.querySelectorAll("[data-kflip]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".sticker-card");
      if (!card) return;
      const front = card.querySelector(".sticker-front");
      const back = card.querySelector(".sticker-back");
      const showingBack = !back.hidden;
      front.hidden = !showingBack;
      back.hidden = showingBack;
      card.classList.toggle("is-flipped", !showingBack);
    });
  });

  grid.querySelectorAll("[data-kreveal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".sticker-card");
      const ans = card?.querySelector(`[data-kanswer="${btn.dataset.kreveal}"]`);
      if (ans) ans.hidden = false;
      btn.hidden = true;
    });
  });

  grid.querySelectorAll("[data-kfsrs]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cardObj = KNOWLEDGE_CARDS.find((c) => c.id === btn.dataset.kfsrs);
      if (!cardObj) return;
      handlers.saveKnowledgeToFsrs?.(cardObj);
      const card = btn.closest(".sticker-card");
      card?.querySelectorAll(`[data-kfsrs="${cardObj.id}"]`).forEach((b) => {
        b.classList.add("is-saved");
        b.textContent = "✓ FSRS-5";
      });
    });
  });

  grid.querySelectorAll("[data-kdone]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.kdone;
      handlers.markKnowledgeStudied?.(id);
      const todayStr = new Date().toISOString().slice(0, 10);
      state.knowledgeLog = state.knowledgeLog || {};
      state.knowledgeLog[todayStr] = state.knowledgeLog[todayStr] || [];
      if (!state.knowledgeLog[todayStr].includes(id)) state.knowledgeLog[todayStr].push(id);
      const card = btn.closest(".sticker-card");
      card?.classList.add("is-studied");
      card?.querySelectorAll(`[data-kdone="${id}"]`).forEach((b) => {
        b.classList.add("is-done");
        b.textContent = "✓ Изучено";
      });
      onProgressChange?.(state.knowledgeLog[todayStr].length);
    });
  });
}

export function renderPageCenter(refs, state, handlers) {
  setPageHeader(refs, "", "", "");
  document.body.classList.add("is-ritual-home");

  const model = getDashboardModel(state);
  const selectedId = state.protocols?.lastUsed || suggestProtocol(state);
  const selected = getProtocol(selectedId);
  const plan = selected.pick(state);
  const coach = buildTrainingCoach(state);
  const ritual = getRitualContext();
  const musicOn = Boolean(state.settings?.musicEnabled);
  const due = dueCardsCount(state);
  const readiness = Math.max(0, Math.min(100, Number(coach.readiness) || 72));
  const weakMode = plan.find((mode) => MODE_META[mode]) || coach.queue?.[0]?.mode || "recall";
  const weakMeta = MODE_META[weakMode] || MODE_META.recall;
  const nowStr = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const todayKey = new Date().toISOString().slice(0, 10);
  const studiedCount = (state.knowledgeLog?.[todayKey] || []).length;

  const quickScenarios = [
    { id: "sprint",   label: "Спринт",  time: "8 мин" },
    { id: "adaptive", label: "Адаптив", time: "18 мин" },
    { id: "memory",   label: "Память",  time: "18 мин" },
    { id: "recovery", label: "Отдых",   time: "12 мин" },
  ];

  refs.arena.innerHTML = `
    <div class="ritual-home">
      <!-- 1. Cozy Coffee & Ambient Ritual Capsule -->
      <div class="cozy-capsule js-spotlight">
        <div class="cc-left">
          <div class="cc-cup" aria-hidden="true">${getRitualSvg("morning")}</div>
          <div class="cc-copy">
            <div class="cc-meta">
              <span class="st-label">${ritual.kicker}</span>
              <span class="cc-time">${nowStr}</span>
            </div>
            <p class="cc-line">${ritual.title}</p>
          </div>
        </div>
        <button type="button" class="cc-music-pill ${musicOn ? "is-playing" : ""}" id="ritualMusicBtn" aria-pressed="${musicOn ? "true" : "false"}">
          <span class="srb-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="cc-music-label">${musicOn ? "Lo-Fi Ambient играет" : "Включить фоновую музыку"}</span>
        </button>
      </div>

      <!-- 2. Centerpiece: Single-Focus Holographic Brain Stage -->
      <section class="ritual-stage js-spotlight">
        <div class="rs-brain-col">
          ${renderLivingBrainSvg(state.domains, model.overall, readiness)}
          <div class="rs-node-hint" id="rsNodeHint">Наведи на зону мозга или кликни для мгновенного старта</div>
        </div>

        <div class="rs-action-col">
          <div class="rs-status-row">
            <span class="rs-badge">SYNC ${readiness}%</span>
            <span class="rs-stat">Индекс <strong>${model.overall}</strong></span>
            ${due > 0 ? `<button type="button" class="rs-due-btn" data-quick-mode="recall">FSRS повторы · ${due}</button>` : ""}
          </div>

          <h2 class="rs-title">${getTimeGreeting()}</h2>
          <p class="rs-desc">${selected.description}</p>

          <div class="rs-mode-pills" role="group" aria-label="Режим сессии">
            ${quickScenarios.map((sc) => `
              <button type="button" class="rs-pill ${selectedId === sc.id ? "is-active" : ""}" data-protocol="${sc.id}">
                <strong>${sc.label}</strong>
                <small>${sc.time}</small>
              </button>
            `).join("")}
          </div>

          <div class="rs-cta-row">
            <button class="primary-action rs-main-cta" type="button" id="heroStartCircuit">
              <span>Начать · ${selected.name}</span>
              <span class="cta-arrow" aria-hidden="true">→</span>
            </button>
            <button class="ghost-action rs-weak-btn" type="button" data-quick-mode="${weakMode}">
              Слабая зона: ${escapeHtml(weakMeta.title)}
            </button>
          </div>
        </div>
      </section>

      <!-- 3. Stylish Collectible Knowledge Sticker-Cards -->
      <section class="stickers-showcase" id="learnTodaySection">
        <div class="ss-head">
          <div>
            <span class="st-label">СТИКЕРЫ ЗНАНИЙ · НАУКА · МАТЕМАТИКА · ИИ · АНТИЭЙДЖИНГ</span>
            <h3>Изучить сегодня</h3>
          </div>
          <div class="ss-controls">
            <span class="sls-progress-pill" id="learnProgressPill">${studiedCount} / 4 ИЗУЧЕНО</span>
            <button type="button" class="ghost-action sls-btn" id="learnShuffleBtn">Другие ↻</button>
            <button type="button" class="ghost-action sls-btn" id="openAllStickersBtn">Все 24 →</button>
          </div>
        </div>

        <div class="stickers-grid" id="learnCardsGrid"></div>
      </section>
    </div>
  `;

  attachSpotlightEffects(refs.arena);

  // Ambient music toggle
  const musicBtn = refs.arena.querySelector("#ritualMusicBtn");
  musicBtn?.addEventListener("click", () => {
    const isNowOn = handlers.toggleAmbientMusic?.();
    musicBtn.classList.toggle("is-playing", Boolean(isNowOn));
    musicBtn.setAttribute("aria-pressed", isNowOn ? "true" : "false");
    const lbl = musicBtn.querySelector(".cc-music-label");
    if (lbl) lbl.textContent = isNowOn ? "Lo-Fi Ambient играет" : "Включить фоновую музыку";
  });

  // Live hover feedback on Brain HUD nodes
  const nodeHint = refs.arena.querySelector("#rsNodeHint");
  refs.arena.querySelectorAll(".lb-node, .lb-pill").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      const label = el.getAttribute("aria-label") || el.textContent.trim();
      if (nodeHint && label) nodeHint.textContent = `${label} · клик — запуск в 1 касание`;
    });
    el.addEventListener("click", () => {
      const mode = el.dataset.centerMode;
      if (mode) handlers.quickLaunchMode ? handlers.quickLaunchMode(mode) : handlers.openMode(mode);
    });
  });

  // Protocol & quick-launch buttons
  refs.arena.querySelector("#heroStartCircuit")?.addEventListener("click", () => handlers.startCircuit(selectedId));
  refs.arena.querySelectorAll("[data-protocol]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.selectProtocol(btn.dataset.protocol));
  });
  refs.arena.querySelectorAll("[data-quick-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const m = btn.dataset.quickMode;
      handlers.quickLaunchMode ? handlers.quickLaunchMode(m) : handlers.openMode(m);
    });
  });
  refs.arena.querySelector("#openAllStickersBtn")?.addEventListener("click", () => handlers.openKnowledge?.());

  // 4 Today's Collectible Stickers
  let kOffset = 0;
  const kGrid = refs.arena.querySelector("#learnCardsGrid");
  const kPill = refs.arena.querySelector("#learnProgressPill");

  function drawHomeStickers() {
    if (!kGrid) return;
    const cards = getKnowledgeByDomain("all", kOffset);
    kGrid.innerHTML = cards.map((card, i) => renderStickerCardHtml(card, state, i)).join("");
    bindStickerGrid(kGrid, state, handlers, (cnt) => {
      if (kPill) kPill.textContent = `${cnt} / 4 ИЗУЧЕНО`;
    });
  }

  refs.arena.querySelector("#learnShuffleBtn")?.addEventListener("click", () => {
    kOffset += 1;
    drawHomeStickers();
  });

  drawHomeStickers();
}

export function renderPageKnowledge(refs, state, handlers) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const studiedCount = (state.knowledgeLog?.[todayKey] || []).length;
  const due = dueCardsCount(state);

  setPageHeader(refs, "база знаний · fsrs-5", "Стикеры знаний", `
    <div class="sls-head-actions">
      <span class="sls-progress-pill" id="kPageProgress">${studiedCount} ИЗУЧЕНО СЕГОДНЯ</span>
      ${due > 0 ? `<button type="button" class="primary-action sls-btn" id="kOpenRecall">Повторить FSRS (${due}) →</button>` : ""}
      <button type="button" class="ghost-action sls-btn" id="kAddToggle">+ Свой стикер</button>
    </div>
  `);

  refs.arena.innerHTML = `
    <div class="knowledge-board-page">
      <div class="sls-tabs" id="kPageTabs" role="tablist" aria-label="Темы знаний">
        ${KNOWLEDGE_DOMAINS.map((d, idx) => `
          <button type="button" class="sls-tab ${idx === 0 ? "is-active" : ""}" data-kdomain="${d.id}" role="tab" aria-selected="${idx === 0 ? "true" : "false"}">
            <span>${d.code}</span> ${d.label}
          </button>
        `).join("")}
      </div>

      <form class="sls-custom-form" id="kCustomForm" hidden>
        <div class="sls-cf-grid">
          <input type="text" id="kCustomFront" placeholder="Заголовок новости или вопрос для проверки" required />
          <input type="text" id="kCustomBack" placeholder="Ключевой ответ / суть для запоминания в FSRS-5" required />
        </div>
        <div class="sls-cf-actions">
          <button type="submit" class="primary-action">Сохранить в FSRS-5</button>
          <button type="button" class="ghost-action" id="kCustomCancel">Отмена</button>
        </div>
      </form>

      <div class="stickers-grid stickers-grid-full" id="kPageGrid"></div>
    </div>
  `;

  let activeDomain = "all";
  const grid = refs.arena.querySelector("#kPageGrid");
  const pill = refs.pageActions?.querySelector("#kPageProgress");

  function drawAll() {
    const list = activeDomain === "all"
      ? KNOWLEDGE_CARDS
      : KNOWLEDGE_CARDS.filter((c) => c.domain === activeDomain);
    grid.innerHTML = list.map((card, i) => renderStickerCardHtml(card, state, i)).join("");
    bindStickerGrid(grid, state, handlers, (cnt) => {
      if (pill) pill.textContent = `${cnt} ИЗУЧЕНО СЕГОДНЯ`;
    });
  }

  refs.arena.querySelectorAll("#kPageTabs [data-kdomain]").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeDomain = tab.dataset.kdomain;
      refs.arena.querySelectorAll("#kPageTabs [data-kdomain]").forEach((t) => {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      drawAll();
    });
  });

  const form = refs.arena.querySelector("#kCustomForm");
  refs.pageActions?.querySelector("#kAddToggle")?.addEventListener("click", () => {
    if (form) form.hidden = !form.hidden;
  });
  refs.pageActions?.querySelector("#kOpenRecall")?.addEventListener("click", () => handlers.openRecall?.());
  refs.arena.querySelector("#kCustomCancel")?.addEventListener("click", () => {
    if (form) form.hidden = true;
  });
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = refs.arena.querySelector("#kCustomFront");
    const b = refs.arena.querySelector("#kCustomBack");
    if (f?.value.trim() && b?.value.trim()) {
      handlers.addCustomKnowledgeCard?.(f.value, b.value);
      f.value = "";
      b.value = "";
      form.hidden = true;
    }
  });

  drawAll();
}

function renderCenterMissionDeck(state, protocol, plan, coach) {
  const history = state.history || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayRounds = history.filter((r) => r.date === today);
  const due = dueCardsCount(state);
  const weakMode = plan.find((mode) => MODE_META[mode]) || coach.queue?.[0]?.mode || "recall";
  const weakMeta = MODE_META[weakMode] || MODE_META.recall;
  const nextMode = coach.queue?.[0]?.mode || weakMode;
  const nextMeta = MODE_META[nextMode] || weakMeta;
  const readiness = Number(coach.readiness) || 0;
  const readinessTone = readiness >= 76 ? "good" : readiness >= 52 ? "warn" : "bad";
  const lastRound = history[history.length - 1];
  const lastLabel = lastRound
    ? `${Math.round((lastRound.accuracy || 0) * 100)}% · ${lastRound.xp || 0} XP`
    : "ещё нет данных";

  return `
    <section class="center-mission-deck-v10" style="--mission-accent:${protocol.accent}">
      <div class="mission-deck-head">
        <div>
          <div class="progress-kicker">mission control</div>
          <h4>Быстрые решения на сегодня</h4>
        </div>
        <span class="mission-readiness is-${readinessTone}">${readiness}%</span>
      </div>
      <div class="mission-deck-grid">
        <button class="mission-card is-primary" type="button" data-center-protocol="${protocol.id}">
          <span class="mission-icon">▶</span>
          <strong>${escapeHtml(protocol.name)}</strong>
          <small>${protocol.duration} мин · ${protocol.rounds} раунда · ${todayRounds.length} уже сегодня</small>
        </button>
        <button class="mission-card" type="button" data-center-mode="${weakMode}">
          <span class="mission-icon">${escapeHtml(weakMeta.code || "NF")}</span>
          <strong>${escapeHtml(weakMeta.title)}</strong>
          <small>слабая зона · L${state.levels?.[weakMode] || 1} · приоритет ${Math.round(getModeNeed(state, weakMode))}</small>
        </button>
        <button class="mission-card" type="button" data-center-mode="${due > 0 ? "recall" : nextMode}">
          <span class="mission-icon">${due > 0 ? "RC" : escapeHtml(nextMeta.code || "NX")}</span>
          <strong>${due > 0 ? `${due} повторов` : escapeHtml(nextMeta.title)}</strong>
          <small>${due > 0 ? "закрепить карточки памяти" : `следующий умный drill · ${lastLabel}`}</small>
        </button>
        <button class="mission-card" type="button" id="centerOpenProgress">
          <span class="mission-icon">↗</span>
          <strong>Разобрать прогресс</strong>
          <small>${state.profile?.totalXp || 0} XP · ${history.length} раундов · ${getTodayAccuracy(state)}% сегодня</small>
        </button>
      </div>
      <div class="mission-deck-foot">
        <button class="ghost-action" type="button" id="centerOpenDrills">Открыть библиотеку</button>
        <span>${escapeHtml(coach.guardrail)}</span>
      </div>
    </section>
  `;
}

function renderSleepCard(state) {
  const hours = state.sleep?.hoursToday;
  const isStale = !state.sleep?.lastUpdate || (Date.now() - state.sleep.lastUpdate > 18 * 60 * 60 * 1000);
  const v = isStale ? null : hours;
  const display = v !== null && v !== undefined ? `${v} ч` : "—";
  const tone = v === null ? "muted" : v >= 7 && v <= 9 ? "good" : v < 6 ? "bad" : "warn";

  const mood = state.mood?.value;
  const energy = state.mood?.energy;
  const moodStale = !state.mood?.lastUpdate || (Date.now() - state.mood.lastUpdate > 12 * 60 * 60 * 1000);
  const mv = moodStale ? null : mood;
  const ev = moodStale ? null : energy;
  const moodEmoji = mv === null ? "—" : mv <= 2 ? "😔" : mv === 3 ? "😐" : mv === 4 ? "🙂" : "😄";
  const energyDots = ev === null ? "—" : "●".repeat(ev) + "○".repeat(5 - ev);

  const tip = v === null
    ? "Введи самочувствие — система подстроит нагрузку."
    : v >= 7 ? "Сон ок · можешь полную нагрузку."
    : v >= 6 ? "Сна впритык — избегай Sprint."
    : "Дефицит сна — Recovery + recall, без Sprint.";

  // One-line collapsible strip with tap-to-expand (clean instrument style)
  return `
    <details class="sleep-card wellbeing-card studio-wellbeing">
      <summary class="wb-summary">
        <span class="wb-strip">
          <span class="wb-chip wb-chip-${tone}" data-tooltip="часы сна">СОН ${display}</span>
          <span class="wb-chip" data-tooltip="настроение">НАСТР ${mv ?? "—"}/5</span>
          <span class="wb-chip" data-tooltip="энергия">ЭНЕРГ ${energyDots}</span>
        </span>
        <span class="wb-tip-inline">${tip}</span>
      </summary>
      <div class="wb-expanded">
        <div class="wb-row">
          <span class="wb-label">СОН</span>
          <strong id="sleepValue" class="sleep-${tone}">${display}</strong>
          <input id="sleepSlider" type="range" min="0" max="12" step="0.5" value="${v ?? 7}" />
        </div>
        <div class="wb-row">
          <span class="wb-label">НАСТРОЕНИЕ</span>
          <strong id="moodValue">${mv ?? "—"}/5</strong>
          <input id="moodSlider" type="range" min="1" max="5" step="1" value="${mv ?? 3}" />
        </div>
        <div class="wb-row">
          <span class="wb-label">ЭНЕРГИЯ</span>
          <strong id="energyValue">${energyDots}</strong>
          <input id="energySlider" type="range" min="1" max="5" step="1" value="${ev ?? 3}" />
        </div>
      </div>
    </details>
  `;
}

function renderCommandRibbon(state, protocol, coach) {
  const today = new Date().toISOString().slice(0, 10);
  const todayRounds = (state.history || []).filter((r) => r.date === today);
  const due = dueCardsCount(state);
  const next = coach.queue[0];
  const accuracy = getTodayAccuracy(state);
  return `
    <section class="command-ribbon" style="--route-accent:${protocol.accent}; --route-glow:${protocol.accent}24">
      <button class="command-ribbon-item is-hot" type="button" data-coach-protocol="${protocol.id}">
        <span class="cri-icon" aria-hidden="true">▶</span>
        <span>
          <strong>${escapeHtml(protocol.name)}</strong>
          <small>${protocol.duration} мин · основной запуск</small>
        </span>
      </button>
      <button class="command-ribbon-item" type="button" data-mode="${due > 0 ? "recall" : next?.mode || "recall"}">
        <span class="cri-icon" aria-hidden="true">${due > 0 ? "RC" : escapeHtml(next?.meta?.code || "NF")}</span>
        <span>
          <strong>${due > 0 ? `${due} повторов` : escapeHtml(next?.meta?.title || "Следующий drill")}</strong>
          <small>${due > 0 ? "закрепить память" : `приоритет ${next?.need || 0}/100`}</small>
        </span>
      </button>
      <div class="command-ribbon-item">
        <span class="cri-icon" aria-hidden="true">R</span>
        <span>
          <strong>${coach.readiness}</strong>
          <small>готовность</small>
        </span>
      </div>
      <div class="command-ribbon-item">
        <span class="cri-icon" aria-hidden="true">D</span>
        <span>
          <strong>${todayRounds.length} р. · ${accuracy}%</strong>
          <small>сегодня</small>
        </span>
      </div>
    </section>
  `;
}

function renderGoalsCard(state) {
  const goals = getActiveGoals(state);
  return `
    <section class="goals-card">
      <div class="progress-kicker">цели · ${goals.length}</div>
      <h4>Личные цели</h4>
      ${goals.length ? `
        <div class="goals-list">
          ${goals.map((g) => {
            const ev = evaluateGoal(state, g);
            const meta = describeGoal(g);
            const cls = ev.reached ? "is-reached" : ev.expired ? "is-expired" : "";
            return `
              <div class="goal-item ${cls}">
                <div class="goal-head">
                  <span class="goal-icon">${meta.icon}</span>
                  <strong>${escapeHtml(g.label)}</strong>
                  <button class="goal-x" type="button" data-goal-remove="${g.id}" aria-label="Удалить">×</button>
                </div>
                <div class="goal-bar"><span style="width:${ev.progress}%"></span></div>
                <div class="goal-meta">
                  <span>${meta.short}: <strong>${ev.current}</strong> / ${meta.unit}</span>
                  <span class="${ev.daysLeft <= 2 ? "warn" : ""}">${ev.daysLeft} д. осталось</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      ` : `<p class="hint-line">Поставь конкретную цель с дедлайном — мозг тренируется на маркерах прогресса.</p>`}
      <button class="ghost-action" type="button" id="openGoalsLib">＋ Добавить цель</button>
      <div class="goals-lib" id="goalsLib" hidden>
        ${GOAL_TEMPLATES.map((t) => `
          <button class="goal-template" type="button" data-goal-template="${t.id}">
            <strong>${escapeHtml(t.label)}</strong>
            <small>${t.days} дней</small>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderReminderCard(state) {
  // find drills not done in last 5 days that have history
  const now = Date.now();
  const fiveDays = 5 * 24 * 60 * 60 * 1000;
  const seen = new Map();
  state.history.forEach((r) => {
    if (!seen.has(r.mode) || (r.timestamp || 0) > seen.get(r.mode).timestamp) {
      seen.set(r.mode, { timestamp: r.timestamp || 0, accuracy: r.accuracy || 0 });
    }
  });
  const stale = [...seen.entries()]
    .filter(([_, info]) => now - info.timestamp > fiveDays)
    .map(([mode, info]) => ({ mode, daysAgo: Math.floor((now - info.timestamp) / (24 * 60 * 60 * 1000)), acc: info.accuracy }))
    .sort((a, b) => b.daysAgo - a.daysAgo)
    .slice(0, 3);
  if (!stale.length) return "";
  return `
    <section class="reminder-card">
      <div class="progress-kicker">давно не делал</div>
      <h4>Точность падает без практики</h4>
      <div class="reminder-list">
        ${stale.map((s) => {
          const meta = MODE_META[s.mode];
          if (!meta) return "";
          return `
            <button class="reminder-item" type="button" data-mode="${s.mode}">
              <strong>${escapeHtml(meta.title)}</strong>
              <small>${s.daysAgo} дн. назад · было ${Math.round(s.acc * 100)}%</small>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function buildTrainingCoach(state) {
  const history = state.history || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayRounds = history.filter((r) => r.date === today);
  const fatigue = getFatigueSignal(state);
  const sleepFresh = state.sleep?.lastUpdate && Date.now() - state.sleep.lastUpdate < 18 * 60 * 60 * 1000;
  const sleepHours = sleepFresh && Number.isFinite(state.sleep?.hoursToday) ? Number(state.sleep.hoursToday) : null;
  const moodFresh = state.mood?.lastUpdate && Date.now() - state.mood.lastUpdate < 12 * 60 * 60 * 1000;
  const energy = moodFresh && Number.isFinite(state.mood?.energy) ? Number(state.mood.energy) : null;
  const weak = getWeakestDomain(state);
  const due = dueCardsCount(state);
  const todayAcc = getTodayAccuracy(state);
  const recommended = getRecommendedPlan(state).filter((mode) => MODE_META[mode]);
  const lowSleep = sleepHours !== null && sleepHours < 6;
  const lowEnergy = energy !== null && energy <= 2;
  const heavyDay = (state.profile?.todayXp || 0) >= 80 || todayRounds.length >= 6;
  const noHistory = history.length < 3;

  let tone = "focus";
  let title = "Собрать умный стек";
  let summary = "Начни с главного дефицита, затем добери скорость и контроль внимания.";
  let guardrail = "Держи точность в рабочей зоне 65-85%. Если падаешь ниже 60%, переключайся на Recovery.";
  let primaryProtocol = state.protocols?.lastUsed || "adaptive";
  let primaryMode = null;

  if (noHistory) {
    tone = "calibrate";
    title = "Калибровка базы";
    summary = "Сделай короткий стартовый замер: реакция, память и фокус. Система быстрее поймёт твой темп.";
    guardrail = "Первые 3-5 раундов важнее пройти честно, чем набрать максимум XP.";
    primaryMode = "reaction";
    primaryProtocol = null;
  } else if (fatigue.active || lowSleep || lowEnergy || heavyDay) {
    tone = "recovery";
    title = "Восстановить точность";
    summary = lowSleep
      ? "Сон просел, поэтому лучше мягкий протокол: recall, образы, минимум давления на скорость."
      : heavyDay
        ? "Дневной объём уже высокий. Следующий раунд лучше сделать мягким, чтобы не закреплять ошибки."
        : "Последние раунды шумят. Снизь темп и верни контроль.";
    guardrail = "Сегодня цель - чистота ответа. Скорость вернётся после восстановления.";
    primaryProtocol = "recovery";
  } else if (todayRounds.length === 0) {
    tone = "start";
    title = "Первый качественный раунд";
    summary = `Слабая зона сейчас - ${weak.label.toLowerCase()}. Запусти протокол, который начнёт с неё и не перегрузит вход.`;
    guardrail = "Перед первым раундом оцени ожидаемую точность - это улучшает метакогнитивную калибровку.";
  } else if (todayAcc >= 85 && todayRounds.length >= 2) {
    tone = "peak";
    title = "Можно усилить вызов";
    summary = `Сегодня ${todayAcc}% точности. Мозг держит нагрузку - хороший момент для Sprint или сложного executive-модуля.`;
    guardrail = "Если две ошибки подряд, перестань гнаться за скоростью и вернись в adaptive.";
    primaryProtocol = "sprint";
  } else {
    tone = "focus";
    const top = recommended[0] || "recall";
    title = MODE_META[top]?.title || "Следующий модуль";
    summary = `Приоритет ${Math.round(getModeNeed(state, top))}/100: слабые домены плюс свежая точность указывают сюда.`;
  }

  const queue = recommended.slice(0, 3).map((mode) => ({
    mode,
    meta: MODE_META[mode],
    need: Math.round(getModeNeed(state, mode)),
    level: state.levels?.[mode] || 1,
  }));
  const protocol = primaryProtocol ? getProtocol(primaryProtocol) : null;
  const readiness = computeReadinessScore({ fatigue, sleepHours, energy, heavyDay, todayAcc, todayRounds });
  const reasons = [
    `слабая зона: ${weak.label}`,
    sleepHours === null ? "сон: не отмечен" : `сон: ${sleepHours} ч`,
    todayRounds.length ? `сегодня: ${todayRounds.length} р. · ${todayAcc}%` : "сегодня: старт",
    due > 0 ? `повторы: ${due}` : "повторы: чисто",
  ];

  return {
    tone,
    title,
    summary,
    guardrail,
    readiness,
    primaryMode,
    primaryProtocol,
    primaryLabel: primaryMode
      ? `Запустить ${MODE_META[primaryMode]?.title || "модуль"}`
      : `Запустить ${protocol?.name || "протокол"}`,
    protocol,
    queue,
    reasons,
  };
}

function computeReadinessScore({ fatigue, sleepHours, energy, heavyDay, todayAcc, todayRounds }) {
  let score = 72;
  if (fatigue.active) score -= 22;
  if (sleepHours !== null) {
    if (sleepHours < 5.5) score -= 22;
    else if (sleepHours < 6.5) score -= 12;
    else if (sleepHours >= 7 && sleepHours <= 9) score += 8;
  }
  if (energy !== null) score += (energy - 3) * 6;
  if (heavyDay) score -= 16;
  if (todayRounds.length && todayAcc >= 85) score += 8;
  if (todayRounds.length && todayAcc < 60) score -= 12;
  return Math.max(5, Math.min(99, Math.round(score)));
}

function renderCoachCard(coach, variant = "rail") {
  const wide = variant === "wide";
  const actionAttr = coach.primaryMode
    ? `data-coach-mode="${coach.primaryMode}"`
    : `data-coach-protocol="${coach.primaryProtocol || "adaptive"}"`;
  return `
    <section class="coach-card coach-${coach.tone} ${wide ? "coach-wide" : ""}" style="--route-accent:${coach.protocol?.accent || "var(--accent)"}">
      <div class="coach-head">
        <div>
          <div class="progress-kicker">нейрокоуч</div>
          <h4>${escapeHtml(coach.title)}</h4>
        </div>
        <div class="coach-score" data-tooltip="готовность по сну, энергии, усталости и сегодняшнему объёму">
          <strong>${coach.readiness}</strong>
          <small>готовность</small>
        </div>
      </div>
      <p>${escapeHtml(coach.summary)}</p>
      <div class="coach-reasons">
        ${coach.reasons.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      <div class="coach-stack" aria-label="быстрые рекомендации">
        ${coach.queue.map((item) => `
          <button type="button" class="coach-stack-item" data-coach-mode="${item.mode}" style="--route-accent:${item.meta.accent}">
            <span>${item.meta.code}</span>
            <strong>${escapeHtml(item.meta.title)}</strong>
            <small>L${item.level} · ${item.need}</small>
          </button>
        `).join("")}
      </div>
      <div class="coach-foot">
        <button class="primary-action" type="button" ${actionAttr}>${escapeHtml(coach.primaryLabel)}</button>
        <small>${escapeHtml(coach.guardrail)}</small>
      </div>
    </section>
  `;
}

function bindCoachActions(root, handlers) {
  root.querySelectorAll("[data-coach-mode]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.openMode?.(btn.dataset.coachMode));
  });
  root.querySelectorAll("[data-coach-protocol]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.startCircuit?.(btn.dataset.coachProtocol));
  });
}

export function renderPageRecords(refs, state, handlers) {
  setPageHeader(refs, "архив рекордов", "Личные рекорды", "");
  const records = computeAllRecords(state);
  const totals = {
    totalRounds: state.history.length,
    totalXp: state.profile.totalXp || 0,
    bestStreak: state.history.reduce((m, r) => Math.max(m, r.streakBest || 0), 0),
    bestSession: state.history.reduce((m, r) => Math.max(m, r.accuracy || 0), 0),
  };

  refs.arena.innerHTML = `
    <div class="progress-grid">
      ${renderRecordsCockpit(state, records, totals)}
      <section class="progress-card progress-program">
        <div class="progress-kicker">сводка</div>
        <h4>Твой архив</h4>
        <div class="result-grid" style="grid-template-columns:repeat(4, 1fr)">
          <div><span>${totals.totalRounds}</span><small>раундов всего</small></div>
          <div><span>${totals.totalXp}</span><small>XP накоплено</small></div>
          <div><span>${totals.bestStreak}</span><small>лучшая серия</small></div>
          <div><span>${Math.round(totals.bestSession * 100)}%</span><small>топ-точность</small></div>
        </div>
      </section>
      ${records.length ? records.map((r, i) => `
        <section class="progress-card record-card" style="--i:${i}">
          <div class="record-head">
            <img src="${r.sprite}" alt="" />
            <div>
              <div class="progress-kicker">${escapeHtml(r.kicker)}</div>
              <h4>${escapeHtml(r.label)}</h4>
            </div>
            <span class="badge">L${r.level}</span>
          </div>
          <div class="record-grid">
            <div><span>${r.bestAcc}%</span><small>лучшая точность</small></div>
            <div><span>${r.avgAcc}%</span><small>средняя</small></div>
            <div><span>${r.bestRt !== null ? r.bestRt + " ms" : "—"}</span><small>лучший RT</small></div>
            <div><span>${r.bestStreak}</span><small>лучшая серия</small></div>
            <div><span>${r.count}</span><small>раундов</small></div>
            <div><span>${r.totalXp}</span><small>XP</small></div>
          </div>
          <button class="ghost-action" type="button" data-mode="${r.mode}">Открыть модуль →</button>
        </section>
      `).join("") : `
        <section class="progress-card">
          <div class="progress-kicker">пусто</div>
          <h4>Начни тренироваться</h4>
          <p class="hint-line">Здесь появятся твои PR-ы. Один раунд — и первая запись.</p>
        </section>
      `}
    </div>
  `;
  refs.arena.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.openMode(btn.dataset.mode));
  });
}

function renderRecordsCockpit(state, records, totals) {
  const best = records.length ? records.reduce((top, r) => (r.bestAcc > top.bestAcc ? r : top), records[0]) : null;
  const volume = records.length ? records.reduce((top, r) => (r.count > top.count ? r : top), records[0]) : null;
  const weak = records.length ? records.reduce((low, r) => (r.avgAcc < low.avgAcc ? r : low), records[0]) : null;
  const newest = (state.history || []).slice(-1)[0];
  const unlocked = state.achievements?.length || 0;
  const level = getAverageLevel(state);

  if (!records.length) {
    return `
      <section class="records-cockpit-v10" style="grid-column:1 / -1">
        <div class="records-cockpit-copy">
          <div class="progress-kicker">records cockpit</div>
          <h3>Первый рекорд ждёт запуска</h3>
          <p>Сделай любой drill, и здесь появятся PR, лучшая серия, точность, скорость реакции и история роста.</p>
        </div>
        <button class="primary-action" type="button" data-mode="reaction">Начать быстрый замер</button>
      </section>
    `;
  }

  return `
    <section class="records-cockpit-v10" style="--record-accent:${best?.accent || "var(--accent)"}; grid-column:1 / -1">
      <div class="records-cockpit-copy">
        <div class="progress-kicker">records cockpit</div>
        <h3>${best.bestAcc}% · ${escapeHtml(best.label)}</h3>
        <p>Лучший PR: <strong>${escapeHtml(best.label)}</strong>. Самая большая практика: <strong>${escapeHtml(volume.label)}</strong>. Зона для добора: <strong>${escapeHtml(weak.label)}</strong>.</p>
      </div>
      <div class="records-cockpit-metrics">
        <div><strong>${totals.totalRounds}</strong><small>раундов</small></div>
        <div><strong>${totals.totalXp}</strong><small>XP</small></div>
        <div><strong>L${level}</strong><small>средний уровень</small></div>
        <div><strong>${unlocked}/${ALL_ACHIEVEMENTS.length}</strong><small>ачивки</small></div>
      </div>
      <div class="records-cockpit-actions">
        <button class="primary-action" type="button" data-mode="${weak.mode}">Прокачать слабую зону</button>
        <button class="ghost-action" type="button" data-mode="${best.mode}">Повторить рекорд</button>
        <span>${newest ? `последний раунд: ${Math.round((newest.accuracy || 0) * 100)}% · ${newest.xp || 0} XP` : "история пока пустая"}</span>
      </div>
    </section>
  `;
}

function computeAllRecords(state) {
  const grouped = new Map();
  state.history.forEach((h) => {
    if (!grouped.has(h.mode)) grouped.set(h.mode, []);
    grouped.get(h.mode).push(h);
  });
  return [...grouped.entries()].map(([mode, items]) => {
    const meta = MODE_META[mode] || { title: mode, kicker: "", accent: "#7c5cff" };
    const visual = getModeVisual(mode);
    const accs = items.map((i) => i.accuracy || 0);
    const rts = items.filter((i) => i.rt).map((i) => i.rt);
    return {
      mode,
      label: meta.title,
      kicker: meta.kicker || "",
      sprite: visual.sprite,
      accent: meta.accent,
      level: state.levels[mode] || 1,
      bestAcc: Math.round(Math.max(...accs) * 100),
      avgAcc: Math.round(accs.reduce((a, b) => a + b, 0) / accs.length * 100),
      bestRt: rts.length ? Math.round(Math.min(...rts)) : null,
      bestStreak: items.reduce((m, r) => Math.max(m, r.streakBest || 0), 0),
      count: items.length,
      totalXp: items.reduce((s, r) => s + (r.xp || 0), 0),
    };
  }).sort((a, b) => b.bestAcc - a.bestAcc);
}

function renderProgramHero(state, day, info, summary, todayDone) {
  if (!info || day > 21) {
    // program completed
    if (summary && summary.isDone) {
      return `
        <section class="program-card program-done">
          <div class="progress-kicker">программа завершена · 21/21</div>
          <h3>Готово. Сравним до и после.</h3>
          <div class="program-deltas">
            ${summary.deltas.map((d) => `
              <div class="program-delta-tile" style="border-color:${d.color}">
                <small>${d.label}</small>
                <div class="program-delta-row">
                  <span>${d.before}</span>
                  <span class="program-delta-arrow">→</span>
                  <span>${d.now}</span>
                  <strong class="${d.delta >= 0 ? "good" : "bad"}">${d.delta >= 0 ? "+" : ""}${d.delta}</strong>
                </div>
              </div>
            `).join("")}
          </div>
          <p>Средний прирост: <strong>${summary.meanDelta >= 0 ? "+" : ""}${summary.meanDelta} п.</strong> по нейроиндексу. Ты разогнал мозг за 21 день. Можно начать новый цикл или взять Recovery-неделю.</p>
        </section>
      `;
    }
    return "";
  }
  const dotsTotal = 21;
  return `
    <section class="program-card">
      <div class="program-card-head">
        <div>
          <div class="progress-kicker">21-дневная программа · день ${day}/${dotsTotal}</div>
          <h3>${info.focus}</h3>
        </div>
        <div class="program-streak" data-tooltip="дней подряд">
          🔥 ${summary?.streak || 0}
        </div>
      </div>
      <p>${info.note}</p>
      <div class="program-dots">
        ${Array.from({ length: dotsTotal }, (_, i) => {
          const d = i + 1;
          const done = state.program.completedDays.includes(d);
          const isToday = d === day;
          return `<span class="program-dot ${done ? "is-done" : ""} ${isToday ? "is-today" : ""}" title="день ${d}"></span>`;
        }).join("")}
      </div>
      <div class="program-meta">
        <span>Сегодня: <strong>${PROTOCOLS[info.protocol]?.name || info.protocol}</strong> · ${PROTOCOLS[info.protocol]?.duration || 18} мин</span>
        <span>Осталось: <strong>${summary?.daysRemaining || 0}</strong></span>
      </div>
      <div class="program-actions">
        ${todayDone ? `
          <span class="status-pill good">✓ сегодня сделано</span>
          <button class="ghost-action" type="button" id="startProgramDay">Повторить</button>
        ` : `
          <button class="primary-action" type="button" id="startProgramDay">▶ Сделать день ${day}</button>
          <button class="ghost-action" type="button" id="completeProgramDay" title="отметить день сделанным без раундов">Отметить сделанным</button>
        `}
      </div>
    </section>
  `;
}

/* === Page: Тренировки =================================================== */
export function renderPageDrills(refs, state, handlers) {
  const favorites = new Set(state.favorites?.drills || []);
  const recommended = getRecommendedPlan(state).filter((mode) => MODE_META[mode]).slice(0, 5);
  const primeMode = recommended[0] || DRILL_IDS[0];
  const primeMeta = MODE_META[primeMode];
  const favoriteList = DRILL_IDS.filter((id) => favorites.has(id));
  const counts = { all: DRILL_IDS.length };
  DOMAINS.forEach((d) => {
    counts[d.id] = DRILL_IDS.filter((id) => {
      const weights = MODE_META[id]?.domainWeights || {};
      return Object.keys(weights).includes(d.id);
    }).length;
  });
  let activeFilter = "all";
  let activeSort = "recommended";
  let density = state.settings?.drillDensity || "visual";
  let query = "";

  setPageHeader(refs, "библиотека", "Тренировки", `
    <div class="drills-filter" id="drillsFilter">
      <button class="chip is-active" type="button" data-filter="all">все ${counts.all}</button>
      <button class="chip" type="button" data-filter="favorites">избранное ${favoriteList.length}</button>
      ${DOMAINS.map((d) => `<button class="chip" type="button" data-filter="${d.id}">${d.label.toLowerCase()} ${counts[d.id]}</button>`).join("")}
    </div>
  `);

  refs.arena.innerHTML = `
    <section class="drills-command-panel studio-drills-head">
      <div class="sdh-main">
        <span class="st-label">КАТАЛОГ / ${DRILL_IDS.length} КОГНИТИВНЫХ МОДУЛЕЙ</span>
        <h3>${primeMeta?.title || "Персональный стек"}</h3>
        <p>${primeMeta?.objective || "Собери свой набор модулей и запускай без лишних переходов."}</p>
        <div class="panel-actions">
          <button class="primary-action" type="button" id="startRecommendedDrills">Запустить умный стек →</button>
          <button class="ghost-action" type="button" id="startFavoriteDrills">Избранное (${favoriteList.length})</button>
          <button class="ghost-action" type="button" id="showFavoriteDrills">Фильтр избранного</button>
        </div>
      </div>
      <div class="sdh-side">
        <div class="sdh-kpis" aria-label="Сводка библиотеки">
          <div><span>МОДУЛЕЙ</span><strong>${DRILL_IDS.length}</strong></div>
          <div><span>ИЗБРАННОЕ</span><strong>${favoriteList.length}</strong></div>
          <div><span>ПРИОРИТЕТ</span><strong>${Math.round(getModeNeed(state, primeMode))}</strong></div>
        </div>
        <div class="sdh-quick" aria-label="Рекомендации">
          <span class="st-label">ТОП-3 СЕЙЧАС</span>
          <div class="sdh-quick-list">
            ${recommended.slice(0, 3).map((mode, idx) => {
              const meta = MODE_META[mode];
              return `<button class="sdh-quick-item" type="button" data-stack-mode="${mode}">
                <span class="sdh-q-num">${String(idx + 1).padStart(2, "0")}</span>
                <strong>${meta.title}</strong>
                <span class="sdh-q-code">${meta.code}</span>
              </button>`;
            }).join("")}
          </div>
        </div>
      </div>
    </section>
    <section class="drills-toolbar-v10 studio-drills-bar" aria-label="инструменты библиотеки">
      <label class="drill-search studio-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="drillSearch" type="search" placeholder="Найти модуль, домен или когнитивную цель..." autocomplete="off" />
      </label>
      <div class="drill-sort" aria-label="сортировка">
        <button class="chip is-active" type="button" data-drill-sort="recommended">Умно</button>
        <button class="chip" type="button" data-drill-sort="level">Уровень</button>
        <button class="chip" type="button" data-drill-sort="accuracy">Точность</button>
        <button class="chip" type="button" data-drill-sort="duration">Короткие</button>
      </div>
      <div class="drill-density" aria-label="плотность">
        <button class="chip ${density === "visual" ? "is-active" : ""}" type="button" data-drill-density="visual">Сетка</button>
        <button class="chip ${density === "compact" ? "is-active" : ""}" type="button" data-drill-density="compact">Список</button>
      </div>
    </section>
    <div class="drill-grid studio-drill-grid" id="drillGrid"></div>
  `;
  const grid = refs.arena.querySelector("#drillGrid");

  function render(filter = "all") {
    activeFilter = filter;
    const normalizedQuery = query.trim().toLowerCase();
    let drills = DRILL_IDS.filter((id) => {
      if (filter === "favorites") return favorites.has(id);
      if (filter === "all") return true;
      const weights = MODE_META[id]?.domainWeights || {};
      return Object.keys(weights).includes(filter);
    });
    if (normalizedQuery) {
      drills = drills.filter((id) => {
        const meta = MODE_META[id] || {};
        const haystack = [
          id,
          meta.code,
          meta.title,
          meta.kicker,
          meta.objective,
          Object.keys(meta.domainWeights || {}).join(" "),
        ].join(" ").toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    }
    drills.sort((a, b) => drillSortValue(b, activeSort, state) - drillSortValue(a, activeSort, state));
    if (activeSort === "duration") drills.sort((a, b) => getDrillDuration(a) - getDrillDuration(b));
    grid.dataset.density = density;
    syncDrillToolbar(refs, { activeSort, density });
    if (!drills.length) {
      grid.innerHTML = `
        <div class="empty-panel">
          <strong>Ничего не найдено</strong>
          <span>${normalizedQuery ? `Попробуй другой запрос: ${escapeHtml(query)}` : "Переключи фильтр или добавь drill в избранное."}</span>
        </div>
      `;
      return;
    }
    grid.innerHTML = drills.map((id, i) => {
      const meta = MODE_META[id];
      if (!meta) return "";
      const visual = getModeVisual(id);
      const brief = getModeBrief(state, id);
      const mastery = getDrillMastery(state, id);
      const isFavorite = favorites.has(id);
      const brainTag = getDrillBrainTag(id);
      return `
        <button class="drill-card studio-drill-card ${isFavorite ? "is-favorite" : ""}" type="button" data-mode="${id}" style="--i:${i}">
          <div class="sdc-top">
            <div class="sdc-ids">
              <span class="sdc-code">${meta.code}</span>
              <span class="sdc-lobe">${escapeHtml(brainTag.lobe)}</span>
            </div>
            <span class="drill-fav-toggle ${isFavorite ? "is-on" : ""}" role="button" tabindex="0" data-favorite-mode="${id}" aria-label="${isFavorite ? "Убрать из избранного" : "Добавить в избранное"}">${isFavorite ? "★" : "☆"}</span>
          </div>
          <div class="sdc-body">
            <h4>${meta.title}</h4>
            <p class="drill-card-objective" title="${escapeHtml(meta.objective || '')}">${meta.objective || ""}</p>
            <div class="sdc-why"><span>ЗАЧЕМ:</span> ${escapeHtml(brainTag.why)}</div>
          </div>
          <div class="sdc-foot">
            <div class="sdc-pills">
              <span class="sdc-lvl" data-tooltip="уровень адаптации">L${String(brief.level).padStart(2, "0")}</span>
              <span class="sdc-time" data-tooltip="оценка длительности раунда">${getDrillDuration(id)}M</span>
              ${mastery.tier ? masteryBadge(mastery.tier) : ""}
            </div>
            <div class="sdc-stats">
              <span class="sdc-acc">${brief.recentAccuracy ? brief.recentAccuracy + "% · " + brief.rounds + "R" : "НОВЫЙ"}</span>
              ${brief.rounds >= 1 ? `<span class="drill-card-detail-link sdc-detail" data-detail-mode="${id}" role="link" tabindex="0" title="Открыть детальную карточку">АНАЛИЗ ↗</span>` : `<span class="sdc-go">СТАРТ →</span>`}
            </div>
          </div>
        </button>
      `;
    }).join("");
    grid.querySelectorAll("[data-favorite-mode]").forEach((el) => {
      const toggle = (event) => {
        event.preventDefault();
        event.stopPropagation();
        handlers.toggleFavorite?.(el.dataset.favoriteMode);
      };
      el.addEventListener("click", toggle);
      el.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") toggle(event);
      });
    });
    grid.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        // If user clicked the "details" link inside the card, open detail page instead
        const detailLink = event.target.closest("[data-detail-mode]");
        const favoriteToggle = event.target.closest("[data-favorite-mode]");
        if (favoriteToggle) return;
        if (detailLink) {
          event.preventDefault();
          event.stopPropagation();
          handlers.openDetail?.(detailLink.dataset.detailMode);
          return;
        }
        handlers.openMode(btn.dataset.mode);
      });
    });
  }

  refs.arena.querySelector("#startRecommendedDrills")?.addEventListener("click", () => handlers.startRecommended?.());
  refs.arena.querySelector("#startFavoriteDrills")?.addEventListener("click", () => handlers.startFavorites?.());
  refs.arena.querySelector("#showFavoriteDrills")?.addEventListener("click", () => {
    refs.pageActions.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("is-active", b.dataset.filter === "favorites"));
    activeFilter = "favorites";
    render("favorites");
  });
  refs.arena.querySelectorAll("[data-stack-mode]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.openMode(btn.dataset.stackMode));
  });

  refs.pageActions.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      refs.pageActions.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("is-active", b === btn));
      render(btn.dataset.filter);
    });
  });

  refs.arena.querySelector("#drillSearch")?.addEventListener("input", (event) => {
    query = event.target.value;
    render(activeFilter);
  });
  refs.arena.querySelectorAll("[data-drill-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeSort = btn.dataset.drillSort;
      render(activeFilter);
    });
  });
  refs.arena.querySelectorAll("[data-drill-density]").forEach((btn) => {
    btn.addEventListener("click", () => {
      density = btn.dataset.drillDensity;
      render(activeFilter);
    });
  });

  render("all");
}

/* === Page: Прогресс ===================================================== */
function drillSortValue(mode, sort, state) {
  const brief = getModeBrief(state, mode);
  if (sort === "level") return brief.level || 0;
  if (sort === "accuracy") return brief.recentAccuracy ?? -1;
  if (sort === "duration") return -getDrillDuration(mode);
  return getModeNeed(state, mode);
}

function syncDrillToolbar(refs, view) {
  refs.arena.querySelectorAll("[data-drill-sort]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.drillSort === view.activeSort);
  });
  refs.arena.querySelectorAll("[data-drill-density]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.drillDensity === view.density);
  });
}

const DRILL_BRAIN_INFO = {
  nback:       { lobe: "PFC · Префронтальная", why: "Удерживать больше контекста и задач в уме одновременно" },
  anback:      { lobe: "PFC · Слуховая РП",    why: "Лучше запоминать на слух на встречах и лекциях" },
  synpath:     { lobe: "PFC + Теменная",       why: "Восстанавливать сложные траектории и пространственные схемы" },
  qpattern:    { lobe: "PFC · Флюидный IQ",    why: "Быстрее находить скрытые закономерности в новых задачах" },
  grid:        { lobe: "Теменная кора",        why: "Усиливать зрительно-пространственную память" },
  bspan:       { lobe: "PFC · Манипуляция",    why: "Свободно оперировать данными в уме в обратном порядке" },
  recall:      { lobe: "Гиппокамп · FSRS-5",   why: "Переводить знания и факты в долговременную память навсегда" },
  evault:      { lobe: "Гиппокамп · Эпизоды",  why: "Не терять информацию даже при сильных отвлечениях" },
  stroop:      { lobe: "ACC · Контроль",       why: "Подавлять автоматические импульсы и сохранять ясность" },
  stopsig:     { lobe: "ACC · Торможение",     why: "Вовремя останавливать ошибочные действия под давлением" },
  flanker:     { lobe: "ACC · Фильтрация",     why: "Игнорировать визуальный шум и держать целевой фокус" },
  antisaccade: { lobe: "PFC + Глазодвигательная", why: "Управлять вниманием вопреки ярким отвлекающим стимулам" },
  focus:       { lobe: "ACC · Переключение",   why: "Переключаться между правилами без потери темпа" },
  trail:       { lobe: "PFC · Гибкость",       why: "Быстро чередовать разнородные потоки информации" },
  logic:       { lobe: "PFC · Аналитика",      why: "Выявлять правила в числах и абстрактных структурах" },
  tower:       { lobe: "PFC · Планирование",   why: "Просчитывать многошаговые решения наперёд" },
  rulehunt:    { lobe: "PFC · Адаптивность",   why: "Вовремя отбрасывать устаревшие гипотезы и перестраиваться" },
  math:        { lobe: "Теменная + PFC",       why: "Уверенно считать и оценивать цифры под дефицитом времени" },
  reaction:    { lobe: "Моторная сеть",        why: "Ускорять базовый нейронный отклик и тонус внимания" },
  dsst:        { lobe: "Моторная + Скорость",  why: "Поднимать темп обработки символов без просадки точности" },
  scan:        { lobe: "Теменная · Поиск",     why: "Мгновенно находить нужные сигналы в большом объёме данных" },
  schulte:     { lobe: "Теменная · Поле зрения", why: "Расширять периферийное внимание и скорость чтения" },
  rsvp:        { lobe: "Височно-теменная",     why: "Удерживать смысл текста при высокой скорости потока" },
  vfluency:    { lobe: "Височная · Лексикон",  why: "Ускорять семантический поиск и точность формулировок" },
  rotate:      { lobe: "Теменная · 3D-образы", why: "Мысленно вращать и сопоставлять геометрические модели" },
};

function getDrillBrainTag(id) {
  return DRILL_BRAIN_INFO[id] || { lobe: "Нейросеть", why: "Комплексная тренировка когнитивного контроля" };
}

function getNeuroRank(totalXp = 0) {
  const ranks = [
    { tier: "I",   name: "Инициация",  min: 0,    next: 250 },
    { tier: "II",  name: "Адаптация",  min: 250,  next: 750 },
    { tier: "III", name: "Синергия",   min: 750,  next: 1800 },
    { tier: "IV",  name: "Мастерство", min: 1800, next: 3600 },
    { tier: "V",   name: "Нейропик",   min: 3600, next: 6000 },
  ];
  const cur = [...ranks].reverse().find((r) => totalXp >= r.min) || ranks[0];
  const pct = cur.next > cur.min ? Math.min(100, Math.round(((totalXp - cur.min) / (cur.next - cur.min)) * 100)) : 100;
  return { ...cur, pct, remaining: Math.max(0, cur.next - totalXp) };
}

function getCabinetLobes(state) {
  const d = state.domains || {};
  const s = {
    wm: Math.round(d.wm ?? 38),
    logic: Math.round(d.logic ?? 40),
    focus: Math.round(d.focus ?? 44),
    memory: Math.round(d.memory ?? 42),
    speed: Math.round(d.speed ?? 43),
    spatial: Math.round(d.spatial ?? 39),
  };
  return [
    {
      id: "pfc",
      code: "PFC",
      name: "Префронтальная кора",
      role: "Рабочая память, логика и планирование",
      score: Math.round((s.wm + s.logic) / 2),
      why: "Главный «дирижёр» интеллекта: удерживает контекст сложных задач, помогает думать на несколько шагов вперёд и принимать взвешенные решения.",
      tips: [
        "Делай 1 раунд Synapse Path или Dual N-back 3 раза в неделю на границе сложности.",
        "В Quantum Pattern и Tower of London сначала формулируй правило целиком, потом кликай.",
        "Сон менее 7 часов снижает эффективность PFC на 20–30% — в такие дни снижай нагрузку.",
      ],
      drills: ["synpath", "qpattern", "nback"],
    },
    {
      id: "acc",
      code: "ACC",
      name: "Передняя поясная кора",
      role: "Внимание, самоконтроль и анти-импульсивность",
      score: Math.round((s.focus * 0.75 + s.speed * 0.25)),
      why: "Отвечает за фильтрацию отвлечений, торможение импульсивных кликов и удержание глубокого фокуса в шумной среде.",
      tips: [
        "Утренний спринт Stroop Plus + Stop Signal быстро «собирает» внимание перед работой.",
        "При точности < 75% сознательно добавь паузу 120 мс перед ответом — чистота важнее спешки.",
        "Практикуй блоки глубокой работы по 30 минут без переключения вкладок.",
      ],
      drills: ["stroop", "stopsig", "flanker"],
    },
    {
      id: "parietal",
      code: "PAR",
      name: "Теменная кора",
      role: "Пространственные образы, схемы и периферийный фокус",
      score: Math.round((s.spatial * 0.7 + s.focus * 0.3)),
      why: "Строит ментальные 3D-карты, помогает мгновенно схватывать структуры, графики, архитектуру и ускоряет визуальный поиск.",
      tips: [
        "Rotation Lab и Synapse Path напрямую нагружают теменно-лобную пространственную сеть.",
        "В Schulte Table удерживай взгляд строго в центре таблицы — тренируй периферийное поле.",
        "При изучении сложных тем рисуй схемы и привязывай идеи к пространству.",
      ],
      drills: ["rotate", "synpath", "schulte"],
    },
    {
      id: "hippo",
      code: "HIP",
      name: "Гиппокамп и височная доля",
      role: "Долговременная память, знания и консолидация",
      score: s.memory,
      why: "Переводит новые факты, термины и идеи из кратковременной памяти в прочные долговременные нейронные следы.",
      tips: [
        "Сохраняй стикеры из вкладки «Знания» в FSRS-5 и закрывай повторы вечером за 30 минут до сна.",
        "Активное вспоминание в Recall Vault в 2 раза эффективнее пассивного перечитывания.",
        "Раз в неделю проходи Episodic Vault для тренировки устойчивости памяти к помехам.",
      ],
      drills: ["recall", "evault", "vfluency"],
    },
    {
      id: "motor",
      code: "SPD",
      name: "Сенсомоторная сеть",
      role: "Скорость обработки и нейронный темп",
      score: s.speed,
      why: "Определяет быстроту реакции, беглость обработки символов и ровный, стабильный когнитивный ритм без провалов.",
      tips: [
        "Короткий разогрев Reaction Rail + Digit-Symbol утром ускоряет темп без перегрузки.",
        "Целься в стабильность времени отклика (малый разброс RT), а не в один случайный рекорд.",
        "10 минут активного движения перед работой ускоряют сенсомоторную реакцию на 8–12%.",
      ],
      drills: ["reaction", "dsst", "math"],
    },
  ];
}

function renderDevelopmentCabinet(state, model, coach, recommended) {
  const lobes = getCabinetLobes(state);

  const sortedLobes = [...lobes].sort((a, b) => a.score - b.score);
  const weakestLobe = sortedLobes[0];
  const strongestLobe = sortedLobes[sortedLobes.length - 1];
  const rank = getNeuroRank(state.profile?.totalXp || 0);
  const history = state.history || [];
  const recent = history.slice(-12);
  const avgAcc = recent.length ? Math.round((recent.reduce((acc, r) => acc + (r.accuracy || 0), 0) / recent.length) * 100) : null;

  return `
    <section class="brain-cabinet-atlas progress-panel-v8" data-progress-view="overview" style="grid-column: 1 / -1" id="brainCabinetAtlas">
      <!-- Top Neuro-Rank Progression Strip -->
      <div class="bca-rank-strip">
        <div class="bca-rank-left">
          <span class="bca-rank-emblem">${rank.tier}</span>
          <div>
            <span class="st-label">СИСТЕМА РАЗВИТИЯ · НЕЙРО-РАНГ</span>
            <h3>Ранг ${rank.tier} · ${rank.name}</h3>
          </div>
        </div>
        <div class="bca-rank-progress">
          <div class="bca-rp-meta">
            <span>${state.profile?.totalXp || 0} XP</span>
            <span>до следующего ранга: <strong>${rank.remaining} XP</strong></span>
          </div>
          <div class="bca-rp-bar"><span style="width:${rank.pct}%"></span></div>
        </div>
        <div class="bca-rank-kpis">
          <div><strong>${model.overall}</strong><small>индекс</small></div>
          <div><strong>${avgAcc !== null ? avgAcc + "%" : "—"}</strong><small>точность</small></div>
          <div><strong>${state.profile?.streakDays || 0}д</strong><small>серия</small></div>
        </div>
      </div>

      <!-- Interactive Anatomical Brain Atlas + Lobe Inspector -->
      <div class="bca-main-grid">
        <div class="bca-brain-stage">
          <div class="bca-stage-head">
            <span class="st-label">АНАТОМИЧЕСКИЙ АТЛАС · КЛИКНИ ПО ОТДЕЛУ</span>
            <span class="bca-focus-pill">УПОР: ${weakestLobe.code} · ${weakestLobe.score}</span>
          </div>

          <svg class="bca-brain-svg" viewBox="0 0 360 250" role="img" aria-label="Интерактивная карта 5 отделов мозга">
            <defs>
              <radialGradient id="cabAura" cx="50%" cy="48%" r="52%">
                <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.20"/>
                <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
              </radialGradient>
            </defs>
            <ellipse cx="180" cy="122" rx="158" ry="102" fill="url(#cabAura)"/>
            <circle cx="180" cy="122" r="92" fill="none" stroke="var(--accent)" stroke-opacity="0.10" stroke-dasharray="2 5"/>

            <!-- 1. Prefrontal Cortex (Front-Left) -->
            <g class="bca-lobe ${weakestLobe.id === "pfc" ? "is-weak" : strongestLobe.id === "pfc" ? "is-strong" : ""} is-selected" data-lobe="pfc" tabindex="0" role="button">
              <path d="M72 152 C54 134 52 96 74 68 C94 42 128 32 162 36 L156 116 L96 156 Z" />
              <circle class="bca-dot" cx="106" cy="88" r="5" />
              <text x="106" y="74" text-anchor="middle" class="bca-lbl">PFC</text>
              <text x="106" y="108" text-anchor="middle" class="bca-val">${lobes[0].score}</text>
            </g>

            <!-- 2. Parietal Lobe (Top-Back) -->
            <g class="bca-lobe ${weakestLobe.id === "parietal" ? "is-weak" : strongestLobe.id === "parietal" ? "is-strong" : ""}" data-lobe="parietal" tabindex="0" role="button">
              <path d="M166 36 C214 34 260 54 282 94 L214 124 L160 116 Z" />
              <circle class="bca-dot" cx="216" cy="74" r="5" />
              <text x="216" y="60" text-anchor="middle" class="bca-lbl">PAR</text>
              <text x="216" y="94" text-anchor="middle" class="bca-val">${lobes[2].score}</text>
            </g>

            <!-- 3. Anterior Cingulate Cortex (Core) -->
            <g class="bca-lobe ${weakestLobe.id === "acc" ? "is-weak" : strongestLobe.id === "acc" ? "is-strong" : ""}" data-lobe="acc" tabindex="0" role="button">
              <path d="M124 116 C142 92 188 92 210 116 C194 146 150 152 124 116 Z" />
              <circle class="bca-dot" cx="166" cy="118" r="4" />
              <text x="166" y="109" text-anchor="middle" class="bca-lbl">ACC</text>
              <text x="166" y="133" text-anchor="middle" class="bca-val">${lobes[1].score}</text>
            </g>

            <!-- 4. Hippocampus / Temporal (Lower-Mid) -->
            <g class="bca-lobe ${weakestLobe.id === "hippo" ? "is-weak" : strongestLobe.id === "hippo" ? "is-strong" : ""}" data-lobe="hippo" tabindex="0" role="button">
              <path d="M98 158 L158 144 L224 148 C218 182 182 198 142 194 C116 190 102 174 98 158 Z" />
              <circle class="bca-dot" cx="160" cy="172" r="5" />
              <text x="160" y="162" text-anchor="middle" class="bca-lbl">HIP</text>
              <text x="160" y="188" text-anchor="middle" class="bca-val">${lobes[3].score}</text>
            </g>

            <!-- 5. Sensorimotor & Visual Speed (Back) -->
            <g class="bca-lobe ${weakestLobe.id === "motor" ? "is-weak" : strongestLobe.id === "motor" ? "is-strong" : ""}" data-lobe="motor" tabindex="0" role="button">
              <path d="M218 126 L284 98 C298 128 292 164 266 184 C248 196 226 196 218 182 L226 146 Z" />
              <circle class="bca-dot" cx="258" cy="148" r="5" />
              <text x="258" y="136" text-anchor="middle" class="bca-lbl">SPD</text>
              <text x="258" y="166" text-anchor="middle" class="bca-val">${lobes[4].score}</text>
            </g>

            <!-- Synaptic impulse lines linking lobes -->
            <path class="lb-synapse" d="M106 88 Q160 66 216 74" fill="none"/>
            <path class="lb-synapse" d="M106 88 Q138 112 166 122" fill="none" style="--d:0.6s"/>
            <path class="lb-synapse" d="M166 122 Q212 134 258 148" fill="none" style="--d:1.2s"/>
            <path class="lb-synapse" d="M160 172 Q208 164 258 148" fill="none" style="--d:1.8s"/>
          </svg>

          <div class="bca-lobe-tabs" id="bcaLobeTabs">
            ${lobes.map((l) => `
              <button type="button" class="bca-lobe-tab ${l.id === weakestLobe.id ? "is-active is-weak" : ""}" data-lobe-tab="${l.id}">
                <span>${l.code}</span>
                <strong>${l.score}</strong>
              </button>
            `).join("")}
          </div>
        </div>

        <div class="bca-inspector" id="bcaInspector">
          ${renderLobeDossierHtml(weakestLobe, weakestLobe.id, strongestLobe.id)}
        </div>
      </div>
    </section>
  `;
}

function renderLobeDossierHtml(lobe, weakId, strongId) {
  const statusTag = lobe.id === weakId
    ? `<span class="bca-status is-weak">ПРИОРИТЕТНЫЙ УПОР</span>`
    : lobe.id === strongId
      ? `<span class="bca-status is-strong">СИЛЬНАЯ ЗОНА</span>`
      : `<span class="bca-status">В БАЛАНСЕ</span>`;
  return `
    <div class="bca-dos-head">
      <div>
        <span class="st-label">${lobe.code} · ОТДЕЛ МОЗГА</span>
        <h4>${escapeHtml(lobe.name)}</h4>
        <p class="bca-dos-role">${escapeHtml(lobe.role)}</p>
      </div>
      <div class="bca-dos-score">
        <strong>${lobe.score}</strong>
        <small>/ 100</small>
      </div>
    </div>
    ${statusTag}
    <div class="bca-dos-bar"><span style="width:${Math.min(100, Math.max(8, lobe.score))}%"></span></div>
    <div class="bca-dos-why">
      <span class="st-label">ЗАЧЕМ РАЗВИВАТЬ ЭТОТ ОТДЕЛ</span>
      <p>${escapeHtml(lobe.why)}</p>
    </div>
    <div class="bca-dos-tips">
      <span class="st-label">ПЛАН ПРОКАЧКИ НА ЭТУ НЕДЕЛЮ</span>
      <ol class="drc-steps">
        ${lobe.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
      </ol>
    </div>
    <div class="bca-dos-drills">
      <span class="st-label">УПРАЖНЕНИЯ ДЛЯ ЭТОГО ОТДЕЛА:</span>
      <div class="drc-launch-pills">
        ${lobe.drills.filter((id) => MODE_META[id]).map((id) => `
          <button type="button" class="primary-action bca-drill-go" data-mode="${id}">
            ${escapeHtml(MODE_META[id].title)} →
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

export function renderPageProgress(refs, state, handlers) {
  const model = getDashboardModel(state);
  const program = getProgram(state);
  const programSummary = program ? getProgramSummary(state) : null;
  const calibration = getCalibration(state);
  const records = computeDrillRecords(state);
  const heatmap8w = compute8WeekHeatmap(state);
  const cogLoadSeries = state.history.slice(-30).map((h) => ({ acc: h.accuracy || 0, mistakes: h.mistakes || 0, level: h.difficultyBefore || 1 }));
  const recommended = getRecommendedPlan(state).filter((mode) => MODE_META[mode]).slice(0, 3);
  const coach = buildTrainingCoach(state);
  const insights = generateInsights(state);
  const dashboard = buildProgressDashboard(state, records, insights, coach);

  setPageHeader(refs, "личный кабинет", "Прогресс", `
    <div class="progress-view-tabs" id="progressViewTabs" role="tablist" aria-label="Разделы прогресса">
      <button class="chip is-active" type="button" data-progress-tab="overview" role="tab" aria-selected="true">Обзор</button>
      <button class="chip" type="button" data-progress-tab="dynamics" role="tab" aria-selected="false">Графики</button>
      <button class="chip" type="button" data-progress-tab="records" role="tab" aria-selected="false">Рекорды</button>
    </div>
  `);

  refs.arena.innerHTML = `
    <div class="progress-grid progress-dashboard-v8" id="progressGrid" data-view="overview">

      ${renderDevelopmentCabinet(state, model, coach, recommended)}

      ${renderProgressCockpit(dashboard, model, recommended)}

      <section class="progress-card progress-insights-strip progress-panel-v8" data-progress-view="overview" style="grid-column: 1 / -1">
        <div class="progress-kicker">сигналы</div>
        <div class="insights-host" id="insightsHost"></div>
      </section>

      <div data-progress-view="overview" style="grid-column: 1 / -1">
        ${renderCoachCard(coach, "wide")}
      </div>

      ${program ? `<div data-progress-view="overview" style="grid-column: 1 / -1">${renderProgramProgressCard(state, programSummary)}</div>` : ""}

      ${renderProgressDomainMatrix(state, program)}

      <section class="progress-card progress-radar progress-panel-v8" data-progress-view="overview">
        <div class="progress-kicker">карта навыков</div>
        <h4>Нейроиндекс · ${model.overall}</h4>
        <div class="radar-wrap" id="radarWrap"></div>
      </section>

      <section class="progress-card progress-memlane progress-panel-v8" data-progress-view="dynamics" style="grid-column: 1 / -1">
        <div class="progress-kicker">Memory Lane · 30 дней</div>
        <h4>Прогресс по топ-5 drill</h4>
        <div id="memoryLaneHost"></div>
      </section>

      <section class="progress-card progress-sleep-corr progress-panel-v8" data-progress-view="dynamics">
        <div class="progress-kicker">сон ↔ точность</div>
        <h4>Связь сна и результата</h4>
        <div id="sleepCorrHost"></div>
      </section>

      <section class="progress-card progress-chronotype progress-panel-v8" data-progress-view="dynamics">
        <div class="progress-kicker">когда твой пик</div>
        <h4>Chronotype 24h</h4>
        <div id="chronotypeHost"></div>
      </section>

      <section class="progress-card progress-365cal progress-panel-v8" data-progress-view="dynamics" style="grid-column: 1 / -1">
        <div class="progress-kicker">365 дней</div>
        <h4>Календарь активности</h4>
        <div id="streakCalHost"></div>
      </section>

      <section class="progress-card progress-trend progress-panel-v8" data-progress-view="dynamics">
        <div class="progress-kicker">${Math.min(30, state.history.length)} последних раундов</div>
        <h4>Тренд точности</h4>
        <div class="trend-chart" id="trendWrap"></div>
      </section>

      <section class="progress-card progress-load progress-panel-v8" data-progress-view="dynamics">
        <div class="progress-kicker">когнитивная нагрузка</div>
        <h4>Динамика 30 раундов</h4>
        <div class="cog-load-chart" id="cogLoadWrap"></div>
        <p class="hint-line">высокая нагрузка + низкая точность = сигнал отдохнуть. Уверенная зона: 40-70.</p>
      </section>

      <section class="progress-card progress-heatmap progress-panel-v8" data-progress-view="dynamics">
        <div class="progress-kicker">8 недель активности</div>
        <h4>${heatmap8w.totalDays} дней с раундами</h4>
        <div class="heatmap-8w" id="heatmap8w"></div>
        <div class="heatmap-legend">
          <small>меньше</small>
          <span data-intensity="0"></span>
          <span data-intensity="1"></span>
          <span data-intensity="2"></span>
          <span data-intensity="3"></span>
          <small>больше</small>
        </div>
      </section>

      <section class="progress-card progress-records progress-panel-v8" data-progress-view="records" style="grid-column: 1 / -1">
        <div class="progress-kicker">личные рекорды по drills</div>
        <h4>${records.length} модулей с историей</h4>
        ${records.length ? `
          <div class="records-table">
            <div class="records-row records-head">
              <span>модуль</span>
              <span>лучший</span>
              <span>средний</span>
              <span>лучший RT</span>
              <span>раундов</span>
            </div>
            ${records.map((r) => `
              <div class="records-row">
                <span class="records-name">
                  <span class="records-dot" style="background:${r.accent}"></span>${escapeHtml(r.label)}
                </span>
                <strong>${r.bestAcc}%</strong>
                <span>${r.avgAcc}%</span>
                <span>${r.bestRt !== null ? r.bestRt + " ms" : "—"}</span>
                <span>${r.count}</span>
              </div>
            `).join("")}
          </div>
        ` : `<p class="hint-line">Пройди хотя бы один раунд — здесь появятся твои рекорды.</p>`}
      </section>

      <section class="progress-card progress-panel-v8" data-progress-view="records">
        <div class="progress-kicker">недавняя активность</div>
        <h4>${state.history.length} раундов всего</h4>
        <div class="recent-log">
          ${state.history.slice(-12).reverse().map((item) => `
            <div class="recent-item">
              <span class="recent-mode">${escapeHtml(item.label || item.mode)}</span>
              <span class="recent-meta">${Math.round((item.accuracy || 0) * 100)}% · ${item.xp} XP</span>
            </div>
          `).join("") || `<div class="recent-item"><span>пока пусто</span><span class="recent-meta">—</span></div>`}
        </div>
      </section>

      <section class="progress-card progress-panel-v8" data-progress-view="records">
        <div class="progress-kicker">достижения · ${state.achievements.length}/${ALL_ACHIEVEMENTS.length}</div>
        <h4>Прогресс</h4>
        <div class="achievements-list">
          ${ALL_ACHIEVEMENTS.map((a) => {
            const unlocked = state.achievements.some((u) => u.id === a.id);
            const pct = Math.round(a.measure(state) * 100);
            return `
              <div class="achievement-row ${unlocked ? "is-unlocked" : ""}">
                <span class="ach-icon" aria-hidden="true"><img src="${getAchievementArt(a.id)}" alt="" loading="lazy" /></span>
                <div class="ach-body">
                  <div class="ach-row">
                    <strong>${escapeHtml(a.label)}</strong>
                    <span class="ach-pct">${unlocked ? "✓" : pct + "%"}</span>
                  </div>
                  <div class="ach-bar"><span style="width:${pct}%"></span></div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </section>

      ${calibration ? `
        <section class="progress-card progress-panel-v8" data-progress-view="records">
          <div class="progress-kicker">метакогниция · ${calibration.samples} прогноза</div>
          <h4>Калибровка: ${calibration.classification}</h4>
          <div class="calibration-bar">
            <span style="left: ${50 + Math.max(-50, Math.min(50, calibration.bias / 2))}%"></span>
            <small class="cb-l">недооценка</small>
            <small class="cb-r">переоценка</small>
          </div>
          <p class="hint-line">${escapeHtml(calibration.hint)}</p>
          <div class="result-grid" style="grid-template-columns:repeat(3, 1fr)">
            <div><span>${calibration.bias >= 0 ? "+" : ""}${calibration.bias}</span><small>средний сдвиг</small></div>
            <div><span>${calibration.mae}</span><small>средняя ошибка</small></div>
            <div><span>${calibration.samples}</span><small>прогнозов</small></div>
          </div>
        </section>
      ` : ""}

    </div>
  `;

  drawRadarSvg(refs.arena.querySelector("#radarWrap"), state);
  drawTrendSvg(refs.arena.querySelector("#trendWrap"), state);
  drawCognitiveLoadSvg(refs.arena.querySelector("#cogLoadWrap"), state);
  draw8WeekHeatmap(refs.arena.querySelector("#heatmap8w"), heatmap8w);
  // v5 cards
  drawMemoryLane(refs.arena.querySelector("#memoryLaneHost"), state, 30);
  drawSleepCorrelation(refs.arena.querySelector("#sleepCorrHost"), state);
  drawChronotype(refs.arena.querySelector("#chronotypeHost"), state);
  drawStreakCalendar(refs.arena.querySelector("#streakCalHost"), state);
  renderInsightsStrip(refs.arena.querySelector("#insightsHost"), insights);
  bindCoachActions(refs.arena, handlers);
  setupProgressTabs(refs);
  refs.arena.querySelector("#progressStartRecommended")?.addEventListener("click", () => handlers.startRecommended?.());
  refs.arena.querySelector("#progressOpenDrills")?.addEventListener("click", () => handlers.openDrills?.());
  refs.arena.querySelectorAll("[data-progress-mode]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.openMode?.(btn.dataset.progressMode));
  });

  // Bind Interactive Anatomical Brain Atlas lobe clicks
  const atlas = refs.arena.querySelector("#brainCabinetAtlas");
  const inspector = refs.arena.querySelector("#bcaInspector");
  if (atlas && inspector) {
    const lobes = getCabinetLobes(state);
    const sorted = [...lobes].sort((a, b) => a.score - b.score);
    const weakId = sorted[0].id;
    const strongId = sorted[sorted.length - 1].id;

    const bindLaunchers = () => {
      inspector.querySelectorAll("[data-mode]").forEach((btn) => {
        btn.addEventListener("click", () => handlers.openMode?.(btn.dataset.mode));
      });
    };

    const selectLobe = (lobeId) => {
      const lobe = lobes.find((l) => l.id === lobeId) || lobes[0];
      atlas.querySelectorAll(".bca-lobe").forEach((el) => el.classList.toggle("is-selected", el.dataset.lobe === lobe.id));
      atlas.querySelectorAll("[data-lobe-tab]").forEach((el) => el.classList.toggle("is-active", el.dataset.lobeTab === lobe.id));
      inspector.innerHTML = renderLobeDossierHtml(lobe, weakId, strongId);
      bindLaunchers();
    };

    atlas.querySelectorAll(".bca-lobe").forEach((el) => {
      el.addEventListener("click", () => selectLobe(el.dataset.lobe));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectLobe(el.dataset.lobe); }
      });
    });
    atlas.querySelectorAll("[data-lobe-tab]").forEach((el) => {
      el.addEventListener("click", () => selectLobe(el.dataset.lobeTab));
    });
    selectLobe(weakId);
  }
}

function buildProgressDashboard(state, records, insights, coach) {
  const history = state.history || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayRounds = history.filter((r) => r.date === today);
  const now = Date.now();
  const dayMs = 86400000;
  const toTime = (r) => r.timestamp || (r.date ? new Date(r.date).getTime() : now);
  const last7 = history.filter((r) => now - toTime(r) < 7 * dayMs);
  const prev7 = history.filter((r) => {
    const age = now - toTime(r);
    return age >= 7 * dayMs && age < 14 * dayMs;
  });
  const acc = (items) => items.length
    ? Math.round(items.reduce((sum, r) => sum + (r.accuracy || 0), 0) / items.length * 100)
    : 0;
  const xp = (items) => items.reduce((sum, r) => sum + (r.xp || 0), 0);
  const weekAcc = acc(last7);
  const prevAcc = acc(prev7);
  const weekDelta = last7.length && prev7.length ? weekAcc - prevAcc : null;
  const activeDays = new Set(last7.map((r) => r.date).filter(Boolean)).size;
  const weak = getWeakestDomain(state);
  const strong = DOMAINS.reduce((best, domain) => {
    return (state.domains[domain.id] || 0) > (state.domains[best.id] || 0) ? domain : best;
  }, DOMAINS[0]);
  const last10 = history.slice(-10).map((r) => r.accuracy || 0);
  const mean = last10.length ? last10.reduce((a, b) => a + b, 0) / last10.length : 0;
  const variance = last10.length ? last10.reduce((s, v) => s + (v - mean) ** 2, 0) / last10.length : 0;
  const consistency = last10.length >= 3 ? Math.max(0, Math.min(100, Math.round(100 - Math.sqrt(variance) * 160))) : 0;
  const bestRecord = records.length
    ? records.reduce((best, r) => (r.bestAcc > best.bestAcc ? r : best), records[0])
    : null;
  const priority = coach.queue?.[0];

  return {
    todayRounds: todayRounds.length,
    todayXp: state.profile?.todayXp || 0,
    todayAcc: getTodayAccuracy(state),
    totalRounds: history.length,
    totalXp: state.profile?.totalXp || 0,
    weekRounds: last7.length,
    weekXp: xp(last7),
    weekAcc,
    weekDelta,
    activeDays,
    weak,
    strong,
    consistency,
    bestRecord,
    due: dueCardsCount(state),
    readiness: coach.readiness,
    priority,
    insightCount: insights.length,
  };
}

function renderProgressCockpit(dashboard, model, recommended) {
  const trendText = dashboard.weekDelta === null
    ? "нужно больше данных"
    : `${dashboard.weekDelta >= 0 ? "+" : ""}${dashboard.weekDelta} п.п. за неделю`;
  const trendTone = dashboard.weekDelta === null ? "muted" : dashboard.weekDelta >= 0 ? "good" : "bad";
  return `
    <section class="progress-cockpit-v8" data-progress-view="overview" style="--score:${model.overall}; --weak-color:${dashboard.weak.color}; --strong-color:${dashboard.strong.color}">
      <div class="pc-main">
        <div class="progress-kicker">оперативная сводка</div>
        <h3>Индекс <span>${model.overall}</span></h3>
        <p>Сильная зона: <strong>${dashboard.strong.label}</strong>. Узкое место: <strong>${dashboard.weak.label}</strong>. ${trendText}.</p>
        <div class="pc-actions">
          <button class="primary-action" type="button" id="progressStartRecommended">Запустить стек</button>
          <button class="ghost-action" type="button" id="progressOpenDrills">Библиотека</button>
        </div>
      </div>

      <div class="pc-score">
        <div class="pc-score-ring">
          <strong>${model.overall}</strong>
          <small>index</small>
        </div>
        <span class="pc-trend ${trendTone}">${trendText}</span>
      </div>

      <div class="pc-kpis">
        <div><strong>${dashboard.todayRounds}</strong><small>раундов сегодня</small></div>
        <div><strong>${dashboard.weekRounds}</strong><small>за 7 дней</small></div>
        <div><strong>${dashboard.consistency || "—"}</strong><small>стабильность</small></div>
        <div><strong>${dashboard.readiness}</strong><small>готовность</small></div>
      </div>

      <div class="pc-stack" aria-label="Следующие модули">
        ${recommended.map((mode) => {
          const meta = MODE_META[mode];
          return `<button class="pc-stack-item" type="button" data-progress-mode="${mode}" style="--route-accent:${meta.accent}">
            <span>${meta.code}</span>
            <strong>${escapeHtml(meta.title)}</strong>
            <small>~${getDrillDuration(mode)}м</small>
          </button>`;
        }).join("")}
      </div>
    </section>
  `;
}

function renderProgressDomainMatrix(state, program) {
  return `
    <section class="progress-card progress-domain-matrix-v8 progress-panel-v8" data-progress-view="overview">
      <div class="progress-kicker">домены · приоритеты</div>
      <h4>Карта развития</h4>
      <div class="pdm-list">
        ${DOMAINS.map((domain, i) => {
          const value = Math.round(state.domains[domain.id] || 0);
          const before = program?.baselines?.[domain.id];
          const delta = before !== undefined ? value - before : null;
          const mode = bestModeForDomain(state, domain.id);
          const meta = MODE_META[mode];
          return `
            <button class="pdm-row" type="button" data-progress-mode="${mode}" style="--domain-color:${domain.color}; --i:${i}">
              <span class="pdm-icon"><img src="${getDomainIcon(domain.id)}" alt="" loading="lazy" /></span>
              <span class="pdm-body">
                <span class="pdm-head">
                  <strong>${domain.label}</strong>
                  <em>${value}${delta !== null ? ` · ${delta >= 0 ? "+" : ""}${delta}` : ""}</em>
                </span>
                <span class="pdm-bar"><span style="width:${Math.max(4, Math.min(100, value))}%"></span></span>
                <small>следующий фокус: ${escapeHtml(meta?.title || mode)}</small>
              </span>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function bestModeForDomain(state, domainId) {
  const scored = DRILL_IDS
    .filter((mode) => MODE_META[mode]?.domainWeights?.[domainId])
    .map((mode) => ({ mode, score: getModeNeed(state, mode) * (MODE_META[mode].domainWeights[domainId] || 0) }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.mode || getRecommendedPlan(state)[0] || "recall";
}

function setupProgressTabs(refs) {
  const tabs = [...refs.pageActions.querySelectorAll("[data-progress-tab]")];
  const grid = refs.arena.querySelector("#progressGrid");
  const panels = [...refs.arena.querySelectorAll("[data-progress-view]")];
  const setView = (view) => {
    if (grid) grid.dataset.view = view;
    tabs.forEach((tab) => {
      const active = tab.dataset.progressTab === view;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.progressView !== view;
    });
  };
  tabs.forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.progressTab)));
  setView("overview");
}

function renderProgramProgressCard(state, summary) {
  if (!summary) return "";
  return `
    <section class="progress-card progress-program">
      <div class="progress-kicker">21-дневная программа · день ${summary.currentDay > 21 ? "21" : summary.currentDay}/21</div>
      <h4>${summary.completed}/21 · прогресс ${summary.progress}%</h4>
      <div class="program-progress-bar"><span style="width:${summary.progress}%"></span></div>
      <div class="program-deltas">
        ${summary.deltas.map((d) => `
          <div class="program-delta-tile" style="border-color:${d.color}">
            <small>${d.label}</small>
            <div class="program-delta-row">
              <span>${d.before}</span>
              <span class="program-delta-arrow">→</span>
              <span>${d.now}</span>
              <strong class="${d.delta >= 0 ? "good" : "bad"}">${d.delta >= 0 ? "+" : ""}${d.delta}</strong>
            </div>
          </div>
        `).join("")}
      </div>
      <p class="hint-line">Стартовый замер: <strong>${Math.round(Object.values(summary.deltas.map((d) => d.before)).reduce((a,b)=>a+b,0)/6)}</strong> нейроиндекс. Сейчас: <strong>${Math.round(Object.values(summary.deltas.map((d) => d.now)).reduce((a,b)=>a+b,0)/6)}</strong>. Средний прирост по доменам: <strong class="${summary.meanDelta >= 0 ? "good" : "bad"}">${summary.meanDelta >= 0 ? "+" : ""}${summary.meanDelta} п.</strong></p>
      <details class="program-schedule-details">
        <summary>📅 расписание 21 дня</summary>
        <div class="program-schedule">
          ${PROGRAM_DAYS.map((d) => {
            const done = state.program.completedDays.includes(d.day);
            const today = d.day === summary.currentDay;
            return `
              <div class="program-schedule-row ${done ? "is-done" : ""} ${today ? "is-today" : ""}">
                <strong>д.${d.day}</strong>
                <span class="schedule-protocol">${PROTOCOLS[d.protocol]?.name || d.protocol}</span>
                <span class="schedule-focus">${escapeHtml(d.focus)}</span>
                ${done ? `<span class="schedule-check">✓</span>` : ""}
              </div>
            `;
          }).join("")}
        </div>
      </details>
    </section>
  `;
}

function computeDrillRecords(state) {
  const grouped = new Map();
  state.history.forEach((h) => {
    if (!grouped.has(h.mode)) grouped.set(h.mode, []);
    grouped.get(h.mode).push(h);
  });
  return [...grouped.entries()].map(([mode, items]) => {
    const meta = MODE_META[mode] || { title: mode, accent: "#7c5cff" };
    const accs = items.map((i) => i.accuracy || 0);
    const rts = items.filter((i) => i.rt).map((i) => i.rt);
    return {
      mode,
      label: meta.title,
      accent: meta.accent,
      bestAcc: Math.round(Math.max(...accs) * 100),
      avgAcc: Math.round(accs.reduce((a, b) => a + b, 0) / accs.length * 100),
      bestRt: rts.length ? Math.round(Math.min(...rts)) : null,
      count: items.length,
    };
  }).sort((a, b) => b.count - a.count);
}

function compute8WeekHeatmap(state) {
  const weeks = 8;
  const days = weeks * 7;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));

  const byDate = new Map();
  state.history.forEach((h) => {
    if (!h.date) return;
    byDate.set(h.date, (byDate.get(h.date) || 0) + 1);
  });

  const cells = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const rounds = byDate.get(key) || 0;
    const intensity = rounds === 0 ? 0 : rounds <= 2 ? 1 : rounds <= 5 ? 2 : 3;
    cells.push({ date: key, rounds, intensity, day: d.getDay(), label: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }) });
  }

  return { cells, weeks, totalDays: cells.filter((c) => c.rounds > 0).length };
}

function draw8WeekHeatmap(host, data) {
  if (!host) return;
  host.innerHTML = data.cells.map((c) => `
    <span class="hm-cell" data-intensity="${c.intensity}" title="${c.label} · ${c.rounds} р."></span>
  `).join("");
}

function drawCognitiveLoadSvg(host, state) {
  if (!host) return;
  const items = state.history.slice(-30);
  const w = 600, h = 140, pad = 18;
  if (!items.length) {
    host.innerHTML = `<div class="hint-line" style="text-align:center;padding:30px">данные появятся после 3+ раундов</div>`;
    return;
  }
  const loads = items.map((r) => Math.round(20 + (r.difficultyBefore || 1) * 8 + (1 - (r.accuracy || 0)) * 30 + ((r.mistakes || 0) / Math.max(1, (r.attempts || r.mistakes + 1))) * 30));
  const step = items.length > 1 ? (w - pad * 2) / (items.length - 1) : 0;
  const pts = loads.map((load, i) => ({
    x: pad + step * i,
    y: h - pad - (load / 100) * (h - pad * 2),
    load,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  host.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="cog-load-svg">
      <defs>
        <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--danger)" stop-opacity="0.4"/>
          <stop offset="50%" stop-color="var(--warning)" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="var(--success)" stop-opacity="0.2"/>
        </linearGradient>
      </defs>
      <rect x="0" y="${h - pad - 0.7 * (h - pad * 2)}" width="${w}" height="${0.3 * (h - pad * 2)}" fill="rgba(255, 90, 122, 0.06)"/>
      <rect x="0" y="${h - pad - 0.4 * (h - pad * 2)}" width="${w}" height="${0.3 * (h - pad * 2)}" fill="rgba(52, 201, 151, 0.06)"/>
      <path d="${path}" fill="none" stroke="url(#trendStroke)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${p.load >= 70 ? 'var(--danger)' : p.load >= 40 ? 'var(--warning)' : 'var(--success)'}"/>`).join("")}
    </svg>
  `;
}

/* === Page: Stim Lab ===================================================== */
export function renderPageStim(refs, state, handlers) {
  setPageHeader(refs, "stim lab · cortex", "Стимуляция мозга", `
    <div class="stim-filter-v10" id="stimFilter">
      <button class="chip is-active" type="button" data-stim-filter="all">все</button>
      <button class="chip" type="button" data-stim-filter="audio">аудио</button>
      <button class="chip" type="button" data-stim-filter="beats">beats</button>
      <button class="chip" type="button" data-stim-filter="genus">40Hz</button>
      <button class="chip" type="button" data-stim-filter="visual">визуал</button>
    </div>
  `);
  const photicAllowed = !!handlers.photicConfirmed;
  const groups = [
    { kind: "audio", title: "Фокус-аудио", note: "Маскировка отвлечений + лучшая концентрация. Pink noise рекомендован для рабочего времени; brown — для глубокого фокуса.", ids: ["pink-noise", "brown-noise", "white-noise"] },
    { kind: "beats", title: "Binaural beats", note: "Карвер-тон в каждом ухе с разницей Δ Гц. Доказательства ограничены, но многим помогает. Только наушники.", ids: ["binaural-theta", "binaural-alpha", "binaural-beta", "binaural-gamma"] },
    { kind: "genus", title: "40Гц GENUS", note: "Экспериментальный протокол MIT (2016) для долгосрочной поддержки памяти. Без приступов — до часа в день.", ids: ["genus-audio", "genus-photic"] },
    { kind: "visual", title: "Визуальные практики", note: "Без аудио. Меньше тревоги, тренировка устойчивого внимания.", ids: ["mandala", "color-breath"] },
  ];
  const stimStats = buildStimStats(groups, photicAllowed);

  refs.arena.innerHTML = `
    <div class="stim-lab">
      <section class="stim-hero">
        <div class="stim-hero-backdrop" aria-hidden="true"></div>
        <div class="stim-hero-content">
          <div class="hero-eyebrow">stim lab · v4</div>
          <h3>Звук, ритм, графика</h3>
          <p>Каждый блок подписан источником эффекта. Запускается на полный экран; Esc или кнопка «Остановить» в любой момент. Биометрика на устройстве, без сетевых вызовов.</p>
        </div>
      </section>

      ${renderStimDashboard(stimStats, photicAllowed)}

      ${groups.map((g, gi) => `
        <section class="stim-group" data-stim-group="${g.kind}">
          <div class="stim-group-head"><strong>${g.title}</strong><small>${g.note}</small></div>
          <div class="stim-grid">
            ${g.ids.map((id, i) => {
              const p = STIM_PRESETS[id];
              if (!p) return "";
              const locked = p.requiresOptIn && !photicAllowed;
              return `
                <button class="stim-card ${locked ? "is-locked" : ""}" type="button" data-stim="${id}" data-stim-kind="${g.kind}" style="--i:${gi * 4 + i}">
                  <strong>${p.label}</strong>
                  <small>${p.description}</small>
                  ${locked ? `<span class="stim-locked">⚠ требуется подтверждение</span>` : ""}
                </button>
              `;
            }).join("")}
          </div>
        </section>
      `).join("")}
    </div>
  `;

  refs.arena.querySelectorAll("[data-stim]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.stim;
      const preset = STIM_PRESETS[id];
      if (preset.requiresOptIn && !photicAllowed) handlers.requestPhoticConsent(id);
      else handlers.startStim(id);
    });
  });
  refs.pageActions.querySelectorAll("[data-stim-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.stimFilter;
      refs.pageActions.querySelectorAll("[data-stim-filter]").forEach((item) => {
        item.classList.toggle("is-active", item === btn);
      });
      refs.arena.querySelectorAll("[data-stim-group]").forEach((group) => {
        group.hidden = filter !== "all" && group.dataset.stimGroup !== filter;
      });
    });
  });
}

function buildStimStats(groups, photicAllowed) {
  const ids = groups.flatMap((g) => g.ids);
  const locked = ids.filter((id) => STIM_PRESETS[id]?.requiresOptIn && !photicAllowed).length;
  return {
    total: ids.length,
    audio: groups.find((g) => g.kind === "audio")?.ids.length || 0,
    beats: groups.find((g) => g.kind === "beats")?.ids.length || 0,
    locked,
  };
}

function renderStimDashboard(stats, photicAllowed) {
  return `
    <section class="stim-dashboard-v10">
      <div>
        <div class="progress-kicker">lab status</div>
        <h4>${photicAllowed ? "Фотостим подтверждён" : "Безопасный режим включён"}</h4>
        <p>${photicAllowed ? "Можно запускать аудио, визуальные практики и GENUS-сценарии." : "Световые протоколы требуют отдельного подтверждения перед запуском."}</p>
      </div>
      <div class="stim-dashboard-metrics">
        <div><strong>${stats.total}</strong><small>пресетов</small></div>
        <div><strong>${stats.audio + stats.beats}</strong><small>аудио</small></div>
        <div><strong>${stats.locked}</strong><small>с подтверждением</small></div>
      </div>
    </section>
  `;
}

/* === Page: Настройки ==================================================== */
function renderThemeStudio(theme, state) {
  const palette = theme.palette;
  const motion = state.settings.reducedMotion ? "меньше движения" : "живые переходы";
  const intensity = state.settings.visualIntensity || "balanced";
  return `
    <div class="theme-studio-v10 theme-studio-v11" style="--studio-a:${palette.accent}; --studio-b:${palette.accentSoft}; --studio-w:${palette.warm}; --studio-bg:${palette.bg}">
      <div class="theme-studio-art" aria-hidden="true"></div>
      <div class="theme-studio-copy">
        <span class="progress-kicker">theme studio · live preview</span>
        <strong>${escapeHtml(theme.label)}</strong>
        <small>${escapeHtml(theme.description)} · ${motion} · ${escapeHtml(intensity)}</small>
        <div class="theme-studio-surface" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div class="theme-studio-swatches" aria-label="палитра темы">
        <span style="background:${palette.accent}"></span>
        <span style="background:${palette.accentSoft}"></span>
        <span style="background:${palette.warm}"></span>
        <span style="background:${palette.success}"></span>
      </div>
    </div>
  `;
}

export function renderPageSettings(refs, state, handlers) {
  setPageHeader(refs, "лаборатория", "Настройки", "");
  const themes = listThemes();
  const activeTheme = themes.find((t) => t.id === state.settings.theme) || themes[0];

  refs.arena.innerHTML = `
    <div class="settings-grid">
      <section class="settings-section theme-section-v11">
        <div class="settings-kicker">визуал</div>
        <h4>Темы и оформление</h4>
        ${renderThemeStudio(activeTheme, state)}
        <div class="theme-switcher">
          ${themes.map((t) => {
            const active = state.settings.theme === t.id;
            return `
            <button class="theme-pill theme-card-v11 ${active ? "is-active" : ""}" type="button" data-theme-pick="${t.id}" data-theme-preview="${t.id}"
              style="--theme-preview: linear-gradient(135deg, ${t.palette.accent}, ${t.palette.accentSoft});">
              <span class="theme-card-scene" aria-hidden="true">
                <i class="theme-card-nav"></i>
                <i class="theme-card-main"></i>
                <i class="theme-card-line"></i>
              </span>
              <strong>${t.label}${active ? " · активна" : ""}</strong>
              <span class="theme-palette" aria-hidden="true">
                <i style="background:${t.palette.accent}"></i>
                <i style="background:${t.palette.accentSoft}"></i>
                <i style="background:${t.palette.warm}"></i>
                <i style="background:${t.palette.bg}"></i>
              </span>
              <small>${t.description}</small>
            </button>
          `;
          }).join("")}
        </div>
      </section>

      <section class="settings-section">
        <div class="settings-kicker">звук</div>
        <h4>Аудио-движок</h4>
        <label class="setting-row"><span>Эффекты</span><input type="checkbox" data-setting="soundEnabled" ${state.settings.soundEnabled ? "checked" : ""} /></label>
        <label class="setting-row"><span>Музыка</span><input type="checkbox" data-setting="musicEnabled" ${state.settings.musicEnabled ? "checked" : ""} /></label>
        <label class="setting-row"><span>Метроном</span><input type="checkbox" data-setting="metronomeEnabled" ${state.settings.metronomeEnabled ? "checked" : ""} /></label>
        <label class="setting-row"><span>Master</span><input type="range" data-setting="masterVolume" min="0" max="1" step="0.05" value="${state.settings.masterVolume ?? 0.7}" /></label>
        <label class="setting-row"><span>SFX</span><input type="range" data-setting="sfxVolume" min="0" max="1" step="0.05" value="${state.settings.sfxVolume ?? 0.8}" /></label>
        <label class="setting-row"><span>Музыка</span><input type="range" data-setting="musicVolume" min="0" max="1" step="0.05" value="${state.settings.musicVolume ?? 0.28}" /></label>
        <label class="setting-row"><span>Реверб</span>
          <select data-setting="reverbPreset">
            <option value="room" ${state.settings.reverbPreset === "room" ? "selected" : ""}>Комната</option>
            <option value="hall" ${state.settings.reverbPreset === "hall" ? "selected" : ""}>Зал</option>
            <option value="cathedral" ${state.settings.reverbPreset === "cathedral" ? "selected" : ""}>Собор</option>
          </select>
        </label>
      </section>

      <section class="settings-section">
        <div class="settings-kicker">сессия</div>
        <h4>Протокол</h4>
        <label class="setting-row"><span>Минуты</span><input type="number" data-setting="sessionLength" min="8" max="40" value="${state.settings.sessionLength}" /></label>
        <label class="setting-row">
          <span>Интенсивность визуала</span>
          <select data-setting="visualIntensity">
            <option value="calm" ${state.settings.visualIntensity === "calm" ? "selected" : ""}>Спокойная</option>
            <option value="balanced" ${state.settings.visualIntensity === "balanced" ? "selected" : ""}>Баланс</option>
            <option value="intense" ${state.settings.visualIntensity === "intense" ? "selected" : ""}>Плотная</option>
          </select>
        </label>
        <label class="setting-row"><span>Меньше движения</span><input type="checkbox" data-setting="reducedMotion" ${state.settings.reducedMotion ? "checked" : ""} /></label>
        <label class="setting-row"><span>Haptics</span><input type="checkbox" data-setting="hapticsEnabled" ${state.settings.hapticsEnabled ? "checked" : ""} /></label>
        <label class="setting-row"><span>Метакогнитивная калибровка</span><input type="checkbox" data-setting="metacog" ${state.settings.metacog !== false ? "checked" : ""} /></label>
        <label class="setting-row">
          <span>Mental Math · ввод</span>
          <select data-setting="mathInputMode">
            <option value="choice" ${(state.settings.mathInputMode || "choice") === "choice" ? "selected" : ""}>Варианты (мышка)</option>
            <option value="type" ${state.settings.mathInputMode === "type" ? "selected" : ""}>Печать (клавиатура)</option>
          </select>
        </label>
      </section>

      <section class="settings-section">
        <div class="settings-kicker">расширенные</div>
        <h4>Голос и биометрика</h4>
        <label class="setting-row"><span>Голос в Recall</span><input type="checkbox" data-setting="voiceEnabled" ${state.settings.voiceEnabled ? "checked" : ""} /></label>
        <label class="setting-row"><span>Биометрика (камера)</span><input type="checkbox" data-setting="biometricEnabled" ${state.settings.biometricEnabled ? "checked" : ""} /></label>
        <div class="privacy-note">Голос и биометрика обрабатываются только в этом браузере. NeuroForge не отправляет данные на серверы.</div>
      </section>

      <section class="settings-section">
        <div class="settings-kicker">данные</div>
        <h4>Прогресс</h4>
        <div class="hero-actions">
          <button class="secondary-action" type="button" id="exportBtn">Экспорт JSON</button>
          <label class="secondary-action" for="importInput">Импорт<input id="importInput" type="file" accept="application/json" hidden /></label>
          <button class="secondary-action" type="button" id="breathBtn">Дыхание 4-7-8</button>
        </div>
      </section>
    </div>
  `;

  refs.arena.querySelectorAll("[data-theme-pick]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.change("theme", btn.dataset.themePick));
  });
  refs.arena.querySelectorAll("[data-setting]").forEach((input) => {
    const update = () => {
      const key = input.dataset.setting;
      const value = input.type === "checkbox" ? input.checked
        : input.type === "number" || input.type === "range" ? Number(input.value)
        : input.value;
      handlers.change(key, value);
    };
    input.addEventListener("change", update);
    if (input.type === "range") input.addEventListener("input", update);
  });
  refs.arena.querySelector("#exportBtn").addEventListener("click", handlers.export);
  refs.arena.querySelector("#importInput").addEventListener("change", handlers.import);
  refs.arena.querySelector("#breathBtn").addEventListener("click", handlers.breath);
}

/* === Drill execution shells ============================================ */
export function renderModeIntro(refs, state, mode, handlers) {
  const meta = MODE_META[mode];
  const visual = getModeVisual(mode);
  const brief = getModeBrief(state, mode);
  setPageHeader(refs, meta.kicker, meta.title, `
    <button class="ghost-action" type="button" id="introBack">← Назад</button>
    <button class="primary-action" type="button" id="introStart">Начать раунд</button>
  `);

  const showPrediction = state.settings.metacog !== false;
  const predictedDefault = brief.recentAccuracy || 70;
  const science = getScience(mode);

  refs.arena.innerHTML = `
    <div class="module-intro" style="--route-accent:${meta.accent}; --route-glow:${meta.glow}">
      <div class="intro-card">
        <div class="intro-sprite">
          <img src="${visual.sprite}" alt="" />
        </div>
        <div>
          <p class="page-kicker">${meta.kicker}</p>
          <h3>${meta.title}</h3>
          <p style="margin-top:6px; color:var(--muted); line-height:1.5">${meta.objective || ""}</p>
        </div>
      </div>
      <div class="intro-grid">
        <div><span>L${brief.level}</span><small>уровень</small></div>
        <div><span>${brief.recentAccuracy ? brief.recentAccuracy + "%" : "новое"}</span><small>точность</small></div>
        <div><span>${brief.rounds}</span><small>раундов</small></div>
        <div><span>${brief.need}</span><small>потребность</small></div>
      </div>
      ${science && science.howto ? `
        <div class="howto-panel">
          <div class="howto-header">
            <span class="science-badge">📋 как делать</span>
            <strong>${escapeHtml(science.summary)}</strong>
          </div>
          <div class="howto-grid">
            <div class="howto-demo">
              ${renderTutorialDemo(science.tutorial, mode, meta)}
            </div>
            <ol class="howto-steps">
              ${science.howto.map((s, i) => `<li><span class="howto-num">${i + 1}</span><span>${escapeHtml(s)}</span></li>`).join("")}
            </ol>
          </div>
          ${science.tips && science.tips.length ? `
            <div class="howto-tips">
              <small>💡 подсказки:</small>
              <span>${science.tips.map((t) => escapeHtml(t)).join(" · ")}</span>
            </div>
          ` : ""}
        </div>
      ` : ""}
      ${science ? `
        <details class="science-panel">
          <summary>
            <span class="science-badge">📖 наука</span>
            <strong>${escapeHtml(science.summary)}</strong>
          </summary>
          <div class="science-grid">
            <div class="science-develops">
              <small>что развивает</small>
              <ul>
                ${science.develops.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}
              </ul>
            </div>
            <div class="science-excerpt">
              <small>выдержка</small>
              <p>${escapeHtml(science.excerpt)}</p>
            </div>
          </div>
          <cite class="science-cite">${escapeHtml(science.citation)}</cite>
        </details>
      ` : ""}
      ${showPrediction ? `
        <div class="prediction-panel">
          <label class="progress-kicker" for="predSlider">самооценка · какую точность ожидаешь?</label>
          <div class="prediction-row">
            <input type="range" id="predSlider" min="0" max="100" step="5" value="${predictedDefault}" />
            <strong id="predValue">${predictedDefault}%</strong>
          </div>
          <p class="hint-line">после раунда сравним прогноз с реальностью — это калибровка метакогниции (Dunning &amp; Kruger, 1999).</p>
        </div>
      ` : ""}
    </div>
  `;
  if (showPrediction) {
    const slider = refs.arena.querySelector("#predSlider");
    const value = refs.arena.querySelector("#predValue");
    slider.addEventListener("input", () => { value.textContent = `${slider.value}%`; });
  }
  refs.pageActions.querySelector("#introStart").addEventListener("click", () => {
    if (showPrediction) {
      const p = Number(refs.arena.querySelector("#predSlider").value);
      handlers.startRound(p);
    } else {
      handlers.startRound(null);
    }
  });
  refs.pageActions.querySelector("#introBack").addEventListener("click", handlers.back);
}

export function renderDrillShell(refs, state, mode, content, sideHtml = "") {
  const meta = MODE_META[mode];
  const science = getScience(mode);
  setPageHeader(refs, meta.kicker, meta.title, `
    <button class="ghost-action fs-btn" type="button" id="focusFsBtn" title="Фокус-режим (F)" aria-label="Фокус-режим">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/></svg>
      <span>Фокус</span>
    </button>
    ${science ? `<button class="ghost-action" type="button" id="helpDrill">? Подсказка</button>` : ""}
    <button class="ghost-action" type="button" id="abortRound">✕ Прервать</button>
  `);
  refs.arena.innerHTML = `
    <div class="task-shell">
      <section class="task-zone">
        <div class="round-hud">
          <div class="round-goal">
            <span class="round-dot"></span>
            <div>
              <strong>${meta.kicker}</strong>
              <small>${roundMicroGoal(mode)}</small>
            </div>
          </div>
          <div class="round-hud-stats">
            <div><span id="roundProgressValue">0%</span><small>прогресс</small></div>
            <div><span id="roundStreak">0</span><small>серия</small></div>
            <div><span id="roundSignal">готов</span><small>сигнал</small></div>
          </div>
        </div>
        <div class="task-title">
          <div>
            <h3>${meta.title}</h3>
            <p>${meta.objective || ""}</p>
          </div>
          <span class="badge">L${state.levels[mode] || 1}</span>
        </div>
        ${(() => { const h = actionHint(mode); return `
          <div class="action-banner">
            <span class="ab-num">1</span>
            <span class="ab-what">${escapeHtml(h.what)}</span>
            <span class="ab-arrow">→</span>
            <span class="ab-num">2</span>
            <span class="ab-do">${escapeHtml(h.action)}</span>
          </div>
        `; })()}
        <div class="task-main">${content}</div>
        ${science && science.howto ? `
          <div class="drill-help-popover" id="drillHelpPopover" hidden>
            <div class="drill-help-card">
              <strong>📋 Как делать</strong>
              <ol>
                ${science.howto.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
              </ol>
              ${science.tips && science.tips.length ? `<p class="hint-line">💡 ${escapeHtml(science.tips[0])}</p>` : ""}
              <button class="ghost-action" type="button" id="closeDrillHelp">Понял</button>
            </div>
          </div>
        ` : ""}
      </section>
      ${sideHtml || renderSidePanel(state, mode)}
    </div>
  `;
  const helpBtn = document.querySelector("#helpDrill");
  const popover = refs.arena.querySelector("#drillHelpPopover");
  const closeBtn = refs.arena.querySelector("#closeDrillHelp");
  if (helpBtn && popover) {
    helpBtn.addEventListener("click", () => popover.toggleAttribute("hidden"));
    closeBtn?.addEventListener("click", () => popover.setAttribute("hidden", ""));
  }
}

export function renderSidePanel(state, mode) {
  const meta = MODE_META[mode];
  const brief = getModeBrief(state, mode);
  const domains = Object.keys(meta.domainWeights || {});
  return `
    <aside class="task-side">
      <div class="progress-kicker">${meta.kicker}</div>
      <div class="side-metrics">
        <div class="metric-tile"><span>L${brief.level}</span><small>уровень</small></div>
        <div class="metric-tile"><span>${brief.recentAccuracy || "NEW"}</span><small>точность</small></div>
        <div class="metric-tile"><span>${brief.rounds}</span><small>сессий</small></div>
        <div class="metric-tile"><span>${domains.length}</span><small>зоны</small></div>
      </div>
      <div class="hint-line">${domains.map((d) => DOMAINS.find((it) => it.id === d)?.label || d).join(" · ")}</div>
    </aside>
  `;
}

export function renderResult(refs, result, state, handlers) {
  const meta = MODE_META[result.mode];
  const visual = getModeVisual(result.mode);
  const percent = Math.round(result.accuracy * 100);
  const status = percent >= 85 ? "good" : percent >= 60 ? "warn" : "bad";
  const analysis = analyzeRound(state, result);
  const quad = QUADRANT_META[analysis.quadrant] || QUADRANT_META["neutral-precise"];
  const resultArt = getResultArt(status, analysis.newAccBest || analysis.newRtBest);
  setPageHeader(refs, "debrief", `Результат · ${meta.title}`, "");

  // metacog prediction comparison (passed via result._prediction)
  let predictionRow = "";
  if (Number.isFinite(result._prediction)) {
    const delta = percent - result._prediction;
    const accuracyOfPrediction = Math.abs(delta);
    const tone = accuracyOfPrediction <= 7 ? "good" : accuracyOfPrediction <= 15 ? "warn" : "bad";
    predictionRow = `
      <div class="analysis-pred">
        <div class="analysis-pred-row">
          <div><strong>${result._prediction}%</strong><small>прогноз</small></div>
          <div class="analysis-pred-arrow">→</div>
          <div><strong>${percent}%</strong><small>факт</small></div>
          <div class="analysis-pred-delta ${tone}">${delta >= 0 ? "+" : ""}${delta} п.п.</div>
        </div>
        <p class="hint-line">${
          accuracyOfPrediction <= 7
            ? "Самооценка точна — доверяй внутреннему ощущению темпа."
            : delta > 0
              ? "Недооценил себя — ты сильнее, чем кажется. Можно брать сложнее."
              : "Переоценил — типичный Dunning-Kruger. Спустись на пол-ступени."
        }</p>
      </div>
    `;
  }

  const isPr = analysis.newAccBest || analysis.newRtBest;
  const resultCoach = buildResultCoach(state, result, analysis);
  const brainTag = getDrillBrainTag(result.mode);
  const gaugeCirc = 2 * Math.PI * 54;
  const gaugeOffset = (gaugeCirc * (1 - Math.max(0, Math.min(100, percent)) / 100)).toFixed(1);
  const domainGains = Object.entries(meta.domainWeights || {})
    .sort((a, b) => b[1] - a[1])
    .map(([dk, weight]) => {
      const dm = DOMAIN_META[dk] || { label: dk };
      const pts = Math.max(1, Math.round(result.xp * weight * 0.25));
      return `<span class="rbi-chip"><strong>${escapeHtml(dm.label)}</strong><em>+${pts}</em></span>`;
    })
    .join("");

  refs.arena.innerHTML = `
    <div class="result-panel result-${status} ${isPr ? "is-pr" : ""}" style="--route-accent:${meta.accent}; --route-glow:${meta.glow}">
      <img class="result-art" src="${resultArt}" alt="" loading="lazy" />

      <div class="result-hero-v5">
        <div class="result-hero-left">
          <div class="result-number-block">
            <div class="result-gauge-wrap" data-status="${status}">
              <svg class="result-gauge-svg" viewBox="0 0 128 128" aria-hidden="true">
                <circle class="rg-track" cx="64" cy="64" r="54" />
                <circle class="rg-fill" cx="64" cy="64" r="54" style="stroke-dasharray:${gaugeCirc.toFixed(1)}; stroke-dashoffset:${gaugeOffset}" />
              </svg>
              <span class="result-big-number" data-status="${status}">${percent}<sup>%</sup></span>
            </div>
            <div class="result-label-stack">
              <span class="result-label-status status-pill ${analysis.tone}">${analysis.label}</span>
              ${analysis.newAccBest ? `<span class="status-pill good">🏆 рекорд точности</span>` : ""}
              ${analysis.newRtBest ? `<span class="status-pill good">⚡ рекорд скорости</span>` : ""}
              ${result.critRound ? `<span class="status-pill warn">✨ Crit Round ×2</span>` : ""}
              ${result.challengeBonus ? `<span class="status-pill warn">⚡ Вызов дня</span>` : ""}
            </div>
          </div>
          <div class="result-meta-strip">
            <div class="result-meta-item">
              <span>${result.xp}</span><small>XP</small>
            </div>
            <div class="result-meta-item">
              <span>${formatRt(result.rt)}</span><small>отклик</small>
            </div>
            <div class="result-meta-item">
              <span>L${result.difficultyAfter}</span><small>уровень</small>
            </div>
            <div class="result-meta-item">
              <span>${result.streakBest || 0}</span><small>серия</small>
            </div>
            <div class="result-meta-item">
              <span>${result.mistakes}</span><small>ошибки</small>
            </div>
          </div>
        </div>
        <div class="result-hero-right">
          <div class="result-sprite">
            <img src="${visual.sprite}" alt="" />
          </div>
          <p class="page-kicker">${meta.kicker}</p>
          <h3>${meta.title}</h3>
          ${isPr ? `<button class="result-share-btn" type="button" id="resultShareBtn" title="Скачать карточку"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v14"/></svg> Поделиться</button>` : ""}
        </div>
      </div>

      <div class="result-brain-impact">
        <div class="rbi-main">
          <span class="rbi-kicker">Прокачанный отдел мозга</span>
          <strong class="rbi-lobe">🧠 ${escapeHtml(brainTag.lobe)}</strong>
          <p class="rbi-why">${escapeHtml(brainTag.why)}</p>
        </div>
        <div class="rbi-chips">${domainGains}</div>
      </div>

      <div class="analysis-block">
        <div class="analysis-header">
          <strong>${analysis.label}</strong>
          <span class="analysis-quad" data-tone="${quad.tone}">${quad.icon} ${quad.label}</span>
        </div>
        ${renderErrorTypeChips(result, analysis)}
        <p class="analysis-insight">${escapeHtml(analysis.insight)}</p>

        <div class="analysis-grid">
          <div class="analysis-tile">
            <small>vs твоя база (${analysis.samples} р.)</small>
            <strong class="${analysis.accDelta >= 0 ? "good" : "bad"}">${analysis.accDelta >= 0 ? "+" : ""}${analysis.accDelta} п.п.</strong>
            <span>точность: ${analysis.accBaseline}% обычно</span>
          </div>
          ${analysis.rtBaseline !== null ? `
            <div class="analysis-tile">
              <small>vs твой темп</small>
              <strong class="${analysis.rtDelta <= 0 ? "good" : "warn"}">${analysis.rtDelta >= 0 ? "+" : ""}${analysis.rtDelta} ms</strong>
              <span>обычно: ${analysis.rtBaseline} ms</span>
            </div>
          ` : ""}
          <div class="analysis-tile">
            <small>flow-зона</small>
            <strong class="${analysis.flow ? "good" : "muted"}">${analysis.flow ? "да" : "нет"}</strong>
            <span>65–85% точности + темп в норме</span>
          </div>
        </div>
        <details class="cog-load-collapse">
          <summary>Дополнительно: когнитивная нагрузка ${analysis.cognitiveLoad}/100</summary>
          <div class="analysis-load-bar" style="margin-top:8px"><span style="width:${analysis.cognitiveLoad}%"></span></div>
          <p class="hint-line">Эвристическая оценка по уровню × ошибкам × распределению. Хорошая зона: 40-70.</p>
        </details>
      </div>

      ${renderResultCoach(resultCoach)}

      ${predictionRow}

      <div class="reflection-panel">
        <div class="progress-kicker">мини-рефлексия (необязательно)</div>
        <textarea id="reflectionInput" placeholder="Что было хардест? Что заметил? — короткая заметка для архива."></textarea>
      </div>

      <div class="result-actions">
        <button class="primary-action result-cta-primary" type="button" id="resultNext">
          <span class="cta-main">${handlers.circuitActive ? "Следующий раунд" : "Сыграть ещё"}</span>
          <span class="cta-sub">${handlers.circuitActive ? "продолжение протокола" : "~" + getDrillDuration(result.mode) + " мин"}</span>
        </button>
        <button class="secondary-action" type="button" id="resultDrills">← К тренировкам</button>
        <button class="ghost-action" type="button" id="resultHome">↩ В центр</button>
      </div>
    </div>
  `;
  refs.arena.querySelector("#resultNext").addEventListener("click", handlers.next);
  refs.arena.querySelector("#resultDrills").addEventListener("click", handlers.toDrills);
  refs.arena.querySelector("#resultHome")?.addEventListener("click", handlers.toCenter);
  refs.arena.querySelector("#resultCoachMode")?.addEventListener("click", () => handlers.openMode?.(resultCoach.mode));
  refs.arena.querySelector("#resultShareBtn")?.addEventListener("click", () => {
    try { generateShareCard(result, state, analysis); }
    catch (e) { console.warn("share card failed", e); }
  });

  // PB celebration
  if (analysis.newAccBest || analysis.newRtBest) celebratePR();

  // reflection journal
  const reflInput = refs.arena.querySelector("#reflectionInput");
  if (reflInput) {
    reflInput.addEventListener("change", () => {
      const text = reflInput.value.trim();
      if (text && handlers.saveReflection) handlers.saveReflection({ mode: result.mode, text, accuracy: percent });
    });
  }
}

function renderDailyChallengeCard(state, handlers) {
  const ch = getTodayChallenge();
  const meta = MODE_META[ch.mode];
  if (!meta) return "";
  const completed = isChallengeCompletedToday(state);
  const streak = state.dailyChallenge?.streak || 0;
  const visual = getModeVisual(ch.mode);
  const banner = getChallengeBanner(ch.theme);
  return `
    <section class="daily-challenge-card ${completed ? "is-done" : ""}" style="--route-accent:${meta.accent}; --route-glow:${meta.glow}; --challenge-banner:url(${banner})">
      <div class="dc-header">
        <span class="dc-badge">⚡ вызов дня</span>
        ${completed
          ? `<span class="dc-status dc-done">✓ выполнено</span>`
          : `<span class="dc-bonus">+50% XP</span>`}
      </div>
      <div class="dc-body">
        <div class="dc-sprite"><img src="${visual.sprite}" alt="" loading="lazy" /></div>
        <div class="dc-text">
          <small>${escapeHtml(ch.theme)}</small>
          <h4>${escapeHtml(meta.title)}</h4>
          <p>${escapeHtml(meta.objective || meta.kicker)}</p>
        </div>
      </div>
      <div class="dc-foot">
        <button class="${completed ? "ghost-action" : "primary-action"}" type="button" data-dc-start="${ch.mode}">
          ${completed ? "Пройти ещё раз" : "Принять вызов →"}
        </button>
        ${streak > 0 ? `<span class="dc-streak" data-tooltip="дней подряд с вызовом">🔥 ${streak}</span>` : ""}
      </div>
    </section>
  `;
}

function renderTutorialDemo(type, mode, meta) {
  const accent = meta?.accent || "var(--accent)";
  // Each type returns inline SVG/HTML with CSS animations
  switch (type) {
    case "nback":
      return `
        <div class="tdemo tdemo-nback">
          <div class="tdemo-grid">
            ${Array.from({ length: 9 }, (_, i) => `<span class="tdemo-cell" style="--i:${i}"></span>`).join("")}
          </div>
          <div class="tdemo-label">↑ совпало с n=2 шагов назад</div>
        </div>
      `;
    case "grid":
      return `
        <div class="tdemo tdemo-grid-trace">
          <div class="tdemo-grid tdemo-4x4">
            ${Array.from({ length: 16 }, (_, i) => `<span class="tdemo-cell" style="--i:${i}"></span>`).join("")}
          </div>
          <div class="tdemo-label">смотри → запомни → повтори</div>
        </div>
      `;
    case "stroop":
      return `
        <div class="tdemo tdemo-stroop">
          <div class="tdemo-word">СИНИЙ</div>
          <div class="tdemo-arrow">⤵</div>
          <div class="tdemo-answer">выбрать «красный» (цвет шрифта)</div>
        </div>
      `;
    case "logic":
      return `
        <div class="tdemo tdemo-logic">
          <div class="tdemo-seq">2 · 5 · 11 · 23 · <span>?</span></div>
          <div class="tdemo-label">правило: ×2 + 1 → 47</div>
        </div>
      `;
    case "recall":
      return `
        <div class="tdemo tdemo-recall">
          <div class="tdemo-card tdemo-q">Что измеряет n-back?</div>
          <div class="tdemo-arrow">⤵</div>
          <div class="tdemo-card tdemo-a">рабочую память</div>
        </div>
      `;
    case "scan":
      return `
        <div class="tdemo tdemo-scan">
          <div class="tdemo-target">найди: ◆</div>
          <div class="tdemo-grid tdemo-5x5">
            ${["○","◇","◆","△","▲","◇","○","▲","◇","△","◆","○","◇","△","▲","△","◆","○","▲","◇","◇","△","○","◆","▲"].map((s, i) => `<span class="tdemo-cell" style="--i:${i}">${s}</span>`).join("")}
          </div>
        </div>
      `;
    case "rotate":
      return `
        <div class="tdemo tdemo-rotate">
          <div class="tdemo-shape tdemo-shape-orig">⬢</div>
          <div class="tdemo-arrow">↻</div>
          <div class="tdemo-shape tdemo-shape-rot">⬢</div>
        </div>
      `;
    case "reaction":
      return `
        <div class="tdemo tdemo-reaction">
          <div class="tdemo-pad">GO</div>
          <div class="tdemo-label">тапнуть сразу при GO</div>
        </div>
      `;
    case "trail":
      return `
        <div class="tdemo tdemo-trail">
          <svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="30" cy="30" r="14" class="tdemo-node tdemo-n1"/>
            <text x="30" y="35" text-anchor="middle">1</text>
            <circle cx="80" cy="60" r="14" class="tdemo-node tdemo-n2"/>
            <text x="80" y="65" text-anchor="middle">А</text>
            <circle cx="140" cy="30" r="14" class="tdemo-node tdemo-n3"/>
            <text x="140" y="35" text-anchor="middle">2</text>
            <circle cx="180" cy="70" r="14" class="tdemo-node tdemo-n4"/>
            <text x="180" y="75" text-anchor="middle">Б</text>
            <polyline points="30,30 80,60 140,30 180,70" class="tdemo-line"/>
          </svg>
          <div class="tdemo-label">1 → А → 2 → Б …</div>
        </div>
      `;
    case "anback":
      return `
        <div class="tdemo tdemo-anback">
          <div class="tdemo-orb">К</div>
          <div class="tdemo-label">🔊 слушай · n=2 назад</div>
        </div>
      `;
    case "math":
      return `
        <div class="tdemo tdemo-math">
          <div class="tdemo-eq">23 + 17 = <span class="tdemo-cursor">_</span></div>
          <div class="tdemo-label">Enter — отправить</div>
        </div>
      `;
    case "schulte":
      return `
        <div class="tdemo tdemo-schulte">
          <div class="tdemo-grid tdemo-5x5-num">
            ${[14,3,21,7,12,18,1,9,22,15,5,24,11,17,2,8,20,13,4,23,16,6,25,10,19].map((n, i) => `<span class="tdemo-cell" style="--i:${i}">${n}</span>`).join("")}
          </div>
          <div class="tdemo-fixation">+</div>
          <div class="tdemo-label">взгляд в центр · ищи 1, 2, 3 …</div>
        </div>
      `;
    case "antisaccade":
      return `
        <div class="tdemo tdemo-antisaccade">
          <div class="tdemo-rail">
            <span class="tdemo-side tdemo-side-l">К</span>
            <span class="tdemo-fix">+</span>
            <span class="tdemo-side tdemo-side-r"></span>
          </div>
          <div class="tdemo-label">мигнуло справа → смотри ВЛЕВО</div>
        </div>
      `;
    case "rsvp":
      return `
        <div class="tdemo tdemo-rsvp">
          <div class="tdemo-rsvp-stage"><span>гиппокамп</span></div>
          <div class="tdemo-label">слова мелькают · ~300 wpm</div>
        </div>
      `;
    case "stopsig":
      return `
        <div class="tdemo tdemo-stopsig">
          <div class="tdemo-pad tdemo-pad-go">●</div>
          <div class="tdemo-pad tdemo-pad-stop">■</div>
          <div class="tdemo-label">● жми · ■ удержи</div>
        </div>
      `;
    default:
      return `<div class="tdemo tdemo-empty">демонстрация скоро</div>`;
  }
}

function renderErrorTypeChips(result, analysis) {
  const total = result.attempts || (result.hits + result.mistakes) || 1;
  const errors = result.mistakes || 0;
  const correct = result.hits || (total - errors);
  const errorRate = errors / total;
  const fastErrors = analysis.quadrant === "fast-sloppy";
  const slowErrors = analysis.quadrant === "slow-sloppy";

  const chips = [
    { icon: "✓", label: `${correct} верно`, tone: "good" },
    { icon: "✕", label: `${errors} ошибок`, tone: errors === 0 ? "muted" : "warn" },
  ];
  if (errorRate > 0.15 && fastErrors) chips.push({ icon: "💨", label: "поспешные", tone: "warn", title: "ошибки были связаны с темпом — замедлись" });
  if (errorRate > 0.15 && slowErrors) chips.push({ icon: "🧠", label: "перегруз", tone: "bad", title: "и медленнее, и шумно — спусти уровень" });
  if (correct >= total * 0.95) chips.push({ icon: "🎯", label: "чистый раунд", tone: "good" });
  if (result.streakBest >= 8) chips.push({ icon: "🔥", label: `серия ${result.streakBest}`, tone: "good" });

  return `
    <div class="error-chips">
      ${chips.map((c) => `<span class="error-chip" data-tone="${c.tone}"${c.title ? ` title="${escapeHtml(c.title)}"` : ""}>${c.icon} ${escapeHtml(c.label)}</span>`).join("")}
    </div>
  `;
}

function buildResultCoach(state, result, analysis) {
  const alternatives = getRecommendedPlan(state).filter((mode) => MODE_META[mode] && mode !== result.mode);
  const due = dueCardsCount(state);
  let tone = "focus";
  let title = "Закрепить траекторию";
  let text = "Раунд в рабочей зоне. Повтори модуль, если хочешь закрепить навык, или смени задачу для вариативности.";
  let mode = result.mode;
  let label = "Повторить модуль";

  if (result.accuracy < 0.6 || analysis.quadrant === "slow-sloppy") {
    tone = "recovery";
    title = "Снизить шум";
    text = due > 0
      ? "Нагрузка выше ресурса. Лучше перейти в Recall: активное вспоминание даст пользу без гонки за скоростью."
      : "Нагрузка выше ресурса. Возьми более мягкий модуль, чтобы вернуть точность и не закреплять ошибки.";
    mode = due > 0 ? "recall" : (alternatives[0] || "recall");
    label = `Перейти к ${MODE_META[mode]?.title || "модулю"}`;
  } else if (analysis.quadrant === "fast-sloppy") {
    tone = "calibrate";
    title = "Темп опережает контроль";
    text = "Ты отвечал быстро, но точность просела. Повтори этот же модуль с правилом: сначала чистый ответ, потом скорость.";
    label = "Повторить медленнее";
  } else if (analysis.flow) {
    tone = "peak";
    title = "Flow-зона найдена";
    text = "Это хорошее соотношение вызова и навыка. Ещё один раунд того же типа даст плотную практику без лишнего шума.";
    label = "Остаться в flow";
  } else if (result.accuracy >= 0.9) {
    tone = "peak";
    title = "Перенести импульс";
    text = "Точность высокая. Можно взять следующий приоритетный модуль и расширить перенос между доменами.";
    mode = alternatives[0] || result.mode;
    label = `Следующий: ${MODE_META[mode]?.title || "модуль"}`;
  } else if (analysis.quadrant === "slow-precise") {
    tone = "focus";
    title = "Ускорить без потери качества";
    text = "Точность есть, скорость осторожная. Следующий раунд держи тот же модуль и отвечай на одно дыхание быстрее.";
    label = "Повторить на темп";
  } else if (alternatives.length) {
    mode = alternatives[0];
    label = `Сменить на ${MODE_META[mode]?.title}`;
  }

  return { tone, title, text, mode, label, meta: MODE_META[mode] || MODE_META[result.mode] };
}

function renderResultCoach(coach) {
  return `
    <section class="result-coach-card result-coach-${coach.tone}" style="--route-accent:${coach.meta?.accent || "var(--accent)"}; --route-glow:${coach.meta?.glow || "var(--accent-glow)"}">
      <div class="result-coach-copy">
        <div class="progress-kicker">следующее решение</div>
        <h4>${escapeHtml(coach.title)}</h4>
        <p>${escapeHtml(coach.text)}</p>
      </div>
      <button class="secondary-action" type="button" id="resultCoachMode">
        <span class="coach-next-code">${escapeHtml(coach.meta?.code || "NF")}</span>
        ${escapeHtml(coach.label)}
      </button>
    </section>
  `;
}

function celebratePR() {
  const layer = document.createElement("div");
  layer.className = "pr-confetti";
  for (let i = 0; i < 60; i += 1) {
    const c = document.createElement("span");
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = ["#ffba2e", "#4fd1a8", "#7c5cff", "#ff7da6"][Math.floor(Math.random() * 4)];
    c.style.animationDelay = `${Math.random() * 0.3}s`;
    c.style.animationDuration = `${1.4 + Math.random() * 0.8}s`;
    layer.appendChild(c);
  }
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 2400);
}

/* === Photic consent ===================================================== */
export function renderPhoticConsent(targetId, handlers) {
  const existing = document.querySelector(".photic-consent");
  if (existing) existing.remove();

  const previousFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "photic-consent";
  overlay.innerHTML = `
    <div class="photic-consent-card" role="dialog" aria-modal="true" aria-labelledby="photicTitle" tabindex="-1">
      <span class="photic-warning">⚠ Безопасность</span>
      <h3 id="photicTitle">Мигающий свет 40Гц</h3>
      <p>40Гц-мигание <strong>может вызвать фотосенситивный приступ</strong> у людей с эпилепсией (~1/4000). Также противопоказано при мигрени с аурой. Если ты или родственники когда-либо теряли сознание от мигающих экранов — пропусти эту функцию.</p>
      <p>Протокол GENUS (Iaccarino &amp; Tsai, Nature 2016) показал снижение бета-амилоида у мышиных моделей Альцгеймера. Эффект на людей пока экспериментальный.</p>
      <label class="photic-check"><input type="checkbox" id="photicAck1" /><span>Я понимаю риск фотосенситивного приступа.</span></label>
      <label class="photic-check"><input type="checkbox" id="photicAck2" /><span>У меня и близких нет эпилепсии и мигрени с аурой.</span></label>
      <div class="photic-actions">
        <button type="button" class="ghost-action" id="photicCancel">Отмена</button>
        <button type="button" class="primary-action" id="photicConfirm" disabled>Запустить</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const ack1 = overlay.querySelector("#photicAck1");
  const ack2 = overlay.querySelector("#photicAck2");
  const confirm = overlay.querySelector("#photicConfirm");
  const card = overlay.querySelector(".photic-consent-card");
  const refresh = () => { confirm.disabled = !(ack1.checked && ack2.checked); };
  const close = () => {
    window.removeEventListener("keydown", onKey);
    overlay.remove();
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus({ preventScroll: true });
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = [...overlay.querySelectorAll("button, input, [tabindex]:not([tabindex='-1'])")]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!overlay.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  ack1.addEventListener("change", refresh);
  ack2.addEventListener("change", refresh);
  overlay.querySelector("#photicCancel").addEventListener("click", close);
  confirm.addEventListener("click", () => { handlers.confirm(targetId); close(); });
  window.addEventListener("keydown", onKey);
  const focusFirstAck = () => {
    try { ack1.focus({ preventScroll: true }); }
    catch { ack1.focus(); }
  };
  window.requestAnimationFrame(() => {
    [40, 140, 300].forEach((delay) => window.setTimeout(focusFirstAck, delay));
  });
}

/* === Fact card (in center page or anywhere) ============================ */
export function renderFactCard(host, fact, onNext) {
  if (!host) return;
  host.innerHTML = `
    <div class="fact-icon" aria-hidden="true">🧠</div>
    <div class="fact-body">
      <p>${escapeHtml(fact.fact)}</p>
      <cite>${escapeHtml(fact.source)}</cite>
    </div>
    <button type="button" aria-label="следующий факт">↻</button>
  `;
  host.querySelector("button").addEventListener("click", onNext);
}

/* === Toast & onboarding ================================================= */
export function toast(refs, message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("is-visible");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => refs.toast.classList.remove("is-visible"), 2600);
}

/**
 * Zero-friction onboarding (GD#1).
 * Flow: welcome → instant 20-sec Reaction round → identity pick → goal anchor → ready.
 * Total ~75 seconds, no text walls.
 */
export function renderOnboarding(handlers) {
  const overlay = document.createElement("div");
  overlay.className = "onboarding-overlay onboarding-v5";
  document.body.appendChild(overlay);

  const collected = {
    reactionTimes: [],
    weakDomain: null,
    goal: null,
  };

  function stepWelcome() {
    overlay.innerHTML = `
      <div class="ob-card ob-welcome">
        <span class="ob-eyebrow">добро пожаловать</span>
        <h2 class="ob-title">NeuroForge</h2>
        <p class="ob-sub">Пройди короткое знакомство — займёт 60-90 секунд. Без чтения мануалов.</p>
        <div class="ob-actions">
          <button class="ghost-action" type="button" id="obSkip">Пропустить и в Центр</button>
          <button class="primary-action ob-cta" type="button" id="obStart">Начать ▸</button>
        </div>
        <small class="ob-foot">Локально · без аккаунтов · без рекламы</small>
      </div>
    `;
    overlay.querySelector("#obSkip").addEventListener("click", finish);
    overlay.querySelector("#obStart").addEventListener("click", stepReaction);
  }

  function stepReaction() {
    overlay.innerHTML = `
      <div class="ob-card ob-reaction">
        <span class="ob-eyebrow">1 · ощути темп</span>
        <h3 class="ob-h3">Быстрый раунд: реакция</h3>
        <p class="ob-sub">Когда круг станет зелёным «GO» — тапни как можно быстрее. 5 попыток.</p>
        <button type="button" class="ob-pad ob-pad-wait" id="obPad">ЖДИ</button>
        <div class="ob-meta">
          <span><strong id="obAttempts">0</strong>/5 попыток</span>
          <span><strong id="obBestRt">—</strong> ms лучшее</span>
        </div>
      </div>
    `;
    const pad = overlay.querySelector("#obPad");
    const attEl = overlay.querySelector("#obAttempts");
    const bestEl = overlay.querySelector("#obBestRt");
    let phase = "wait", goAt = 0, timer = 0, attempt = 0;

    function startTrial() {
      if (attempt >= 5) { stepIdentity(); return; }
      phase = "wait";
      pad.className = "ob-pad ob-pad-wait";
      pad.textContent = "ЖДИ";
      const delay = 800 + Math.random() * 1400;
      timer = window.setTimeout(() => {
        phase = "go";
        pad.className = "ob-pad ob-pad-go";
        pad.textContent = "GO";
        goAt = performance.now();
      }, delay);
    }

    pad.addEventListener("click", () => {
      if (phase === "wait") {
        window.clearTimeout(timer);
        // false start — try again, don't count
        pad.className = "ob-pad ob-pad-early";
        pad.textContent = "рано!";
        window.setTimeout(startTrial, 600);
        return;
      }
      if (phase === "go") {
        const rt = performance.now() - goAt;
        collected.reactionTimes.push(rt);
        attempt += 1;
        attEl.textContent = attempt;
        const best = Math.min(...collected.reactionTimes);
        bestEl.textContent = Math.round(best);
        phase = "done";
        pad.className = "ob-pad ob-pad-done";
        pad.textContent = `${Math.round(rt)} ms`;
        // spawn floating +
        const rect = pad.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const float = document.createElement("div");
        float.className = "float-text float-text-good";
        float.textContent = "+1";
        float.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:9999;`;
        document.body.appendChild(float);
        window.setTimeout(() => float.remove(), 1100);
        window.setTimeout(startTrial, 700);
      }
    });

    startTrial();
  }

  function stepIdentity() {
    overlay.innerHTML = `
      <div class="ob-card ob-identity">
        <span class="ob-eyebrow">2 · что прокачиваем</span>
        <h3 class="ob-h3">Какая зона у тебя слабее всего?</h3>
        <p class="ob-sub">Это поможет настроить первый план. Можно поменять позже.</p>
        <div class="ob-domains">
          ${[
            { id: "memory", label: "Память", icon: "🧠", desc: "забываю детали, разговор час назад" },
            { id: "focus", label: "Внимание", icon: "🎯", desc: "отвлекаюсь, теряю фокус на задаче" },
            { id: "speed", label: "Скорость", icon: "⚡", desc: "медленно реагирую, долго думаю" },
            { id: "logic", label: "Логика", icon: "🔣", desc: "сложно анализировать, считать в уме" },
            { id: "wm", label: "Рабочая память", icon: "📋", desc: "теряю мысль на полпути" },
            { id: "spatial", label: "Образы", icon: "🌀", desc: "сложно мысленно вращать фигуры" },
          ].map((d) => `
            <button class="ob-domain" type="button" data-id="${d.id}">
              <span class="ob-domain-icon">${d.icon}</span>
              <strong>${d.label}</strong>
              <small>${d.desc}</small>
            </button>
          `).join("")}
        </div>
        <div class="ob-actions">
          <button class="ghost-action" type="button" id="obDomainSkip">Все понемногу</button>
        </div>
      </div>
    `;
    overlay.querySelectorAll("[data-id]").forEach((b) => {
      b.addEventListener("click", () => {
        collected.weakDomain = b.dataset.id;
        b.classList.add("is-picked");
        window.setTimeout(stepGoal, 350);
      });
    });
    overlay.querySelector("#obDomainSkip").addEventListener("click", stepGoal);
  }

  function stepGoal() {
    overlay.innerHTML = `
      <div class="ob-card ob-goal">
        <span class="ob-eyebrow">3 · цель на 21 день</span>
        <h3 class="ob-h3">Зачем тебе это?</h3>
        <p class="ob-sub">Якорь, который вспомнится при усталости. Можно сменить.</p>
        <div class="ob-goals">
          ${[
            { id: "clarity", icon: "💎", label: "Думать яснее", desc: "меньше тумана в голове" },
            { id: "focus-work", icon: "🎯", label: "Фокус на работе", desc: "не отвлекаться на задачи" },
            { id: "memory-keep", icon: "📖", label: "Помнить детали", desc: "имена, факты, нюансы" },
            { id: "reaction", icon: "⚡", label: "Быстрая реакция", desc: "лучше в спорте, играх, вождении" },
            { id: "learning", icon: "🎓", label: "Лучше учиться", desc: "новый язык, навык, профессия" },
            { id: "wellbeing", icon: "🌱", label: "Просто привычка", desc: "поддерживать форму без целей" },
          ].map((g) => `
            <button class="ob-goal-card" type="button" data-id="${g.id}">
              <span class="ob-goal-icon">${g.icon}</span>
              <strong>${g.label}</strong>
              <small>${g.desc}</small>
            </button>
          `).join("")}
        </div>
      </div>
    `;
    overlay.querySelectorAll("[data-id]").forEach((b) => {
      b.addEventListener("click", () => {
        collected.goal = b.dataset.id;
        b.classList.add("is-picked");
        window.setTimeout(stepReady, 350);
      });
    });
  }

  function stepReady() {
    const bestRt = collected.reactionTimes.length ? Math.min(...collected.reactionTimes) : null;
    const meanRt = collected.reactionTimes.length ? collected.reactionTimes.reduce((a, b) => a + b, 0) / collected.reactionTimes.length : null;
    const goalLabel = {
      clarity: "Думать яснее", "focus-work": "Фокус на работе", "memory-keep": "Помнить детали",
      reaction: "Быстрая реакция", learning: "Лучше учиться", wellbeing: "Привычка",
    }[collected.goal] || "Прокачать мозг";
    overlay.innerHTML = `
      <div class="ob-card ob-ready">
        <span class="ob-eyebrow">готов</span>
        <h2 class="ob-title">Поехали</h2>
        <div class="ob-summary">
          ${bestRt ? `<div class="ob-pill">⚡ <strong>${Math.round(bestRt)} ms</strong> твой лучший RT</div>` : ""}
          ${collected.weakDomain ? `<div class="ob-pill">🎯 фокус на: <strong>${MODE_LABEL_FOR_DOMAIN[collected.weakDomain] || collected.weakDomain}</strong></div>` : ""}
          <div class="ob-pill">🌱 цель: <strong>${goalLabel}</strong></div>
        </div>
        <p class="ob-sub">Адаптив-протокол подстроится под слабую зону. Дальше — Центр, кнопка «Запустить».</p>
        <div class="ob-actions">
          <button class="primary-action ob-cta" type="button" id="obDone">В Центр ▸</button>
        </div>
      </div>
    `;
    overlay.querySelector("#obDone").addEventListener("click", finish);
  }

  function finish() {
    overlay.remove();
    handlers.finish?.({
      reactionBaseline: collected.reactionTimes.length ? Math.min(...collected.reactionTimes) : null,
      weakDomain: collected.weakDomain,
      goal: collected.goal,
    });
  }

  stepWelcome();
}

const MODE_LABEL_FOR_DOMAIN = {
  memory: "Память", wm: "Рабочая память", focus: "Внимание",
  logic: "Логика", speed: "Скорость", spatial: "Образы",
};

/* === Helpers ============================================================ */
function sessionChip(state, minutes, label, note) {
  const active = Number(state.settings.sessionLength) === minutes;
  return `
    <button class="session-chip ${active ? "is-active" : ""}" type="button" data-session-minutes="${minutes}">
      <strong>${minutes}</strong>
      <span>${label}</span>
      <small>${note}</small>
    </button>
  `;
}

function getSessionRouteCount(state) {
  const minutes = Number(state.settings.sessionLength) || 18;
  if (minutes <= 8) return 3;
  if (minutes <= 18) return 5;
  return 7;
}

function dueCardsCount(state) {
  const now = Date.now();
  return state.cards.filter((c) => c.due <= now).length;
}

function statusLabel(s) { return s === "good" ? "усиление" : s === "warn" ? "адаптация" : "перенастройка"; }

function formatRt(rt) {
  if (!rt) return "—";
  if (rt >= 1000) return `${(rt / 1000).toFixed(1)}s`;
  return `${Math.round(rt)}ms`;
}

function roundMicroGoal(mode) {
  const goals = {
    nback: "удерживай два потока", grid: "восстанови маршрут мысленно", focus: "переключай правило", logic: "ищи правило, не угадывай",
    recall: "вспомни до подсказки", scan: "сканируй по траектории", rotate: "поверни образ целиком",
    reaction: "ждать сигнала", trail: "1-А-2-Б-3-В", stroop: "цвет важнее слова", anback: "слушай, сравнивай с n назад",
    math: "счёт в уме, выбери или введи", schulte: "смотри в центр, ищи периферией", antisaccade: "посмотри на противоположную сторону",
    rsvp: "слова мелькают по одному", stopsig: "● — жми, ■ — стоп",
    flanker: "только ЦЕНТРАЛЬНАЯ стрелка", bspan: "повтори в ОБРАТНОМ порядке", vfluency: "уникальные слова из категории",
    tower: "минимум ходов до цели", dsst: "найди символ по цифре",
  };
  return goals[mode] || "держи точность";
}

function actionHint(mode) {
  const hints = {
    nback: { what: "ЗАПОМИНАЙ две вещи: где загорелось и какая буква", action: "когда повторится через N шагов — нажми Match" },
    grid: { what: "СМОТРИ как клетки вспыхивают по очереди", action: "потом тапни их в ТОМ ЖЕ порядке" },
    bspan: { what: "СМОТРИ как клетки вспыхивают по очереди", action: "потом тапни в ОБРАТНОМ порядке" },
    focus: { what: "ПРАВИЛО сверху: ЦВЕТ или СЛОВО", action: "выбери кнопку по правилу — игнорируй конфликт" },
    stroop: { what: "СЛОВО написано цветом", action: "выбери ЦВЕТ ШРИФТА (не значение слова)" },
    flanker: { what: "5 стрелок в ряд", action: "нажми по направлению ЦЕНТРАЛЬНОЙ (← / → клавиши)" },
    logic: { what: "паттерн с пропуском", action: "найди правило и выбери продолжение" },
    recall: { what: "вопрос — попробуй ВСПОМНИТЬ", action: "введи или скажи голосом, потом оцени себя честно" },
    scan: { what: "цель — символ сверху", action: "найди его в сетке и кликни" },
    rotate: { what: "ОРИГИНАЛ сверху", action: "выбери ту фигуру, что совпадает после поворота" },
    reaction: { what: "ЖДИ зелёный «GO»", action: "жми СРАЗУ. На «СТОП» — НЕ жми" },
    trail: { what: "узлы 1-9 и А-К разбросаны", action: "соединяй: 1 → А → 2 → Б → 3 → В …" },
    anback: { what: "СЛУШАЙ — буквы звучат", action: "если повторилась через n шагов — «Match»" },
    math: { what: "пример в центре", action: "кликни верный вариант (или 1-4 на клавиатуре)" },
    schulte: { what: "сетка с числами 1-25", action: "СМОТРИ в центр. Кликни 1, потом 2, потом 3 …" },
    antisaccade: { what: "СМОТРИ на «+» в центре", action: "мигнёт сторона → выбери букву С ПРОТИВОПОЛОЖНОЙ" },
    rsvp: { what: "слова мелькают по одному", action: "не двигай глазами; потом ответь на вопрос" },
    stopsig: { what: "зелёный ● или красный ■", action: "● — жми СРАЗУ, ■ — НЕ жми" },
    vfluency: { what: "категория сверху, 60 сек", action: "печатай слова — по одному на строке или через запятую" },
    tower: { what: "шарики слева, цель справа", action: "тап колонку → возьми верх; тап другую → положи. Минимум ходов" },
    dsst: { what: "ключ сверху: 9 пар цифра→символ", action: "найди символ для текущей цифры, кликни вариант" },
  };
  return hints[mode] || { what: "следуй инструкциям drill", action: "удерживай фокус и точность" };
}

function resultAdvice(result) {
  if (result.accuracy >= 0.85) return { title: "Можно повышать нагрузку", text: "Точность выше верхней зоны адаптации. Следующий раунд станет плотнее." };
  if (result.accuracy >= 0.6)  return { title: "Идеальная зона тренировки", text: "Достаточно сложно, но не хаотично. Продолжай." };
  return { title: "Снизим шум", text: "Перегруз. Попробуй Recall или повтори на более мягкой сложности." };
}

function animateNumber(el, target, duration = 600) {
  if (!el) return;
  const start = Number(el.textContent.replace(/\D/g, "")) || 0;
  if (start === target) { el.textContent = target; return; }
  const t0 = performance.now();
  function tick(t) {
    const k = Math.min(1, (t - t0) / duration);
    const eased = 1 - Math.pow(1 - k, 3);
    const val = Math.round(start + (target - start) * eased);
    el.textContent = val;
    if (k < 1) window.requestAnimationFrame(tick);
  }
  window.requestAnimationFrame(tick);
}

/* === SVG Radar & Trend ================================================= */
function drawRadarSvg(host, state) {
  if (!host) return;
  const size = 380;
  const cx = size / 2, cy = size / 2;
  const radius = size * 0.35;
  const n = DOMAINS.length;

  const points = DOMAINS.map((d, i) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n;
    const v = (state.domains[d.id] || 0) / 100;
    return {
      x: cx + Math.cos(angle) * radius * v,
      y: cy + Math.sin(angle) * radius * v,
      lx: cx + Math.cos(angle) * (radius + 18),
      ly: cy + Math.sin(angle) * (radius + 18),
      label: d.label,
      color: d.color,
    };
  });

  const rings = [1, 2, 3, 4].map((r) => {
    const pts = DOMAINS.map((_, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n;
      const rr = (radius * r) / 4;
      return `${cx + Math.cos(angle) * rr},${cy + Math.sin(angle) * rr}`;
    }).join(" ");
    return `<polygon class="radar-grid" points="${pts}"/>`;
  }).join("");

  const polygonPts = points.map((p) => `${p.x},${p.y}`).join(" ");
  const len = points.length * radius;

  host.innerHTML = `
    <svg class="radar-svg" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet">
      ${rings}
      ${DOMAINS.map((_, i) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n;
        return `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${cx + Math.cos(angle) * radius}" y2="${cy + Math.sin(angle) * radius}"/>`;
      }).join("")}
      <polygon class="radar-fill" points="${polygonPts}" style="--len:${len}"/>
      ${points.map((p) => `<circle class="radar-point" cx="${p.x}" cy="${p.y}" r="4" style="fill:${p.color}"/>`).join("")}
      ${points.map((p) => {
        const anchor = p.lx < cx - 5 ? "end" : p.lx > cx + 5 ? "start" : "middle";
        return `<text class="radar-label" x="${p.lx}" y="${p.ly}" text-anchor="${anchor}" dominant-baseline="middle">${p.label}</text>`;
      }).join("")}
    </svg>
  `;
}

function drawTrendSvg(host, state) {
  if (!host) return;
  const items = state.history.slice(-14);
  const w = 600, h = 200, pad = 24;
  if (!items.length) {
    host.innerHTML = `<div class="hint-line" style="text-align:center;padding:40px">первые данные появятся после раунда</div>`;
    return;
  }
  const step = items.length > 1 ? (w - pad * 2) / (items.length - 1) : 0;
  const pts = items.map((it, i) => {
    const x = pad + step * i;
    const y = h - pad - (it.accuracy || 0) * (h - pad * 2);
    return { x, y };
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `M ${pts[0].x} ${h - pad} ${pts.map((p) => `L ${p.x} ${p.y}`).join(" ")} L ${pts[pts.length - 1].x} ${h - pad} Z`;
  const len = pts.reduce((s, p, i) => i ? s + Math.hypot(p.x - pts[i-1].x, p.y - pts[i-1].y) : 0, 0);

  host.innerHTML = `
    <svg class="trend-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--accent)"/>
          <stop offset="100%" stop-color="var(--accent-2)"/>
        </linearGradient>
      </defs>
      ${[0.25, 0.5, 0.75, 1.0].map((r) => `<line class="trend-grid" x1="${pad}" y1="${pad + (h - pad * 2) * r}" x2="${w - pad}" y2="${pad + (h - pad * 2) * r}"/>`).join("")}
      <path class="trend-area" d="${area}"/>
      <path class="trend-line" d="${path}" style="--len:${len}"/>
      ${pts.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--accent)"/>`).join("")}
    </svg>
  `;
}

/* ========================================================================
   v5 Per-Drill detailed view: #/drills/:mode
   ======================================================================== */

export function renderPageDrillDetail(refs, state, mode, handlers) {
  const meta = MODE_META[mode];
  if (!meta) return;
  const visual = getModeVisual(mode);
  const science = getScience(mode);
  const mastery = getDrillMastery(state, mode);
  const history = (state.history || []).filter((r) => r.mode === mode);
  const brief = getModeBrief(state, mode);

  setPageHeader(refs, meta.kicker, meta.title, `
    <button class="ghost-action" type="button" id="drillDetailBack">← К библиотеке</button>
    <button class="primary-action" type="button" id="drillDetailStart">Запустить ▸</button>
  `);

  // PR stats
  const accs = history.map((r) => r.accuracy || 0);
  const rts = history.filter((r) => r.rt).map((r) => r.rt);
  const xps = history.map((r) => r.xp || 0);
  const bestAcc = accs.length ? Math.max(...accs) : 0;
  const bestRt = rts.length ? Math.min(...rts) : null;
  const totalXp = xps.reduce((a, b) => a + b, 0);
  const longestStreak = (() => {
    if (!history.length) return 0;
    const dates = new Set(history.map((r) => r.date).filter(Boolean));
    const sorted = [...dates].sort();
    let max = 1, cur = 1;
    for (let i = 1; i < sorted.length; i += 1) {
      const a = new Date(sorted[i - 1]);
      const b = new Date(sorted[i]);
      const diff = Math.round((b - a) / 86400000);
      if (diff === 1) { cur += 1; max = Math.max(max, cur); }
      else cur = 1;
    }
    return max;
  })();

  // Recommended next focus
  const last10 = history.slice(-10);
  const meanLast10 = last10.length ? last10.reduce((s, r) => s + (r.accuracy || 0), 0) / last10.length : 0;
  let recommend;
  if (history.length < 5) recommend = { text: "Сделай ещё несколько раундов — система калибрует уровень.", tone: "muted" };
  else if (meanLast10 >= 0.88) recommend = { text: "Точность стабильно высокая. Уровень растёт автоматически.", tone: "good" };
  else if (meanLast10 >= 0.70) recommend = { text: "Идеальная зона тренировки. Продолжай в текущем темпе.", tone: "good" };
  else if (meanLast10 >= 0.55) recommend = { text: "Немного шумно — сосредоточься перед раундом.", tone: "warn" };
  else recommend = { text: "Перегруз: уровень адаптируется вниз. Возможно стоит переключиться на recovery.", tone: "bad" };

  // Baseline comparison
  const first10 = history.slice(0, 10);
  const meanFirst10 = first10.length ? first10.reduce((s, r) => s + (r.accuracy || 0), 0) / first10.length : null;
  const growth = (meanFirst10 !== null && last10.length >= 5)
    ? Math.round((meanLast10 - meanFirst10) * 100)
    : null;

  refs.arena.innerHTML = `
    <div class="drill-detail-page">
      <section class="drill-detail-hero" style="--route-accent:${meta.accent}; --route-glow:${meta.glow}">
        <div class="drill-detail-sprite">
          <img src="${visual.sprite}" alt="" />
          ${masteryBadge(mastery.tier)}
        </div>
        <div class="drill-detail-info">
          <p class="page-kicker">${meta.kicker}</p>
          <h2>${meta.title}</h2>
          <p class="drill-detail-objective">${meta.objective || ""}</p>
          <div class="drill-detail-chips">
            <span class="drill-chip">L${brief.level}</span>
            <span class="drill-chip drill-chip-time">~${getDrillDuration(mode)} мин</span>
            <span class="drill-chip">${history.length} раундов</span>
            ${mastery.tier !== "none" ? `<span class="drill-chip" style="color:${mastery.tierMeta.color}; border-color:${mastery.tierMeta.color}">${mastery.tierMeta.icon} ${mastery.tierMeta.label}</span>` : ""}
          </div>
          ${mastery.next ? `
            <div class="drill-detail-tier-progress">
              <div class="dtp-label">
                <span>До ${mastery.next.id === "platinum" ? "Platinum" : mastery.next.id} tier</span>
                <strong>${mastery.progress}%</strong>
              </div>
              <div class="dtp-bar"><span style="width:${mastery.progress}%"></span></div>
              <small>требуется: L≥${mastery.next.L} · точность ≥${Math.round(mastery.next.acc * 100)}%</small>
            </div>
          ` : ""}
        </div>
      </section>

      <section class="drill-detail-prs">
        <div class="dd-pr-tile">
          <small>лучшая точность</small>
          <strong>${history.length ? Math.round(bestAcc * 100) + "%" : "—"}</strong>
        </div>
        <div class="dd-pr-tile">
          <small>лучший RT</small>
          <strong>${bestRt !== null ? Math.round(bestRt) + " ms" : "—"}</strong>
        </div>
        <div class="dd-pr-tile">
          <small>серия дней</small>
          <strong>${longestStreak}</strong>
        </div>
        <div class="dd-pr-tile">
          <small>всего XP</small>
          <strong>${totalXp}</strong>
        </div>
      </section>

      <section class="progress-card">
        <div class="progress-kicker">тренд точности · ${Math.min(60, history.length)} последних раундов</div>
        <h4>Memory Lane</h4>
        <div id="ddTimelineHost"></div>
      </section>

      <section class="progress-card">
        <div class="progress-kicker">распределение времени реакции</div>
        <h4>${rts.length ? "Текущий vs предыдущий месяц" : "—"}</h4>
        <div id="ddRtHistHost"></div>
      </section>

      <section class="progress-card drill-detail-recommend">
        <div class="progress-kicker">рекомендация</div>
        <h4 class="dd-rec-${recommend.tone}">${escapeHtml(recommend.text)}</h4>
        ${growth !== null ? `
          <p class="hint-line">
            Прогресс от первых 10 раундов: <strong class="${growth >= 0 ? "good" : "bad"}">${growth >= 0 ? "+" : ""}${growth} п.п.</strong>
          </p>
        ` : ""}
      </section>

      ${science ? `
        <section class="progress-card">
          <div class="progress-kicker">наука</div>
          <h4>${escapeHtml(science.summary)}</h4>
          <div class="science-grid">
            <div>
              <small>развивает</small>
              <ul>${science.develops.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>
            </div>
            <div>
              <small>выдержка</small>
              <p>${escapeHtml(science.excerpt)}</p>
            </div>
          </div>
          <cite class="science-cite">${escapeHtml(science.citation)}</cite>
        </section>
      ` : ""}
    </div>
  `;

  refs.pageActions.querySelector("#drillDetailBack").addEventListener("click", handlers.backToDrills);
  refs.pageActions.querySelector("#drillDetailStart").addEventListener("click", () => handlers.openMode(mode));

  // draw filtered Memory Lane for THIS drill only
  drawSingleDrillTimeline(refs.arena.querySelector("#ddTimelineHost"), history, 60);
  drawRtDistribution(refs.arena.querySelector("#ddRtHistHost"), history);
}

/** Single drill timeline with rolling avg overlay */
function drawSingleDrillTimeline(host, history, days = 60) {
  if (!host) return;
  if (history.length < 2) {
    host.innerHTML = `<div class="hint-line" style="text-align:center;padding:40px">Нужно минимум 2 раунда</div>`;
    return;
  }
  const w = 720, h = 200, pad = 28;
  const today = new Date();
  const dayKeys = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const series = new Array(dayKeys.length).fill(null);
  for (const r of history) {
    const idx = dayKeys.indexOf(r.date);
    if (idx < 0) continue;
    if (!series[idx]) series[idx] = { sum: 0, n: 0 };
    series[idx].sum += r.accuracy || 0;
    series[idx].n += 1;
  }
  const daily = series.map((v) => v ? v.sum / v.n : null);
  // rolling 7-day average for overlay
  const rolling = daily.map((_, i) => {
    const win = daily.slice(Math.max(0, i - 6), i + 1).filter((v) => v !== null);
    return win.length ? win.reduce((a, b) => a + b, 0) / win.length : null;
  });
  const stepX = (w - pad * 2) / Math.max(1, daily.length - 1);
  function buildPath(values) {
    const pts = [];
    values.forEach((v, i) => {
      if (v === null) return;
      pts.push({ x: pad + stepX * i, y: h - pad - v * (h - pad * 2) });
    });
    if (!pts.length) return "";
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }
  host.innerHTML = `
    <svg class="memory-lane-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${[0.25, 0.5, 0.75, 1.0].map((r) => `<line class="ml-grid" x1="${pad}" y1="${(pad + (h - pad * 2) * r).toFixed(1)}" x2="${w - pad}" y2="${(pad + (h - pad * 2) * r).toFixed(1)}"/>`).join("")}
      <path d="${buildPath(daily)}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" opacity="0.6" stroke-dasharray="3 4"/>
      <path d="${buildPath(rolling)}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
    </svg>
    <div class="dd-timeline-legend">
      <span><span class="ml-dot" style="background:var(--accent); opacity:0.6"></span>дневная точность</span>
      <span><span class="ml-dot" style="background:var(--accent)"></span>средняя за 7 дней</span>
    </div>
  `;
}

/** RT histogram: this month vs prev month overlay */
function drawRtDistribution(host, history) {
  if (!host) return;
  const all = history.filter((r) => r.rt && r.timestamp);
  if (all.length < 4) {
    host.innerHTML = `<div class="hint-line" style="text-align:center;padding:40px">Нужно минимум 4 раунда с измеренным RT</div>`;
    return;
  }
  const now = Date.now();
  const monthMs = 30 * 86400000;
  const thisMonth = all.filter((r) => now - r.timestamp <= monthMs).map((r) => r.rt);
  const prevMonth = all.filter((r) => {
    const age = now - r.timestamp;
    return age > monthMs && age <= monthMs * 2;
  }).map((r) => r.rt);

  // bin 100ms-wide
  const min = Math.min(...all.map((r) => r.rt));
  const max = Math.max(...all.map((r) => r.rt));
  const binSize = 50;
  const binStart = Math.floor(min / binSize) * binSize;
  const binEnd = Math.ceil(max / binSize) * binSize;
  const nBins = Math.max(6, (binEnd - binStart) / binSize);
  const bins = (arr) => {
    const out = new Array(nBins).fill(0);
    for (const v of arr) {
      const idx = Math.min(nBins - 1, Math.floor((v - binStart) / binSize));
      out[idx] += 1;
    }
    return out;
  };
  const thisBins = bins(thisMonth);
  const prevBins = bins(prevMonth);
  const maxCount = Math.max(1, ...thisBins, ...prevBins);

  const w = 720, h = 200, pad = 28;
  const barW = (w - pad * 2) / nBins;
  const meanThis = thisMonth.length ? thisMonth.reduce((a, b) => a + b, 0) / thisMonth.length : 0;
  const meanPrev = prevMonth.length ? prevMonth.reduce((a, b) => a + b, 0) / prevMonth.length : 0;
  const meanXThis = pad + ((meanThis - binStart) / (binEnd - binStart)) * (w - pad * 2);
  const meanXPrev = pad + ((meanPrev - binStart) / (binEnd - binStart)) * (w - pad * 2);

  let svg = `<svg class="rt-hist-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;
  // prev bars (muted)
  prevBins.forEach((c, i) => {
    if (!c) return;
    const x = pad + i * barW;
    const bh = (c / maxCount) * (h - pad * 2 - 12);
    svg += `<rect x="${(x + 1).toFixed(1)}" y="${(h - pad - bh).toFixed(1)}" width="${(barW - 2).toFixed(1)}" height="${bh.toFixed(1)}" fill="var(--muted)" opacity="0.32"/>`;
  });
  // current bars
  thisBins.forEach((c, i) => {
    if (!c) return;
    const x = pad + i * barW;
    const bh = (c / maxCount) * (h - pad * 2 - 12);
    svg += `<rect x="${(x + 1).toFixed(1)}" y="${(h - pad - bh).toFixed(1)}" width="${(barW - 2).toFixed(1)}" height="${bh.toFixed(1)}" fill="var(--accent)" opacity="0.84"/>`;
  });
  // mean lines
  if (meanPrev) svg += `<line x1="${meanXPrev.toFixed(1)}" y1="${pad}" x2="${meanXPrev.toFixed(1)}" y2="${h - pad}" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4 3"/>`;
  if (meanThis) svg += `<line x1="${meanXThis.toFixed(1)}" y1="${pad}" x2="${meanXThis.toFixed(1)}" y2="${h - pad}" stroke="var(--accent)" stroke-width="2"/>`;
  svg += `<text class="sleep-axis" x="${pad}" y="${h - 8}" font-size="10">${binStart} ms</text>`;
  svg += `<text class="sleep-axis" x="${w - pad}" y="${h - 8}" text-anchor="end" font-size="10">${binEnd} ms</text>`;
  svg += `</svg>`;

  const deltaMs = meanThis && meanPrev ? Math.round(meanThis - meanPrev) : null;
  const delta = deltaMs !== null
    ? (deltaMs < 0 ? `на ${Math.abs(deltaMs)} ms быстрее` : `на ${deltaMs} ms медленнее`)
    : null;
  host.innerHTML = `
    ${svg}
    <div class="dd-rt-legend">
      <span><span class="rt-swatch" style="background:var(--accent)"></span>этот месяц · μ ${Math.round(meanThis)} ms (n=${thisMonth.length})</span>
      ${prevMonth.length ? `<span><span class="rt-swatch" style="background:var(--muted);opacity:0.5"></span>предыдущий · μ ${Math.round(meanPrev)} ms (n=${prevMonth.length})</span>` : ""}
      ${delta ? `<span class="dd-rt-delta ${deltaMs < 0 ? "good" : "warn"}">${delta}</span>` : ""}
    </div>
  `;
}

/* ========================================================================
   v5 Data-Viz cards: Memory Lane / Sleep×Acc scatter / 365-day calendar / Chronotype
   ======================================================================== */

const DRILL_PALETTE = ["#7c5cff", "#4fd1a8", "#ff7da6", "#ffba2e", "#2fd0d8", "#ff6f5e", "#5fc36a", "#7aa8ff", "#b78cff", "#f5c45f"];

/** Memory Lane — per-drill timeline (multi-line) over N days, daily-aggregated */
export function drawMemoryLane(host, state, days = 30) {
  if (!host) return;
  const w = 600, h = 220, pad = 28;
  const history = state.history || [];
  if (history.length < 3) {
    host.innerHTML = `<div class="hint-line" style="text-align:center;padding:40px">Минимум 3 раунда — потом появится прогресс по drill</div>`;
    return;
  }
  // Pick top 5 most-played drills
  const counts = {};
  for (const r of history) counts[r.mode] = (counts[r.mode] || 0) + 1;
  const topModes = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([m]) => m);
  // Daily means per mode
  const today = new Date();
  const dayKeys = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const seriesByMode = {};
  for (const m of topModes) seriesByMode[m] = new Array(dayKeys.length).fill(null);
  for (const r of history) {
    if (!topModes.includes(r.mode) || !r.date) continue;
    const idx = dayKeys.indexOf(r.date);
    if (idx < 0) continue;
    const arr = seriesByMode[r.mode];
    if (arr[idx] === null) arr[idx] = { sum: 0, n: 0 };
    arr[idx].sum += r.accuracy || 0;
    arr[idx].n += 1;
  }
  for (const m of topModes) {
    seriesByMode[m] = seriesByMode[m].map((v) => v ? v.sum / v.n : null);
  }
  const stepX = (w - pad * 2) / Math.max(1, dayKeys.length - 1);
  function pathFor(values, colour) {
    const pts = [];
    values.forEach((v, i) => {
      if (v === null) return;
      pts.push({ x: pad + stepX * i, y: h - pad - v * (h - pad * 2) });
    });
    if (!pts.length) return "";
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }
  const legend = topModes.map((m, i) => `<span class="ml-legend-item" style="--c:${DRILL_PALETTE[i]}"><span class="ml-dot"></span>${escapeHtml(MODE_META[m]?.title || m)}</span>`).join("");
  host.innerHTML = `
    <div class="memory-lane-legend">${legend}</div>
    <svg class="memory-lane-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${[0.25, 0.5, 0.75, 1.0].map((r) => `<line class="ml-grid" x1="${pad}" y1="${pad + (h - pad * 2) * r}" x2="${w - pad}" y2="${pad + (h - pad * 2) * r}"/>`).join("")}
      ${topModes.map((m, i) => `<path d="${pathFor(seriesByMode[m])}" fill="none" stroke="${DRILL_PALETTE[i]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.86"/>`).join("")}
    </svg>
    <div class="memory-lane-axis">${days} дн. назад<span>сегодня</span></div>
  `;
}

/** Sleep × Accuracy scatter with Pearson r trend line */
export function drawSleepCorrelation(host, state) {
  if (!host) return;
  const w = 360, h = 220, pad = 32;
  const sleepLog = state.sleepLog || [];
  if (sleepLog.length < 5) {
    host.innerHTML = `<div class="hint-line" style="text-align:center;padding:40px">Логируй сон ${5 - sleepLog.length} раз — появится связь со точностью</div>`;
    return;
  }
  const dayAcc = new Map();
  for (const r of (state.history || [])) {
    if (!r.date) continue;
    if (!dayAcc.has(r.date)) dayAcc.set(r.date, []);
    dayAcc.get(r.date).push(r.accuracy || 0);
  }
  const points = [];
  for (const entry of sleepLog) {
    const rounds = dayAcc.get(entry.date);
    if (!rounds || !rounds.length) continue;
    const acc = rounds.reduce((a, b) => a + b, 0) / rounds.length;
    points.push({ hours: entry.hours, acc });
  }
  if (points.length < 3) {
    host.innerHTML = `<div class="hint-line" style="text-align:center;padding:40px">Сложи ${3 - points.length} ещё совпадающих дней сна+drill</div>`;
    return;
  }
  // Pearson
  const xs = points.map((p) => p.hours);
  const ys = points.map((p) => p.acc);
  const n = points.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i += 1) { num += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2; }
  const r = (dx && dy) ? num / Math.sqrt(dx * dy) : 0;
  const slope = dx ? num / dx : 0;
  const intercept = my - slope * mx;
  // Scales
  const xMin = 4, xMax = 12;
  const yMin = 0, yMax = 1;
  const px = (h) => pad + ((h - xMin) / (xMax - xMin)) * (w - pad * 2);
  const py = (a) => (h - pad) - ((a - yMin) / (yMax - yMin)) * (h - pad * 2);
  const dotSvg = points.map((p) =>
    `<circle cx="${px(p.hours).toFixed(1)}" cy="${py(p.acc).toFixed(1)}" r="4" fill="var(--accent)" opacity="0.8"/>`
  ).join("");
  // Trend line endpoints
  const xa = xMin, xb = xMax;
  const ya = slope * xa + intercept;
  const yb = slope * xb + intercept;
  const tone = r > 0.4 ? "good" : r < -0.3 ? "warn" : "muted";
  host.innerHTML = `
    <div class="sleep-corr-head">
      <strong class="sleep-r ${tone}">r = ${r.toFixed(2)}</strong>
      <small>${r > 0.4 ? "сильная положительная" : r > 0.2 ? "слабая положительная" : r < -0.3 ? "обратная" : "слабая"} · n=${n}</small>
    </div>
    <svg class="sleep-corr-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${[0, 0.25, 0.5, 0.75, 1].map((a) => `<line class="ml-grid" x1="${pad}" y1="${py(a).toFixed(1)}" x2="${w - pad}" y2="${py(a).toFixed(1)}"/>`).join("")}
      <line class="sleep-trend" x1="${px(xa).toFixed(1)}" y1="${py(ya).toFixed(1)}" x2="${px(xb).toFixed(1)}" y2="${py(yb).toFixed(1)}"/>
      ${dotSvg}
      <text class="sleep-axis" x="${pad}" y="${h - 8}" font-size="9">4ч</text>
      <text class="sleep-axis" x="${w - pad}" y="${h - 8}" text-anchor="end" font-size="9">12ч</text>
      <text class="sleep-axis" x="6" y="${pad + 4}" font-size="9">100%</text>
      <text class="sleep-axis" x="6" y="${h - pad - 2}" font-size="9">0%</text>
    </svg>
  `;
}

/** 365-day GitHub-style streak calendar */
export function drawStreakCalendar(host, state) {
  if (!host) return;
  const cell = 11, gap = 2;
  const days = 365;
  const today = new Date();
  // build map date → xp sum
  const xpByDay = new Map();
  for (const r of (state.history || [])) {
    if (!r.date) continue;
    xpByDay.set(r.date, (xpByDay.get(r.date) || 0) + (r.xp || 0));
  }
  const data = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    data.push({ date: key, xp: xpByDay.get(key) || 0, dow: d.getDay() });
  }
  // Align first column to start on Monday (dow=1)
  // GitHub-style: 53 columns × 7 rows
  const offsetDow = (data[0].dow + 6) % 7; // Mon=0
  for (let p = 0; p < offsetDow; p += 1) data.unshift({ pad: true });
  const cols = Math.ceil(data.length / 7);
  const w = cols * (cell + gap), h = 7 * (cell + gap) + 18;
  const intensity = (xp) => {
    if (!xp) return 0;
    if (xp < 10) return 1;
    if (xp < 30) return 2;
    if (xp < 60) return 3;
    return 4;
  };
  const cells = [];
  for (let i = 0; i < data.length; i += 1) {
    const d = data[i];
    const col = Math.floor(i / 7);
    const row = i % 7;
    if (d.pad) continue;
    const lvl = intensity(d.xp);
    const x = col * (cell + gap);
    const y = row * (cell + gap);
    cells.push(`<rect class="sc-cell sc-lvl-${lvl}" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2"><title>${d.date} · ${d.xp} XP</title></rect>`);
  }
  // active days + best streak
  const activeDays = data.filter((d) => !d.pad && d.xp > 0).length;
  // Compute longest streak
  let maxStreak = 0, cur = 0;
  for (const d of data) {
    if (d.pad) continue;
    if (d.xp > 0) { cur += 1; if (cur > maxStreak) maxStreak = cur; }
    else cur = 0;
  }
  host.innerHTML = `
    <div class="sc-head">
      <span><strong>${activeDays}</strong> активных дней за 365</span>
      <span>лучшая серия <strong>${maxStreak}</strong></span>
    </div>
    <div class="sc-scroll">
      <svg class="streak-cal-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
        ${cells.join("")}
      </svg>
    </div>
    <div class="sc-legend">
      меньше
      <span class="sc-cell sc-lvl-0"></span>
      <span class="sc-cell sc-lvl-1"></span>
      <span class="sc-cell sc-lvl-2"></span>
      <span class="sc-cell sc-lvl-3"></span>
      <span class="sc-cell sc-lvl-4"></span>
      больше
    </div>
  `;
}

/** Time-of-day chronotype 24h radial */
export function drawChronotype(host, state) {
  if (!host) return;
  const size = 220, cx = size / 2, cy = size / 2;
  const inner = 40, outer = 96;
  const buckets = new Array(24).fill(null).map(() => ({ sum: 0, n: 0 }));
  for (const r of (state.history || [])) {
    if (!r.timestamp) continue;
    const h = new Date(r.timestamp).getHours();
    buckets[h].sum += r.accuracy || 0;
    buckets[h].n += 1;
  }
  const stats = buckets.map((b, h) => ({ hour: h, mean: b.n ? b.sum / b.n : 0, n: b.n }));
  const totalRounds = stats.reduce((s, b) => s + b.n, 0);
  if (totalRounds < 6) {
    host.innerHTML = `<div class="hint-line" style="text-align:center;padding:40px">${6 - totalRounds} раундов до chronotype-карты</div>`;
    return;
  }
  const arcs = stats.map((s, i) => {
    if (!s.n) return "";
    const a0 = ((i - 6) / 24) * Math.PI * 2;  // 6:00 at top
    const a1 = ((i + 1 - 6) / 24) * Math.PI * 2;
    const r0 = inner;
    const r1 = inner + (outer - inner) * s.mean;
    const opacity = Math.min(1, 0.3 + s.n / 8);
    const x0 = cx + Math.cos(a0) * r0, y0 = cy + Math.sin(a0) * r0;
    const x1 = cx + Math.cos(a0) * r1, y1 = cy + Math.sin(a0) * r1;
    const x2 = cx + Math.cos(a1) * r1, y2 = cy + Math.sin(a1) * r1;
    const x3 = cx + Math.cos(a1) * r0, y3 = cy + Math.sin(a1) * r0;
    return `<path class="ct-arc" fill="var(--accent)" fill-opacity="${opacity}" d="M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r1} ${r1} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${r0} ${r0} 0 0 0 ${x0.toFixed(1)} ${y0.toFixed(1)} Z"><title>${i}:00 · ${Math.round(s.mean * 100)}% (${s.n} р.)</title></path>`;
  }).join("");
  // hour labels at 0, 6, 12, 18
  const labels = [0, 6, 12, 18].map((h) => {
    const a = ((h - 6) / 24) * Math.PI * 2;
    const r = outer + 14;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" class="ct-label">${h}:00</text>`;
  }).join("");
  // best hour
  const best = stats.reduce((a, b) => (b.mean > a.mean && b.n > 0 ? b : a), { hour: -1, mean: 0 });
  host.innerHTML = `
    <svg class="chronotype-svg" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet">
      <circle cx="${cx}" cy="${cy}" r="${outer}" class="ct-ring"/>
      <circle cx="${cx}" cy="${cy}" r="${inner}" class="ct-inner"/>
      ${arcs}
      ${labels}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="ct-center-num">${best.hour >= 0 ? best.hour : "—"}:00</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="ct-center-label">пик</text>
    </svg>
  `;
}

/** Narrative insight cards strip (top of Progress page) */
export function renderInsightsStrip(host, insights) {
  if (!host) return;
  if (!insights.length) {
    host.innerHTML = `<div class="insight-card insight-empty"><span class="insight-icon">💡</span><div><strong>Открытия появятся после ~7 раундов</strong><p>Нужны накопленные данные для выводов о трендах и связях.</p></div></div>`;
    return;
  }
  host.innerHTML = insights.slice(0, 4).map((ins) => `
    <div class="insight-card insight-${ins.severity}">
      <span class="insight-icon">${escapeHtml(ins.icon)}</span>
      <div>
        <strong>${escapeHtml(ins.title)}</strong>
        <p>${escapeHtml(ins.text)}</p>
      </div>
    </div>
  `).join("");
}

/**
 * Generate a 1080×1080 PNG result share card and trigger download.
 * Uses canvas-2D, theme-aware colors via getComputedStyle.
 */
export function generateShareCard(result, state, analysis) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  const meta = MODE_META[result.mode] || {};
  const visual = getModeVisual(result.mode);

  // Read theme tokens from root
  const css = getComputedStyle(document.documentElement);
  const bg = (css.getPropertyValue("--bg") || "#f6f7ff").trim();
  const surface = (css.getPropertyValue("--surface-strong") || "#ffffff").trim();
  const accent = meta.accent || (css.getPropertyValue("--accent") || "#7c5cff").trim();
  const accent2 = (css.getPropertyValue("--accent-2") || "#4fd1a8").trim();
  const text = (css.getPropertyValue("--text") || "#101935").trim();
  const muted = (css.getPropertyValue("--muted") || "#6b7493").trim();

  // Background — soft radial gradient
  const grad = ctx.createRadialGradient(540, 360, 0, 540, 540, 800);
  grad.addColorStop(0, withAlpha(accent, 0.18));
  grad.addColorStop(1, bg);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  // Top brand
  ctx.fillStyle = muted;
  ctx.font = "600 24px Inter Tight, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("NeuroForge · cognitive lab", 80, 90);

  // PR badge if applicable
  if (analysis.newAccBest || analysis.newRtBest) {
    ctx.fillStyle = accent;
    ctx.font = "900 28px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    ctx.fillText("🏆 PERSONAL BEST", 1000, 90);
  }

  // Big percent
  const percent = Math.round(result.accuracy * 100);
  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.font = "900 320px JetBrains Mono, monospace";
  ctx.fillText(`${percent}`, 70, 540);
  ctx.fillStyle = muted;
  ctx.font = "800 80px JetBrains Mono, monospace";
  // align the % roughly after the digits
  const w = ctx.measureText(`${percent}`).width;  // approximate
  ctx.fillStyle = accent2;
  ctx.font = "800 100px JetBrains Mono, monospace";
  ctx.fillText("%", 90 + Math.min(640, percent < 10 ? 220 : percent < 100 ? 420 : 540), 470);

  // Drill name
  ctx.fillStyle = text;
  ctx.font = "900 56px Inter Tight, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(meta.title || result.mode, 70, 640);

  // Kicker
  ctx.fillStyle = muted;
  ctx.font = "600 28px Inter Tight, system-ui, sans-serif";
  ctx.fillText((meta.kicker || "").toUpperCase(), 70, 680);

  // Stat row
  const stats = [
    { v: `${result.xp}`, l: "XP" },
    { v: formatRt(result.rt), l: "отклик" },
    { v: `L${result.difficultyAfter}`, l: "уровень" },
    { v: `${result.streakBest || 0}`, l: "серия" },
  ];
  let sx = 70;
  stats.forEach((s) => {
    const cardW = 220;
    const cardH = 160;
    ctx.fillStyle = withAlpha(surface, 0.95);
    drawRoundedRect(ctx, sx, 780, cardW, cardH, 18);
    ctx.fill();
    ctx.strokeStyle = withAlpha(accent, 0.18);
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, sx, 780, cardW, cardH, 18);
    ctx.stroke();
    ctx.fillStyle = text;
    ctx.font = "900 50px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(s.v, sx + cardW / 2, 860);
    ctx.fillStyle = muted;
    ctx.font = "700 18px Inter Tight, system-ui, sans-serif";
    ctx.fillText(s.l.toUpperCase(), sx + cardW / 2, 900);
    sx += cardW + 20;
  });

  // Insight line
  ctx.fillStyle = text;
  ctx.font = "500 22px Inter Tight, system-ui, sans-serif";
  ctx.textAlign = "left";
  const insightText = (analysis.insight || "").slice(0, 120);
  wrapText(ctx, insightText, 70, 970, 940, 32);

  // Date
  ctx.fillStyle = muted;
  ctx.font = "600 18px Inter Tight, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(new Date().toLocaleDateString("ru-RU"), 1000, 1030);

  // Try to draw sprite (async)
  const tryDownload = () => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `neuroforge-${result.mode}-${percent}p-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png", 0.92);
  };

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    // Draw sprite in top-right corner with glow background
    ctx.save();
    const cx = 870, cy = 320, r = 110;
    const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.4);
    sg.addColorStop(0, withAlpha(accent, 0.22));
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    tryDownload();
  };
  img.onerror = () => tryDownload();
  img.src = visual.sprite;
}

function withAlpha(hex, alpha) {
  if (!hex || !hex.startsWith("#")) return hex;
  const clean = hex.replace("#", "").trim();
  let r, g, b;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n += 1) {
    const test = line + words[n] + " ";
    const m = ctx.measureText(test);
    if (m.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}

/** Mastery tier badge — small chip */
export function masteryBadge(tier) {
  if (!tier || tier === "none") return "";
  const meta = { bronze: { icon: "●", color: "#cd7f32", label: "Bronze" },
                 silver:   { icon: "◆", color: "#9aa6b8", label: "Silver" },
                 gold:     { icon: "★", color: "#ffba2e", label: "Gold" },
                 platinum: { icon: "◈", color: "#7c5cff", label: "Platinum" } }[tier];
  if (!meta) return "";
  return `<span class="mastery-chip mastery-${tier}" data-tooltip="${meta.label}" style="--m-color:${meta.color}">${meta.icon}</span>`;
}

export { escapeHtml };
