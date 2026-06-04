# NeuroForge v4 — ImageGen Prompt Pack

> Готовые промпты для **ChatGPT ImageGen 2 / DALL·E 3**, чтобы догенерировать
> арты под Командный центр, экраны результатов, инфографику и декоративный слой.
>
> Каждый промпт — самодостаточный. Копируй блок целиком в чат с ImageGen, без
> дополнительных пояснений.

---

## ⚙ Universal Style Guide (всегда включай в промпт)

```text
Style: premium neuro-lab, modern cognitive-wellness tech, scientific-elegant.
Light, clean, airy composition (NOT cyberpunk, NOT dark sci-fi cliché).
Materials: frosted glass, brushed aluminium, holographic membrane, soft glow.
Lighting: soft volumetric, rim-light from upper-left, ambient bloom 4-8%.
Palette options (pick ONE per asset, match the theme it serves):
  · Aurora theme:  iridescent violet #7c5cff, mint #4fd1a8, blush #ff7da6 on white #f6f7ff
  · Citrus theme:  sun #ffba2e, leaf #5fc36a, coral #ff6f5e on cream #fffdf6
  · Tide theme:    cobalt #2a73ff, aqua #2fd0d8, periwinkle #7aa8ff on pearl #f4f7fb
  · Obsidian theme: muted-violet #8b7dff, mint-green #5ddfb7, rose #ff8fab on near-black #0d1117
No people, no faces, no copyrighted characters, no watermark, no text labels,
no random latin/cyrillic letters as decor (they distort).
```

### Naming convention (куда положить файлы)

```
public/assets/v4-concept/
├── backgrounds/                # hero/page backdrops, 1920×1080 png/webp
├── protocols/                  # 6 protocol illustrations, 800×600 png/webp
├── results/                    # 4 status arts (good/warn/bad/pr), 1200×800 png
├── domains/                    # 6 domain icons (memory/wm/focus/logic/speed/spatial), 512×512 png
├── badges/                     # achievement badges, 512×512 png with transparent bg
├── infographics/               # n-back loop, Stroop conflict, etc., 1200×900 png
├── decorative/                 # mesh patterns, dividers, frames
└── drills/                     # alternative drill sprites if нужно обновить, 512×512
```

Затем в `src/config.js` обнови пути в `ASSETS.sprites` и в `index.html` фон-картинки
(если делаешь крупный hero).

---

# A · Command Center — фон и hero-арт

## A1. Hero backdrop — Aurora theme

```text
[Universal Style Guide]
Aspect ratio: 16:9, resolution 2560×1440 for retina.
Subject: an abstract dawn over an empty neural lab. A soft iridescent mesh
floats horizontally — like rippling silk in violet-mint-blush gradient. In the
background, very faint blueprint lines of synaptic arborisations, barely visible.
Lower third: a calm reflective pool surface with subtle wave patterns.
Mood: morning readiness, optimistic, anticipatory.
Lighting: backlight from upper-right (warm rose), ambient cyan from below.
Composition: leave a soft empty zone in the centre-left for UI text overlay.
Materials: holographic film, frosted acrylic, no metal.
Avoid: dark colours, sci-fi panels, characters, text, watermarks.
Save as PNG, full-bleed, no border.
```

## A2. Hero backdrop — Citrus theme

```text
[Universal Style Guide — Citrus palette]
Aspect ratio: 16:9.
Subject: a sun-bleached interior of a wellness lab at golden hour. Long warm
shadows on a cream wall, geometric leaf-green plant silhouettes on the side,
a soft yellow halo glow in the upper-right corner. A few floating
out-of-focus dust motes catching sunlight.
Mood: energising, fresh-morning-coffee feeling.
Composition: large empty area in upper-left for headline and CTA.
Lighting: warm direct sun + cool indirect blue from windows.
Materials: matte cream surfaces, brushed brass accents.
Avoid: text labels, characters, photographic faces.
```

## A3. Hero backdrop — Tide theme

