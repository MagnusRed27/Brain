export const BEAT_PRESETS = {
  delta: { freq: 2.5, carrier: 110, label: "Delta · глубокий покой (2.5Гц)", note: "Дельта-волны связаны со сном и восстановлением. Эффект бодрствующего стимулирования спорный." },
  theta: { freq: 6, carrier: 150, label: "Theta · релаксация / медитация (6Гц)", note: "Тета-ритм наблюдается при глубокой медитации и REM-сне." },
  alpha: { freq: 10, carrier: 200, label: "Alpha · спокойный фокус (10Гц)", note: "Альфа-волны коррелируют со спокойным бодрствованием и творческими состояниями." },
  beta: { freq: 18, carrier: 240, label: "Beta · концентрация (18Гц)", note: "Бета-ритм активен при сосредоточенной работе." },
  gamma: { freq: 40, carrier: 280, label: "Gamma · GENUS-частота (40Гц)", note: "40Гц-стимуляция — экспериментальный протокол (Iaccarino & Tsai 2016, MIT) с обещанием в исследованиях Альцгеймера." },
};

export function createBinaural(engine) {
  let oscL = null;
  let oscR = null;
  let panL = null;
  let panR = null;
  let gain = null;
  let preset = "alpha";

  function start(name = "alpha") {
    stop();
    if (!engine.ready()) return;
    const ctx = engine.ctx;
    const p = BEAT_PRESETS[name] || BEAT_PRESETS.alpha;
    preset = name;

    gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.2);
    gain.connect(engine.musicIn);

    oscL = ctx.createOscillator();
    oscR = ctx.createOscillator();
    oscL.type = "sine";
    oscR.type = "sine";
    oscL.frequency.value = p.carrier;
    oscR.frequency.value = p.carrier + p.freq;

    panL = ctx.createStereoPanner();
    panR = ctx.createStereoPanner();
    panL.pan.value = -1;
    panR.pan.value = 1;

    oscL.connect(panL).connect(gain);
    oscR.connect(panR).connect(gain);

    oscL.start();
    oscR.start();
  }

  function stop(ramp = 0.6) {
    if (!gain) return;
    const ctx = engine.ctx;
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.linearRampToValueAtTime(0, t + ramp);
    const captureL = oscL, captureR = oscR;
    window.setTimeout(() => {
      try { captureL?.stop(); } catch { /* noop */ }
      try { captureR?.stop(); } catch { /* noop */ }
    }, ramp * 1000 + 100);
    oscL = oscR = panL = panR = gain = null;
  }

  return { start, stop, get current() { return preset; } };
}

export function createGenus40(engine) {
  let carrier = null;
  let lfo = null;
  let lfoGain = null;
  let dca = null;
  let out = null;
  let running = false;

  function start() {
    stop();
    if (!engine.ready()) return;
    const ctx = engine.ctx;
    carrier = ctx.createOscillator();
    carrier.type = "sine";
    carrier.frequency.value = 220;

    lfo = ctx.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = 40;
    lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain);

    dca = ctx.createGain();
    dca.gain.value = 0.5;
    lfoGain.connect(dca.gain);

    out = ctx.createGain();
    out.gain.setValueAtTime(0, ctx.currentTime);
    out.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.0);

    carrier.connect(dca).connect(out).connect(engine.musicIn);
    carrier.start();
    lfo.start();
    running = true;
  }

  function stop(ramp = 0.5) {
    if (!running) return;
    const ctx = engine.ctx;
    const t = ctx.currentTime;
    out?.gain.cancelScheduledValues(t);
    out?.gain.linearRampToValueAtTime(0, t + ramp);
    const c = carrier, l = lfo;
    window.setTimeout(() => {
      try { c?.stop(); } catch { /* noop */ }
      try { l?.stop(); } catch { /* noop */ }
    }, ramp * 1000 + 80);
    carrier = lfo = lfoGain = dca = out = null;
    running = false;
  }

  return { start, stop, get running() { return running; } };
}
