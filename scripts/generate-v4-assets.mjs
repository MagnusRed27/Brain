import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const outDir = join(process.cwd(), "public", "assets", "v4-concept");

function save(path, markup) {
  const file = join(outDir, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, markup, "utf8");
}

function svg(width, height, body, defs = "", attrs = "") {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ${attrs}>\n${defs}\n${body}\n</svg>\n`;
}

function defs(id, colors) {
  const [a, b, c, d = "#ffffff"] = colors;
  return `<defs>
  <linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${a}"/>
    <stop offset="45%" stop-color="${b}"/>
    <stop offset="100%" stop-color="${c}"/>
  </linearGradient>
  <radialGradient id="${id}-r" cx="50%" cy="45%" r="70%">
    <stop offset="0%" stop-color="${d}" stop-opacity=".95"/>
    <stop offset="45%" stop-color="${b}" stop-opacity=".42"/>
    <stop offset="100%" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <filter id="${id}-glow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="10" result="blur"/>
    <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .75 0" result="glow"/>
    <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="${id}-soft" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="18"/>
  </filter>
  <pattern id="${id}-grid" width="64" height="64" patternUnits="userSpaceOnUse">
    <path d="M64 0H0v64" fill="none" stroke="${a}" stroke-opacity=".08" stroke-width="1"/>
  </pattern>
</defs>`;
}

const palette = {
  aurora: ["#7c5cff", "#4fd1a8", "#ff7da6", "#f6f7ff"],
  citrus: ["#ffba2e", "#5fc36a", "#ff6f5e", "#fffdf6"],
  tide: ["#2a73ff", "#2fd0d8", "#7aa8ff", "#f4f7fb"],
  obsidian: ["#8b7dff", "#5ddfb7", "#ff8fab", "#0d1117"],
};

function neuralLines(w, h, color = "#7c5cff", opacity = 0.18) {
  let paths = "";
  for (let i = 0; i < 9; i += 1) {
    const y = 120 + i * (h - 240) / 8;
    const c1 = 140 + (i % 3) * 80;
    const c2 = w - 240 - (i % 4) * 42;
    paths += `<path d="M${-80} ${y} C ${c1} ${y - 90}, ${c2} ${y + 105}, ${w + 80} ${y - 30}" fill="none" stroke="${color}" stroke-width="${i % 3 === 0 ? 2.2 : 1.2}" stroke-opacity="${opacity}"/>`;
  }
  return paths;
}

function heroBackground(kind, colors, body) {
  const [a, b, c, d] = colors;
  return svg(2560, 1440, `
  <rect width="2560" height="1440" fill="${d}"/>
  <rect width="2560" height="1440" fill="url(#${kind}-grid)"/>
  <ellipse cx="660" cy="420" rx="780" ry="420" fill="${a}" opacity=".14" filter="url(#${kind}-soft)"/>
  <ellipse cx="1800" cy="330" rx="640" ry="360" fill="${c}" opacity=".16" filter="url(#${kind}-soft)"/>
  <ellipse cx="1430" cy="1120" rx="900" ry="280" fill="${b}" opacity=".16" filter="url(#${kind}-soft)"/>
  ${neuralLines(2560, 1440, a, 0.13)}
  ${body}
  <rect x="0" y="0" width="2560" height="1440" fill="url(#${kind}-r)" opacity=".55"/>
`, defs(kind, colors));
}

save("backgrounds/hero-aurora.svg", heroBackground("aurora", palette.aurora, `
  <path d="M-80 900 C 340 710, 820 820, 1120 710 S 1880 620, 2640 760 L2640 1440 L-80 1440 Z" fill="url(#aurora-g)" opacity=".34"/>
  <path d="M-80 1010 C 560 840, 920 1000, 1490 900 S 2220 780, 2640 980" fill="none" stroke="#ffffff" stroke-width="18" stroke-opacity=".35"/>
  <ellipse cx="1260" cy="1060" rx="980" ry="130" fill="#ffffff" opacity=".28"/>
`));

save("backgrounds/hero-citrus.svg", heroBackground("citrus", palette.citrus, `
  <rect x="0" y="0" width="2560" height="1440" fill="#fff6d9" opacity=".32"/>
  <circle cx="2080" cy="250" r="210" fill="#ffba2e" opacity=".28" filter="url(#citrus-soft)"/>
  <path d="M1870 1440 C 1960 1160, 2140 1010, 2300 790 C 2180 930, 2110 1160, 2140 1440 Z" fill="#5fc36a" opacity=".18"/>
  <path d="M2020 1440 C 2080 1220, 2260 1120, 2440 930 C 2340 1100, 2300 1280, 2350 1440 Z" fill="#5fc36a" opacity=".13"/>
`));

save("backgrounds/hero-tide.svg", heroBackground("tide", palette.tide, `
  <g opacity=".42">
    <rect x="280" y="110" width="88" height="1180" rx="44" fill="#ffffff" opacity=".24"/>
    <rect x="1840" y="40" width="120" height="1260" rx="60" fill="#2fd0d8" opacity=".20"/>
    <rect x="2080" y="210" width="70" height="980" rx="35" fill="#2a73ff" opacity=".18"/>
  </g>
  <path d="M0 980 C 360 860, 620 1050, 960 940 S 1550 810, 1950 960 S 2380 1050, 2560 900" fill="none" stroke="#2fd0d8" stroke-width="3" stroke-opacity=".25"/>
  <polygon points="1280,430 1410,520 1360,680 1200,680 1150,520" fill="#ffffff" opacity=".44" stroke="#2fd0d8" stroke-opacity=".55" stroke-width="4" filter="url(#tide-glow)"/>
`));

save("backgrounds/hero-obsidian.svg", heroBackground("obsidian", palette.obsidian, `
  <rect width="2560" height="1440" fill="#0d1117" opacity=".94"/>
  <g opacity=".72" filter="url(#obsidian-glow)">
    <circle cx="920" cy="820" r="120" fill="#8b7dff" opacity=".55"/>
    <circle cx="1360" cy="660" r="96" fill="#5ddfb7" opacity=".48"/>
    <circle cx="1650" cy="930" r="132" fill="#ff8fab" opacity=".42"/>
  </g>
  <path d="M0 410 C 420 280, 770 500, 1210 380 S 1970 270, 2560 420" fill="none" stroke="#8b7dff" stroke-width="18" stroke-opacity=".16"/>
`));

save("decorative/gradient-swatch.svg", svg(1024, 512, `
  <rect width="1024" height="512" fill="url(#swatch-g)"/>
  <ellipse cx="260" cy="170" rx="360" ry="160" fill="#ffffff" opacity=".24" filter="url(#swatch-soft)"/>
  <ellipse cx="780" cy="370" rx="360" ry="150" fill="#ffba2e" opacity=".14" filter="url(#swatch-soft)"/>
`, defs("swatch", palette.aurora)));

save("decorative/mesh-tile.svg", svg(512, 512, `
  <rect width="512" height="512" fill="none"/>
  ${neuralLines(512, 512, "#7c5cff", 0.38)}
  <g fill="#7c5cff" opacity=".35">
    <circle cx="96" cy="122" r="4"/><circle cx="214" cy="230" r="3"/><circle cx="332" cy="174" r="4"/><circle cx="444" cy="300" r="3"/>
    <circle cx="48" cy="390" r="3"/><circle cx="260" cy="420" r="4"/><circle cx="490" cy="112" r="3"/>
  </g>
`, defs("mesh", palette.aurora)));

save("decorative/divider-wave.svg", svg(1920, 240, `
  <path d="M0 120 C 260 35, 460 205, 720 120 S 1180 35, 1440 120 S 1710 205, 1920 120" fill="none" stroke="url(#divider-g)" stroke-width="10" stroke-linecap="round"/>
  <g fill="#4fd1a8" opacity=".32"><circle cx="320" cy="80" r="5"/><circle cx="900" cy="160" r="4"/><circle cx="1510" cy="92" r="5"/></g>
`, defs("divider", palette.aurora)));

save("decorative/corner-tide.svg", svg(256, 256, `
  <path d="M18 198 A180 180 0 0 1 198 18" fill="none" stroke="#2a73ff" stroke-width="8" stroke-linecap="round"/>
  <path d="M18 146 A128 128 0 0 1 146 18" fill="none" stroke="#2fd0d8" stroke-width="5" stroke-linecap="round" opacity=".75"/>
  <path d="M18 94 A76 76 0 0 1 94 18" fill="none" stroke="#7aa8ff" stroke-width="4" stroke-linecap="round" opacity=".65"/>
  <circle cx="198" cy="18" r="8" fill="#2fd0d8" filter="url(#corner-glow)"/>
`, defs("corner", palette.tide)));

save("backgrounds/hero-orb.svg", svg(1024, 1024, `
  <circle cx="512" cy="512" r="348" fill="url(#orb-g)" opacity=".96" filter="url(#orb-glow)"/>
  <circle cx="398" cy="342" r="122" fill="#ffffff" opacity=".35" filter="url(#orb-soft)"/>
  <circle cx="512" cy="512" r="334" fill="none" stroke="#ffffff" stroke-width="5" stroke-opacity=".52"/>
  <g fill="none" stroke="#ffffff" stroke-opacity=".32" stroke-width="4">
    <path d="M330 520 C 420 420, 520 590, 660 455"/>
    <path d="M382 630 C 470 540, 560 720, 694 610"/>
    <path d="M410 398 C 500 510, 620 325, 705 435"/>
  </g>
  <g fill="#ffffff" opacity=".62"><circle cx="330" cy="520" r="8"/><circle cx="512" cy="512" r="7"/><circle cx="660" cy="455" r="8"/><circle cx="382" cy="630" r="7"/><circle cx="694" cy="610" r="7"/></g>
`, defs("orb", ["#7c5cff", "#4fd1a8", "#ff7da6", "#ffba2e"])));

function card(name, colors, body) {
  const [a, b, c, d] = colors;
  return svg(1200, 900, `
  <rect width="1200" height="900" rx="44" fill="${d}"/>
  <rect width="1200" height="900" fill="url(#${name}-grid)"/>
  <ellipse cx="300" cy="180" rx="340" ry="190" fill="${a}" opacity=".14" filter="url(#${name}-soft)"/>
  <ellipse cx="870" cy="690" rx="390" ry="220" fill="${b}" opacity=".15" filter="url(#${name}-soft)"/>
  ${body}
`, defs(name, colors));
}

save("protocols/adaptive.svg", card("adaptive", palette.aurora, `
  <g filter="url(#adaptive-glow)">
    <circle cx="600" cy="450" r="112" fill="url(#adaptive-g)" opacity=".92"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => {
      const angle = -Math.PI / 2 + i * Math.PI / 3;
      const x = 600 + Math.cos(angle) * 260;
      const y = 450 + Math.sin(angle) * 210;
      return `<line x1="600" y1="450" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#7c5cff" stroke-opacity=".25" stroke-width="5"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="44" fill="#ffffff" stroke="url(#adaptive-g)" stroke-width="8"/>`;
    }).join("")}
  </g>
