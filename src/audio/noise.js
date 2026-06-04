function fillWhite(data) {
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
}

function fillPink(data) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
}

function fillBrown(data) {
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
}

const FILLS = { white: fillWhite, pink: fillPink, brown: fillBrown };

export function createNoise(engine, kind = "pink", { lengthSeconds = 4, lowpass = null } = {}) {
  if (!engine.ready()) return null;
  const ctx = engine.ctx;
  const length = Math.floor(ctx.sampleRate * lengthSeconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  const fill = FILLS[kind] || FILLS.pink;
  for (let ch = 0; ch < 2; ch += 1) fill(buffer.getChannelData(ch));

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  let lastNode = source;
  if (lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    source.connect(filter);
    lastNode = filter;
  }
  lastNode.connect(gain);
  gain.connect(engine.musicIn);

  source.start();

  return {
    setLevel(value, ramp = 0.6) {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, value)), t + ramp);
    },
    stop(ramp = 0.6) {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.linearRampToValueAtTime(0, t + ramp);
      window.setTimeout(() => {
        try { source.stop(); } catch { /* noop */ }
      }, ramp * 1000 + 100);
    },
    kind,
  };
}