```text
[Universal Style Guide — Tide palette]
Aspect ratio: 16:9.
Subject: a clean cobalt laboratory at twilight. Vertical glass columns refract
soft cobalt and aqua light. A faint topographic line pattern washes
across the lower half (like an oceanographic sonar map). One single floating
crystal-cell shape mid-frame, refracting light into a tiny rainbow.
Mood: deep focus, deliberate, pro-tool.
Composition: centred crystal with negative space all around.
Lighting: cool top-down + warm rim from behind the crystal.
Materials: optical glass, polished cobalt enamel, no warmth.
Avoid: cliché lab equipment, doctors, faces.
```

## A4. Hero backdrop — Obsidian theme (dark)

```text
[Universal Style Guide — Obsidian palette]
Aspect ratio: 16:9.
Subject: a contemplative dark-mode neuro chamber at night. Three soft floating
orbs of muted violet, mint-green and rose hover in a deep near-black space.
Each orb has a soft outer glow but no harsh neon. Faint hexagonal lattice
in 6% opacity covers the entire background. A single thin horizontal light
beam at 30% from the top, simulating an aurora curtain.
Mood: late-evening focus, quiet intensity, contemplative.
Lighting: only the three orbs and the aurora beam — no key light.
Composition: orbs in a triangular arrangement, centred lower-mid.
Materials: matte deep black, holographic film, soft volumetric fog.
Avoid: harsh neon, dystopian cyberpunk, characters, text.
```

## A5. Neuro-orb hero element (3D iridescent sphere)

```text
[Universal Style Guide]
Aspect ratio: 1:1, resolution 1024×1024, TRANSPARENT background (PNG with alpha).
Subject: a single hovering sphere ~80% of canvas. The sphere has a
mirror-thin holographic surface with shifting iridescent colours — violet, mint,
rose, gold — flowing like soft oil-on-water. Inside the sphere, a faint glow
of synaptic network is visible, very subtly. A thin chromatic-aberration ring
on the outline.
Lighting: studio softbox from upper-left + violet rim light from right.
NO base, NO shadow under the sphere — must look truly floating with transparent bg.
Composition: dead-centred, perfect circle, edge-bleed acceptable.
Style: premium product render, e.g. Apple-keynote level.
Avoid: ground shadow, reflection plane, text, watermark.
```

## A6. Decorative mesh pattern (tileable)

```text
[Universal Style Guide — Aurora palette]
Aspect ratio: 1:1, 512×512, TILEABLE seamless.
Subject: a flowing organic mesh pattern, like neural dendrites woven into a
silk fabric. Use 3-4 line thicknesses for hierarchy, very faint nodes at
intersections. Background: nearly transparent (let it sit at 4-6% opacity
when applied).
Composition: pattern repeats perfectly at edges — generate as seamless tile.
Style: line-art, vector-friendly, monochrome violet with subtle gradient.
Avoid: photographic, 3D depth, characters.
```

---

# B · Protocol Cards (6 разных артов)

Каждый протокол получает свой illustrative card 800×600 для использования
как фон/иллюстрация в `.protocol-card`.

## B1. «Адаптив» (Adaptive · violet #7c5cff)

```text
[Universal Style Guide — Aurora palette, violet dominant]
Aspect ratio: 4:3, resolution 1200×900.
Subject: a balanced cognitive scale — abstract not literal — six glowing
nodes around a central pulsing orb, each node a different cool colour.
The whole composition feels balanced and self-tuning.
Mood: calm intelligence, adaptive control.
Composition: centred orb with six radial nodes, soft connecting lines.
Style: data-visualisation meets premium product render.
Avoid: gears, traditional scales of justice, text, faces.
```

## B2. «Спринт» (Sprint · leaf-green #5fc36a)

```text
[Universal Style Guide — Citrus palette, leaf-green dominant]
Aspect ratio: 4:3.
Subject: a single streak of luminous green energy slicing diagonally across
a soft cream backdrop, with subtle motion-blur particles trailing. At the
trailing edge, a faint silhouette of a stopwatch face dissolving into pure
light. Feels like 8 minutes of pure speed.
Mood: kinetic, focused, sharp.
Style: motion-art poster, premium fitness-app feel.
Avoid: literal running figures, harsh neon, text.
```

## B3. «Memory Lab» (mint #4fd1a8)

```text
[Universal Style Guide — Aurora palette, mint dominant]
Aspect ratio: 4:3.
Subject: a translucent crystal lattice resembling a stylised hippocampus
shape — abstract enough not to be anatomical, but evocative. Inside the
lattice, hundreds of tiny memory-bead points pulse gently. The whole
structure floats on a soft cream gradient.
Mood: archival, consolidating, gentle warmth.
Style: scientific illustration meets jewellery render.
Avoid: literal brain anatomy diagrams, text, medical sterility.
```