`));

save("protocols/sprint.svg", card("sprint", palette.citrus, `
  <path d="M130 610 C 400 330, 690 470, 1060 220" fill="none" stroke="url(#sprint-g)" stroke-width="70" stroke-linecap="round" filter="url(#sprint-glow)"/>
  <path d="M240 655 C 470 455, 720 530, 1010 330" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="18" stroke-linecap="round"/>
  <g opacity=".42" fill="#5fc36a"><circle cx="320" cy="570" r="10"/><circle cx="230" cy="640" r="6"/><circle cx="470" cy="480" r="8"/><circle cx="790" cy="380" r="6"/></g>
`));

save("protocols/memory.svg", card("memory", palette.aurora, `
  <g filter="url(#memory-glow)">
    <path d="M380 530 C 310 350, 430 230, 600 250 C 790 270, 880 410, 780 560 C 700 680, 480 680, 380 530 Z" fill="#ffffff" opacity=".42" stroke="#4fd1a8" stroke-width="10"/>
    <path d="M450 520 C 420 430, 480 350, 585 350 C 710 350, 755 455, 700 540 C 645 625, 500 615, 450 520 Z" fill="none" stroke="#7c5cff" stroke-width="8" stroke-opacity=".42"/>
    ${Array.from({ length: 44 }, (_, i) => {
      const x = 410 + (i * 73) % 380;
      const y = 310 + (i * 47) % 310;
      return `<circle cx="${x}" cy="${y}" r="${3 + (i % 3)}" fill="#4fd1a8" opacity=".62"/>`;
    }).join("")}
  </g>
