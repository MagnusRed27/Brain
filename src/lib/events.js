export function createBus() {
  const channels = new Map();

  function on(event, handler) {
    if (!channels.has(event)) channels.set(event, new Set());
    channels.get(event).add(handler);
    return () => off(event, handler);
  }

  function off(event, handler) {
    channels.get(event)?.delete(handler);
  }

  function emit(event, payload) {
    const handlers = channels.get(event);
    if (!handlers || !handlers.size) return;
    for (const handler of [...handlers]) {
      try {
        handler(payload);
      } catch (error) {
        console.warn(`[bus] handler error on ${event}`, error);
      }
    }
  }

  function once(event, handler) {
    const unsub = on(event, (payload) => {
      unsub();
      handler(payload);
    });
    return unsub;
  }

  return { on, off, emit, once };
}

export const bus = createBus();

export const EVENTS = {
  AUDIO_UNLOCK: "audio:unlock",
  THEME_CHANGE: "theme:change",
  DRILL_START: "drill:start",
  DRILL_HIT: "drill:hit",
  DRILL_MISS: "drill:miss",
  DRILL_FINISH: "drill:finish",
  CIRCUIT_DONE: "circuit:done",
  STATE_SAVED: "state:saved",
  STATE_SAVE_FAILED: "state:save-failed",
  CUE: "sensory:cue",
};