## B4. «Executive» (coral-pink #ff7da6)

```text
[Universal Style Guide — Aurora palette, coral-pink dominant]
Aspect ratio: 4:3.
Subject: an abstract control-room console rendered as a single translucent
panel with five glowing controls arranged in a precise hexagonal pattern.
Each control gives off a thin coral beam of light upward, converging at a
point above the panel.
Mood: decisive, controlled, executive function.
Style: minimal product render, like a stylised audio mixer.
Avoid: realistic dashboards, photographic UI, text.
```

## B5. «Flow» (amber #ffba2e)

```text
[Universal Style Guide — Citrus palette, amber dominant]
Aspect ratio: 4:3.
Subject: a smooth golden ribbon flowing in a long S-curve across the frame,
catching sun at three points. The curve rises in the centre (peak challenge),
softens at both ends (warmup, cooldown). Below the ribbon, a faint horizon
line of cream and rose.
Mood: deep flow state, challenge-skill balance, Csikszentmihalyi.
Style: abstract architectural ribbon, like a Zaha Hadid sketch.
Avoid: literal river, water-photo, text.
```

## B6. «Recovery» (aqua-cyan #2fd0d8)

```text
[Universal Style Guide — Tide palette, aqua dominant]
Aspect ratio: 4:3.
Subject: a single droplet of aqua-coloured light suspended above a perfectly
still circular pool. Concentric ripples emanate softly. The whole scene is
rendered in cool soft pastels, like a meditation app loading screen.
Mood: restorative, calm, parasympathetic relaxation.
Style: zen-minimalist product render.
Avoid: text, harsh edges, blue medical clinical look.
```

---

# C · Result Panel — статусные арты

Используются как hero-illustration в `.result-panel` под состояние.

## C1. Result «good» / Прорыв / Усиление

```text
[Universal Style Guide — Aurora palette]
Aspect ratio: 3:2, resolution 1500×1000.
Subject: a sunrise over a calm horizon, viewed through a soft circular
window. The sun is rendered as a perfect mint-gold orb. Subtle light rays
fan out in 60-degree spread. A thin laurel-like wreath of pale leaves
arcs across the lower third — celebratory but minimal.
Mood: achievement, calm satisfaction, NOT cheesy fanfare.
Style: premium card-art, like Apple Fitness award screen.
Avoid: confetti, trophies, banners, text, gold-medal cliché.
```

## C2. Result «warn» / Зона тренировки / Аккуратно

```text
[Universal Style Guide — Citrus palette, amber dominant]
Aspect ratio: 3:2.
Subject: a balanced pair of weights on a translucent fulcrum, gently
tilted but not falling. The amber halo around the fulcrum suggests calibration
in progress. Background: soft cream with a faint blueprint grid at 5% opacity.
Mood: working through the difficulty zone, productive tension.
Style: scientific elegance, like a Cambridge Brain Sciences card.
Avoid: literal scale of justice, text, warning signs, sirens.
```

## C3. Result «bad» / Перенастройка / Восстановление

```text
[Universal Style Guide — Tide palette, soft aqua + dusty rose]
Aspect ratio: 3:2.
Subject: a single small white feather drifting downward on a calm aqua-blue
gradient background. Below the feather, gentle ripples in still water suggest
where it will land. Composition feels permissive, NOT punitive.
Mood: supportive recovery, gentle reset — explicitly NOT shameful.
Style: meditation-app illustration.
Avoid: dark colours, red warnings, frowning faces, text, error icons.
```

## C4. Result «personal record» (celebration)

```text
[Universal Style Guide — Aurora palette, all three accents]
Aspect ratio: 3:2, resolution 1500×1000.
Subject: a single starburst of iridescent particles exploding outward from a
crystalline central polygon. Particles trail in violet, mint, blush and gold.
The central polygon has a thin "PR" engraved without using letters — just
abstract notch.
Mood: celebratory, premium, "earned" not "given".
Style: high-end game achievement art, like Destiny exotic unlock.
Avoid: literal trophies, gold cups, text, character mascots.
```