`));

save("protocols/executive.svg", card("executive", palette.aurora, `
  <g filter="url(#executive-glow)">
    <path d="M295 590 L905 590 Q945 590 945 550 L945 360 Q945 320 905 320 L295 320 Q255 320 255 360 L255 550 Q255 590 295 590 Z" fill="#ffffff" opacity=".44" stroke="#ff7da6" stroke-width="8"/>
    ${[[440, 455], [540, 390], [660, 390], [760, 455], [600, 515]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="34" fill="#ff7da6" opacity=".78"/><path d="M${x} ${y - 34} L600 190" stroke="#ff7da6" stroke-opacity=".32" stroke-width="5"/>`).join("")}
  </g>
`));

save("protocols/flow.svg", card("flow", palette.citrus, `
  <path d="M120 570 C 320 260, 520 280, 620 450 S 860 680, 1080 330" fill="none" stroke="url(#flow-g)" stroke-width="82" stroke-linecap="round" filter="url(#flow-glow)"/>
  <path d="M120 630 C 420 590, 770 650, 1080 585" fill="none" stroke="#ff7da6" stroke-width="5" stroke-opacity=".26"/>
`));

save("protocols/recovery.svg", card("recovery", palette.tide, `
  <g filter="url(#recovery-glow)">
    <path d="M600 250 C 710 390, 760 500, 600 600 C 440 500, 490 390, 600 250 Z" fill="url(#recovery-g)" opacity=".74"/>
    <ellipse cx="600" cy="650" rx="260" ry="56" fill="none" stroke="#2fd0d8" stroke-width="9" stroke-opacity=".44"/>
    <ellipse cx="600" cy="650" rx="390" ry="86" fill="none" stroke="#2fd0d8" stroke-width="5" stroke-opacity=".24"/>
  </g>
`));

