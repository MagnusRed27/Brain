import { createNoise } from "./audio/noise.js";
import { BEAT_PRESETS, createBinaural, createGenus40 } from "./audio/binaural.js";

export const STIM_PRESETS = {
  "pink-noise": {
    label: "Розовый шум",
    description: "Маскирует звуки и снижает когнитивную нагрузку. Papalambros 2017 показала улучшение консолидации памяти при подаче во сне.",
    kind: "audio",
  },
  "brown-noise": {
    label: "Коричневый шум",
    description: "Тёплый, глубокий. Многим людям с СДВГ помогает удерживать фокус (анекдотические данные + ряд small-n исследований).",
    kind: "audio",
  },
  "white-noise": {
    label: "Белый шум",
    description: "Равномерный спектр. Бытовая привычка для концентрации; научных эффектов меньше, чем у розового.",
    kind: "audio",
  },
  "binaural-theta": { label: "Binaural · Theta 6Гц", description: BEAT_PRESETS.theta.note + " Требуются наушники.", kind: "binaural", preset: "theta" },
  "binaural-alpha": { label: "Binaural · Alpha 10Гц", description: BEAT_PRESETS.alpha.note + " Требуются наушники.", kind: "binaural", preset: "alpha" },
  "binaural-beta":  { label: "Binaural · Beta 18Гц",  description: BEAT_PRESETS.beta.note + " Требуются наушники.", kind: "binaural", preset: "beta" },
  "binaural-gamma": { label: "Binaural · Gamma 40Гц", description: BEAT_PRESETS.gamma.note + " Требуются наушники.", kind: "binaural", preset: "gamma" },
  "genus-audio": {
    label: "40Гц GENUS (звук)",
    description: "Амплитудная модуляция 40Гц по протоколу Iaccarino & Tsai (MIT 2016). Безопасный для всех, но эффект экспериментальный.",
    kind: "genus-audio",
  },
  "genus-photic": {
    label: "40Гц GENUS (свет+звук)",
    description: "Световое мигание 40Гц синхронно со звуком. ВНИМАНИЕ: может вызвать приступ у фотосенситивных эпилептиков (~1/4000). Требуется двойное подтверждение.",
    kind: "genus-photic",
    requiresOptIn: true,
  },
  "mandala": {
    label: "Мандала",
    description: "Вращающаяся сакральная геометрия. Фокус на центр снижает тревогу и тренирует сосредоточение (mindfulness-эффект).",
    kind: "visual",
  },
  "color-breath": {
    label: "Цветное дыхание",
    description: "Полноэкранный цвет, дышащий по циклу 4-7-8. Снижает симпатический тонус и нормализует ЧСС.",
    kind: "visual",
  },
};

