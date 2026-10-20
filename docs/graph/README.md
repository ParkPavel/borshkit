---
bk-type: index
related: ["../README.md", "../concepts/knowledge.md"]
---
# Граф документации

Эту страницу Borshkit написал сам: собрал свою базу знаний по этому репозиторию и выгрузил её. Команда — `node scripts/docs-graph.mjs`.

Всего в графе: модулей 47, тестов 31, документов 104, связей 1501.

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
  n19["Черновик обсуждения: резервная копия истории пространства"]
  n20["Передать работу другому харнесу"]
  n21["Быстрый старт: первая задача"]
  n22["Мастер настройки команды"]
  n23["Работа команды, телефон и перенос"]
  n24["Руководство: от цели до результата"]
  n25["Рецепт: из чего сварен Borshkit"]
  n26["Все команды"]
  n27["Формат задачи (contract.json)"]
  n28["Details und Grenzen — 0.12"]
  n29["Details and limitations — 0.12"]
  n30["Détails et limites — 0.12"]
  n31["상세 설명과 한계 — 0.12"]
  n32["Подробности и ограничения — 0.12"]
  n33["詳細資料與限制 — 0.12"]
  n34["Команда, оценки ролей и ресурсы"]
  n35["Дорожная карта"]
  n36["Проверка модернизации — 20 октября 2026"]
  n37["Библиотека: навыки и проверенные ссылки"]
  n0 --> n10
  n0 --> n25
  n0 --> n37
  n1 --> n0
  n1 --> n2
  n1 --> n10
  n1 --> n25
  n2 --> n3
  n2 --> n5
  n2 --> n20
  n2 --> n21
  n2 --> n24
  n2 --> n25
  n2 --> n26
  n2 --> n32
  n2 --> n35
  n3 --> n23
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
  n4 --> n19
  n4 --> n20
  n4 --> n21
  n4 --> n22
  n4 --> n23
  n4 --> n24
  n4 --> n25
  n4 --> n26
  n4 --> n27
  n4 --> n34
  n4 --> n35
  n4 --> n37
  n5 --> n20
  n5 --> n26
  n5 --> n35
  n6 --> n7
  n6 --> n12
  n6 --> n13
  n6 --> n16
  n6 --> n27
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
  n9 --> n21
  n9 --> n27
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
  n13 --> n25
  n13 --> n37
  n14 --> n8
  n14 --> n10
  n14 --> n11
  n14 --> n19
  n15 --> n4
  n15 --> n8
  n15 --> n13
  n15 --> n17
  n15 --> n18
  n15 --> n22
  n15 --> n23
  n15 --> n34
  n16 --> n0
  n16 --> n3
  n16 --> n6
  n16 --> n7
  n16 --> n11
  n17 --> n15
  n17 --> n16
  n17 --> n18
  n17 --> n22
  n17 --> n23
  n17 --> n34
  n18 --> n15
  n18 --> n17
  n18 --> n22
  n18 --> n23
  n19 --> n14
  n20 --> n5
  n20 --> n24
  n20 --> n26
  n20 --> n35
  n21 --> n6
  n21 --> n8
  n21 --> n9
  n21 --> n22
  n21 --> n26
  n22 --> n15
  n22 --> n17
  n22 --> n21
  n22 --> n23
  n22 --> n26
  n22 --> n34
  n23 --> n15
  n23 --> n18
  n23 --> n22
  n23 --> n26
  n23 --> n34
  n24 --> n20
  n24 --> n21
  n24 --> n23
  n24 --> n26
  n25 --> n37
  n26 --> n9
  n26 --> n21
  n26 --> n22
  n26 --> n23
  n26 --> n27
  n26 --> n34
  n27 --> n6
  n27 --> n12
  n27 --> n26
  n28 --> n0
  n28 --> n1
  n28 --> n3
  n28 --> n4
  n28 --> n5
  n28 --> n15
  n28 --> n17
  n28 --> n18
  n28 --> n21
  n28 --> n22
  n28 --> n23
  n28 --> n24
  n28 --> n25
  n28 --> n26
  n28 --> n34
  n28 --> n35
  n28 --> n37
  n29 --> n0
  n29 --> n1
  n29 --> n3
  n29 --> n4
  n29 --> n5
  n29 --> n15
  n29 --> n17
  n29 --> n18
  n29 --> n21
  n29 --> n22
  n29 --> n23
  n29 --> n24
  n29 --> n25
  n29 --> n26
  n29 --> n34
  n29 --> n35
  n29 --> n37
  n30 --> n0
  n30 --> n1
  n30 --> n3
  n30 --> n4
  n30 --> n5
  n30 --> n15
  n30 --> n17
  n30 --> n18
  n30 --> n21
  n30 --> n22
  n30 --> n23
  n30 --> n24
  n30 --> n25
  n30 --> n26
  n30 --> n34
  n30 --> n35
  n30 --> n37
  n31 --> n0
  n31 --> n1
  n31 --> n3
  n31 --> n4
  n31 --> n5
  n31 --> n15
  n31 --> n17
  n31 --> n18
  n31 --> n21
  n31 --> n22
  n31 --> n23
  n31 --> n24
  n31 --> n25
  n31 --> n26
  n31 --> n34
  n31 --> n35
  n31 --> n37
  n32 --> n0
  n32 --> n1
  n32 --> n3
  n32 --> n4
  n32 --> n5
  n32 --> n15
  n32 --> n17
  n32 --> n18
  n32 --> n21
  n32 --> n22
  n32 --> n23
  n32 --> n24
  n32 --> n25
  n32 --> n26
  n32 --> n34
  n32 --> n35
  n32 --> n37
  n33 --> n0
  n33 --> n1
  n33 --> n3
  n33 --> n4
  n33 --> n5
  n33 --> n15
  n33 --> n17
  n33 --> n18
  n33 --> n21
  n33 --> n22
  n33 --> n23
  n33 --> n24
  n33 --> n25
  n33 --> n26
  n33 --> n34
  n33 --> n35
  n33 --> n37
  n34 --> n15
  n34 --> n21
  n34 --> n23
  n34 --> n26
  n35 --> n5
  n35 --> n18
  n35 --> n20
  n36 --> n5
  n36 --> n21
  n36 --> n35
  n37 --> n13
  n37 --> n25