function result(name, colors, body) {
  return svg(1500, 1000, `
  <rect width="1500" height="1000" rx="52" fill="${colors[3]}"/>
  <rect width="1500" height="1000" fill="url(#${name}-grid)"/>
  <ellipse cx="750" cy="500" rx="560" ry="360" fill="url(#${name}-r)" opacity=".75"/>
  ${body}
`, defs(name, colors));
}

save("results/good.svg", result("good", palette.aurora, `
  <circle cx="750" cy="440" r="132" fill="#ffdf75" opacity=".92" filter="url(#good-glow)"/>
  <path d="M350 690 C 520 610, 660 640, 750 695 C 840 640, 980 610, 1150 690" fill="none" stroke="#4fd1a8" stroke-width="18" stroke-linecap="round" opacity=".62"/>
  <g stroke="#ffdf75" stroke-width="8" stroke-linecap="round" opacity=".38">${Array.from({ length: 9 }, (_, i) => {
    const a = -60 + i * 15;
    const x = 750 + Math.cos(a * Math.PI / 180) * 230;
    const y = 440 + Math.sin(a * Math.PI / 180) * 230;
    return `<path d="M750 440 L${x.toFixed(1)} ${y.toFixed(1)}"/>`;
  }).join("")}</g>
`));

save("results/warn.svg", result("warn", palette.citrus, `
  <path d="M420 620 L1080 620" stroke="#ffba2e" stroke-width="18" stroke-linecap="round" opacity=".72"/>
  <path d="M750 380 L710 620 L790 620 Z" fill="#ffffff" opacity=".6" stroke="#ffba2e" stroke-width="8"/>
  <ellipse cx="560" cy="530" rx="150" ry="62" fill="#ffba2e" opacity=".28"/>
  <ellipse cx="940" cy="500" rx="150" ry="62" fill="#ffba2e" opacity=".18"/>
  <circle cx="750" cy="620" r="54" fill="#ffba2e" opacity=".72" filter="url(#warn-glow)"/>
`));

save("results/bad.svg", result("bad", palette.tide, `
  <path d="M760 250 C 690 350, 620 455, 690 610 C 780 565, 875 470, 760 250 Z" fill="#ffffff" opacity=".88" filter="url(#bad-glow)"/>
  <path d="M680 710 C 760 660, 855 665, 930 715" fill="none" stroke="#2fd0d8" stroke-width="10" stroke-linecap="round" opacity=".46"/>
  <ellipse cx="760" cy="742" rx="260" ry="44" fill="none" stroke="#2fd0d8" stroke-width="6" opacity=".25"/>
`));

save("results/pr.svg", result("pr", palette.aurora, `
  <polygon points="750,265 930,410 860,650 640,650 570,410" fill="url(#pr-g)" opacity=".92" filter="url(#pr-glow)"/>
  <g stroke-linecap="round">${Array.from({ length: 42 }, (_, i) => {
    const angle = (i * 137.5) * Math.PI / 180;
    const r1 = 160 + (i % 5) * 18;
    const r2 = 430 + (i % 7) * 30;
    const color = ["#7c5cff", "#4fd1a8", "#ff7da6", "#ffba2e"][i % 4];
    return `<path d="M${750 + Math.cos(angle) * r1} ${500 + Math.sin(angle) * r1} L${750 + Math.cos(angle) * r2} ${500 + Math.sin(angle) * r2}" stroke="${color}" stroke-width="${3 + (i % 4)}" opacity=".42"/>`;
  }).join("")}</g>
`));

function icon(name, color, body) {
  return svg(512, 512, `
  <g filter="url(#${name}-glow)" stroke="${color}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${body}
  </g>
`, defs(name, [color, "#ffffff", color, "#ffffff"]));
}

