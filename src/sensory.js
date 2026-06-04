import { createAudioEngine } from "./audio/engine.js";

export function createSensory(getSettings) {
  const engine = createAudioEngine(getSettings);
  return {
    cue: (type, options) => engine.cue(type, options),
    unlock: () => engine.unlock(),
    engine,
  };
}

export { createAudioEngine };
