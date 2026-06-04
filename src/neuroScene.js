import { MODE_META } from "./config.js";
import { hexToRgba } from "./utils.js";

const MOODS = {
  halo: {
    palette: ["#7c5cff", "#4fd1a8", "#ff7da6"],
    grid: "rgba(124, 92, 255, 0.10)",
    core: "#7c5cff",
    particleCount: 56,
    linkRadius: 140,
  },
  filaments: {
    palette: ["#ffba2e", "#5fc36a", "#ff6f5e"],
    grid: "rgba(255, 186, 46, 0.10)",
    core: "#ffba2e",
    particleCount: 64,
    linkRadius: 130,
  },
  deepwave: {
    palette: ["#2a73ff", "#2fd0d8", "#7aa8ff"],
    grid: "rgba(42, 115, 255, 0.10)",
    core: "#2a73ff",
    particleCount: 60,
    linkRadius: 150,
  },
};

const CELL_SIZE = 160;

export function createNeuroScene(canvas, options = {}) {
  const getAnalyser = options.getAnalyser || (() => null);
  const ctx2d = canvas.getContext("2d");
  let mood = "halo";
  let modeAccent = MODE_META.circuit.accent;
  let particles = [];
  let pulse = 0;
  let pulseColor = MOODS.halo.core;
  let raf = 0;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let phase = 0;
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

  function setMood(nextMood) {
    if (!MOODS[nextMood]) return;
    mood = nextMood;
    pulseColor = MOODS[mood].core;
    populate();
  }

  function setMode(nextMode) {
    modeAccent = MODE_META[nextMode]?.accent || MODE_META.circuit.accent;
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

  function burst(type = "success") {
    pulse = type === "error" ? 1.25 : type === "reward" ? 1.6 : 0.85;
    pulseColor =
      type === "error" ? "#ff5a7a" :
      type === "reward" ? "#ffba2e" :
      MOODS[mood].core;
    for (let i = 0; i < particles.length; i += 1) {
      if (i % 3 === 0) {
        particles[i].speed = 0.55 + Math.random() * 0.8;
        particles[i].life = 0.75 + Math.random() * 0.25;
      }
    }
  }

  function makeParticle(w, h, theme) {
    const palette = MOODS[theme].palette;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      speed: 0.25 + Math.random() * 0.55,
      life: 0.65 + Math.random() * 0.35,
      tint: palette[Math.floor(Math.random() * palette.length)],
      size: 1.4 + Math.random() * 1.6,
    };
  }

  function updateFromAudio() {
    const analyser = getAnalyser();
    if (!analyser) {
      const t = phase;
      bands = [
        0.25 + Math.sin(t * 0.7) * 0.18,
        0.22 + Math.sin(t * 1.1 + 0.6) * 0.16,
        0.28 + Math.sin(t * 1.6 + 1.2) * 0.18,
        0.20 + Math.sin(t * 2.1 + 1.9) * 0.14,
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
    const reactiveAlpha = 0.06 + bands[0] * 0.10;
    ctx2d.save();
    ctx2d.globalAlpha = reactiveAlpha;
    ctx2d.strokeStyle = MOODS[mood].grid;
    ctx2d.lineWidth = 1;
    const horizon = height * 0.58;
    for (let i = 0; i < 14; i += 1) {
      const y = horizon + i * i * 1.05;
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
    const radius = MOODS[mood].linkRadius * (1 + bands[2] * 0.25);
    const cellSize = Math.max(80, radius);
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.x += p.vx * p.speed * (1 + bands[1] * 0.6);
      p.y += p.vy * p.speed * (1 + bands[1] * 0.6);
      p.life -= 0.002;
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
    ctx2d.restore();

    ctx2d.save();
    for (const p of particles) {
      ctx2d.globalAlpha = 0.55 + pulse * 0.22 + bands[3] * 0.30;
      ctx2d.fillStyle = p.tint;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.size + pulse * 1.4 + bands[3] * 1.8, 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.restore();
  }

  function connect(a, b, radius) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) return;
    const alpha = (1 - dist / radius) * (0.16 + bands[2] * 0.12);
    ctx2d.globalAlpha = alpha;
    ctx2d.strokeStyle = a.tint;
    ctx2d.beginPath();
    ctx2d.moveTo(a.x, a.y);
    ctx2d.lineTo(b.x, b.y);
    ctx2d.stroke();
  }

  function drawCore() {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const baseRadius = Math.min(width, height) * (0.1 + pulse * 0.02 + bands[0] * 0.06);
    const gradient = ctx2d.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 3);
    gradient.addColorStop(0, hexToRgba(pulseColor, 0.28 + bands[3] * 0.12));
    gradient.addColorStop(0.4, hexToRgba(pulseColor, 0.08));
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx2d.save();
    ctx2d.fillStyle = gradient;
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, baseRadius * 3, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.globalAlpha = 0.18 + pulse * 0.22 + bands[0] * 0.20;
    ctx2d.strokeStyle = pulseColor;
    ctx2d.lineWidth = 1.6;
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx2d.stroke();
    ctx2d.restore();
  }

  function draw() {
    phase += 0.016;
    ctx2d.clearRect(0, 0, width, height);
    updateFromAudio();
    drawGrid();
    drawNetwork();
    drawCore();
    pulse *= 0.93;
    raf = window.requestAnimationFrame(draw);
  }

  resize();
  populate();
  window.addEventListener("resize", resize);
  raf = window.requestAnimationFrame(draw);

  return {
    setMode,
    setMood,
    burst,
    destroy() {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    },
  };
}
