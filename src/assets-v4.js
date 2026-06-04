const BASE = "/assets/v4-concept";
const BASE_V6 = "/assets/v6";

export const V4_ASSETS = {
  heroBackdrops: {
    aurora: `${BASE}/backgrounds/hero-aurora-ai.png`,
    citrus: `${BASE}/backgrounds/hero-citrus-ai.png`,
    tide: `${BASE}/backgrounds/hero-tide-ai.png`,
    obsidian: `${BASE}/backgrounds/hero-obsidian-ai.png`,
  },
  heroOrb: `${BASE}/decorative/hero-orb-ai.png`,
  protocols: {
    adaptive: `${BASE}/protocols/adaptive-ai.png`,
    sprint: `${BASE}/protocols/sprint-ai.png`,
    memory: `${BASE}/protocols/memory-ai.png`,
    executive: `${BASE}/protocols/executive-ai.png`,
    flow: `${BASE}/protocols/flow-ai.png`,
    recovery: `${BASE}/protocols/recovery-ai.png`,
  },
  results: {
    good: `${BASE}/results/good-ai.png`,
    warn: `${BASE}/results/warn-ai.png`,
    bad: `${BASE}/results/bad-ai.png`,
    pr: `${BASE}/results/pr-ai.png`,
  },
  domains: {
    memory: `${BASE}/domains/memory.svg`,
    wm: `${BASE}/domains/wm.svg`,
    focus: `${BASE}/domains/focus.svg`,
    logic: `${BASE}/domains/logic.svg`,
    speed: `${BASE}/domains/speed.svg`,
    spatial: `${BASE}/domains/spatial.svg`,
  },
  drills: {
    "working-memory": `${BASE}/drills/working-memory-ai.png`,
    "spatial-grid": `${BASE}/drills/spatial-grid-ai.png`,
    "focus-reticle": `${BASE}/drills/focus-reticle-ai.png`,
    "logic-prism": `${BASE}/drills/logic-prism-ai.png`,
    "recall-crystal": `${BASE}/drills/recall-crystal-ai.png`,
    "speed-wave": `${BASE}/drills/speed-wave-ai.png`,
  },
  banners: {
    attention: `${BASE}/banners/attention-ai.png`,
    memory: `${BASE}/banners/memory-ai.png`,
    speed: `${BASE}/banners/speed-ai.png`,
    logic: `${BASE}/banners/logic-ai.png`,
    speech: `${BASE}/banners/speech-ai.png`,
    inhibition: `${BASE}/banners/inhibition-ai.png`,
    spatial: `${BASE}/banners/spatial-ai.png`,
  },
  badges: {
    "first-round": `${BASE}/badges/first-round.svg`,
    "rounds-50": `${BASE}/badges/rounds-50.svg`,
    "rounds-200": `${BASE}/badges/rounds-200.svg`,
    "streak-3": `${BASE}/badges/streak-3.svg`,
    "streak-7": `${BASE}/badges/streak-7.svg`,
    "streak-21": `${BASE}/badges/streak-21.svg`,
    "streak-30": `${BASE}/badges/streak-30.svg`,
    "index-60": `${BASE}/badges/index-60.svg`,
    "index-75": `${BASE}/badges/index-75.svg`,
    "index-80": `${BASE}/badges/index-80.svg`,
    "balanced-l3": `${BASE}/badges/balanced-l3.svg`,
    "pr-machine": `${BASE}/badges/pr-machine.svg`,
    "metacog-20": `${BASE}/badges/metacog-20.svg`,
    "program-done": `${BASE}/badges/program-done.svg`,
    "night-owl": `${BASE}/badges/night-owl.svg`,
    "early-bird": `${BASE}/badges/early-bird.svg`,
  },
  infographics: {
    nback: `${BASE}/infographics/nback-loop.svg`,
    stroop: `${BASE}/infographics/stroop-conflict.svg`,
    forgetting: `${BASE}/infographics/forgetting-curve.svg`,
    tradeoff: `${BASE}/infographics/speed-accuracy.svg`,
    journey: `${BASE}/infographics/journey-21.svg`,
    hippocampus: `${BASE}/infographics/hippocampus.svg`,
    prefrontal: `${BASE}/infographics/prefrontal.svg`,
    acc: `${BASE}/infographics/acc.svg`,
  },
  decorative: {
    mesh: `${BASE}/decorative/mesh-tile-ai.png`,
    divider: `${BASE}/decorative/divider-wave.svg`,
    corner: `${BASE}/decorative/corner-tide-ai.png`,
    swatch: `${BASE}/decorative/gradient-swatch-ai.png`,
  },
  v6: {
    hero: `${BASE_V6}/quiet-lab-hero.png`,
    drills: `${BASE_V6}/drills-library-banner.png`,
    progress: `${BASE_V6}/progress-analytics-banner.png`,
  },
};

const MODE_DRILL_ART = {
  nback: "working-memory",
  anback: "working-memory",
  bspan: "spatial-grid",
  grid: "spatial-grid",
  schulte: "spatial-grid",
  rotate: "spatial-grid",
  focus: "focus-reticle",
  scan: "focus-reticle",
  trail: "focus-reticle",
  stroop: "focus-reticle",
  antisaccade: "focus-reticle",
  flanker: "focus-reticle",
  logic: "logic-prism",
  math: "logic-prism",
  recall: "recall-crystal",
  rsvp: "recall-crystal",
  vfluency: "recall-crystal",
  circuit: "speed-wave",
  reaction: "speed-wave",
  stopsig: "speed-wave",
  stim: "recall-crystal",
};

const CHALLENGE_BANNER_BY_THEME = {
  "День внимания": "attention",
  "День памяти": "memory",
  "День скорости": "speed",
  "День логики": "logic",
  "День речи и мысли": "speech",
  "День ингибиции": "inhibition",
  "День образов": "spatial",
};

export function getHeroBackdrop(theme) {
  if (theme !== "obsidian") return V4_ASSETS.v6.hero;
  return V4_ASSETS.heroBackdrops[theme] || V4_ASSETS.heroBackdrops.aurora;
}

export function getV6Banner(kind) {
  return V4_ASSETS.v6[kind] || V4_ASSETS.v6.hero;
}

export function getHeroOrb() {
  return V4_ASSETS.heroOrb;
}

export function getProtocolArt(protocolId) {
  return V4_ASSETS.protocols[protocolId] || V4_ASSETS.protocols.adaptive;
}

export function getResultArt(status, isPersonalRecord = false) {
  if (isPersonalRecord) return V4_ASSETS.results.pr;
  return V4_ASSETS.results[status] || V4_ASSETS.results.warn;
}

export function getDomainIcon(domainId) {
  return V4_ASSETS.domains[domainId] || V4_ASSETS.domains.memory;
}

export function getV4DrillSprite(mode) {
  const artId = MODE_DRILL_ART[mode] || MODE_DRILL_ART.circuit;
  return V4_ASSETS.drills[artId];
}

export function getChallengeBanner(theme) {
  const key = CHALLENGE_BANNER_BY_THEME[theme] || "attention";
  return V4_ASSETS.banners[key];
}

export function getAchievementArt(id) {
  return V4_ASSETS.badges[id] || V4_ASSETS.badges["first-round"];
}

export function getScienceGraphic(key) {
  return V4_ASSETS.infographics[key] || null;
}
