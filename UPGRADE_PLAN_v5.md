# NeuroForge v5 «Synthesis» — мастер-план апгрейда

> Синтез четырёх экспертных аудитов (cognitive neuroscience PhD, senior game
> designer, UX/UI designer Linear-уровня, data-viz специалист FT/Pudding).
> Все рекомендации приоритизированы P0/P1/P2.

---

## 🧠 Cognitive Neuroscience — рестор научной валидности

### Методологические критические фиксы

| Drill | Проблема | Фикс | Файл |
|---|---|---|---|
| N-back | Нет lures → измеряет familiarity, не WM update; ceiling за 2 недели | 60% non-targets / 25% targets / 15% lures (n±1); d' = z(hit) − z(FA) | `drills.js:nbackItem` |
| Stop Signal | Фиксированный 28% stop → нет валидного SSRT | 1-up/1-down staircase SSD (+50/-50 ms), таргет 50% inhibition, SSRT = mean-go-RT − mean-SSD | `drills.lab.js:runStopSignal` |
| Schulte | Random позиции → измеряет visual search, не peripheral attention | 3 fixed seeds (A/B/C), ротация Пн/Ср/Пт | `drills.lab.js:runSchulte` |
| Recall | Ad-hoc «слабо/почти/чисто» без spaced-repetition | FSRS-5 scheduler (4 ratings: Again/Hard/Good/Easy) | `drills.js:runRecall` |
| Trail | Только B, нет baseline | Trail A (numbers only) + Trail B + дельта = executive marker | `drills.lab.js:runTrail` |
| Anti-Saccade | Без fixation epoch, без corrective saccade flag | 800-1200ms fixation jitter + log first mouse direction | `drills.lab.js:runAntiSaccade` |
| Stroop | Mixed block (45/55 правил) → не считается congruency RT delta | Single-rule blocks, compute (incongruent − congruent) RT | `drills.js:runFocus` |
| DSST | Без 90s стандартного окна → нет норм-сравнения | Fixed 90s; report items-completed | `drills.lab.js:runDigitSymbol` |
| Verbal Fluency | Только raw count | Cluster/switch decomposition (Troyer 1997) | `drills.lab.js:runVerbalFluency` |
| Tower of London | Planning time + execution time слиты | Pre-move latency vs execution отдельно | `drills.lab.js:runTowerOfLondon` |

### Замена `adaptDifficulty()` — IRT + staircase

Текущий +1/−1 на основе accuracy — психометрически устарел.

```js
// 3-down-1-up staircase per session targeting 79.4% (Levitt 1971):
if (3 consecutive correct) difficulty += step;
if (1 incorrect)            difficulty -= step;
step *= 0.7 after each reversal (min 0.05);
threshold = mean of last 6 reversals;

// IRT cross-session (2-PL):
P(correct | θ, b, a) = 1 / (1 + exp(-a(θ - b)));
θ_{t+1} = θ_t + K * (correct_t - P̂_t) * a_item;
K = 0.4 / sqrt(1 + n/50);
```

### Новые drills (наука требует)

1. **Episodic Vault** — Rey-AVLT 15-word list, encoding/retention/retrieval scores
2. **Intention Bank** — prospective memory с rule "при ◇ нажми F"
3. **Source Lock** — source memory: items от 2 «голосов»
4. **Rule Hunt** — Wisconsin Card Sort, unannounced rule shifts
5. **Bottleneck** — PRP dual-task interference

### Честные UI-метки

Подписать `evidence: limited far transfer` на: Dual N-back (Owen 2010, Melby-Lervåg 2016), Schulte (no RCT), Stroop training (g=0.16), RSVP speed reading (Rayner 2016). НЕ убирать — но не врать.

---

## 🎮 Game Design — retention & engagement

### Onboarding (P0)
Заменить 3-слайдовый текст на **zero-friction first round**:
1. (0-15s) Reaction drill сразу, без выбора → instant gratification
2. (15-30s) Identity-pick: «Что плывёт? Память / Внимание / Скорость»
3. (30-50s) Goal anchor: «Через 21 день хочу: думать яснее / сфокусироваться / помнить»
4. (50-75s) В Center

