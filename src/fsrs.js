/**
 * FSRS-5 (Free Spaced Repetition Scheduler, 2024) — minimal implementation.
 * Based on https://github.com/open-spaced-repetition/fsrs.js (MIT)
 *
 * Replaces ad-hoc Leitner with stability/difficulty-based intervals.
 * Empirically: 30% fewer reviews than SM-2 at same retention.
 *
 * Each card has:
 *   stability S — days until retrievability falls to 90%
 *   difficulty D — intrinsic difficulty 1-10
 *   reps        — count of reviews
 *   lapses      — count of "Again" ratings
 *   state       — "new" | "learning" | "review" | "relearning"
 *
 * Rating: 1=Again, 2=Hard, 3=Good, 4=Easy
 */

const REQUEST_RETENTION = 0.9;
const MAX_INTERVAL_DAYS = 365 * 2;

// FSRS-5 parameter set (defaults — w[0..18]; production tuners optimise per-user)
const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604,
  0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605,
  2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];

/** Initial stability after first rating (state="new") */
function initStability(rating) {
  // rating 1..4
  return Math.max(0.1, W[rating - 1]);
}

/** Initial difficulty after first rating */
function initDifficulty(rating) {
  return clamp(W[4] - Math.exp(W[5] * (rating - 1)) + 1, 1, 10);
}

/** Update difficulty after review */
function nextDifficulty(D, rating) {
  const deltaD = -W[6] * (rating - 3);
  return clamp(meanReversion(W[4], D + deltaD), 1, 10);
}

/** Mean-reverting D toward W[4] */
function meanReversion(init, current) {
  return W[7] * init + (1 - W[7]) * current;
}

/** Retrievability after t days */
function retrievability(t, S) {
  return Math.pow(1 + W[14] * t / S, -W[15]);
}

/** Next stability after successful recall (Good/Easy) */
function nextStabilityRecall(D, S, R, rating) {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  return S * (Math.exp(W[8])
    * (11 - D)
    * Math.pow(S, -W[9])
    * (Math.exp(W[10] * (1 - R)) - 1)
    * hardPenalty
    * easyBonus + 1);
}

/** Next stability after lapse (Again) */
function nextStabilityForget(D, S, R) {
  return Math.max(0.1, W[11]
    * Math.pow(D, -W[12])
    * (Math.pow(S + 1, W[13]) - 1)
    * Math.exp(W[14] * (1 - R)));
}

/** Compute next interval (days) to reach REQUEST_RETENTION */
function nextInterval(stability) {
  const factor = Math.pow(REQUEST_RETENTION, 1 / -W[14]) - 1;
  const interval = (stability / W[14]) * factor;
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(interval)));
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/**
 * Apply rating to a card. Returns new card state with updated S, D, interval, due.
 *
 * @param {Object} card  - { state, stability, difficulty, lastReview, due, reps, lapses }
 * @param {Number} rating - 1=Again, 2=Hard, 3=Good, 4=Easy
 * @returns {Object} updated card
 */
export function applyRating(card, rating) {
  const now = Date.now();
  const safeRating = clamp(rating, 1, 4);
  let { state = "new", stability = 0, difficulty = 0, lastReview = null, reps = 0, lapses = 0 } = card;

  if (state === "new" || !stability) {
    // First review
    stability = initStability(safeRating);
    difficulty = initDifficulty(safeRating);
    reps = 1;
    if (safeRating === 1) lapses = 1;
    state = safeRating === 1 ? "learning" : safeRating === 2 ? "learning" : "review";
  } else {
    // Existing card — compute retrievability based on elapsed days
    const elapsedDays = lastReview ? Math.max(0, (now - lastReview) / 86400000) : 0;
    const R = retrievability(elapsedDays, stability);
    if (safeRating === 1) {
      // Lapse
      lapses += 1;
      stability = nextStabilityForget(difficulty, stability, R);
      state = "relearning";
    } else {
      stability = nextStabilityRecall(difficulty, stability, R, safeRating);
      state = "review";
    }
    difficulty = nextDifficulty(difficulty, safeRating);
    reps += 1;
  }

  const interval = nextInterval(stability);
  const due = now + interval * 86400000;
  return {
    ...card,
    state,
    stability: Number(stability.toFixed(3)),
    difficulty: Number(difficulty.toFixed(3)),
    lastReview: now,
    due,
    interval,
    reps,
    lapses,
  };
}

/** Returns cards due now (or overdue) sorted by due date */
export function dueCards(cards) {
  const now = Date.now();
  return (cards || []).filter((c) => !c.due || c.due <= now).sort((a, b) => (a.due || 0) - (b.due || 0));
}

/** Forecast cards due in N days */
export function dueWithinDays(cards, days) {
  const horizon = Date.now() + days * 86400000;
  return (cards || []).filter((c) => !c.due || c.due <= horizon);
}

/** Pretty-print interval */
export function formatInterval(days) {
  if (!days || days < 1) return "сегодня";
  if (days === 1) return "завтра";
  if (days < 7) return `через ${days} ${dayWord(days)}`;
  if (days < 30) return `через ${Math.round(days / 7)} нед.`;
  if (days < 365) return `через ${Math.round(days / 30)} мес.`;
  return `через ${(days / 365).toFixed(1)} года`;
}

function dayWord(n) {
  const last = n % 10;
  if (n >= 11 && n <= 14) return "дней";
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}