---

# D · Domain Icons (6 шт. для радара навыков)

512×512 PNG with transparent background. Used in:
- `src/config.js` `DOMAINS` array
- progress page domain bars
- skill-radar legend

Style guide for all 6:
```text
Consistent set, 1:1, 512×512, TRANSPARENT background.
Style: rounded thick-stroke vector with soft inner-gradient fill.
Stroke weight: ~16px relative to canvas.
Single visual metaphor per icon — no text, no labels.
Each icon uses one accent colour from the palette (defined per icon below).
Outer glow: soft 8px aura matching the accent.
Pictographic, not literal — work at 24×24 px and at 512×512.
```

## D1. Memory (icon · mint #4fd1a8)

```text
[domain-icon style guide, mint]
Subject: a stylised hippocampus-shaped spiral — abstract enough to be a
graphic icon, not a medical diagram. Single curl going inward like a snail
shell with a small central node.
```

## D2. Working Memory / WM (icon · amber #ffba2e)

```text
[domain-icon style guide, amber]
Subject: three nested squares with the innermost holding a glowing dot.
Suggests holding items in active store.
```

## D3. Focus / Attention (icon · cyan #59a8ff)

```text
[domain-icon style guide, cyan]
Subject: a precise crosshair with four short tick marks, central solid dot.
Looks like a sniper reticle or microscope aim.
```

## D4. Logic (icon · coral #ff7da6)

```text
[domain-icon style guide, coral)
Subject: three small geometric shapes (triangle, circle, square) connected
by thin lines forming an inference triangle.
```

## D5. Speed (icon · violet #7c5cff)

```text
[domain-icon style guide, violet]
Subject: a lightning bolt that resolves into two parallel motion lines at the
end — suggests acceleration not just impact.
```

## D6. Spatial (icon · orange-red #ff6f5e)

```text
[domain-icon style guide, orange-red]
Subject: an isometric cube outline rotating mid-frame, with one face slightly
transparent revealing inner volume.
```

---

# E · Drill Sprite Refresh (опционально — улучшить существующие 6)

Существующие спрайты `working-memory`, `spatial-grid`, `focus-reticle`,
`logic-prism`, `recall-crystal`, `speed-wave` — dark sci-fi, не идеальны для
светлых тем. Если хочешь сделать набор под Aurora/Citrus/Tide:

## E-template — для каждого drill

```text
[Universal Style Guide]
Aspect ratio: 1:1, 512×512, TRANSPARENT background.
Style: premium product-render icon, like Apple Memoji-style depth but
abstract (no faces). Soft volumetric lighting from upper-left.
Inner glow in accent colour, outer aura at 30% radius.
Camera: slight 15° tilt, isometric-ish but not strict.
The icon should read at 64px while being beautiful at 512px.
```

Конкретные subjects (вставь в template вместо «Subject:»):

- **n-back / anback / working memory** — `a translucent ribbon-loop forming a Möbius strip, with a single bead sliding along it`
- **grid / bspan / schulte / rotate** — `a floating Rubik-style cube made of glass cubes, one cube glowing`
- **focus / stroop / scan / flanker / antisaccade** — `a target reticle composed of three concentric rings of glass, central dot pulsing`
- **logic / math** — `a geometric prism splitting a single light ray into three coloured beams`
- **recall / rsvp / vfluency** — `a crystalline shard with embedded constellation of light points (the memory)`
- **reaction / stopsig / trail** — `a sleek arrow-shaped pulse with a soft motion-trail behind it`

---

# F · Daily Challenge banners (7 тем)

Каждая тема дня — отдельный banner 1200×400 (с зоной для текста справа).
Используется как фон карточки `.daily-challenge-card`.

```text
[Universal Style Guide]
Aspect ratio: 3:1, resolution 1500×500.
Format: PNG, fade-to-transparent on the right 40% of the canvas so UI text
overlays cleanly.
Style: premium editorial banner, modern wellness magazine.
```

