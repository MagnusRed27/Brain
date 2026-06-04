import { IR_PRESETS, makeImpulseResponse } from "./ir-bank.js";
import { PRESETS, playPreset } from "./synth.js";
import { createMusic } from "./music.js";
import { createHaptics } from "./haptics.js";
import { bus, EVENTS } from "../lib/events.js";

const CUE_ALIASES = {
  success: "hit-soft",
  error: "miss-near",
  reward: "level-up",
  start: "round-start",
  end: "round-end",
};

export function createAudioEngine(getSettings) {
  let ctx = null;
  let unlocked = false;
  let masterIn = null;
  let dryIn = null;
  let wetIn = null;
  let sendIn = null;
  let musicIn = null;
  let analyser = null;
  let compressor = null;
  let convolver = null;
  let fatigueFilter = null;
  let music = null;
  let metronomeHandle = 0;
  let breathHandle = 0;
  const haptics = createHaptics(getSettings);

  function ready() {
    return Boolean(ctx && unlocked);
  }

  function settingsSafe() {
    try {
      return getSettings() || {};
    } catch {
      return {};
    }
  }

  function masterGain() {
    const settings = settingsSafe();
    if (!settings.soundEnabled) return 0;
    const v = Number(settings.masterVolume);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.7;
  }

  function sfxGain() {
    const settings = settingsSafe();
    const v = Number(settings.sfxVolume);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8;
  }

  function musicGain() {
    const settings = settingsSafe();
    if (!settings.musicEnabled) return 0;
    const v = Number(settings.musicVolume);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.32;
  }

  function buildGraph() {
    masterIn = ctx.createGain();
    masterIn.gain.value = masterGain();

    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -8;
    compressor.knee.value = 14;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.18;

    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.78;

    dryIn = ctx.createGain();
    dryIn.gain.value = 1;
    fatigueFilter = ctx.createBiquadFilter();
    fatigueFilter.type = "lowpass";
    fatigueFilter.frequency.value = 9600;
    fatigueFilter.Q.value = 0.7;
    dryIn.connect(fatigueFilter).connect(masterIn);

    wetIn = ctx.createGain();
    wetIn.gain.value = 0.45;
    convolver = ctx.createConvolver();
    convolver.buffer = makeImpulseResponse(ctx, IR_PRESETS.hall);
    sendIn = ctx.createGain();
    sendIn.gain.value = 0.5;
    sendIn.connect(convolver).connect(wetIn).connect(masterIn);

    musicIn = ctx.createGain();
    musicIn.gain.value = musicGain();
    musicIn.connect(masterIn);

    masterIn.connect(compressor).connect(analyser).connect(ctx.destination);

    music = createMusic(api);
  }

  function attemptUnlock() {
    if (unlocked) return;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      if (!ctx) ctx = new Ctor({ latencyHint: "interactive" });
    } catch {
      return;
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    if (!masterIn) buildGraph();
    unlocked = true;
    bus.emit(EVENTS.AUDIO_UNLOCK, { sampleRate: ctx.sampleRate });
  }

  ["pointerdown", "keydown", "touchstart"].forEach((event) =>
    window.addEventListener(event, attemptUnlock, { once: false, passive: true })
  );

  function cue(name, options) {
    haptics.cue(CUE_ALIASES[name] || name);
    bus.emit(EVENTS.CUE, { name });
    if (!ready()) return;
    if (!settingsSafe().soundEnabled) return;
    const preset = CUE_ALIASES[name] || name;
    if (!PRESETS[preset]) return;
    duck(preset);
    playPreset(api, preset, options);
  }

  function duck(name) {
    if (!musicIn) return;
    if (name === "metronome" || name === "metronome-acc") return;
    if (name === "breath-in" || name === "breath-out") return;
    const target = musicGain();
    const t = ctx.currentTime;
    musicIn.gain.cancelScheduledValues(t);
    musicIn.gain.setValueAtTime(musicIn.gain.value, t);
    musicIn.gain.linearRampToValueAtTime(Math.max(0, target * 0.55), t + 0.05);
    musicIn.gain.linearRampToValueAtTime(target, t + 0.4);
  }

  function setReverb(preset = "hall") {
    if (!ready()) return;
    convolver.buffer = makeImpulseResponse(ctx, IR_PRESETS[preset] || IR_PRESETS.hall);
  }

  function setReverbWet(value) {
    if (!ready()) return;
    wetIn.gain.linearRampToValueAtTime(Math.max(0, Math.min(0.85, value)), ctx.currentTime + 0.2);
  }

  function setFatigue(value) {
    if (!ready()) return;
    const cutoff = 9600 - Math.max(0, Math.min(1, value)) * 6800;
    fatigueFilter.frequency.linearRampToValueAtTime(cutoff, ctx.currentTime + 0.6);
  }

  function refreshVolumes() {
    if (!ready()) return;
    masterIn.gain.linearRampToValueAtTime(masterGain(), ctx.currentTime + 0.15);
    musicIn.gain.linearRampToValueAtTime(musicGain(), ctx.currentTime + 0.2);
    if (music && music.setVolume) music.setVolume();
  }

  function startMetronome({ bpm = 90, accent = 4 } = {}) {
    stopMetronome();
    if (!ready()) return;
    let step = 0;
    const interval = Math.max(180, 60000 / bpm);
    metronomeHandle = window.setInterval(() => {
      const isAccent = step % accent === 0;
      cue(isAccent ? "metronome-acc" : "metronome");
      step += 1;
    }, interval);
  }

  function stopMetronome() {
    if (metronomeHandle) {
      window.clearInterval(metronomeHandle);
      metronomeHandle = 0;
    }
  }

  function startBreath(pattern = [4000, 7000, 8000]) {
    stopBreath();
    if (!ready()) return;
    let phase = 0;
    const cycle = () => {
      const p = phase % 3;
      if (p === 0) cue("breath-in");
      else if (p === 2) cue("breath-out");
      bus.emit("breath:phase", { phase: p });
      phase += 1;
      breathHandle = window.setTimeout(cycle, pattern[p]);
    };
    cycle();
  }

  function stopBreath() {
    if (breathHandle) {
      window.clearTimeout(breathHandle);
      breathHandle = 0;
      bus.emit("breath:stop");
    }
  }

  function getAnalyserData(target) {
    if (!ready() || !analyser) return null;
    analyser.getByteFrequencyData(target);
    return target;
  }

  function bands(target) {
    if (!getAnalyserData(target)) return [0, 0, 0, 0];
    const n = target.length;
    const sub = sliceAvg(target, 0, Math.floor(n * 0.08));
    const lo = sliceAvg(target, Math.floor(n * 0.08), Math.floor(n * 0.22));
    const mid = sliceAvg(target, Math.floor(n * 0.22), Math.floor(n * 0.55));
    const hi = sliceAvg(target, Math.floor(n * 0.55), n);
    return [sub, lo, mid, hi].map((v) => v / 255);
  }

  function sliceAvg(arr, start, end) {
    let sum = 0;
    const len = Math.max(1, end - start);
    for (let i = start; i < end; i += 1) sum += arr[i];
    return sum / len;
  }

  const api = {
    get ctx() { return ctx; },
    get analyser() { return analyser; },
    get dryIn() { return dryIn; },
    get sendIn() { return sendIn; },
    get musicIn() { return musicIn; },
    ready,
    cue,
    duck,
    sfxGain,
    musicGain,
    setReverb,
    setReverbWet,
    setFatigue,
    refreshVolumes,
    startMetronome,
    stopMetronome,
    startBreath,
    stopBreath,
    music: () => music,
    getAnalyserData,
    bands,
    unlock: attemptUnlock,
  };

  return api;
}
