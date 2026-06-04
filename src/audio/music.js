import { NOTE } from "./synth.js";

const SCALES = {
  aurora:  [NOTE.D4, NOTE.E4, NOTE.G4, NOTE.A4, NOTE.B4, NOTE.D5, NOTE.E5, NOTE.G5],
  citrus:  [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.A4, NOTE.B4, NOTE.C5, NOTE.E5, NOTE.G5],
  tide:    [NOTE.A3, NOTE.C4, NOTE.D4, NOTE.E4, NOTE.G4, NOTE.A4, NOTE.C5, NOTE.E5],
  default: [NOTE.D4, NOTE.F4, NOTE.G4, NOTE.A4, NOTE.C5, NOTE.D5, NOTE.F5, NOTE.A5],
};

const MODE_TINT = {
  circuit: 0,
  nback: 2,
  grid: 4,
  focus: 1,
  logic: 3,
  recall: 0,
  scan: 5,
  rotate: 6,
  reaction: 2,
  trail: 3,
  stroop: 4,
  anback: 1,
};

export function createMusic(engine) {
  let pad = null;
  let bell = null;
  let running = false;
  let scheduler = 0;
  let nextNoteAt = 0;
  let stepIdx = 0;
  let scale = SCALES.aurora;
  let bpm = 60;
  let modeTint = 0;
  let currentMode = "circuit";
  let currentTheme = "aurora";

  function buildVoices() {
    const ctx = engine.ctx;
    const padGain = ctx.createGain();
    padGain.gain.value = 0;
    padGain.connect(engine.musicIn);

    const bellGain = ctx.createGain();
    bellGain.gain.value = 0;
    bellGain.connect(engine.musicIn);

    pad = { gain: padGain };
    bell = { gain: bellGain };
  }

  function setTheme(theme) {
    currentTheme = theme;
    scale = SCALES[theme] || SCALES.default;
  }

  function setMode(mode) {
    currentMode = mode;
    modeTint = MODE_TINT[mode] ?? 0;
  }

  function pickNote(stepOffset = 0) {
    const idx = ((stepIdx + modeTint + stepOffset) % scale.length + scale.length) % scale.length;
    return Number.isFinite(scale[idx]) ? scale[idx] : SCALES.default[0];
  }

  function playPad(freq, duration, when) {
    const ctx = engine.ctx;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = "sine";
    osc2.type = "triangle";
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 0.5;
    osc1.detune.value = -6;
    osc2.detune.value = 6;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.4;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(0.22, when + 1.2);
    env.gain.linearRampToValueAtTime(0, when + duration);
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env).connect(pad.gain);
    osc1.start(when);
    osc2.start(when);
    osc1.stop(when + duration + 0.1);
    osc2.stop(when + duration + 0.1);
  }

  function playBell(freq, when) {
    const ctx = engine.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * 2;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 4800;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(0.18, when + 0.008);
    env.gain.exponentialRampToValueAtTime(0.001, when + 1.8);
    osc.connect(filter).connect(env).connect(bell.gain);
    osc.start(when);
    osc.stop(when + 2);
    if (engine.sendIn) {
      const send = ctx.createGain();
      send.gain.value = 0.5;
      env.connect(send).connect(engine.sendIn);
    }
  }

  function step() {
    if (!running) return;
    const ctx = engine.ctx;
    const stepDur = 60 / bpm;
    const lookahead = 0.2;
    while (nextNoteAt < ctx.currentTime + lookahead) {
      const beat = stepIdx % 8;
      if (beat === 0) {
        playPad(pickNote(-7) * 0.5, stepDur * 8, nextNoteAt);
      }
      if (beat === 0 || beat === 3 || beat === 5) {
        const freq = pickNote(beat === 5 ? 2 : 0);
        playBell(freq, nextNoteAt + 0.005);
      }
      stepIdx += 1;
      nextNoteAt += stepDur;
    }
    scheduler = window.setTimeout(step, 80);
  }

  function start() {
    if (running) return;
    if (!engine.ready()) return;
    if (!pad) buildVoices();
    running = true;
    nextNoteAt = engine.ctx.currentTime + 0.1;
    stepIdx = 0;
    pad.gain.gain.cancelScheduledValues(engine.ctx.currentTime);
    pad.gain.gain.setValueAtTime(0, engine.ctx.currentTime);
    pad.gain.gain.linearRampToValueAtTime(0.4 * engine.musicGain(), engine.ctx.currentTime + 1.6);
    bell.gain.gain.setValueAtTime(0.7 * engine.musicGain(), engine.ctx.currentTime);
    step();
  }

  function stop() {
    if (!running) return;
    running = false;
    window.clearTimeout(scheduler);
    if (pad) {
      pad.gain.gain.cancelScheduledValues(engine.ctx.currentTime);
      pad.gain.gain.linearRampToValueAtTime(0, engine.ctx.currentTime + 1.2);
    }
    if (bell) {
      bell.gain.gain.linearRampToValueAtTime(0, engine.ctx.currentTime + 0.5);
    }
  }

  function setVolume(v) {
    if (!pad || !bell || !engine.ready()) return;
    const target = engine.musicGain();
    pad.gain.gain.linearRampToValueAtTime(0.4 * target, engine.ctx.currentTime + 0.2);
    bell.gain.gain.linearRampToValueAtTime(0.7 * target, engine.ctx.currentTime + 0.2);
  }

  function setTempo(value) {
    bpm = Math.max(40, Math.min(120, value));
  }

  function setCombo(c) {
    const targetBpm = 60 + Math.max(0, Math.min(2, c - 1)) * 18;
    setTempo(targetBpm);
  }

  return {
    start,
    stop,
    setTheme,
    setMode,
    setVolume,
    setTempo,
    setCombo,
    get running() { return running; },
    get mode() { return currentMode; },
    get theme() { return currentTheme; },
  };
}
