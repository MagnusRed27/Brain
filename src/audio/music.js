import { NOTE } from "./synth.js";

/**
 * Warm, serene lo-fi felt-piano & soft-rain procedural ambient engine.
 * Designed for deep focus and morning coffee — zero harsh highs, zero shrill bells.
 */

const CHORD_PROGRESSIONS = {
  // Warm lush maj9 / m9 voicings in cozy low-mid register (130–392 Hz)
  aurora: [
    [NOTE.C3, NOTE.G3, NOTE.B3, NOTE.D4, NOTE.E4], // Cmaj9
    [NOTE.A3 * 0.5, NOTE.E3, NOTE.G3, NOTE.B3, NOTE.C4], // Am9
    [NOTE.F3, NOTE.C4, NOTE.E4, NOTE.G3, NOTE.A3], // Fmaj9
    [NOTE.G3, NOTE.D4, NOTE.E4, NOTE.A3, NOTE.B3], // G6sus
  ],
  citrus: [
    [NOTE.D3, NOTE.A3, NOTE.C4, NOTE.E4, NOTE.F4], // Dm9
    [NOTE.G3 * 0.5, NOTE.D3, NOTE.F3, NOTE.A3, NOTE.B3], // G9
    [NOTE.C3, NOTE.G3, NOTE.B3, NOTE.D4, NOTE.E4], // Cmaj9
    [NOTE.A3 * 0.5, NOTE.E3, NOTE.G3, NOTE.B3, NOTE.D4], // Am11
  ],
  tide: [
    [NOTE.E3, NOTE.B3, NOTE.D4, NOTE.G3, NOTE.A3], // Em11
    [NOTE.C3, NOTE.G3, NOTE.B3, NOTE.D4, NOTE.E4], // Cmaj9
    [NOTE.G3 * 0.5, NOTE.D3, NOTE.B3, NOTE.A3, NOTE.E4], // Gmaj13
    [NOTE.D3, NOTE.A3, NOTE.E4, NOTE.G3, NOTE.B3], // D6sus
  ],
  obsidian: [
    [NOTE.A3 * 0.5, NOTE.E3, NOTE.B3, NOTE.C4, NOTE.G3], // Am9
    [NOTE.F3 * 0.5, NOTE.C3, NOTE.G3, NOTE.A3, NOTE.E4], // Fmaj9
    [NOTE.C3, NOTE.G3, NOTE.D4, NOTE.E4, NOTE.B3], // Cmaj9
    [NOTE.E3 * 0.5, NOTE.B3 * 0.5, NOTE.G3, NOTE.D4, NOTE.A3], // Em11
  ],
};