### Progression curve (P0)
- **Mastery tiers**: Bronze (L3 + 70% × 5) → Silver (L5 + 80% × 8) → Gold (L7 + 85% × 10) → Platinum (L10 + 90% × 15). Каждый tier разблокирует визуальный вариант drill.
- **Prestige после L10**: «Ascend» → reset to L7 с золотым ободком и **+15% XP forever** на этот drill.
- **21-day Battle Pass**: per-day visible rewards (theme/skin/soundpack) на 21-day timeline в Center.
- **Daily XP cap soft-curve**: после 80 XP/день — XP × 0.4 (защита от burnout, повышает habit).

### Daily hooks (P0)
- **Streak Shield видимым**: currently silent. «У тебя 1 щит. Earned за 7 дней. Защитит при пропуске.»
- **Daily Challenge streak escalation**: 3 подряд = +75%, 7 = +100% + badge.
- **PWA Push notifications**: lastActive>18h && streak>2 → «Серия 5 дней. Сегодня — день внимания».
- **Variable reward — Crit Round 7%**: x2 XP, золотой flash, dedicated sfx. Skinner variable-ratio.

### Juice & Feel (P0)
- **Layered hit feedback**: sfx + 4-8px screen shake + chip-particle от точки клика + floating «+XP» цифра. Сейчас только border-flash.
- **Level-up overlay**: full-screen «L4 → L5» с pulse-glow, 1.2s hold, sfx-stinger, next-level preview text. Сейчас просто число меняется.
- **Streak bump on app open**: number-tick от N-1 до N с overshoot, screen bloom.
- **Miss differentiated**: near-miss (жёлтый, мягко) vs hard miss (красный, резко).
- **Combo visualization**: при combo>2.0 — постоянное pulse-aura вокруг arena, >2.7 — particle trail.
- **PR replaced**: 60 confetti spans → 15 больших золотых + screen-flash + sustained chord + «PERSONAL BEST» typewriter.

### Past-self comparison (P0)
- **Memory Lane**: route с «год назад / 30 дней / при старте» side-by-side. По словам GD — самое impactful single addition для D30 retention.
- **Anonymous percentile bars**: из norm-данных (Deary 2001 reaction, Wechsler DSST, etc.) — identity-anchor без сервера.

---

## 🎨 UX/UI — clarity & hierarchy

### Главные friction points

1. **Center page = 9 равных карточек** → flat hierarchy. Hero + protocols → объединить в одну «Запуск» 2-column. Aside в collapsible «context rail».
2. **Drills page = 22 карточки 220px** → перевести в **dense 2-column list 96px** (sprite-left, content-right, level/time/CTA-right). Filter chips с count: `все 22 · память 4 · РП 3…`. Все умещается на один экран ноутбука.
3. **Drill execution side panel** = L1/точность/сессий — всё уже в HUD/intro. Удалить, отдать 220-280px drill-канвасу.
4. **Result panel** = 15 info-зон competing. Сделать `${percent}%` 4rem + label + status-pill = visual anchor; остальные 5 метрик — secondary row 0.78rem. analysis-grid → `<details>`.
5. **Wellbeing card** = 3 ползунка + emoji + tip = 4 линии в ambient-card. Collapse в один-line strip: `😴 7ч · 🙂 4/5 · ⚡ ●●●●○` + tap-to-expand.

### Mobile (≤640px) баги
- **Bottom-nav без Records route** — пользователь mobile не может зайти в `#/records`
- **4 metric-pill + search overflow** на 360px → carousel или скрытие combo/focus <480
- **drill-card-chips коллизия со sprite** на iPhone SE
- **`:hover` only states (49 правил)** — на touch застревают. Обернуть в `@media (hover: hover)`. Сейчас 0 использований.
- **hero-orb 88px + text проходит под** — потерян padding-right

### Accessibility
- Obsidian `--muted #8b95ad` на `surface rgba(22,28,40,.72)` ≈ 4.4:1 → fails AA на small text 0.62-0.66rem
- `:focus-visible` outline rectangular на rounded cards → `outline-offset: 4px; border-radius: inherit`
- Schulte/scan/trail SVG нет `tabindex`/`role="button"` — keyboard inaccessible
- photic-consent без `role="dialog" aria-modal="true"` + focus trap
- **5 always-on infinite animations** на Center (meshDrift / dotPulse×2 / indicatorPulse / spriteFloat×22 / heroFloat / spriteSpin) → screen never stops, читается тревожно. IntersectionObserver pause для off-screen sprites.

