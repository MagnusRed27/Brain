const PATTERNS = {
  "hit-soft":      [12],
  "hit-crisp":     [16],
  "miss-near":     [22, 30, 22],
  "miss-bad":      [40, 35, 40],
  "level-up":      [20, 30, 20, 30, 60],
  "round-start":   [16, 20, 16],
  "round-end":     [20, 24, 20, 24],
  "recall-flip":   [10],
  "recall-reveal": [14, 18, 14],
  "metronome":     [8],
  "metronome-acc": [12],
  "streak":        [10, 8, 10],
  "combo":         [14, 12, 14, 12, 24],
};

export function createHaptics(getSettings) {
  const supported = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  return {
    cue(name) {
      if (!supported) return;
      const settings = getSettings();
      if (!settings.hapticsEnabled) return;
      if (settings.reducedMotion) return;
      const pattern = PATTERNS[name];
      if (!pattern) return;
      try {
        navigator.vibrate(pattern);
      } catch {
        /* noop */
      }
    },
    supported,
  };
}