| Тема | Subject |
|---|---|
| **День внимания** | `a single laser beam slicing through soft cyan fog, hitting a precise target on the left edge` |
| **День памяти** | `a quiet archive of glowing translucent crystals on velvet, mint-gold lighting` |
| **День скорости** | `a long horizontal motion-streak in lime-green, particles dispersing` |
| **День логики** | `interlocking geometric shapes solving themselves into a clean pattern, coral lighting` |
| **День речи и мысли** | `a flock of small luminous letters dispersing from a central glow into a constellation` |
| **День ингибиции** | `a single drop of red light held in mid-air, perfectly still, defying gravity` |
| **День образов** | `a 3D wireframe of an impossible geometry (Penrose stairs aesthetic), iridescent edges` |

---

# G · Achievement Badges (10 шт.)

512×512 transparent PNG, used in `.achievement` chips on Progress page.

## Style guide for badges

```text
1:1, 512×512, TRANSPARENT background.
Style: pin-style badge or medallion, premium leather-and-metal hybrid.
Each badge has a thin glowing rim in the accent colour and a single
symbolic element in the centre.
NO text, NO numerals on the badge itself.
Diameter 90% of canvas — leave 5% padding for outer glow.
```

| ID | Subject |
|---|---|
| `first-round` | `a single small spark inside a circular medallion` |
| `streak-3` | `three small flame petals arranged in a triangle, warm orange glow` |
| `streak-7` | `seven small flame petals arranged in a circular crown` |
| `streak-30` | `a phoenix feather curled into a perfect circle, gold-violet` |
| `index-60` | `a precise needle pointing at 60 on a half-arc gauge` |
| `index-80` | `same gauge needle past 80, with soft gold accent` |
| `balanced-l3` | `six small petals (one per domain) arranged radially around a central node` |
| `pr-machine` | `a stylised crown of three small stars` |
| `night-owl` | `a crescent moon with a small synaptic node inside` |
| `early-bird` | `a stylised sunrise rendered as three rays from a central point` |

---

# H · Infographics — обучающие схемы

Используются в `.science-panel` или раскрывающихся how-to блоках.
1200×900 PNG, light background, scientific clean.

## H1. N-back loop diagram

```text
[Universal Style Guide]
Aspect ratio: 4:3, 1600×1200.
Subject: a horizontal timeline of 6 cells, each containing a stylised letter
glyph (use shape glyphs, NOT real letters to avoid text-corruption).
Above cell N, a curved arrow points back to cell N−2, labeled with a small
"2" pictogram. The arrow is the focal point.
Caption space at the bottom (do NOT add caption — leave blank for UI).
Style: clean infographic, like a Scientific American sidebar.
Mood: explanatory, calm.
Avoid: real letters, text labels, watermarks.
```

## H2. Stroop conflict diagram

```text
[Universal Style Guide]
Aspect ratio: 4:3.
Subject: the word "BLUE" rendered in red ink, large in the centre. Two
arrows emerge: one pointing down to a red colour-swatch (correct), one
pointing right to a blue colour-swatch (wrong). The "correct" arrow is
mint-green and bold; the "wrong" arrow is soft rose and dimmed.
Style: stark didactic, like a textbook page.
Avoid: caricatures, characters, lots of text.
```

## H3. Spaced-repetition forgetting curve

```text
[Universal Style Guide]
Aspect ratio: 4:3.
Subject: an Ebbinghaus forgetting curve — exponential decay from 100% to
30% over time. Overlaid: 4 small upward pulses where reviews happen,
each pulse slightly higher than the last, with the curve resetting from
that point. Axes are minimal cream lines without numerical labels.
Style: scientific paper figure, but premium-rendered.
```

## H4. Speed-accuracy tradeoff quadrant

```text
[Universal Style Guide]
Aspect ratio: 1:1, 1200×1200.
Subject: 2×2 quadrant chart — axes "speed" (horizontal) and "accuracy"
(vertical). Each of four quadrants has a unique soft pastel fill. In the
top-right (fast+precise) a small gold star. In the top-left (slow+precise)
a small mint dot. Bottom-right (fast+sloppy) coral wave. Bottom-left
(slow+sloppy) faint blue droplet. NO text labels in image.
Style: data-vis poster.
```

## H5. 21-day program journey map

```text
[Universal Style Guide]
Aspect ratio: 16:9.
Subject: a horizontal winding path with 21 small node-dots, snaking from
left to right. Path passes through three visual zones: "foundation" (days
1-7, soft mint), "build" (days 8-14, amber), "consolidate" (days 15-21,
violet). Tiny milestones at days 7, 14, 21 marked with small crown glyphs.
Style: premium fitness-tracker journey map.
Avoid: text labels, day numbers as text (use abstract markers).
```

