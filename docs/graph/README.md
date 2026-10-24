---
bk-type: index
related: ["../README.md", "../concepts/knowledge.md"]
---
# Граф документации

Эту страницу Borshkit написал сам: собрал свою базу знаний по этому репозиторию и выгрузил её. Команда — `node scripts/docs-graph.mjs`.

Всего в графе: модулей 58, тестов 34, документов 111, связей 1727.

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
  n18["Аудит и программа модернизации — 2026-10-08"]
  n19["Контроль модернизации — 2026-10-09"]
  n20["Аудит оформления и достоверности — 22 октября 2026"]
  n21["Черновик обсуждения: резервная копия истории пространства"]
  n22["Передать работу другому харнесу"]
  n23["Copilot, Roo и Cline: нативный запуск"]
  n24["Быстрый старт: первая задача"]
  n25["Мастер настройки команды"]
  n26["Работа команды, телефон и перенос"]
  n27["Сайт и документация как единый продукт"]
  n28["Руководство: от цели до результата"]
  n29["Рецепт: из чего сварен Borshkit"]
  n30["Все команды"]
  n31["Формат задачи (contract.json)"]
  n32["Details und Grenzen — 0.13"]
  n33["Details and limitations — 0.13"]
  n34["Détails et limites — 0.13"]
  n35["상세 설명과 한계 — 0.13"]
  n36["Подробности и ограничения — 0.13"]
  n37["詳細資料與限制 — 0.13"]
  n38["Команда, оценки ролей и ресурсы"]
  n39["Как выпускается Borshkit"]
  n40["Статус пяти направлений — 0.13.0"]
  n41["Проверка выпуска 0.13.0"]
  n42["Проверка модернизации — 20 октября 2026"]
  n43["Библиотека: навыки и проверенные ссылки"]
  n0 --> n10
  n0 --> n29
  n0 --> n43
  n1 --> n0
  n1 --> n2
  n1 --> n10
  n1 --> n29
  n2 --> n3
  n3 --> n26
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
  n4 --> n18
  n4 --> n20
  n4 --> n21
  n4 --> n22
  n4 --> n23
  n4 --> n24
  n4 --> n25
  n4 --> n26
  n4 --> n28
  n4 --> n29
  n4 --> n30
  n4 --> n31
  n4 --> n38
  n4 --> n39
  n4 --> n40
  n4 --> n41
  n4 --> n43
  n5 --> n22
  n5 --> n23
  n5 --> n30
  n5 --> n40
  n6 --> n7
  n6 --> n12
  n6 --> n13
  n6 --> n16
  n6 --> n31
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
  n9 --> n24
  n9 --> n31
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
  n13 --> n29
  n13 --> n43
  n14 --> n8
  n14 --> n10
  n14 --> n11
  n14 --> n21
  n15 --> n4
  n15 --> n8
  n15 --> n13
  n15 --> n18
  n15 --> n19
  n15 --> n23
  n15 --> n25
  n15 --> n26
  n15 --> n38
  n16 --> n0
  n16 --> n3
  n16 --> n6
  n16 --> n7
  n16 --> n11
  n17 --> n7
  n17 --> n8
  n17 --> n16
  n17 --> n26
  n18 --> n15
  n18 --> n16
  n18 --> n19
  n18 --> n25
  n18 --> n26
  n18 --> n38
  n19 --> n15
  n19 --> n18
  n19 --> n25
  n19 --> n26
  n20 --> n4
  n20 --> n5
  n20 --> n23
  n20 --> n24
  n20 --> n41
  n21 --> n14
  n22 --> n5
  n22 --> n28
  n22 --> n30
  n22 --> n40
  n23 --> n5
  n23 --> n22
  n23 --> n39
  n23 --> n40
  n24 --> n6
  n24 --> n8
  n24 --> n9
  n24 --> n25
  n24 --> n30
  n25 --> n15
  n25 --> n18
  n25 --> n24
  n25 --> n26
  n25 --> n30
  n25 --> n38
  n26 --> n15
  n26 --> n19
  n26 --> n23
  n26 --> n25
  n26 --> n30
  n26 --> n38
  n27 --> n4
  n27 --> n24
  n27 --> n29
  n27 --> n39
  n27 --> n43
  n28 --> n22
  n28 --> n24
  n28 --> n26
  n28 --> n30
  n29 --> n43
  n30 --> n9
  n30 --> n23
  n30 --> n24
  n30 --> n25
  n30 --> n26
  n30 --> n31
  n30 --> n38
  n31 --> n6
  n31 --> n12
  n31 --> n30
  n32 --> n0
  n32 --> n1
  n32 --> n3
  n32 --> n4
  n32 --> n5
  n32 --> n15
  n32 --> n18
  n32 --> n19
  n32 --> n23
  n32 --> n24
  n32 --> n25
  n32 --> n26
  n32 --> n28
  n32 --> n29
  n32 --> n30
  n32 --> n38
  n32 --> n40
  n32 --> n43
  n33 --> n0
  n33 --> n1
  n33 --> n3
  n33 --> n4
  n33 --> n5
  n33 --> n15
  n33 --> n18
  n33 --> n19
  n33 --> n23
  n33 --> n24
  n33 --> n25
  n33 --> n26
  n33 --> n28
  n33 --> n29
  n33 --> n30
  n33 --> n38
  n33 --> n40
  n33 --> n43
  n34 --> n0
  n34 --> n1
  n34 --> n3
  n34 --> n4
  n34 --> n5
  n34 --> n15
  n34 --> n18
  n34 --> n19
  n34 --> n23
  n34 --> n24
  n34 --> n25
  n34 --> n26
  n34 --> n28
  n34 --> n29
  n34 --> n30
  n34 --> n38
  n34 --> n40
  n34 --> n43
  n35 --> n0
  n35 --> n1
  n35 --> n3
  n35 --> n4
  n35 --> n5
  n35 --> n15
  n35 --> n18
  n35 --> n19
  n35 --> n23
  n35 --> n24
  n35 --> n25
  n35 --> n26
  n35 --> n28
  n35 --> n29
  n35 --> n30
  n35 --> n38
  n35 --> n40
  n35 --> n43
  n36 --> n0
  n36 --> n1
  n36 --> n3
  n36 --> n4
  n36 --> n5
  n36 --> n15
  n36 --> n18
  n36 --> n19
  n36 --> n23
  n36 --> n24
  n36 --> n25
  n36 --> n26
  n36 --> n28
  n36 --> n29
  n36 --> n30
  n36 --> n38
  n36 --> n40
  n36 --> n43
  n37 --> n0
  n37 --> n1
  n37 --> n3
  n37 --> n4
  n37 --> n5
  n37 --> n15
  n37 --> n18
  n37 --> n19
  n37 --> n23
  n37 --> n24
  n37 --> n25
  n37 --> n26
  n37 --> n28
  n37 --> n29
  n37 --> n30
  n37 --> n38
  n37 --> n40
  n37 --> n43
  n38 --> n15
  n38 --> n24
  n38 --> n26
  n38 --> n30
  n39 --> n5
  n39 --> n22
  n39 --> n40
  n40 --> n5
  n40 --> n22
  n40 --> n23
  n40 --> n39
  n41 --> n22
  n41 --> n23
  n41 --> n39
  n41 --> n40
  n42 --> n5
  n42 --> n24
  n42 --> n40
  n43 --> n13
  n43 --> n29
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
| [Аудит надёжности и мини-спринт — 24 октября 2026](../discussions/audit-2026-10-24.md) | — | `core/accept.mjs`, `core/adapters.mjs`, `core/assessments.mjs`, `core/eval.mjs`, `core/executors.mjs`, `core/process.mjs` |
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