save("domains/memory.svg", icon("d-memory", "#4fd1a8", `<path d="M338 160 C210 120 130 205 166 310 C194 393 315 405 354 328 C388 262 305 231 266 274 C242 300 252 342 292 354"/><circle cx="292" cy="354" r="12" fill="#4fd1a8" stroke="none"/>`));
save("domains/wm.svg", icon("d-wm", "#ffba2e", `<rect x="126" y="126" width="260" height="260" rx="42"/><rect x="174" y="174" width="164" height="164" rx="28"/><rect x="218" y="218" width="76" height="76" rx="18"/><circle cx="256" cy="256" r="16" fill="#ffba2e" stroke="none"/>`));
save("domains/focus.svg", icon("d-focus", "#59a8ff", `<circle cx="256" cy="256" r="116"/><path d="M256 92v64M256 356v64M92 256h64M356 256h64"/><circle cx="256" cy="256" r="18" fill="#59a8ff" stroke="none"/>`));
save("domains/logic.svg", icon("d-logic", "#ff7da6", `<path d="M256 104 L392 344 H120 Z"/><circle cx="256" cy="104" r="32" fill="#fff" fill-opacity=".6"/><rect x="360" y="312" width="64" height="64" rx="18" fill="#fff" fill-opacity=".6"/><circle cx="120" cy="344" r="32" fill="#fff" fill-opacity=".6"/>`));
save("domains/speed.svg", icon("d-speed", "#7c5cff", `<path d="M288 70 L150 278 H256 L218 442 L374 220 H268 Z"/><path d="M332 330 H430M302 390 H392"/>`));
save("domains/spatial.svg", icon("d-spatial", "#ff6f5e", `<path d="M256 82 L396 162 V326 L256 430 L116 326 V162 Z"/><path d="M256 82 V246M116 162 L256 246 L396 162M256 246 V430"/><path d="M116 326 L256 246 L396 326" opacity=".55"/>`));

function drill(name, colors, body) {
  return svg(512, 512, `
  <rect width="512" height="512" fill="none"/>
  <ellipse cx="256" cy="276" rx="178" ry="170" fill="url(#${name}-r)" opacity=".6"/>
  <g filter="url(#${name}-glow)">${body}</g>
`, defs(name, colors));
}

save("drills/working-memory.svg", drill("working-memory", palette.aurora, `<path d="M146 270 C145 165, 268 126, 360 182 C470 250, 384 380, 250 348 C148 324, 157 228, 252 222 C339 217, 386 291, 320 330" fill="none" stroke="url(#working-memory-g)" stroke-width="38" stroke-linecap="round"/><circle cx="304" cy="222" r="22" fill="#ffba2e"/>`));
save("drills/spatial-grid.svg", drill("spatial-grid", palette.tide, `${Array.from({ length: 9 }, (_, i) => {
  const x = 150 + (i % 3) * 72;
  const y = 150 + Math.floor(i / 3) * 72;
  return `<rect x="${x}" y="${y}" width="58" height="58" rx="12" fill="${i === 4 ? "#2fd0d8" : "#ffffff"}" fill-opacity="${i === 4 ? ".82" : ".45"}" stroke="#2a73ff" stroke-opacity=".5"/>`;
}).join("")}`));
save("drills/focus-reticle.svg", drill("focus-reticle", palette.tide, `<circle cx="256" cy="256" r="132" fill="none" stroke="#2fd0d8" stroke-width="22"/><circle cx="256" cy="256" r="78" fill="none" stroke="#2a73ff" stroke-width="12" opacity=".65"/><path d="M256 78v72M256 362v72M78 256h72M362 256h72" stroke="#7aa8ff" stroke-width="18" stroke-linecap="round"/><circle cx="256" cy="256" r="24" fill="#2fd0d8"/>`));
save("drills/logic-prism.svg", drill("logic-prism", palette.aurora, `<polygon points="244,128 382,246 240,384 118,246" fill="#ffffff" fill-opacity=".52" stroke="#ff7da6" stroke-width="10"/><path d="M40 246 H118" stroke="#ffffff" stroke-width="14" stroke-linecap="round"/><path d="M382 246 L470 176M382 246 L470 246M382 246 L470 318" stroke-width="12" stroke-linecap="round" stroke="#4fd1a8"/><path d="M382 246 L470 176" stroke="#7c5cff" stroke-width="12" stroke-linecap="round"/><path d="M382 246 L470 318" stroke="#ff7da6" stroke-width="12" stroke-linecap="round"/>`));
save("drills/recall-crystal.svg", drill("recall-crystal", palette.aurora, `<polygon points="256,70 378,190 338,400 174,400 134,190" fill="url(#recall-crystal-g)" fill-opacity=".7" stroke="#4fd1a8" stroke-width="10"/><g fill="#ffffff" opacity=".75"><circle cx="230" cy="184" r="6"/><circle cx="286" cy="230" r="5"/><circle cx="214" cy="292" r="5"/><circle cx="302" cy="340" r="7"/><circle cx="268" cy="142" r="5"/></g><path d="M230 184 L286 230 L214 292 L302 340 M286 230 L268 142" stroke="#ffffff" stroke-opacity=".42" stroke-width="4"/>`));
save("drills/speed-wave.svg", drill("speed-wave", palette.citrus, `<path d="M66 286 C154 190, 246 328, 344 220 L312 156 L462 256 L312 356 L344 292 C240 386, 150 246, 66 342" fill="url(#speed-wave-g)" opacity=".88"/><path d="M70 370 H236M92 154 H248" stroke="#5fc36a" stroke-width="16" stroke-linecap="round" opacity=".42"/>`));

function banner(name, colors, body) {
  return svg(1500, 500, `
  <rect width="1500" height="500" rx="34" fill="${colors[3]}"/>
  <rect width="1500" height="500" fill="url(#${name}-grid)"/>
  <rect width="1500" height="500" fill="url(#${name}-g)" opacity=".12"/>
  ${body}
  <rect x="900" y="0" width="600" height="500" fill="url(#${name}-fade)"/>
