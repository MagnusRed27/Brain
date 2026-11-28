import { MODE_META } from "./config.js";
import { hexToRgba } from "./utils.js";

const MOODS = {
  obsidian: {
    palette: ["#22d3ee", "#38bdf8", "#2dd4bf"],
    grid: "rgba(34, 211, 238, 0.07)",
    core: "#22d3ee",
    particleCount: 68,
    linkRadius: 152,
  },
  halo: {
    palette: ["#38bdf8", "#818cf8", "#34d399"],
    grid: "rgba(56, 189, 248, 0.08)",
    core: "#38bdf8",
    particleCount: 60,
    linkRadius: 145,
  },
  filaments: {
    palette: ["#f59e0b", "#38bdf8", "#34d399"],
    grid: "rgba(245, 158, 11, 0.08)",
    core: "#f59e0b",
    particleCount: 62,
    linkRadius: 138,
  },
  deepwave: {
    palette: ["#0284c7", "#0891b2", "#38bdf8"],
    grid: "rgba(2, 132, 199, 0.08)",
    core: "#0284c7",
    particleCount: 58,
    linkRadius: 148,
  },
};

export function createNeuroScene(canvas, options = {}) {
  const getAnalyser = options.getAnalyser || (() => null);
  const ctx2d = canvas.getContext("2d");
  let mood = "obsidian";
  let modeAccent = MODE_META.circuit?.accent || "#22d3ee";
  let particles = [];
  let shockwaves = [];
  let pulse = 0;
  let pulseColor = MOODS.obsidian.core;
  let raf = 0;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let phase = 0;
  const pointer = { x: -9999, y: -9999, active: false };
  const fft = new Uint8Array(256);
  let bands = [0, 0, 0, 0];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function onPointerMove(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  }

  function onPointerLeave() {
    pointer.active = false;
  }

  function setMood(nextMood) {
    if (!MOODS[nextMood]) return;
    mood = nextMood;
    pulseColor = MOODS[mood].core;
    populate();
  }

  function setMode(nextMode) {
    modeAccent = MODE_META[nextMode]?.accent || MOODS[mood].core;
    burst("start");
  }

  function populate() {
    const target = MOODS[mood].particleCount;
    if (particles.length < target) {
      for (let i = particles.length; i < target; i += 1) particles.push(makeParticle(width, height, mood));
    } else if (particles.length > target) {
      particles.length = target;
    }
  }

  function burst(type = "success", opts = {}) {
    const isErr = type === "error" || type === "miss-near" || type === "miss-bad";
    const isReward = type === "reward" || type === "level-up" || type === "overdrive";
    pulse = isErr ? 1.15 : isReward ? 1.65 : 0.85;
    pulseColor = isErr ? "#fb7185" : isReward ? "#2dd4bf" : MOODS[mood].core;

    const sx = Number.isFinite(opts.x) ? opts.x : (Number.isFinite(window._lastPointerX) ? window._lastPointerX : width * 0.5);
    const sy = Number.isFinite(opts.y) ? opts.y : (Number.isFinite(window._lastPointerY) ? window._lastPointerY : height * 0.5);
    if (shockwaves.length < 6) {
      shockwaves.push({
        x: sx,
        y: sy,
        r: 12,
        maxR: isReward ? 280 : isErr ? 150 : 190,
        alpha: isReward ? 0.55 : 0.36,
        color: pulseColor,
      });
    }

    for (let i = 0; i < particles.length; i += 1) {
      if (i % 3 === 0) {
        particles[i].speed = 0.55 + Math.random() * 0.75;
        particles[i].life = 0.78 + Math.random() * 0.22;
      }
    }
  }

  function makeParticle(w, h, theme) {
    const palette = MOODS[theme].palette;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.62,
      vy: (Math.random() - 0.5) * 0.62,
      speed: 0.22 + Math.random() * 0.5,
      life: 0.65 + Math.random() * 0.35,
      tint: palette[Math.floor(Math.random() * palette.length)],
      size: 1.3 + Math.random() * 1.5,
    };
  }

  function updateFromAudio() {
    const analyser = getAnalyser();
    if (!analyser) {
      const t = phase;
      bands = [
        0.22 + Math.sin(t * 0.65) * 0.14,
        0.20 + Math.sin(t * 1.05 + 0.6) * 0.14,
        0.24 + Math.sin(t * 1.45 + 1.2) * 0.15,
        0.18 + Math.sin(t * 1.95 + 1.9) * 0.12,
      ].map((v) => Math.max(0, v));
      return;
    }
    analyser.getByteFrequencyData(fft);
    const n = fft.length;
    bands = [
      sliceAvg(fft, 0, Math.floor(n * 0.08)) / 255,
      sliceAvg(fft, Math.floor(n * 0.08), Math.floor(n * 0.22)) / 255,
      sliceAvg(fft, Math.floor(n * 0.22), Math.floor(n * 0.55)) / 255,
      sliceAvg(fft, Math.floor(n * 0.55), n) / 255,
    ];
  }

  function sliceAvg(arr, start, end) {
    let sum = 0;
    const len = Math.max(1, end - start);
    for (let i = start; i < end; i += 1) sum += arr[i];
    return sum / len;
  }

  function drawGrid() {
    const reactiveAlpha = 0.05 + bands[0] * 0.08;
    ctx2d.save();
    ctx2d.globalAlpha = reactiveAlpha;
    ctx2d.strokeStyle = MOODS[mood].grid;
    ctx2d.lineWidth = 1;
    const horizon = height * 0.60;
    for (let i = 0; i < 12; i += 1) {
      const y = horizon + i * i * 1.15;
      if (y > height + 10) break;
      ctx2d.beginPath();
      ctx2d.moveTo(width * 0.04, y);
      ctx2d.lineTo(width * 0.96, y);
      ctx2d.stroke();
    }
    ctx2d.restore();
  }

  function drawNetwork() {
    const grid = new Map();
    const radius = MOODS[mood].linkRadius * (1 + bands[2] * 0.22);
    const cellSize = Math.max(80, radius);

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (pointer.active) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 100 && d2 < 36000) {
          const pull = 0.012 * (1 - d2 / 36000);
          p.x += dx * pull;
          p.y += dy * pull;
        }
      }
      p.x += p.vx * p.speed * (1 + bands[1] * 0.55);
      p.y += p.vy * p.speed * (1 + bands[1] * 0.55);
      p.life -= 0.0018;
      if (p.x < -40 || p.x > width + 40 || p.y < -40 || p.y > height + 40 || p.life <= 0) {
        Object.assign(p, makeParticle(width, height, mood));
      }
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);
      const key = `${cx},${cy}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(p);
    }

    ctx2d.save();
    ctx2d.lineWidth = 1;
    for (const [key, bucket] of grid) {
      const [cx, cy] = key.split(",").map(Number);
      for (let i = 0; i < bucket.length; i += 1) {
        const a = bucket[i];
        for (let j = i + 1; j < bucket.length; j += 1) {
          connect(a, bucket[j], radius);
        }
        for (const offset of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
          const neighborKey = `${cx + offset[0]},${cy + offset[1]}`;
          const neighborBucket = grid.get(neighborKey);
          if (!neighborBucket) continue;
          for (const b of neighborBucket) connect(a, b, radius);
        }
      }
    }

    // Subtle synaptic filaments toward active cursor
    if (pointer.active) {
      const cRadius = 165;
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < cRadius) {
          ctx2d.globalAlpha = (1 - dist / cRadius) * 0.24;
          ctx2d.strokeStyle = MOODS[mood].core;
          ctx2d.beginPath();
          ctx2d.moveTo(p.x, p.y);
          ctx2d.lineTo(pointer.x, pointer.y);
          ctx2d.stroke();
        }
      }
    }
    ctx2d.restore();

    ctx2d.save();
    for (const p of particles) {
      ctx2d.globalAlpha = 0.48 + pulse * 0.20 + bands[3] * 0.28;
      ctx2d.fillStyle = p.tint;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.size + pulse * 1.1 + bands[3] * 1.5, 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.restore();
  }

  function connect(a, b, radius) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) return;
    const alpha = (1 - dist / radius) * (0.14 + bands[2] * 0.10);
    ctx2d.globalAlpha = alpha;
    ctx2d.strokeStyle = a.tint;
    ctx2d.beginPath();
    ctx2d.moveTo(a.x, a.y);
    ctx2d.lineTo(b.x, b.y);
    ctx2d.stroke();
  }

  function drawShockwaves() {
    if (!shockwaves.length) return;
    ctx2d.save();
    for (let i = shockwaves.length - 1; i >= 0; i -= 1) {
      const sw = shockwaves[i];
      sw.r += (sw.maxR - sw.r) * 0.085 + 2.2;
      sw.alpha *= 0.92;
      if (sw.alpha < 0.015 || sw.r >= sw.maxR) {
        shockwaves.splice(i, 1);
        continue;
      }
      ctx2d.globalAlpha = sw.alpha;
      ctx2d.strokeStyle = sw.color;
      ctx2d.lineWidth = 1.6;
      ctx2d.beginPath();
      ctx2d.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx2d.stroke();
    }
    ctx2d.restore();
  }

  function drawCore() {
    const cx = width * 0.5;
    const cy = height * 0.46;
    const baseRadius = Math.min(width, height) * (0.09 + pulse * 0.018 + bands[0] * 0.05);
    const gradient = ctx2d.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 3.2);
    gradient.addColorStop(0, hexToRgba(pulseColor, 0.20 + bands[3] * 0.10));
    gradient.addColorStop(0.45, hexToRgba(modeAccent || pulseColor, 0.06));
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx2d.save();
    ctx2d.fillStyle = gradient;
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, baseRadius * 3.2, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();
  }

  function draw() {
    phase += 0.016;
    ctx2d.clearRect(0, 0, width, height);
    updateFromAudio();
    drawGrid();
    drawNetwork();
    drawCore();
    drawShockwaves();
    pulse *= 0.93;
    raf = window.requestAnimationFrame(draw);
  }

  resize();
  populate();
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerleave", onPointerLeave, { passive: true });
  raf = window.requestAnimationFrame(draw);

  return {
    setMode,
    setMood,
    burst,
    destroy() {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    },
  };
}
