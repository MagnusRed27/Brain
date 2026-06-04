/**
 * Метакогниция: пользователь оценивает прогноз точности ДО раунда (0-100%).
 * После раунда мы сохраняем пару (prediction, actual) и считаем калибровку.
 * Хорошая калибровка → точная самооценка → лучше принимать решения о темпе.
 *
 * Исследование: Dunning & Kruger 1999, Hacker et al. 2009 (metacognitive monitoring).
 */

export function recordPrediction(state, mode, prediction) {
  const entry = { mode, prediction, at: Date.now() };
  return {
    ...state,
    metacog: {
      ...(state.metacog || { pending: null, history: [] }),
      pending: entry,
    },
  };
}

export function recordOutcome(state, result) {
  const meta = state.metacog || { pending: null, history: [] };
  const pending = meta.pending;
  if (!pending || pending.mode !== result.mode) return state;
  const entry = {
    mode: result.mode,
    prediction: pending.prediction,
    actual: Math.round(result.accuracy * 100),
    delta: Math.round(result.accuracy * 100) - pending.prediction,
    at: Date.now(),
  };
  const history = [...(meta.history || []), entry].slice(-100);
  return {
    ...state,
    metacog: { pending: null, history },
  };
}

/**
 * Вычисление калибровки: средняя ошибка между предсказанием и реальностью.
 * Возвращает { bias, mae, samples, classification, lastDelta }.
 */
export function getCalibration(state) {
  const history = state.metacog?.history || [];
  if (!history.length) return null;
  const bias = history.reduce((s, e) => s + e.delta, 0) / history.length;
  const mae = history.reduce((s, e) => s + Math.abs(e.delta), 0) / history.length;
  const samples = history.length;
  const lastDelta = history[history.length - 1]?.delta || 0;

  let classification, hint;
  if (samples < 4) {
    classification = "формируется";
    hint = "После нескольких предсказаний калибровка начнёт показывать твою самооценку.";
  } else if (Math.abs(bias) <= 7 && mae <= 12) {
    classification = "точная";
    hint = "Самооценка совпадает с реальностью — это редкий навык. Доверяй предчувствию.";
  } else if (bias > 7) {
    classification = "переоценка";
    hint = `В среднем переоцениваешь себя на ${Math.round(bias)} п.п. — типичный Dunning-Kruger. Не повышай уровень слишком рано.`;
  } else if (bias < -7) {
    classification = "недооценка";
    hint = `В среднем недооцениваешь себя на ${Math.round(-bias)} п.п. — ты сильнее, чем кажется. Бери задачи посложнее.`;
  } else {
    classification = "шум";
    hint = "Точность самооценки разбросанная. Сосредоточься на конкретном модуле, чтобы стабилизировать.";
  }

  return {
    bias: Math.round(bias),
    mae: Math.round(mae),
    samples,
    classification,
    hint,
    lastDelta,
  };
}