`, `${defs(name, colors)}
<defs><linearGradient id="${name}-fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${colors[3]}" stop-opacity="0"/><stop offset="100%" stop-color="${colors[3]}" stop-opacity=".92"/></linearGradient></defs>`);
}

save("banners/attention.svg", banner("b-attention", palette.tide, `<path d="M70 280 L690 170" stroke="#2fd0d8" stroke-width="24" stroke-linecap="round" filter="url(#b-attention-glow)"/><circle cx="720" cy="164" r="54" fill="none" stroke="#2a73ff" stroke-width="12"/><circle cx="720" cy="164" r="12" fill="#2fd0d8"/>`));
save("banners/memory.svg", banner("b-memory", palette.aurora, `<g filter="url(#b-memory-glow)">${Array.from({ length: 7 }, (_, i) => `<polygon points="${130 + i * 78},220 ${168 + i * 78},160 ${210 + i * 78},220 ${184 + i * 78},305 ${146 + i * 78},305" fill="#4fd1a8" opacity="${.28 + i * .06}"/>`).join("")}</g>`));
save("banners/speed.svg", banner("b-speed", palette.citrus, `<path d="M100 270 C310 130, 520 375, 780 220" fill="none" stroke="#5fc36a" stroke-width="46" stroke-linecap="round" filter="url(#b-speed-glow)"/><g fill="#5fc36a" opacity=".38"><circle cx="240" cy="260" r="8"/><circle cx="460" cy="304" r="6"/><circle cx="630" cy="245" r="7"/></g>`));
save("banners/logic.svg", banner("b-logic", palette.aurora, `<g stroke="#ff7da6" stroke-width="12" fill="#ffffff" fill-opacity=".38" filter="url(#b-logic-glow)"><circle cx="220" cy="250" r="62"/><rect x="360" y="184" width="132" height="132" rx="26"/><polygon points="625,170 745,318 505,318"/></g><path d="M282 250 H360M492 250 H565" stroke="#ff7da6" stroke-width="10" opacity=".42"/>`));
save("banners/speech.svg", banner("b-speech", palette.aurora, `${Array.from({ length: 38 }, (_, i) => {
  const angle = (i * 137) * Math.PI / 180;
  const r = 20 + i * 7;
  const x = 420 + Math.cos(angle) * r;
  const y = 250 + Math.sin(angle) * r * .56;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${5 + (i % 4)}" fill="${["#7c5cff", "#4fd1a8", "#ff7da6"][i % 3]}" opacity=".56"/>`;
}).join("")}`));
save("banners/inhibition.svg", banner("b-inhibition", palette.citrus, `<circle cx="420" cy="230" r="62" fill="#ff6f5e" opacity=".72" filter="url(#b-inhibition-glow)"/><path d="M420 116 V344" stroke="#ff6f5e" stroke-width="6" opacity=".28"/><ellipse cx="420" cy="356" rx="170" ry="26" fill="#ff6f5e" opacity=".12"/>`));
save("banners/spatial.svg", banner("b-spatial", palette.tide, `<path d="M150 340 L310 170 H520 L400 300 H610 L450 390 H250 Z" fill="none" stroke="url(#b-spatial-g)" stroke-width="16" stroke-linejoin="round" filter="url(#b-spatial-glow)"/>`));

function badge(name, color, body) {
  return svg(512, 512, `
  <circle cx="256" cy="256" r="216" fill="#1b202a" opacity=".96"/>
  <circle cx="256" cy="256" r="204" fill="#ffffff" fill-opacity=".08" stroke="${color}" stroke-width="10" filter="url(#${name}-glow)"/>
  <g stroke="${color}" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">${body}</g>
