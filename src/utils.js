export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function normalizeText(value) {
  return String(value)
    .toLowerCase()
    .replace(/[ё]/g, "е")
    .replace(/[^a-zа-я0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compareText(answer, expected) {
  const a = normalizeText(answer);
  const e = normalizeText(expected);
  if (!a || !e) return 0;
  if (a === e || a.includes(e) || e.includes(a)) return 1;
  const expectedWords = e.split(" ").filter(Boolean);
  const answerWords = new Set(a.split(" ").filter(Boolean));
  const hits = expectedWords.filter((word) => answerWords.has(word)).length;
  return hits / Math.max(1, expectedWords.length);
}

export function sleepSignal(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function isAbortError(error) {
  return error?.name === "AbortError";
}

export function throttle(fn, delay) {
  let last = 0;
  let pending = null;
  let pendingArgs = null;
  return function throttled(...args) {
    const now = performance.now();
    const elapsed = now - last;
    if (elapsed >= delay) {
      last = now;
      fn.apply(this, args);
      return;
    }
    pendingArgs = args;
    if (pending) return;
    pending = window.setTimeout(() => {
      last = performance.now();
      pending = null;
      fn.apply(this, pendingArgs);
      pendingArgs = null;
    }, delay - elapsed);
  };
}

export function hexToRgb(hex) {
  const clean = String(hex).replace("#", "");
  if (clean.length === 3) {
    const value = parseInt(clean.split("").map((c) => c + c).join(""), 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
  }
  const value = parseInt(clean, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
