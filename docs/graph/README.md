---
bk-type: index
related: ["../README.md", "../concepts/knowledge.md"]
---
# Граф документации

Эту страницу Borshkit написал сам: собрал свою базу знаний по этому репозиторию и выгрузил её. Команда — `node scripts/docs-graph.mjs`.

Всего в графе: модулей 59, тестов 33, документов 109, связей 1664.

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
  n17["Аудит и программа модернизации — 2026-10-08"]
  n18["Контроль модернизации — 2026-10-09"]
  n19["Аудит оформления и достоверности — 22 октября 2026"]
  n20["Черновик обсуждения: резервная копия истории пространства"]
  n21["Передать работу другому харнесу"]
  n22["Copilot, Roo и Cline: нативный запуск"]
  n23["Быстрый старт: первая задача"]
  n24["Мастер настройки команды"]
  n25["Работа команды, телефон и перенос"]
  n26["Сайт и документация как единый продукт"]
  n27["Руководство: от цели до результата"]
  n28["Рецепт: из чего сварен Borshkit"]
  n29["Все команды"]
  n30["Формат задачи (contract.json)"]
  n31["Details und Grenzen — 0.13"]
  n32["Details and limitations — 0.13"]
  n33["Détails et limites — 0.13"]
  n34["상세 설명과 한계 — 0.13"]
  n35["Подробности и ограничения — 0.13"]
  n36["詳細資料與限制 — 0.13"]
  n37["Команда, оценки ролей и ресурсы"]
  n38["Как выпускается Borshkit"]
  n39["Статус пяти направлений — 0.13.0"]
  n40["Проверка выпуска 0.13.0"]
  n41["Проверка модернизации — 20 октября 2026"]
  n42["Библиотека: навыки и проверенные ссылки"]
  n0 --> n10
  n0 --> n28
  n0 --> n42
  n1 --> n0
  n1 --> n2
  n1 --> n10
  n1 --> n28
  n2 --> n3
  n3 --> n25
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
  n4 --> n20
  n4 --> n21
  n4 --> n22
  n4 --> n23
  n4 --> n24
  n4 --> n25
  n4 --> n27
  n4 --> n28
  n4 --> n29
  n4 --> n30
  n4 --> n37
  n4 --> n38
  n4 --> n39
  n4 --> n40
  n4 --> n42
  n5 --> n21
  n5 --> n22
  n5 --> n29
  n5 --> n39
  n6 --> n7
  n6 --> n12
  n6 --> n13
  n6 --> n16
  n6 --> n30
  n7 --> n6
  n7 --> n9
  n8 --> n11
  n8 --> n13
  n8 --> n14
  n9 --> n4
  n9 --> n6
  n9 --> n7
  n9 --> n8
  n9 --> n10
  n9 --> n12
  n9 --> n13
  n9 --> n14
  n9 --> n23
  n9 --> n30
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
  n13 --> n28
  n13 --> n42
  n14 --> n8
  n14 --> n10
  n14 --> n11
  n14 --> n20
  n15 --> n4
  n15 --> n8
  n15 --> n13
  n15 --> n17
  n15 --> n18
  n15 --> n22
  n15 --> n24
  n15 --> n25
  n15 --> n37
  n16 --> n0
  n16 --> n3
  n16 --> n6
  n16 --> n7
  n16 --> n11
  n17 --> n15
  n17 --> n16
  n17 --> n18
  n17 --> n24
  n17 --> n25
  n17 --> n37
  n18 --> n15
  n18 --> n17
  n18 --> n24
  n18 --> n25
  n19 --> n4
  n19 --> n5
  n19 --> n22
  n19 --> n23
  n19 --> n40
  n20 --> n14
  n21 --> n5
  n21 --> n27
  n21 --> n29
  n21 --> n39
  n22 --> n5
  n22 --> n21
  n22 --> n38
  n22 --> n39
  n23 --> n6
  n23 --> n8
  n23 --> n9
  n23 --> n24
  n23 --> n29
  n24 --> n15
  n24 --> n17
  n24 --> n23
  n24 --> n25
  n24 --> n29
  n24 --> n37
  n25 --> n15
  n25 --> n18
  n25 --> n22
  n25 --> n24
  n25 --> n29
  n25 --> n37
  n26 --> n4
  n26 --> n23
  n26 --> n28
  n26 --> n38
  n26 --> n42
  n27 --> n21
  n27 --> n23
  n27 --> n25
  n27 --> n29
  n28 --> n42
  n29 --> n9
  n29 --> n22
  n29 --> n23
  n29 --> n24
  n29 --> n25
  n29 --> n30
  n29 --> n37
  n30 --> n6
  n30 --> n12
  n30 --> n29
  n31 --> n0
  n31 --> n1
  n31 --> n3
  n31 --> n4
  n31 --> n5
  n31 --> n15
  n31 --> n17
  n31 --> n18
  n31 --> n22
  n31 --> n23
  n31 --> n24
  n31 --> n25
  n31 --> n27
  n31 --> n28
  n31 --> n29
  n31 --> n37
  n31 --> n39
  n31 --> n42
  n32 --> n0
  n32 --> n1
  n32 --> n3
  n32 --> n4
  n32 --> n5
  n32 --> n15
  n32 --> n17
  n32 --> n18
  n32 --> n22
  n32 --> n23
  n32 --> n24
  n32 --> n25
  n32 --> n27
  n32 --> n28
  n32 --> n29
  n32 --> n37
  n32 --> n39
  n32 --> n42
  n33 --> n0
  n33 --> n1
  n33 --> n3
  n33 --> n4
  n33 --> n5
  n33 --> n15
  n33 --> n17
  n33 --> n18
  n33 --> n22
  n33 --> n23
  n33 --> n24
  n33 --> n25
  n33 --> n27
  n33 --> n28
  n33 --> n29
  n33 --> n37
  n33 --> n39
  n33 --> n42
  n34 --> n0
  n34 --> n1
  n34 --> n3
  n34 --> n4
  n34 --> n5
  n34 --> n15
  n34 --> n17
  n34 --> n18
  n34 --> n22
  n34 --> n23
  n34 --> n24
  n34 --> n25
  n34 --> n27
  n34 --> n28
  n34 --> n29
  n34 --> n37
  n34 --> n39
  n34 --> n42
  n35 --> n0
  n35 --> n1
  n35 --> n3
  n35 --> n4
  n35 --> n5
  n35 --> n15
  n35 --> n17
  n35 --> n18
  n35 --> n22
  n35 --> n23
  n35 --> n24
  n35 --> n25
  n35 --> n27
  n35 --> n28
  n35 --> n29
  n35 --> n37
  n35 --> n39
  n35 --> n42
  n36 --> n0
  n36 --> n1
  n36 --> n3
  n36 --> n4
  n36 --> n5
  n36 --> n15
  n36 --> n17
  n36 --> n18
  n36 --> n22
  n36 --> n23
  n36 --> n24
  n36 --> n25
  n36 --> n27
  n36 --> n28
  n36 --> n29
  n36 --> n37
  n36 --> n39
  n36 --> n42
  n37 --> n15
  n37 --> n23
  n37 --> n25
  n37 --> n29
  n38 --> n5
  n38 --> n21
  n38 --> n39
  n39 --> n5
  n39 --> n21
  n39 --> n22
  n39 --> n38
  n40 --> n21
  n40 --> n22
  n40 --> n38
  n40 --> n39
  n41 --> n5
  n41 --> n23
  n41 --> n39
  n42 --> n13
  n42 --> n28
