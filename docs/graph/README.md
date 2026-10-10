---
bk-type: index
related: ["../README.md", "../concepts/knowledge.md"]
---
# Граф документации

Эту страницу Borshkit написал сам: собрал свою базу знаний по этому репозиторию и выгрузил её. Команда — `node scripts/docs-graph.mjs`.

Всего в графе: модулей 46, тестов 26, документов 92, связей 1286.

- [`borshkit.sql`](borshkit.sql) — весь граф одним SQL-скриптом. Загрузить: `sqlite3 graph.db < borshkit.sql`, потом спрашивать, например, `SELECT * FROM undocumented_modules;`.
- Ниже — карта документов: стрелка значит «ссылается на». GitHub рисует её сам (Mermaid).

```mermaid
flowchart LR
  n0["AGENTS.md"]
  n1["CONTRIBUTING.md"]
  n2["README.md"]
  n3["SECURITY.md"]
  n4["Документация Borshkit"]
  n5["Приёмка по целям"]
  n6["Доказательства и устаревание"]
  n7["Исполнители, пулы и автопилот"]
  n8["Словарь"]
  n9["База знаний: заметки, связи, SQL"]
  n10["Приватность и настройки"]
  n11["Исследования: источники и цитаты"]
  n12["Роли и навыки"]
  n13["Пространство и Git простыми словами"]
  n14["Borshkit как профессиональная команда"]
  n15["Ответ на независимый аудит 0.10.1"]
  n16["Аудит и программа модернизации — 2026-10-08"]
  n17["Контроль модернизации — 2026-10-09"]
  n18["Черновик обсуждения: резервная копия истории пространства"]
  n19["Быстрый старт: первая задача"]
  n20["Мастер настройки команды"]
  n21["Работа команды, телефон и перенос"]
  n22["Рецепт: из чего сварен Borshkit"]
  n23["Все команды"]
  n24["Формат задачи (contract.json)"]
  n25["Команда, оценки ролей и ресурсы"]
  n26["Библиотека: навыки и проверенные ссылки"]
  n0 --> n9
  n0 --> n22
  n0 --> n26
  n1 --> n0
  n1 --> n2
  n1 --> n9
  n1 --> n22
  n2 --> n0
  n2 --> n1
  n2 --> n3
  n2 --> n4
  n2 --> n6
  n2 --> n7
  n2 --> n13
  n2 --> n14
  n2 --> n16
  n2 --> n17
  n2 --> n19
  n2 --> n20
  n2 --> n21
  n2 --> n22
  n2 --> n23
  n2 --> n25
  n2 --> n26
  n3 --> n21
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
  n5 --> n6
  n5 --> n11
  n5 --> n12
  n5 --> n15
  n5 --> n24
  n6 --> n5
  n6 --> n8
  n7 --> n10
  n7 --> n12
  n7 --> n13
  n8 --> n4
  n8 --> n5
  n8 --> n6
  n8 --> n7
  n8 --> n9
  n8 --> n11
  n8 --> n12
  n8 --> n13
  n8 --> n19
  n8 --> n24
  n9 --> n8
  n9 --> n13
  n10 --> n3
  n10 --> n7
  n10 --> n13
  n11 --> n5
  n11 --> n10
  n12 --> n5
  n12 --> n7
  n12 --> n10
  n12 --> n22
  n12 --> n26
  n13 --> n7
  n13 --> n9
  n13 --> n10
  n13 --> n18
  n14 --> n4
  n14 --> n7
  n14 --> n12
  n14 --> n16
  n14 --> n17
  n14 --> n20
  n14 --> n21
  n14 --> n25
  n15 --> n0
  n15 --> n3
  n15 --> n5
  n15 --> n6
  n15 --> n10
  n16 --> n14
  n16 --> n15
  n16 --> n17
  n16 --> n20
  n16 --> n21
  n16 --> n25
  n17 --> n14
  n17 --> n16
  n17 --> n20
  n17 --> n21
  n18 --> n13
  n19 --> n5
  n19 --> n7
  n19 --> n8
  n19 --> n20
  n19 --> n23
  n20 --> n14
  n20 --> n16
  n20 --> n19
  n20 --> n21
  n20 --> n23
  n20 --> n25
  n21 --> n14
  n21 --> n17
  n21 --> n20
  n21 --> n23
  n21 --> n25
  n22 --> n26
  n23 --> n8
  n23 --> n19
  n23 --> n20
  n23 --> n21
  n23 --> n24
  n23 --> n25
  n24 --> n5
  n24 --> n11
  n24 --> n23
  n25 --> n14
  n25 --> n19
  n25 --> n21
  n25 --> n23
  n26 --> n12
  n26 --> n22
```

## Документы и код, который они описывают

| Документ | Вид | Описывает код |
|---|---|---|
| [AGENTS.md](../../AGENTS.md) | — | — |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | — | `scripts/diagrams.mjs` |
| [README.md](../../README.md) | — | — |
| [SECURITY.md](../../SECURITY.md) | — | — |
| [Документация Borshkit](../README.md) | карта | — |
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
| [Быстрый старт: первая задача](../guide/quickstart.md) | руководство | — |
| [Мастер настройки команды](../guide/setup.md) | руководство | `bin/borshkit.mjs`, `core/setup.mjs` |
| [Работа команды, телефон и перенос](../guide/team-operations.md) | руководство | `bin/monitor-worker.mjs`, `core/adapters.mjs`, `core/approval-server.mjs`, `core/approvals.mjs`, `core/assessments.mjs`, `core/integrations.mjs`, `core/monitor.mjs`, `core/operations.mjs`, `core/portable.mjs` |
| [Рецепт: из чего сварен Borshkit](../ingredients.md) | справка | — |
| [Все команды](../reference/commands.md) | справка | `bin/borshkit.mjs` |
| [Формат задачи (contract.json)](../reference/contract.md) | справка | `core/contract.mjs` |
| [Команда, оценки ролей и ресурсы](../reference/team-resources.md) | справка | `core/config.mjs`, `core/executors.mjs`, `core/resources.mjs`, `core/roles.mjs`, `core/team.mjs` |
| [Библиотека: навыки и проверенные ссылки](../../library/README.md) | справка | — |

## Модули ядра без документации

Таких нет.