export function createStimController(engine) {
  let activeAudio = null;
  let activeBinaural = null;
  let activeGenus = null;
  let overlay = null;
  let raf = 0;
  let abort = null;
  const photicConfirmed = { value: false };

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "stim-overlay";
    overlay.innerHTML = `
      <canvas class="stim-canvas" id="stimCanvas"></canvas>
      <div class="stim-photic" id="stimPhotic" aria-hidden="true"></div>
      <div class="stim-hud">
        <strong id="stimTitle">Стимуляция</strong>
        <span id="stimSub"></span>
        <button class="stim-stop" type="button" id="stimStop">Остановить · Esc</button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#stimStop").addEventListener("click", () => stop());
    return overlay;
  }

  function setHud(title, sub) {
    if (!overlay) return;
    overlay.querySelector("#stimTitle").textContent = title;
    overlay.querySelector("#stimSub").textContent = sub || "";
  }

  function clearVisual() {
    if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
    if (abort) { abort.abort(); abort = null; }
    if (overlay) {
      overlay.classList.remove("is-photic", "is-mandala", "is-breath");
      const photic = overlay.querySelector("#stimPhotic");
      if (photic) photic.style.opacity = "0";
    }
  }

  function drawMandala() {
    const canvas = overlay.querySelector("#stimCanvas");
    const ctx = canvas.getContext("2d");
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    abort = new AbortController();
    abort.signal.addEventListener("abort", () => window.removeEventListener("resize", onResize));

    let phase = 0;
    const accent = getCssVar("--accent");
    const accent2 = getCssVar("--accent-2");
    const accent3 = getCssVar("--accent-3");
    const palette = [accent, accent2, accent3];

    function frame() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.42;

      ctx.fillStyle = getCssVar("--bg");
      ctx.fillRect(0, 0, w, h);

      phase += 0.0035;

      for (let layer = 0; layer < 4; layer += 1) {
        const points = 8 + layer * 2;
        const radius = r * (0.3 + layer * 0.22);
        const offset = phase * (layer % 2 === 0 ? 1 : -1) * (1 + layer * 0.3);
        ctx.beginPath();
        for (let i = 0; i <= points; i += 1) {
          const a = offset + (i * Math.PI * 2) / points;
          const rr = radius + Math.sin(phase * 4 + i) * 12;
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = palette[layer % palette.length];
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = 0.7 - layer * 0.12;
        ctx.stroke();
      }

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, hexToRgba(accent, 0.4));
      grad.addColorStop(0.7, hexToRgba(accent2, 0.08));
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      const dotCount = 32;
      for (let i = 0; i < dotCount; i += 1) {
        const a = phase * 2 + (i * Math.PI * 2) / dotCount;
        const rr = r * 0.92;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        ctx.beginPath();
        ctx.arc(x, y, 3 + Math.sin(phase * 3 + i) * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = palette[i % palette.length];
        ctx.globalAlpha = 0.65;
        ctx.fill();
      }
      raf = window.requestAnimationFrame(frame);
    }
    frame();
  }

  function startColorBreath() {
    const localAbort = new AbortController();
    abort = localAbort;

    const orb = document.createElement("div");
    orb.className = "color-breath-orb";
    overlay.appendChild(orb);

    const phases = [
      { label: "Вдох — 4 секунды",    bg: "#e6f7ec", orb: "#34c997", scale: 1.6, duration: 4000 },
      { label: "Задержка — 7 секунд", bg: "#e6efff", orb: "#2a73ff", scale: 1.6, duration: 7000 },
      { label: "Выдох — 8 секунд",    bg: "#ffeee9", orb: "#ff6f5e", scale: 0.7, duration: 8000 },
    ];

    let idx = 0;
    function cycle() {
      if (localAbort.signal.aborted) return;
      const p = phases[idx % phases.length];
      overlay.style.backgroundColor = p.bg;
      orb.style.background = p.orb;
      orb.style.transform = `translate(-50%, -50%) scale(${p.scale})`;
      orb.style.transition = `transform ${Math.max(800, p.duration - 200)}ms ease-in-out, background 1s`;
      setHud("Цветное дыхание", p.label);
      idx += 1;
      window.setTimeout(cycle, p.duration);
    }
    cycle();

    localAbort.signal.addEventListener("abort", () => {
      orb.remove();
      overlay.style.backgroundColor = "";
    });
  }

  function startPhotic40() {
    overlay.classList.add("is-photic");
    const photic = overlay.querySelector("#stimPhotic");
    photic.style.opacity = "0.5";
  }

  function stopAudio(ramp = 0.5) {
    if (activeAudio) { activeAudio.stop(ramp); activeAudio = null; }
    if (activeBinaural) { activeBinaural.stop(ramp); activeBinaural = null; }
    if (activeGenus) { activeGenus.stop(ramp); activeGenus = null; }
  }

  function start(id, { onClose } = {}) {
    if (!engine.ready()) engine.unlock();
    const preset = STIM_PRESETS[id];
    if (!preset) return false;
    if (preset.requiresOptIn && !photicConfirmed.value) return false;

    stop({ silent: true });
    ensureOverlay();
    overlay.classList.add("is-open");
    setHud(preset.label, preset.description);

    if (preset.kind === "audio") {
      activeAudio = createNoise(engine, preset.label.includes("Розов") ? "pink" : preset.label.includes("Корич") ? "brown" : "white", { lowpass: 4800 });
      if (activeAudio) activeAudio.setLevel(0.35);
      overlay.classList.add("is-mandala");
      drawMandala();
    } else if (preset.kind === "binaural") {
      activeBinaural = createBinaural(engine);
      activeBinaural.start(preset.preset);
      overlay.classList.add("is-mandala");
      drawMandala();
    } else if (preset.kind === "genus-audio") {
      activeGenus = createGenus40(engine);
      activeGenus.start();
      overlay.classList.add("is-mandala");
      drawMandala();
    } else if (preset.kind === "genus-photic") {
      activeGenus = createGenus40(engine);
      activeGenus.start();
      startPhotic40();
    } else if (preset.kind === "visual") {
      if (id === "mandala") {
        overlay.classList.add("is-mandala");
        drawMandala();
      } else if (id === "color-breath") {
        startColorBreath();
      }
    }

    overlay._onClose = onClose;
    return true;
  }

  function stop({ silent = false } = {}) {
    stopAudio();
    clearVisual();
    if (overlay) {
      overlay.classList.remove("is-open");
      overlay._onClose?.();
      overlay._onClose = null;
    }
  }

  function confirmPhotic() {
    photicConfirmed.value = true;
  }

  return { start, stop, confirmPhotic, get photicConfirmed() { return photicConfirmed.value; } };
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#7c5cff";
}

function hexToRgba(hex, alpha) {
  const clean = String(hex).replace("#", "").trim();
  if (!clean) return `rgba(124, 92, 255, ${alpha})`;
  const len = clean.length === 3 ? 3 : 6;
  let r, g, b;
  if (len === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