```

## Документы и код, который они описывают

| Документ | Вид | Описывает код |
|---|---|---|
| [AGENTS.md](../../AGENTS.md) | — | — |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | — | `scripts/diagrams.mjs` |
| [README.md](../../README.md) | — | — |
| [SECURITY.md](../../SECURITY.md) | — | — |
| [Документация Borshkit](../README.md) | карта | — |
| [Текущая архитектура](../architecture.md) | понятие | `core/accept.mjs`, `core/adapters.mjs`, `core/context-pack.mjs`, `core/contract.mjs`, `core/gitshell.mjs`, `core/handoff.mjs`, `core/integrations.mjs`, `core/jobs.mjs`, `core/kb.mjs`, `core/portable.mjs`, `core/process.mjs`, `core/roles.mjs`, `core/snapshot.mjs` |
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
| [Аудит и программа модернизации — 2026-10-08](../discussions/modernization-2026-10-08.md) | справка | — |
| [Контроль модернизации — 2026-10-09](../discussions/modernization-2026-10-09.md) | справка | — |
| [Аудит оформления и достоверности — 22 октября 2026](../discussions/professionalism-2026-10-22.md) | справка | `core/contract.mjs`, `core/hooks.mjs`, `docs/site.js` |
| [Черновик обсуждения: резервная копия истории пространства](../discussions/space-history-backup.md) | — | — |
| [Передать работу другому харнесу](../guide/handoff.md) | руководство | `core/integrations.mjs`, `core/kb.mjs`, `core/portable.mjs`, `core/questions.mjs` |
| [Copilot, Roo и Cline: нативный запуск](../guide/native-integrations.md) | руководство | `core/native.mjs`, `integrations/vscode/extension.cjs`, `integrations/vscode/native.cjs` |
| [Быстрый старт: первая задача](../guide/quickstart.md) | руководство | — |
| [Мастер настройки команды](../guide/setup.md) | руководство | `bin/borshkit.mjs`, `core/setup.mjs` |
| [Работа команды, телефон и перенос](../guide/team-operations.md) | руководство | `bin/monitor-worker.mjs`, `core/adapters.mjs`, `core/approval-server.mjs`, `core/approvals.mjs`, `core/assessments.mjs`, `core/integrations.mjs`, `core/monitor.mjs`, `core/operations.mjs`, `core/portable.mjs` |
| [Сайт и документация как единый продукт](../guide/website.md) | руководство | `docs/reader.js`, `scripts/check-site.mjs`, `scripts/site.mjs` |
| [Руководство: от цели до результата](../guide/workflow.md) | руководство | — |
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
| [Как выпускается Borshkit](../release.md) | руководство | `scripts/provenance.mjs`, `scripts/verify-release.mjs` |
| [Статус пяти направлений — 0.13.0](../roadmap.md) | — | — |
| [Проверка выпуска 0.13.0](../verification-0.13.md) | справка | `scripts/live-check.mjs`, `scripts/verify-release.mjs` |
| [Проверка модернизации — 20 октября 2026](../verification-2026-10-20.md) | справка | — |
| [Библиотека: навыки и проверенные ссылки](../../library/README.md) | справка | — |

## Модули ядра без документации

- `core/code-map.mjs`