export function createMusic(engine) {
  let padBus = null;
  let keysBus = null;
  let rainNode = null;
  let rainGain = null;
  let running = false;
  let scheduler = 0;
  let nextChordAt = 0;
  let nextDropAt = 0;
  let chordIdx = 0;
  let currentMode = "circuit";
  let currentTheme = "aurora";
  let tempoScale = 1;

  function buildVoices() {
    const ctx = engine.ctx;
    padBus = ctx.createGain();
    padBus.gain.value = 0;
    padBus.connect(engine.musicIn);

    keysBus = ctx.createGain();
    keysBus.gain.value = 0;
    keysBus.connect(engine.musicIn);

    // Soft warm rain / vinyl room-tone bed (heavily lowpass-filtered brown noise)
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch += 1) {
      const data = buffer.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < bufferSize; i += 1) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 2.4;
      }
    }
    rainNode = ctx.createBufferSource();
    rainNode.buffer = buffer;
    rainNode.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = "lowpass";
    rainFilter.frequency.value = 340;
    rainFilter.Q.value = 0.5;

    rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainNode.connect(rainFilter).connect(rainGain).connect(engine.musicIn);
    rainNode.start();
  }

  function getProgression() {
    return CHORD_PROGRESSIONS[currentTheme] || CHORD_PROGRESSIONS.aurora;
  }

  function setTheme(theme) {
    currentTheme = theme || "aurora";
  }

  function setMode(mode) {
    currentMode = mode || "circuit";
  }

  function playWarmPadChord(freqs, duration, when) {
    const ctx = engine.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(380, when);
    filter.frequency.linearRampToValueAtTime(560, when + duration * 0.45);
    filter.frequency.linearRampToValueAtTime(340, when + duration);
    filter.Q.value = 0.35;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(0.14, when + 2.4);
    env.gain.setValueAtTime(0.14, when + duration - 2.8);
    env.gain.linearRampToValueAtTime(0.0001, when + duration);

    filter.connect(env).connect(padBus);

    // Use bottom 3 notes for a warm, spacious foundation (never muddy)
    freqs.slice(0, 3).forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.detune.value = (idx - 1) * 4;
      const g = ctx.createGain();
      g.gain.value = idx === 0 ? 0.55 : 0.32;
      osc.connect(g).connect(filter);
      osc.start(when);
      osc.stop(when + duration + 0.15);
    });
  }

  function playFeltKey(freq, when) {
    const ctx = engine.ctx;
    // Keep felt piano strictly in warm register (<= 460 Hz)
    const safeFreq = freq > 460 ? freq * 0.5 : freq;

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = safeFreq;

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = safeFreq * 2;

    const g2 = ctx.createGain();
    g2.gain.value = 0.12; // subtle felt warmth

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(920, when);
    filter.frequency.exponentialRampToValueAtTime(320, when + 2.6);
    filter.Q.value = 0.4;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(0.11, when + 0.032); // soft felt hammer
    env.gain.exponentialRampToValueAtTime(0.0001, when + 3.2);

    const panner = ctx.createStereoPanner();
    panner.pan.value = (Math.random() * 0.7 - 0.35);

    osc1.connect(filter);
    osc2.connect(g2).connect(filter);
    filter.connect(env).connect(panner).connect(keysBus);

    if (engine.sendIn) {
      const send = ctx.createGain();
      send.gain.value = 0.42;
      panner.connect(send).connect(engine.sendIn);
    }

    osc1.start(when);
    osc2.start(when);
    osc1.stop(when + 3.4);
    osc2.stop(when + 3.4);
  }

  function step() {
    if (!running) return;
    const ctx = engine.ctx;
    const now = ctx.currentTime;
    const prog = getProgression();
    const chordDur = 8.5 / tempoScale;

    if (nextChordAt < now + 0.4) {
      const chord = prog[chordIdx % prog.length];
      playWarmPadChord(chord, chordDur + 1.8, Math.max(now + 0.05, nextChordAt));
      chordIdx += 1;
      nextChordAt = Math.max(now + 0.05, nextChordAt) + chordDur;
    }

    if (nextDropAt < now + 0.3) {
      const chord = prog[(Math.max(0, chordIdx - 1)) % prog.length];
      const note = chord[2 + Math.floor(Math.random() * Math.max(1, chord.length - 2))] || chord[0];
      playFeltKey(note, Math.max(now + 0.05, nextDropAt));
      // Sparse, breathing intervals (2.4s to 4.6s) — never frantic or repetitive
      nextDropAt = Math.max(now + 0.05, nextDropAt) + (2.4 + Math.random() * 2.2) / tempoScale;
    }

    scheduler = window.setTimeout(step, 180);
  }

  function applyVolumes() {
    if (!padBus || !keysBus || !engine.ready()) return;
    const target = engine.musicGain();
    const now = engine.ctx.currentTime;
    padBus.gain.cancelScheduledValues(now);
    padBus.gain.linearRampToValueAtTime(0.65 * target, now + 0.4);
    keysBus.gain.cancelScheduledValues(now);
    keysBus.gain.linearRampToValueAtTime(0.55 * target, now + 0.4);
    if (rainGain) {
      rainGain.gain.cancelScheduledValues(now);
      rainGain.gain.linearRampToValueAtTime(0.08 * target, now + 0.8);
    }
  }

  function start() {
    if (running) return;
    if (!engine.ready()) return;
    if (!padBus) buildVoices();
    running = true;
    const now = engine.ctx.currentTime;
    nextChordAt = now + 0.08;
    nextDropAt = now + 1.4;
    chordIdx = 0;
    applyVolumes();
    step();
  }

  function stop() {
    if (!running) return;
    running = false;
    window.clearTimeout(scheduler);
    const now = engine.ctx.currentTime;
    if (padBus) {
      padBus.gain.cancelScheduledValues(now);
      padBus.gain.linearRampToValueAtTime(0, now + 1.0);
    }
    if (keysBus) {
      keysBus.gain.cancelScheduledValues(now);
      keysBus.gain.linearRampToValueAtTime(0, now + 0.6);
    }
    if (rainGain) {
      rainGain.gain.cancelScheduledValues(now);
      rainGain.gain.linearRampToValueAtTime(0, now + 0.8);
    }
  }

  function setVolume() {
    if (running) applyVolumes();
  }

  function setTempo(value) {
    tempoScale = Math.max(0.75, Math.min(1.25, (Number(value) || 60) / 60));
  }

  function setCombo(c) {
    tempoScale = 1 + Math.max(0, Math.min(1, (c - 1) * 0.12));
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
