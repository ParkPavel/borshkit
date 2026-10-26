---
bk-type: index
related: ["../README.md", "../concepts/knowledge.md"]
---
# Граф документации

Эту страницу Borshkit написал сам: собрал свою базу знаний по этому репозиторию и выгрузил её. Команда — `node scripts/docs-graph.mjs`.

Всего в графе: модулей 61, тестов 35, документов 116, связей 1891.

- [`borshkit.sql`](borshkit.sql) — весь граф одним SQL-скриптом. Загрузить: `sqlite3 graph.db < borshkit.sql`, потом спрашивать, например, `SELECT * FROM undocumented_modules;`.
- Ниже — карта документов: стрелка значит «ссылается на». GitHub рисует её сам (Mermaid).

```mermaid
flowchart LR
  n0["AGENTS.md"]
  n1["CONTRIBUTING.md"]
  n2["README.md"]
  n3["SECURITY.md"]
  n4["Документация Borshkit"]
  n5["Текущая архитектура"]
  n6["Приёмка по целям"]
  n7["Доказательства и устаревание"]
  n8["Исполнители, пулы и автопилот"]
  n9["Словарь"]
  n10["База знаний: заметки, связи, SQL"]
  n11["Приватность и настройки"]
  n12["Исследования: источники и цитаты"]
  n13["Роли и навыки"]
  n14["Пространство и Git простыми словами"]
  n15["Borshkit как профессиональная команда"]
  n16["Ответ на независимый аудит 0.10.1"]
  n17["Аудит надёжности и мини-спринт — 24 октября 2026"]
  n18["25 октября: работа в основной среде и контроль запуска"]
  n19["Аудит и программа модернизации — 2026-10-08"]
  n20["Контроль модернизации — 2026-10-09"]
  n21["Аудит оформления и достоверности — 22 октября 2026"]
  n22["Черновик обсуждения: резервная копия истории пространства"]
  n23["Передать работу другому харнесу"]
  n24["Copilot, Roo и Cline: нативный запуск"]
  n25["Быстрый старт: первая задача"]
  n26["Настройки и дополнительная команда"]
  n27["Работа команды, телефон и перенос"]
  n28["Сайт и документация как единый продукт"]
  n29["Руководство: от цели до результата"]
  n30["Одна рабочая среда: Claude, Codex и терминал"]
  n31["Рецепт: из чего сварен Borshkit"]
  n32["Все команды"]
  n33["Формат задачи (contract.json)"]
  n34["Details und Grenzen — 0.13"]
  n35["Details and limitations — 0.13"]
  n36["Détails et limites — 0.13"]
  n37["상세 설명과 한계 — 0.13"]
  n38["Подробности и ограничения — 0.13"]
  n39["詳細資料與限制 — 0.13"]
  n40["Команда, оценки ролей и ресурсы"]
  n41["Borshkit 0.13.1 — диагностика запуска и достоверная оценка"]
  n42["Borshkit 0.14.0 — промежуточный выпуск"]
  n43["Как выпускается Borshkit"]
  n44["Статус продукта — 0.14.0 Pre-release"]
  n45["Проверка выпуска 0.13.0"]
  n46["Проверка модернизации — 20 октября 2026"]
  n47["Библиотека: навыки и проверенные ссылки"]
  n0 --> n10
  n0 --> n31
  n0 --> n47
  n1 --> n0
  n1 --> n2
  n1 --> n10
  n1 --> n31
  n2 --> n3
  n2 --> n30
  n3 --> n27
  n4 --> n5
  n4 --> n6
  n4 --> n7
  n4 --> n8
  n4 --> n9
  n4 --> n10
  n4 --> n11
  n4 --> n12
  n4 --> n13
  n4 --> n14
  n4 --> n15
  n4 --> n16
  n4 --> n17
  n4 --> n19
  n4 --> n21
  n4 --> n22
  n4 --> n23
  n4 --> n24
  n4 --> n25
  n4 --> n26
  n4 --> n27
  n4 --> n29
  n4 --> n30
  n4 --> n31
  n4 --> n32
  n4 --> n33
  n4 --> n40
  n4 --> n41
  n4 --> n42
  n4 --> n43
  n4 --> n44
  n4 --> n45
  n4 --> n47
  n5 --> n18
  n5 --> n23
  n5 --> n24
  n5 --> n30
  n5 --> n32
  n5 --> n44
  n6 --> n7
  n6 --> n12
  n6 --> n13
  n6 --> n16
  n6 --> n33
  n7 --> n6
  n7 --> n9
  n8 --> n11
  n8 --> n13
  n8 --> n14
  n8 --> n17
  n9 --> n4
  n9 --> n6
  n9 --> n7
  n9 --> n8
  n9 --> n10
  n9 --> n12
  n9 --> n13
  n9 --> n14
  n9 --> n25
  n9 --> n33
  n10 --> n9
  n10 --> n14
  n11 --> n3
  n11 --> n8
  n11 --> n14
  n12 --> n6
  n12 --> n11
  n13 --> n6
  n13 --> n8
  n13 --> n11
  n13 --> n31
  n13 --> n47
  n14 --> n8
  n14 --> n10
  n14 --> n11
  n14 --> n22
  n15 --> n4
  n15 --> n8
  n15 --> n13
  n15 --> n19
  n15 --> n20
  n15 --> n24
  n15 --> n26
  n15 --> n27
  n15 --> n40
  n16 --> n0
  n16 --> n3
  n16 --> n6
  n16 --> n7
  n16 --> n11
  n17 --> n7
  n17 --> n8
  n17 --> n16
  n17 --> n27
  n17 --> n41
  n18 --> n5
  n18 --> n17
  n18 --> n30
  n18 --> n44
  n19 --> n15
  n19 --> n16
  n19 --> n20
  n19 --> n26
  n19 --> n27
  n19 --> n40
  n20 --> n15
  n20 --> n19
  n20 --> n26
  n20 --> n27
  n21 --> n4
  n21 --> n5
  n21 --> n24
  n21 --> n25
  n21 --> n45
  n22 --> n14
  n23 --> n5
  n23 --> n29
  n23 --> n32
  n23 --> n44
  n24 --> n5
  n24 --> n23
  n24 --> n43
  n24 --> n44
  n25 --> n6
  n25 --> n8
  n25 --> n9
  n25 --> n26
  n25 --> n30
  n25 --> n32
  n26 --> n15
  n26 --> n19
  n26 --> n25
  n26 --> n27
  n26 --> n30
  n26 --> n32
  n26 --> n40
  n27 --> n15
  n27 --> n20
  n27 --> n24
  n27 --> n26
  n27 --> n32
  n27 --> n40
  n28 --> n4
  n28 --> n25
  n28 --> n31
  n28 --> n43
  n28 --> n47
  n29 --> n23
  n29 --> n25
  n29 --> n27
  n29 --> n30
  n29 --> n32
  n30 --> n5
  n30 --> n18
  n30 --> n26
  n30 --> n32
  n30 --> n42
  n31 --> n47
  n32 --> n9
  n32 --> n24
  n32 --> n25
  n32 --> n26
  n32 --> n27
  n32 --> n30
  n32 --> n33
  n32 --> n40
  n33 --> n6
  n33 --> n12
  n33 --> n32
  n34 --> n0
  n34 --> n1
  n34 --> n3
  n34 --> n4
  n34 --> n5
  n34 --> n15
  n34 --> n19
  n34 --> n20
  n34 --> n24
  n34 --> n25
  n34 --> n26
  n34 --> n27
  n34 --> n29
  n34 --> n31
  n34 --> n32
  n34 --> n40
  n34 --> n44
  n34 --> n47
  n35 --> n0
  n35 --> n1
  n35 --> n3
  n35 --> n4
  n35 --> n5
  n35 --> n15
  n35 --> n19
  n35 --> n20
  n35 --> n24
  n35 --> n25
  n35 --> n26
  n35 --> n27
  n35 --> n29
  n35 --> n31
  n35 --> n32
  n35 --> n40
  n35 --> n44
  n35 --> n47
  n36 --> n0
  n36 --> n1
  n36 --> n3
  n36 --> n4
  n36 --> n5
  n36 --> n15
  n36 --> n19
  n36 --> n20
  n36 --> n24
  n36 --> n25
  n36 --> n26
  n36 --> n27
  n36 --> n29
  n36 --> n31
  n36 --> n32
  n36 --> n40
  n36 --> n44
  n36 --> n47
  n37 --> n0
  n37 --> n1
  n37 --> n3
  n37 --> n4
  n37 --> n5
  n37 --> n15
  n37 --> n19
  n37 --> n20
  n37 --> n24
  n37 --> n25
  n37 --> n26
  n37 --> n27
  n37 --> n29
  n37 --> n31
  n37 --> n32
  n37 --> n40
  n37 --> n44
  n37 --> n47
  n38 --> n0
  n38 --> n1
  n38 --> n3
  n38 --> n4
  n38 --> n5
  n38 --> n15
  n38 --> n19
  n38 --> n20
  n38 --> n24
  n38 --> n25
  n38 --> n26
  n38 --> n27
  n38 --> n29
  n38 --> n31
  n38 --> n32
  n38 --> n40
  n38 --> n44
  n38 --> n47
  n39 --> n0
  n39 --> n1
  n39 --> n3
  n39 --> n4
  n39 --> n5
  n39 --> n15
  n39 --> n19
  n39 --> n20
  n39 --> n24
  n39 --> n25
  n39 --> n26
  n39 --> n27
  n39 --> n29
  n39 --> n31
  n39 --> n32
  n39 --> n40
  n39 --> n44
  n39 --> n47
  n40 --> n15
  n40 --> n25
  n40 --> n27
  n40 --> n32
  n41 --> n8
  n41 --> n17
  n41 --> n43
  n41 --> n44
  n42 --> n5
  n42 --> n25
  n42 --> n30
  n42 --> n41
  n42 --> n43
  n42 --> n44
  n43 --> n5
  n43 --> n23
  n43 --> n41
  n43 --> n42
  n43 --> n44
  n44 --> n5
  n44 --> n18
  n44 --> n23
  n44 --> n24
  n44 --> n30
  n44 --> n41
  n44 --> n43
  n45 --> n23
  n45 --> n24
  n45 --> n43
  n45 --> n44
  n46 --> n5
  n46 --> n25
  n46 --> n44
  n47 --> n13
  n47 --> n31
```

