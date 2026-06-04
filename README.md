# NeuroForge v3 «Lumen»

Адаптивная premium neuro-lab станция для тренировки памяти, внимания, логики, скорости и пространственного мышления. v3 — полный редизайн: светлая ультрасовременная эстетика, профессиональный WebAudio-движок, новые drills, голосовой ввод и опциональная биометрика.

## Что нового в v3

- **Три светлые темы** — Aurora (иридесцентный рассвет), Citrus (солнечный заряд), Tide (кобальт-перл). Переключаются мгновенно в настройках.
- **Resonator audio engine** — master bus с компрессором/лимитером, convolution reverb (room / hall / cathedral), biquad-фильтр усталости, polyphony до 12 голосов, FM-синтез, AnalyserNode для FFT-визуализации, procedural ambient музыка с sidechain ducking, метроном и дыхательный гайд 4-7-8.
- **Audio-reactive neuro-scene** — частицы и ядро пульсируют по 4 частотным полосам, O(n) через spatial hash, своё настроение под каждую тему.
- **Новые тренировки**: Reaction Rail (go/no-go), Trail Making (1-А-2-Б…), Stroop Plus, Audio N-back (TTS-голос). Итого 11 модулей.
- **Голосовой Recall** — кнопка-микрофон для ответа голосом (ru-RU SpeechRecognition).
- **Биометрика (опционально)** — пульс через камеру (rPPG), всё локально, никаких сетевых вызовов.
- **Архитектура** — EventBus, реактивный store, AbortController на drills, throttled persistence, миграция v1→v2→v3.
- **Адаптив** на 1280 / 1024 / 780 px + onboarding-тур.

## Запуск

```bash
npm.cmd install
npm.cmd run dev
```

После запуска откройте локальный адрес Vite, например `http://127.0.0.1:61481/`.

## Что внутри

- Vite + vanilla ES modules без React и Phaser.
- Миграция прогресса `neuroforge:v1` -> `neuroforge:v2`.
- Маршрут из семи раундов: Dual Stream, Memory Grid, Focus Switch, Logic Forge, Recall Vault, Signal Scan, Rotation Lab.
- Адаптивная сложность: уровень растет при высокой точности и снижается, если задача стала слишком шумной.
- Карта навыков: память, рабочая память, внимание, логика, скорость, пространственные образы.
- Локальное сохранение прогресса в `localStorage`.
- Карточки активного воспроизведения с интервальным планированием.
- Живая canvas-нейросцена, WebP-ассеты, мягкий Web Audio/haptics слой и настройки.

## Исследовательская логика

Тренажер не обещает "плюс IQ". В исследованиях когнитивные тренировки чаще дают сильный прирост в похожих задачах и слабый или спорный дальний перенос. Поэтому NeuroForge смешивает разные форматы, держит сложность близко к границе возможностей и отдельно тренирует активное воспроизведение.

Использованные принципы:

- активное вспоминание и обратная связь для долговременной памяти;
- интервальные повторения вместо плотной зубрежки;
- адаптивная сложность для удержания рабочей нагрузки;
- вариативность задач, чтобы не сводить прогресс к одному мини-игровому навыку;
- короткие глубокие сессии и легкие дни повторения.

## Источники

- Lampit, Hallock, Valenzuela, 2014, PLOS Medicine: computerized cognitive training in healthy older adults showed a small significant overall effect, with effects depending on domain and design. https://pubmed.ncbi.nlm.nih.gov/25405755/
- Melby-Lervag, Redick, Hulme, 2016: working-memory training showed reliable intermediate transfer but no convincing far transfer to broader real-world cognitive skills. https://discovery.ucl.ac.uk/id/eprint/10120081/
- Zhong et al., 2025, Acta Psychologica: visuospatial n-back produced training gains, but no evidence of near or far transfer in a preregistered double-blind RCT. https://www.sciencedirect.com/science/article/pii/S0001691825008121
- Karpicke and Roediger, 2008, Science: repeated retrieval produced a large positive effect on delayed recall compared with repeated studying. https://brucehayes.org/Teaching/papers/2008_Roediger_Karpicke_Science.pdf
- Dunlosky et al., 2013: practice testing and distributed practice received high utility ratings across learners and tasks. https://gwern.net/doc/psychology/spaced-repetition/2013-dunlosky.pdf
- Trumble et al., 2023: distributed practice and retrieval practice improved academic outcomes in a systematic review of health professions education. https://link.springer.com/article/10.1007/s10459-023-10274-3
- Dale et al., 2023, PLOS One: video-game cognitive interventions showed moderate gains, while publication bias and gameplay factors mattered. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0285925
