/**
 * Silky acoustic micro-SFX synthesizer:
 * Soft wooden marimba taps, warm felt-piano intervals, gentle singing-bowl chimes.
 * Zero sawtooth, zero square waves, zero shrill FM screeches.
 */

const NOTE = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, E6: 1318.5, G6: 1568.0,
};

export const PRESETS = {
  "hit-soft":      { notes: [NOTE.D4],                       dur: 0.14, amp: 0.14, filter: 1100, decay: 0.18, attack: 0.008 },
  "hit-crisp":     { notes: [NOTE.F4, NOTE.A4],              dur: 0.14, amp: 0.15, filter: 1350, decay: 0.20, attack: 0.007 },
  "streak":        { notes: [NOTE.A4, NOTE.D5],              dur: 0.18, amp: 0.15, filter: 1400, decay: 0.28, attack: 0.010, stagger: 0.055 },
  "combo":         { notes: [NOTE.G4, NOTE.B4, NOTE.D5],     dur: 0.22, amp: 0.16, filter: 1500, decay: 0.36, attack: 0.012, stagger: 0.05 },
  "miss-near":     { notes: [NOTE.A3],                       dur: 0.14, amp: 0.12, filter: 520,  decay: 0.16, attack: 0.010 },
  "miss-bad":      { notes: [NOTE.F3],                       dur: 0.18, amp: 0.13, filter: 420,  decay: 0.20, attack: 0.012 },
  "level-up":      { notes: [NOTE.D4, NOTE.A4, NOTE.D5],     dur: 0.34, amp: 0.16, filter: 1600, decay: 0.55, attack: 0.015, stagger: 0.08 },
  "round-start":   { notes: [NOTE.D4, NOTE.A4],              dur: 0.28, amp: 0.13, filter: 1150, decay: 0.45, attack: 0.018, stagger: 0.06 },
  "round-end":     { notes: [NOTE.A4, NOTE.D4],              dur: 0.32, amp: 0.13, filter: 1000, decay: 0.52, attack: 0.018, stagger: 0.09 },
  "recall-flip":   { notes: [NOTE.E4],                       dur: 0.11, amp: 0.11, filter: 980,  decay: 0.14, attack: 0.008 },
  "recall-reveal": { notes: [NOTE.G4, NOTE.B4],              dur: 0.20, amp: 0.13, filter: 1250, decay: 0.32, attack: 0.012, stagger: 0.05 },
  "metronome":     { notes: [NOTE.G4],                       dur: 0.04, amp: 0.08, filter: 780,  decay: 0.04, attack: 0.004 },
  "metronome-acc": { notes: [NOTE.C5],                       dur: 0.05, amp: 0.10, filter: 980,  decay: 0.05, attack: 0.004 },
  "breath-in":     { notes: [NOTE.A3, NOTE.E4],              dur: 3.6,  amp: 0.07, filter: 520,  decay: 3.8,  attack: 1.2 },
  "breath-out":    { notes: [NOTE.E4, NOTE.A3],              dur: 3.6,  amp: 0.07, filter: 460,  decay: 3.8,  attack: 1.0 },
};

export function playPreset(engine, name, options = {}) {
  const preset = PRESETS[name] || PRESETS["hit-soft"];
  if (!engine.ready()) return;
  const ctx = engine.ctx;
  const baseNow = ctx.currentTime + 0.005;
  const amp = (options.amp ?? preset.amp) * engine.sfxGain();
  const pan = options.pan ?? 0;
  const stagger = preset.stagger || 0;
  const notes = preset.notes || [NOTE.D4];

  notes.forEach((freq, idx) => {
    const startAt = baseNow + idx * stagger;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startAt);
    osc.detune.setValueAtTime((Math.random() * 4 - 2), startAt);

    // Subtle warm 2nd harmonic (marimba/felt body)
    const harm = ctx.createOscillator();
    harm.type = "sine";
    harm.frequency.setValueAtTime(freq * 2, startAt);
    const harmGain = ctx.createGain();
    harmGain.gain.setValueAtTime(0.10, startAt);
    harmGain.gain.exponentialRampToValueAtTime(0.001, startAt + preset.dur * 0.6);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(preset.filter, startAt);
    filter.frequency.exponentialRampToValueAtTime(Math.max(220, preset.filter * 0.45), startAt + preset.dur + preset.decay);
    filter.Q.value = 0.4;

    const env = ctx.createGain();
    const attack = Math.max(0.004, options.attack ?? preset.attack ?? 0.008);
    const noteAmp = amp / Math.sqrt(notes.length);
    env.gain.setValueAtTime(0.0001, startAt);
    env.gain.linearRampToValueAtTime(noteAmp, startAt + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, startAt + preset.dur + preset.decay);

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), startAt);

    osc.connect(filter);
    harm.connect(harmGain).connect(filter);
    filter.connect(env).connect(panner);
    panner.connect(engine.dryIn);

    if (engine.sendIn) {
      const send = ctx.createGain();
      send.gain.setValueAtTime(0.24, startAt);
      panner.connect(send).connect(engine.sendIn);
    }

    const stopAt = startAt + preset.dur + preset.decay + 0.06;
    osc.start(startAt);
    harm.start(startAt);
    osc.stop(stopAt);
    harm.stop(stopAt);
  });

  engine.duck(name);
  return { stopAt: baseNow + preset.dur + preset.decay };
}

export { NOTE };