---

# I · Brain Anatomy mini-illustrations (для science notes)

Лёгкие иллюстративные диаграммы анатомии, не учебники медицины.

## I1. Hippocampus highlight

```text
[Universal Style Guide]
Aspect ratio: 4:3, 1200×900.
Subject: a stylised sagittal brain outline in soft pearl-white, with the
hippocampus highlighted in mint glow — abstract teardrop shape inside the
medial temporal area. The rest of the brain is rendered as flat soft shape,
NOT anatomical detail.
Style: ABC of neuroscience illustration, premium, magazine-clean.
```

## I2. Prefrontal cortex highlight

```text
[Universal Style Guide]
Aspect ratio: 4:3.
Subject: same stylised sagittal brain, this time the front third
highlighted in soft violet with a few thin gold connection-lines reaching
backward — suggests executive control.
Style: matched to I1 for set consistency.
```

## I3. Anterior cingulate cortex (ACC) highlight

```text
[Universal Style Guide]
Aspect ratio: 4:3.
Subject: same stylised sagittal brain, ACC highlighted as a slim curving
ribbon along the medial wall, glowing soft coral. Tiny conflict-arrows
pointing toward it from two directions.
Style: matched to I1-I2.
```

---

# J · Decorative dividers, frames, accents

## J1. Section divider — wave (Aurora)

```text
[Universal Style Guide — Aurora]
Aspect ratio: 8:1, resolution 1920×240.
Subject: a soft single sine-wave horizontal line in violet-mint gradient,
with very faint particles dotting the line. Transparent everywhere else.
Style: editorial divider.
PNG with alpha.
```

## J2. Corner ornament — Tide

```text
[Universal Style Guide — Tide]
Aspect ratio: 1:1, 256×256, transparent.
Subject: a thin cobalt geometric corner ornament — three nested arcs from
the top-left corner, ending in a single small node. Looks like an
architectural drawing detail.
```

## J3. Iridescent gradient swatch (used as cards background)

```text
Subject: a perfectly smooth iridescent gradient swatch, 1024×512, with
violet-mint-blush flowing like silk in soft horizontal bands. No noise, no
texture — just clean gradient. PNG.
```

---

# K · Quick batch — попроси одним промптом сразу 4 элемента

Используй когда нужен согласованный сет:

```text
Generate a set of 4 images as a 2×2 grid sheet (single PNG), each cell 800×800,
sharing a unified palette and style.
[Universal Style Guide — Aurora palette]
Cells:
  1. (top-left) the protocol illustration for "Adaptive" — balanced six-node neural orb
  2. (top-right) the protocol illustration for "Sprint" — single green energy streak
  3. (bottom-left) the protocol illustration for "Memory" — translucent crystal lattice
  4. (bottom-right) the protocol illustration for "Recovery" — single aqua droplet on still pool
Each cell renders the subject on its own soft pastel background, no text labels,
no separators between cells (just adjacent images). Output as one large PNG
1600×1600, easy to slice into 4 files.
```

---

# Workflow рекомендации

1. **Один запрос = одна картинка.** Промпт = блок целиком из этого файла.
2. После генерации сохрани в `public/assets/v4-concept/<категория>/`
   под именем, совпадающим с `id` (например, `protocols/adaptive.png`).
3. Если фон должен быть прозрачным — **в промпте дублируй** «TRANSPARENT
   background, PNG with alpha» — ImageGen часто это игнорирует с первого раза.
4. Перегенерируй 2-3 раза, выбери лучший вариант. Style consistency
   достигается через цитирование универсального style guide дословно.
5. Для светлых тем избегай fill-background; для Obsidian — наоборот, можно
   делать с тёмным фоном слитно.
6. После сохранения добавь пути в `src/config.js` либо в новый
   `src/assets-v4.js` модуль и используй через `getModeVisual(mode)` или
   `getProtocolArt(protocolId)`.
7. Для масштабируемых элементов (иконки, дивайдеры) подумай об SVG —
   попроси ImageGen «as crisp vector-style with minimal noise», затем
   используй [Vector Magic](https://vectormagic.com/) или manual SVG trace.