```

## Документы и код, который они описывают

| Документ | Вид | Описывает код |
|---|---|---|
| [AGENTS.md](../../AGENTS.md) | — | — |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | — | `scripts/diagrams.mjs` |
| [README.md](../../README.md) | — | — |
| [SECURITY.md](../../SECURITY.md) | — | — |
| [Документация Borshkit](../README.md) | карта | — |
| [Текущая архитектура](../architecture.md) | понятие | `core/accept.mjs`, `core/adapters.mjs`, `core/contract.mjs`, `core/gitshell.mjs`, `core/integrations.mjs`, `core/jobs.mjs`, `core/kb.mjs`, `core/portable.mjs`, `core/process.mjs`, `core/roles.mjs`, `core/snapshot.mjs` |
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
| [Черновик обсуждения: резервная копия истории пространства](../discussions/space-history-backup.md) | — | — |
| [Передать работу другому харнесу](../guide/handoff.md) | руководство | `core/integrations.mjs`, `core/kb.mjs`, `core/portable.mjs`, `core/questions.mjs` |
| [Быстрый старт: первая задача](../guide/quickstart.md) | руководство | — |
| [Мастер настройки команды](../guide/setup.md) | руководство | `bin/borshkit.mjs`, `core/setup.mjs` |
| [Работа команды, телефон и перенос](../guide/team-operations.md) | руководство | `bin/monitor-worker.mjs`, `core/adapters.mjs`, `core/approval-server.mjs`, `core/approvals.mjs`, `core/assessments.mjs`, `core/integrations.mjs`, `core/monitor.mjs`, `core/operations.mjs`, `core/portable.mjs` |
| [Руководство: от цели до результата](../guide/workflow.md) | руководство | — |
| [Рецепт: из чего сварен Borshkit](../ingredients.md) | справка | — |
| [Все команды](../reference/commands.md) | справка | `bin/borshkit.mjs` |
| [Формат задачи (contract.json)](../reference/contract.md) | справка | `core/contract.mjs` |
| [Details und Grenzen — 0.12](../reference/overview.de.md) | справка | — |
| [Details and limitations — 0.12](../reference/overview.en.md) | справка | — |
| [Détails et limites — 0.12](../reference/overview.fr.md) | справка | — |
| [상세 설명과 한계 — 0.12](../reference/overview.ko.md) | справка | — |
| [Подробности и ограничения — 0.12](../reference/overview.ru.md) | справка | — |
| [詳細資料與限制 — 0.12](../reference/overview.zh-TW.md) | справка | — |
| [Команда, оценки ролей и ресурсы](../reference/team-resources.md) | справка | `core/config.mjs`, `core/executors.mjs`, `core/resources.mjs`, `core/roles.mjs`, `core/team.mjs` |
| [Дорожная карта](../roadmap.md) | — | — |
| [Проверка модернизации — 20 октября 2026](../verification-2026-10-20.md) | справка | — |
| [Библиотека: навыки и проверенные ссылки](../../library/README.md) | справка | — |

## Модули ядра без документации

Таких нет.
