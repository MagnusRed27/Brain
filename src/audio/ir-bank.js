export function makeImpulseResponse(ctx, { seconds = 1.8, decay = 2.6, reverse = false } = {}) {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      const noise = Math.random() * 2 - 1;
      const envelope = Math.pow(1 - t, decay);
      data[reverse ? length - 1 - i : i] = noise * envelope;
    }
  }
  return buffer;
}

export const IR_PRESETS = {
  room: { seconds: 1.2, decay: 3.4 },
  hall: { seconds: 2.4, decay: 2.2 },
  cathedral: { seconds: 3.6, decay: 1.6 },
};
