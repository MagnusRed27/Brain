# 🧠 NeuroForge — Cognitive Training Lab

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-7c5cff?style=for-the-badge&logo=github)](https://magnusred27.github.io/Brain/)
[![License: MIT](https://img.shields.io/badge/License-MIT-34c997?style=for-the-badge)](./LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Vanilla%20ES%20Modules-Vite%205-ffba2e?style=for-the-badge&logo=vite)](https://vitejs.dev/)

**NeuroForge** — открытая адаптивная neuro-lab станция для тренировки памяти, внимания, исполнительного контроля, логики, скорости реакции и пространственного мышления. Работает **100% локально в браузере** — без аккаунтов, без серверов, без рекламы и трекеров.

> 🚀 **Открыть прямо в браузере:** [https://magnusred27.github.io/Brain/](https://magnusred27.github.io/Brain/)

---

## ✨ Ключевые возможности

- **23 научно-обоснованных тренажёра** по 6 когнитивным доменам:
  - **Рабочая память**: Dual N-back (с lures и метрикой $d'$), Audio N-back (TTS), Memory Grid, Backwards Span
  - **Внимание и контроль**: Stop Signal (SSRT staircase), Stroop Plus, Flanker, Focus Switch, Anti-Saccade, Schulte Table, Trail Making (A+B), Signal Scan
  - **Память и обучение**: Recall Vault на базе **FSRS-5** (интервальные повторения), Episodic Vault
  - **Логика и планирование**: Logic Forge, Tower of London, Rule Hunt (WCST-механика), Mental Math
  - **Скорость и чтение**: Reaction Rail, Digit-Symbol (DSST), RSVP Reading, Verbal Fluency
  - **Пространственное мышление**: Rotation Lab
- **Prism UI & 4 темы оформления** — мгновенное переключение в шапке между **Aurora** (иридесцентный рассвет), **Citrus** (солнечный заряд), **Tide** (кобальт-перл) и **Obsidian** (тёмная тема для вечера).
- **Zen Focus Arena** — во время раунда интерфейс плавно приглушает лишние панели, оставляя чистую сцену для концентрации (`F` — полноэкранный режим).
- **Жизненные сценарии и 21-дневная программа** — быстрый старт под задачу (*Спринт*, *Адаптив*, *Memory Lab*, *Executive*, *Flow*, *Recovery*), адаптивный подбор сложности, Streak Shield и Daily Challenge.
- **Resonator WebAudio Engine** — процедурный ambient с sidechain ducking, бинауральные ритмы, дыхательный гайд 4-7-8, FFT-визуализация нейросцены.
- **Глубокая аналитика и нарратив** — Memory Lane, корреляция сна и точности (Pearson $r$), 365-дневный календарь активности, хронотип по часам суток, метакогнитивная калибровка и генератор Share Card (PNG) при новом рекорде.
- **Быстрый запуск (`⌘K` / `Ctrl+K`)** — мгновенный поиск любого тренажёра, протокола или режима.
- **PWA-ready** — можно установить на телефон или рабочий стол и тренироваться оффлайн.

---

## 🚀 Локальный запуск

```bash
git clone https://github.com/MagnusRed27/Brain.git
cd Brain
npm install
npm run dev
```

Сборка production-версии:

```bash
npm run build
npm run preview
```

---

## 🧪 Научная позиция

NeuroForge **не обещает «+30 IQ за неделю»**. Когнитивные тренировки дают наиболее надёжный эффект в целевых и близких задачах, а также через дисциплину внимания, активное вспоминание (testing effect) и интервальные повторения (FSRS-5). В интерфейсе честно указаны уровни доказательности, а сложность удерживается на границе возможностей.

---

## 📁 Архитектура

- `index.html` — оболочка приложения (top-strip, sidebar, bottom-nav, quick-launch, PWA manifest)
- `src/main.js` — роутинг, lifecycle раундов, Zen Focus, горячие клавиши, store
- `src/ui.js` — экраны (`Center`, `Drills`, `Progress`, `Records`, `Stim Lab`, `Settings`, `Onboarding`) и SVG-визуализации
- `src/drills.js`, `src/drills.extra.js`, `src/drills.lab.js` — 23 когнитивных модуля
- `src/fsrs.js`, `src/progression.js`, `src/analysis.js`, `src/protocols.js` — адаптивность, FSRS-5 и аналитика
- `src/audio/` — WebAudio-движок (`engine`, `music`, `binaural`, `noise`, `haptics`)
- `styles.css` — дизайн-система, 4 темы, стекломорфизм и адаптивная вёрстка

---

## 🤝 Участие (Contributing)

Pull requests, идеи новых когнитивных модулей и улучшения дизайна приветствуются!  
Открывайте Issue или отправляйте PR.

## 📄 Лицензия

Распространяется под лицензией **MIT** — см. файл [LICENSE](./LICENSE).