`, defs(name, [color, "#ffffff", color, "#0d1117"]));
}

const badgeBodies = {
  "first-round": `<circle cx="256" cy="256" r="24" fill="#4fd1a8" stroke="none"/>`,
  "streak-3": `<path d="M210 292 C180 246 218 212 236 172 C252 215 292 230 278 292 Z"/><path d="M286 302 C268 262 305 235 316 202 C334 240 362 260 342 302 Z"/>`,
  "streak-7": `${Array.from({ length: 7 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 7;
    const x = 256 + Math.cos(a) * 92;
    const y = 256 + Math.sin(a) * 92;
    return `<path d="M${x - 16} ${y + 22} C${x - 34} ${y - 6} ${x - 6} ${y - 18} ${x} ${y - 44} C${x + 12} ${y - 12} ${x + 34} ${y + 0} ${x + 16} ${y + 22} Z"/>`;
  }).join("")}`,
  "streak-21": `<path d="M170 310 C250 160 354 174 360 292 C314 260 256 268 170 310 Z"/><path d="M168 314 C246 344 312 338 372 288"/>`,
  "streak-30": `<path d="M160 270 C210 130 360 160 370 270 C380 380 215 405 170 300"/><path d="M186 304 C250 255 314 245 362 272"/>`,
  "rounds-50": `<circle cx="256" cy="256" r="92"/><path d="M256 164 V110M256 402v-54M164 256h-54M402 256h-54"/>`,
  "rounds-200": `<circle cx="256" cy="256" r="122"/><circle cx="256" cy="256" r="62"/><path d="M256 134 V92M256 420v-42M134 256H92M420 256h-42"/>`,
  "index-60": `<path d="M144 310 A124 124 0 0 1 368 310"/><path d="M256 310 L308 238"/>`,
  "index-75": `<path d="M144 310 A124 124 0 0 1 368 310"/><path d="M256 310 L332 230"/>`,
  "index-80": `<path d="M144 310 A124 124 0 0 1 368 310"/><path d="M256 310 L344 220"/>`,
  "balanced-l3": `${Array.from({ length: 6 }, (_, i) => {
    const a = i * Math.PI / 3;
    const x = 256 + Math.cos(a) * 88;
    const y = 256 + Math.sin(a) * 88;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="28"/>`;
  }).join("")}<circle cx="256" cy="256" r="24" fill="#fff" fill-opacity=".4"/>`,
  "pr-machine": `<path d="M156 315 L186 198 L256 280 L326 198 L356 315 Z"/><path d="M192 168 L202 148M256 150 V126M320 168 L340 148"/>`,
  "metacog-20": `<path d="M148 280 C185 180 327 180 364 280"/><path d="M188 304 C226 342 286 342 324 304"/><circle cx="216" cy="256" r="12" fill="#fff" fill-opacity=".5"/><circle cx="296" cy="256" r="12" fill="#fff" fill-opacity=".5"/>`,
  "program-done": `<path d="M150 300 C210 170 312 170 370 300"/><path d="M174 300 H338"/><path d="M256 150 V356"/><circle cx="256" cy="356" r="18" fill="#fff" fill-opacity=".5"/>`,
  "night-owl": `<path d="M320 156 C238 178 206 278 270 348 C220 340 178 300 166 246 C144 146 244 94 320 156 Z"/>`,
  "early-bird": `<path d="M150 320 A106 106 0 0 1 362 320"/><path d="M256 212 V140M204 232 L162 180M308 232 L350 180"/>`,
};

Object.entries(badgeBodies).forEach(([name, body], i) => {
  const colors = ["#4fd1a8", "#ffba2e", "#7c5cff", "#ff7da6", "#2fd0d8", "#ff6f5e"];
  save(`badges/${name}.svg`, badge(`badge-${name}`, colors[i % colors.length], body));
});

function infographic(name, colors, body, w = 1200, h = 900) {
  return svg(w, h, `
  <rect width="${w}" height="${h}" rx="36" fill="${colors[3]}"/>
  <rect width="${w}" height="${h}" fill="url(#${name}-grid)"/>
  ${body}
`, defs(name, colors));
}

save("infographics/nback-loop.svg", infographic("ig-nback", palette.aurora, `
  ${Array.from({ length: 6 }, (_, i) => `<rect x="${120 + i * 160}" y="330" width="110" height="110" rx="24" fill="#ffffff" stroke="#7c5cff" stroke-opacity=".34" stroke-width="6"/><circle cx="${175 + i * 160}" cy="385" r="${18 + (i % 2) * 8}" fill="${["#7c5cff", "#4fd1a8", "#ff7da6"][i % 3]}" opacity=".58"/>`).join("")}
  <path d="M655 312 C610 190, 392 190, 350 312" fill="none" stroke="#4fd1a8" stroke-width="14" stroke-linecap="round" marker-end="url(#arrow)"/>
  <g fill="#4fd1a8"><circle cx="492" cy="222" r="12"/><circle cx="532" cy="222" r="12"/></g>
`, `${defs("ig-nback", palette.aurora)}<defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="8" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#4fd1a8"/></marker></defs>`));

save("infographics/stroop-conflict.svg", infographic("ig-stroop", palette.aurora, `
  <text x="600" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="128" font-weight="900" fill="#ff5d7d">BLUE</text>
  <path d="M560 385 C500 470, 420 515, 320 550" fill="none" stroke="#4fd1a8" stroke-width="14" stroke-linecap="round"/>
  <path d="M640 385 C735 445, 825 470, 930 460" fill="none" stroke="#ff8fab" stroke-opacity=".42" stroke-width="10" stroke-linecap="round"/>
  <rect x="260" y="570" width="120" height="70" rx="16" fill="#ff5d7d"/>
  <rect x="890" y="420" width="120" height="70" rx="16" fill="#2a73ff" opacity=".72"/>
`));

save("infographics/forgetting-curve.svg", infographic("ig-curve", palette.citrus, `
  <path d="M160 650 H1040M160 650 V180" stroke="#d8c8a4" stroke-width="6" stroke-linecap="round"/>
  <path d="M180 210 C300 410, 420 560, 590 610 S870 640, 1040 650" fill="none" stroke="#7c5cff" stroke-width="12" stroke-linecap="round"/>
  ${[320, 500, 700, 900].map((x, i) => `<path d="M${x} ${560 - i * 45} C${x + 30} ${430 - i * 55}, ${x + 70} ${400 - i * 45}, ${x + 120} ${520 - i * 45}" fill="none" stroke="#ffba2e" stroke-width="10" stroke-linecap="round"/><circle cx="${x}" cy="${560 - i * 45}" r="12" fill="#5fc36a"/>`).join("")}
`));

save("infographics/speed-accuracy.svg", infographic("ig-quadrant", palette.tide, `
  <rect x="140" y="140" width="460" height="460" fill="#4fd1a8" opacity=".14"/>
  <rect x="600" y="140" width="460" height="460" fill="#ffba2e" opacity=".16"/>
  <rect x="140" y="600" width="460" height="160" fill="#2fd0d8" opacity=".14"/>
  <rect x="600" y="600" width="460" height="160" fill="#ff7da6" opacity=".14"/>
  <path d="M140 600 H1060M600 140 V760" stroke="#2a73ff" stroke-opacity=".32" stroke-width="8"/>
  <polygon points="830,300 855,355 915,362 872,405 884,465 830,436 776,465 788,405 745,362 805,355" fill="#ffba2e" filter="url(#ig-quadrant-glow)"/>
  <circle cx="370" cy="320" r="28" fill="#4fd1a8"/><path d="M800 690 C850 635, 910 744, 970 680" stroke="#ff7da6" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M330 710 C360 668, 398 668, 428 710 C398 742, 360 742, 330 710 Z" fill="#2fd0d8" opacity=".7"/>
`, 1200, 1200));

save("infographics/journey-21.svg", infographic("ig-journey", palette.aurora, `
  <path d="M110 530 C260 290, 440 720, 590 470 S850 280, 1090 455" fill="none" stroke="url(#ig-journey-g)" stroke-width="24" stroke-linecap="round"/>
  ${Array.from({ length: 21 }, (_, i) => {
    const t = i / 20;
    const x = 110 + t * 980;
    const y = 510 + Math.sin(t * Math.PI * 5) * 95 - Math.sin(t * Math.PI) * 80;
    const milestone = [6, 13, 20].includes(i);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${milestone ? 18 : 10}" fill="${milestone ? "#ffba2e" : "#ffffff"}" stroke="#7c5cff" stroke-width="5"/>`;
  }).join("")}
`, 1600, 900));

function brain(name, color, accentBody) {
  save(`infographics/${name}.svg`, infographic(`brain-${name}`, palette.aurora, `
    <path d="M285 570 C170 510 162 335 268 250 C330 126 512 142 570 235 C710 248 792 360 754 486 C710 635 482 666 285 570 Z" fill="#ffffff" opacity=".62" stroke="#cdd6e4" stroke-width="8"/>
    ${accentBody(color)}
  `));
}

brain("hippocampus", "#4fd1a8", (c) => `<path d="M420 460 C475 400 575 425 600 500 C540 532 465 526 420 460 Z" fill="${c}" opacity=".72" filter="url(#brain-hippocampus-glow)"/>`);
brain("prefrontal", "#7c5cff", (c) => `<path d="M250 265 C310 160 430 155 472 230 C408 286 342 326 248 342 Z" fill="${c}" opacity=".66" filter="url(#brain-prefrontal-glow)"/><path d="M450 250 C520 310 570 360 630 420" stroke="#ffba2e" stroke-width="8" opacity=".52" fill="none"/>`);
brain("acc", "#ff7da6", (c) => `<path d="M390 330 C465 280 570 295 635 370" fill="none" stroke="${c}" stroke-width="24" stroke-linecap="round" filter="url(#brain-acc-glow)"/><path d="M306 306 L368 332M684 316 L632 366" stroke="${c}" stroke-width="8" stroke-linecap="round" opacity=".5"/>`);

console.log(`Generated v4 assets in ${outDir}`);
