---
bk-type: index
related: ["../README.md", "../concepts/knowledge.md"]
---
# Граф документации

Эту страницу Borshkit написал сам: собрал свою базу знаний по этому репозиторию и выгрузил её. Команда — `node scripts/docs-graph.mjs`.

Всего в графе: модулей 31, тестов 17, документов 82, связей 872.

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
  n14["Ответ на независимый аудит 0.10.1"]
  n15["Черновик обсуждения: резервная копия истории пространства"]
  n16["Быстрый старт: первая задача"]
  n17["Рецепт: из чего сварен Borshkit"]
  n18["Все команды"]
  n19["Формат задачи (contract.json)"]
  n20["Библиотека: навыки и проверенные ссылки"]
  n0 --> n9
  n0 --> n17
  n0 --> n20
  n1 --> n0
  n1 --> n2
  n1 --> n9
  n1 --> n17
  n2 --> n0
  n2 --> n1
  n2 --> n3
  n2 --> n4
  n2 --> n6
  n2 --> n7
  n2 --> n13
  n2 --> n16
  n2 --> n17
  n2 --> n18
  n2 --> n20
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
  n5 --> n6
  n5 --> n11
  n5 --> n12
  n5 --> n14
  n5 --> n19
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
  n8 --> n16
  n8 --> n19
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
  n12 --> n17
  n12 --> n20
  n13 --> n7
  n13 --> n9
  n13 --> n10
  n13 --> n15
  n14 --> n0
  n14 --> n3
  n14 --> n5
  n14 --> n6
  n14 --> n10
  n15 --> n13
  n16 --> n5
  n16 --> n7
  n16 --> n8
  n16 --> n18
  n17 --> n20
  n18 --> n8
  n18 --> n16
  n18 --> n19
  n19 --> n5
  n19 --> n11
  n19 --> n18
  n20 --> n12
  n20 --> n17
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
| [Ответ на независимый аудит 0.10.1](../discussions/audit-2026-10-07.md) | — | `core/accept.mjs`, `core/adapters.mjs`, `core/eval.mjs`, `core/gitshell.mjs`, `core/jobs.mjs`, `core/snapshot.mjs` |
| [Черновик обсуждения: резервная копия истории пространства](../discussions/space-history-backup.md) | — | — |
| [Быстрый старт: первая задача](../guide/quickstart.md) | руководство | — |
| [Рецепт: из чего сварен Borshkit](../ingredients.md) | справка | — |
| [Все команды](../reference/commands.md) | справка | `bin/borshkit.mjs` |
| [Формат задачи (contract.json)](../reference/contract.md) | справка | `core/contract.mjs` |
| [Библиотека: навыки и проверенные ссылки](../../library/README.md) | справка | — |

## Модули ядра без документации

- `core/builtins.mjs`
- `core/process.mjs`