### Cohesion проблемы
- **6 разных border-radius** для "card-like" surfaces (6/10/14/22/28 + хардкод 18/24/22/12/8)
- **5 разных elevation/shadow** систем параллельно
- **`font-weight: 900`** на всём — надо reserve для hero numerics
- **5 разных pill-стилей** (session-chip/chip/dc-badge/science-badge/protocol-suggested)
- **6 разных sprite-frame** размеров (38/72/80/92/140 + hero-orb)

---

## 📊 Data Viz — мотивация через нарратив

### Карточки данных (priority order)

| # | Карточка | History | Render |
|---|---|---|---|
| **A** | **Memory Lane** per-drill timeline (multi-line SVG 6 цветов) | 30/60/90 дней toggle | `drawDrillTimelineSvg()` |
| **C** | **Sleep × Accuracy scatter** + trend line + Pearson r | 30 дней | `drawSleepCorrelationSvg()` |
| **F** | **365-day streak calendar** (GitHub-style 53×7) | 365 | extend `compute8WeekHeatmap` |
| **D** | **Domain growth waterfall** baseline → current | вся история | extend `renderProgramProgressCard` |
| **E** | **Time-of-day radial** chronotype 24h | вся история | `drawChronotypeSvg()` |
| **G** | **RT distribution histogram** this vs prev month overlay | 60 дней | per-drill view |
| **H** | **Error-type stacked bar** агрегированный | 30 дней | extend `renderErrorTypeChips` |
| **B** | **Drill × Day heatmap matrix** | 8 недель | extend heatmap |

### Narrative engine (`analysis.js`)

```js
generateLongFormInsights(state) → [
  weekly_improvement_ttest(),  // |z|>1.5 → "Stroop вырос на 12%, z=2.1, не шум"
  plateau_detection(),         // |slope|<0.005, n>10 → "застрял на L4 12 раундов"
  correlation_flag(),          // r(sleep, acc)>0.4 → "сильная связь, 7+ часов — твой коридор"
  chronotype(),                // best vs worst hour, diff>15% → "утром на 18% точнее"
  population_context(),        // RT percentile vs Deary 2010 → "top 30% для 25-34"
  streak_velocity(),           // forecast → "при текущем темпе индекс 75 через 11 дней"
]
```

### Per-drill detailed view `#/drills/:mode`
Hero+sprite+sparkline / 4 PR tiles / Memory Lane filtered / RT distribution / error breakdown / baseline comparison / recommended next focus / calibration mini.

### Share card на PR (P0)
Canvas 1080×1080 в `renderResult` при `analysis.newAccBest`. Drill + accuracy + sprite + date → download PNG.

### Что свернуть/убрать
- **Cognitive Load score** (формула handwavy без калибровки) → в `<details>`
- **z-Acc/z-RT числа** в result → фраза «необычно для тебя» при |z|>1
- **`samples` counter** → служебный шум
- **Recent log 12 строк** дубль с heatmap → 5 строк или sparkline
- **Achievement progress bars при <10%** → только икoнка без бара
- **Цвет-only signaling** в domain bars → + иконки/паттерны для colorblind

---

## 🎯 Execution priority — что делаю прямо сейчас

### Batch A (immediate, this session)
1. ✅ Master plan written
2. **Bottom-nav: добавить Records** (UX critical bug)
3. **N-back: добавить lures + d'** (NS#1 — low LOC, high science impact)
4. **Stop Signal: SSRT staircase** (NS#2)
5. **Visible Streak Shield** UI (GD#3)
6. **Layered hit feedback** (GD juice — sfx + shake + +XP float)
7. **Level-up overlay** (GD juice moment)
8. **Hide Cognitive Load to `<details>`** (DataViz clean-up)
9. **Wrap `:hover` in `@media (hover: hover)`** (a11y mobile)

### Batch B (next session)
- Memory Lane per-drill timeline
- Sleep × Accuracy scatter with Pearson
- Narrative engine 6 templates
- Mastery tiers + Prestige
- Wellbeing one-line strip
- Result panel hero number redesign
- FSRS-5 for Recall

### Batch C (after)
- 365-day calendar
- Time-of-day radial
- Per-drill detailed view `#/drills/:mode`
- Onboarding zero-friction rewrite
- 5 новых научных drills (Episodic Vault, Intention Bank, etc.)
- Share card on PR
- Schulte fixed seeds, Trail A+B, Stroop block design
- IRT/staircase replacement of adaptDifficulty
