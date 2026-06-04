const NOTE = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, E6: 1318.5, G6: 1568.0,
};

export const PRESETS = {
  "hit-soft":      { wave: "sine",     freq: NOTE.E5, glide: NOTE.B5, dur: 0.18, amp: 0.18, fm: 0.0,  pan: 0,    filter: 8200, decay: 0.4 },
  "hit-crisp":     { wave: "triangle", freq: NOTE.G5, glide: NOTE.D6, dur: 0.16, amp: 0.22, fm: 0.4,  pan: 0,    filter: 9800, decay: 0.5 },
  "streak":        { wave: "sine",     freq: NOTE.A5, glide: NOTE.E6, dur: 0.24, amp: 0.22, fm: 0.2,  pan: 0,    filter: 9200, decay: 0.6 },
  "combo":         { wave: "sine",     freq: NOTE.C5, glide: NOTE.G6, dur: 0.32, amp: 0.26, fm: 0.6,  pan: 0,    filter: 11000, decay: 0.8 },
  "miss-near":     { wave: "triangle", freq: NOTE.E4, glide: NOTE.C4, dur: 0.22, amp: 0.2,  fm: 0.5,  pan: 0,    filter: 2400, decay: 0.5 },
  "miss-bad":      { wave: "sawtooth", freq: NOTE.A3, glide: NOTE.F3, dur: 0.28, amp: 0.22, fm: 0.9,  pan: 0,    filter: 1400, decay: 0.6 },
  "level-up":      { wave: "sine",     freq: NOTE.C5, glide: NOTE.C6, dur: 0.5,  amp: 0.28, fm: 0.3,  pan: 0,    filter: 10400, decay: 1.2 },
  "round-start":   { wave: "sine",     freq: NOTE.G4, glide: NOTE.D5, dur: 0.34, amp: 0.22, fm: 0.15, pan: 0,    filter: 6800, decay: 0.9 },
  "round-end":     { wave: "sine",     freq: NOTE.D5, glide: NOTE.A4, dur: 0.44, amp: 0.2,  fm: 0.1,  pan: 0,    filter: 5600, decay: 1.1 },
  "recall-flip":   { wave: "triangle", freq: NOTE.E5, glide: NOTE.A5, dur: 0.22, amp: 0.18, fm: 0.3,  pan: 0,    filter: 7400, decay: 0.5 },
  "recall-reveal": { wave: "sine",     freq: NOTE.C6, glide: NOTE.G5, dur: 0.38, amp: 0.22, fm: 0.25, pan: 0,    filter: 8800, decay: 0.9 },
  "metronome":     { wave: "square",   freq: NOTE.A5, glide: NOTE.A5, dur: 0.05, amp: 0.16, fm: 0.0,  pan: 0,    filter: 3600, decay: 0.06 },
  "metronome-acc": { wave: "square",   freq: NOTE.E6, glide: NOTE.E6, dur: 0.07, amp: 0.22, fm: 0.0,  pan: 0,    filter: 5200, decay: 0.08 },
  "breath-in":     { wave: "sine",     freq: NOTE.A3, glide: NOTE.E4, dur: 4.0,  amp: 0.12, fm: 0.05, pan: 0,    filter: 1800, decay: 4.0 },
  "breath-out":    { wave: "sine",     freq: NOTE.E4, glide: NOTE.A3, dur: 4.0,  amp: 0.12, fm: 0.05, pan: 0,    filter: 1600, decay: 4.0 },
};

export function playPreset(engine, name, options = {}) {
  const preset = PRESETS[name] || PRESETS["hit-soft"];
  if (!engine.ready()) return;
  const ctx = engine.ctx;
  const now = ctx.currentTime + 0.005;

  const detune = options.detune ?? (Math.random() * 6 - 3);
  const jitter = options.jitter ?? (Math.random() * 0.01 - 0.005);
  const startAt = now + Math.max(0, jitter);
  const pan = options.pan ?? preset.pan;
  const amp = (options.amp ?? preset.amp) * engine.sfxGain();

  const osc = ctx.createOscillator();
  osc.type = preset.wave;
  osc.frequency.setValueAtTime(preset.freq, startAt);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, preset.glide), startAt + preset.dur);
  osc.detune.setValueAtTime(detune, startAt);

  let mod = null;
  if (preset.fm > 0) {
    mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    mod.frequency.setValueAtTime(preset.freq * 0.5, startAt);
    modGain.gain.setValueAtTime(preset.freq * preset.fm, startAt);
    mod.connect(modGain).connect(osc.frequency);
    mod.start(startAt);
    mod.stop(startAt + preset.dur + 0.05);
  }

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(preset.filter, startAt);
  filter.frequency.exponentialRampToValueAtTime(Math.max(180, preset.filter * 0.45), startAt + preset.dur);
  filter.Q.value = 0.6;

  const env = ctx.createGain();
  const attack = Math.max(0.004, options.attack ?? 0.006);
  const release = Math.max(0.04, preset.decay * 0.75);
  env.gain.setValueAtTime(0, startAt);
  env.gain.linearRampToValueAtTime(amp, startAt + attack);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0001, amp * 0.4), startAt + preset.dur * 0.55);
  env.gain.exponentialRampToValueAtTime(0.0001, startAt + preset.dur + release);

  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), startAt);

  osc.connect(filter).connect(env).connect(panner);
  panner.connect(engine.dryIn);
  if (engine.sendIn) {
    const send = ctx.createGain();
    send.gain.setValueAtTime(0.34, startAt);
    panner.connect(send).connect(engine.sendIn);
  }

  osc.start(startAt);
  osc.stop(startAt + preset.dur + release + 0.05);

  engine.duck(name);
  return { stopAt: startAt + preset.dur + release };
}

export { NOTE };