## Документы и код, который они описывают

| Документ | Вид | Описывает код |
|---|---|---|
| [AGENTS.md](../../AGENTS.md) | — | — |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | — | `scripts/diagrams.mjs` |
| [README.md](../../README.md) | — | — |
| [SECURITY.md](../../SECURITY.md) | — | — |
| [Документация Borshkit](../README.md) | карта | — |
| [Текущая архитектура](../architecture.md) | понятие | `core/accept.mjs`, `core/adapters.mjs`, `core/context-pack.mjs`, `core/contract.mjs`, `core/gitshell.mjs`, `core/handoff.mjs`, `core/integrations.mjs`, `core/jobs.mjs`, `core/kb.mjs`, `core/portable.mjs`, `core/process.mjs`, `core/roles.mjs`, `core/runtime-control.mjs`, `core/snapshot.mjs`, `core/workspace.mjs` |
| [Приёмка по целям](../concepts/acceptance.md) | понятие | `core/accept.mjs`, `core/contract.mjs`, `core/eval.mjs`, `core/gitshell.mjs` |
| [Доказательства и устаревание](../concepts/evidence.md) | понятие | `core/accept.mjs`, `core/snapshot.mjs` |
| [Исполнители, пулы и автопилот](../concepts/executors.md) | понятие | `core/adapters.mjs`, `core/dispatch.mjs`, `core/executors.mjs`, `core/jobs.mjs`, `core/questions.mjs` |
| [Словарь](../concepts/glossary.md) | справка | — |
| [База знаний: заметки, связи, SQL](../concepts/knowledge.md) | понятие | `core/kb.mjs` |
| [Приватность и настройки](../concepts/privacy.md) | понятие | `core/config.mjs`, `core/experiment.mjs`, `core/privacy.mjs`, `core/secrets.mjs` |
| [Исследования: источники и цитаты](../concepts/research.md) | понятие | `core/citations.mjs`, `core/materials.mjs` |
| [Роли и навыки](../concepts/roles-and-skills.md) | понятие | `core/roles.mjs` |
| [Пространство и Git простыми словами](../concepts/space.md) | понятие | `core/gitshell.mjs`, `core/hooks.mjs`, `core/space.mjs`, `core/status.mjs` |
| [Borshkit как профессиональная команда](../concepts/team-workspace.md) | понятие | `core/resources.mjs`, `core/team.mjs` |
| [Ответ на независимый аудит 0.10.1](../discussions/audit-2026-10-07.md) | — | `core/accept.mjs`, `core/adapters.mjs`, `core/eval.mjs`, `core/gitshell.mjs`, `core/jobs.mjs`, `core/snapshot.mjs` |
| [Аудит надёжности и мини-спринт — 24 октября 2026](../discussions/audit-2026-10-24.md) | — | `core/accept.mjs`, `core/adapters.mjs`, `core/assessments.mjs`, `core/eval.mjs`, `core/executors.mjs`, `core/process.mjs` |
| [25 октября: работа в основной среде и контроль запуска](../discussions/host-first-architecture-2026-10-25.md) | — | `core/integrations.mjs`, `core/jobs.mjs`, `core/operations.mjs`, `core/process.mjs`, `core/runtime-control.mjs`, `core/workspace-ui.mjs`, `core/workspace.mjs` |
| [Аудит и программа модернизации — 2026-10-08](../discussions/modernization-2026-10-08.md) | справка | — |
| [Контроль модернизации — 2026-10-09](../discussions/modernization-2026-10-09.md) | справка | — |
| [Аудит оформления и достоверности — 22 октября 2026](../discussions/professionalism-2026-10-22.md) | справка | `core/contract.mjs`, `core/hooks.mjs`, `docs/site.js` |
| [Черновик обсуждения: резервная копия истории пространства](../discussions/space-history-backup.md) | — | — |
| [Передать работу другому харнесу](../guide/handoff.md) | руководство | `core/integrations.mjs`, `core/kb.mjs`, `core/portable.mjs`, `core/questions.mjs` |
| [Copilot, Roo и Cline: нативный запуск](../guide/native-integrations.md) | руководство | `core/native.mjs`, `integrations/vscode/extension.cjs`, `integrations/vscode/native.cjs` |
| [Быстрый старт: первая задача](../guide/quickstart.md) | руководство | — |
| [Настройки и дополнительная команда](../guide/setup.md) | руководство | `bin/borshkit.mjs`, `core/setup.mjs` |
| [Работа команды, телефон и перенос](../guide/team-operations.md) | руководство | `bin/monitor-worker.mjs`, `core/adapters.mjs`, `core/approval-server.mjs`, `core/approvals.mjs`, `core/assessments.mjs`, `core/integrations.mjs`, `core/monitor.mjs`, `core/operations.mjs`, `core/portable.mjs` |
| [Сайт и документация как единый продукт](../guide/website.md) | руководство | `docs/reader.js`, `scripts/check-site.mjs`, `scripts/site.mjs` |
| [Руководство: от цели до результата](../guide/workflow.md) | руководство | — |
| [Одна рабочая среда: Claude, Codex и терминал](../guide/workspace.md) | руководство | — |
| [Рецепт: из чего сварен Borshkit](../ingredients.md) | справка | — |
| [Все команды](../reference/commands.md) | справка | `bin/borshkit.mjs` |
| [Формат задачи (contract.json)](../reference/contract.md) | справка | `core/contract.mjs` |
| [Details und Grenzen — 0.13](../reference/overview.de.md) | справка | — |
| [Details and limitations — 0.13](../reference/overview.en.md) | справка | — |
| [Détails et limites — 0.13](../reference/overview.fr.md) | справка | — |
| [상세 설명과 한계 — 0.13](../reference/overview.ko.md) | справка | — |
| [Подробности и ограничения — 0.13](../reference/overview.ru.md) | справка | — |
| [詳細資料與限制 — 0.13](../reference/overview.zh-TW.md) | справка | — |
| [Команда, оценки ролей и ресурсы](../reference/team-resources.md) | справка | `core/config.mjs`, `core/executors.mjs`, `core/resources.mjs`, `core/roles.mjs`, `core/team.mjs` |
| [Borshkit 0.13.1 — диагностика запуска и достоверная оценка](../release-0.13.1.md) | руководство | `core/adapters.mjs`, `core/executors.mjs`, `core/privacy.mjs`, `core/process.mjs` |
| [Borshkit 0.14.0 — промежуточный выпуск](../release-0.14.0.md) | руководство | — |
| [Как выпускается Borshkit](../release.md) | руководство | `scripts/provenance.mjs`, `scripts/verify-release.mjs` |
| [Статус продукта — 0.14.0 Pre-release](../roadmap.md) | — | — |
| [Проверка выпуска 0.13.0](../verification-0.13.md) | справка | `scripts/live-check.mjs`, `scripts/verify-release.mjs` |
| [Проверка модернизации — 20 октября 2026](../verification-2026-10-20.md) | справка | — |
| [Библиотека: навыки и проверенные ссылки](../../library/README.md) | справка | — |

## Модули ядра без документации

- `core/code-map.mjs`
