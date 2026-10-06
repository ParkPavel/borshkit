---
bk-type: reference
related: ["../CONTRIBUTORS-REFERENCES.md", "../third-party.json", "../library/README.md", "spec.md"]
---
# Рецепт: из чего сварен Borshkit

Borshkit — это борщ. Его не придумали с нуля: собрали из лучших ингредиентов, которые другие люди вырастили и открыто выложили. Здесь перечислено всё, что попало в кастрюлю: что взято, откуда, на каких условиях и кому сказать спасибо.

> **Про термическую обработку.** Некоторые ингредиенты прошли её дважды. [Spec Kit](https://github.com/github/spec-kit) сначала потушили в [Claudex](https://github.com/ParkPavel/claudex) как контракт задачи. Потом ещё раз — как проверку спецификации до начала работы. И только после этого он доварился в Borshkit. [Навыки Emil Kowalski](https://github.com/emilkowalski/skills) тоже попали к нам двумя путями: сначала через библиотеку Claudex, потом напрямую. Ничего не подгорело: лицензии сохранены, авторы названы, версии записаны.

Версии зафиксированы на дату сбора, 2026-10-06. Машиночитаемый список — [`third-party.json`](../third-party.json). Встроенная проверка `attribution` сверяет его с этой страницей и с README.

## Основа: код и тексты, которые лежат внутри

| Ингредиент | Авторы | Лицензия | Что взято | Как | Поддержать |
|---|---|---|---|---|---|
| [Claudex](https://github.com/ParkPavel/claudex) @ `ed73017` | Pavel Park | Apache-2.0 | контракт задачи, снимок состояния, доказательства и сверка, поиск ключей, адаптеры CLI, классы сбоев, схема ответа ревью | **код адаптирован** в `core/` (см. [`NOTICE`](../NOTICE)) | — |
| [Ponytail](https://github.com/DietrichGebert/ponytail) @ `552acd5` | DietrichGebert и контрибьюторы | MIT | «ленивый сеньор» для `implementer` и `simplicity-reviewer` | **тексты навыков скопированы** в `packs/ponytail/`; хуки не ставятся | [GitHub Sponsors](https://github.com/sponsors/DietrichGebert) |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) @ `e8a175d` | Emil Kowalski | MIT | 14 навыков дизайн-инженерии и анимации | **скопированы** в `packs/emil/` | — |
| [ECC](https://github.com/affaan-m/ECC) @ `ef648e0` | Affaan Mustafa и контрибьюторы | MIT | 9 фронтенд-навыков (доступность, анимация, SwiftUI, Liquid Glass, React); идея устанавливаемых модулей | **навыки скопированы** в `packs/ecc/`; остальной ECC — нет | [GitHub Sponsors](https://github.com/sponsors/affaan-m), [ecc.tools](https://ecc.tools) |

## Зажарка: идеи, которые пришли через Claudex

Код этих проектов в Borshkit не входит. Входят идеи, которые Claudex адаптировал, а Borshkit унаследовал.

| Ингредиент | Авторы | Лицензия | Что взято | Поддержать |
|---|---|---|---|---|
| [Spec Kit](https://github.com/github/spec-kit) @ `9fb13c1` | GitHub, Inc. и контрибьюторы | MIT | путь «намерение → спецификация → план → задачи → сверка»; проверка спецификации до работы (`задача анализ`) | — |
| [Superpowers](https://github.com/obra/superpowers) @ `8ca22db` | Jesse Vincent и контрибьюторы | MIT | отдельная копия (worktree) для пишущего агента; тест до исправления; ревью до завершения | [GitHub Sponsors](https://github.com/sponsors/obra) |
| [Graphify](https://github.com/Graphify-Labs/graphify) @ `5c7b847` | Safi Shamsi и контрибьюторы | Apache-2.0 | карта кода, где у каждой связи записано происхождение (извлечено / заявлено) | [GitHub Sponsors](https://github.com/sponsors/safishamsi) |
| [prompt-agent](https://github.com/kvyb/prompt-agent) @ `f603198` | kvyb | не указана | оценивать прошлые работы по эффективности и точкам сбоя (`оценка`) | — |
| [HIGAgentSkills](https://github.com/justinwetch/HIGAgentSkills) @ `77f32a4` | Justin Wetch | не указана | маршрутизация по Apple HIG; у нас — только ссылка в каталоге | — |

## Специи: внешние инструменты и первоисточники

Не копируются. Borshkit вызывает их или ссылается на них.

| Что | Зачем |
|---|---|
| [Agent Reach](https://github.com/panniantong/agent-reach) @ `a19a171` (Panniantong и контрибьюторы, MIT) | маршруты для сбора из интернета: `материал добавить --команда …` |
| [free-llm-api-resources](https://github.com/raullenchai/free-llm-api-resources) @ `fb47629` (Jun Siang Cheah, зеркало у raullenchai; лицензия не указана) | подсказка при выборе бесплатных API; только ссылка, данные не копируются |
| [Jina Reader](https://r.jina.ai) | очищенный текст страницы: `материал добавить --через jina` |
| [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) | первоисточник для `ios-designer` |
| [Документация хуков Claude Code](https://code.claude.com/docs/en/hooks) | формат хуков плагина |
| [Каталог библиотеки](../library/README.md) | 63 проверенные ссылки для фронтенда, дизайна и доступности |

## Кухонная утварь

[Node.js](https://nodejs.org) 22+ (встроенные `node:sqlite`, `node:test`, `fetch`; внешних зависимостей нет) · [Git](https://git-scm.com) · [SQLite](https://sqlite.org) с полнотекстовым поиском FTS5 · [Obsidian](https://obsidian.md) — читать пространство как граф · [Claude Code](https://code.claude.com) и Codex CLI — исполнители по подписке.

## Попробовали, но не положили

- **TypeSafe agent skill** — Claudex оценил его и не взял: внешний сервис, пока недостаточно надёжный для пути работы.
- **Код Graphify** — Claudex включает его копию; Borshkit — нет: нужна была только идея происхождения связей.
- **Хуки Ponytail и установщик ECC** — они сделали бы режим глобальным для всех проектов. Borshkit подключает только тексты и только к своим ролям.
- **Отклонённые ссылки каталога** — например, Vaul (автор пишет, что проект больше не поддерживается) и архивный Polaris React. Причины записаны в [`library/catalog.json`](../library/catalog.json).

## Повара

По решению D14 перечислены **все** контрибьюторы всех ингредиентов: [CONTRIBUTORS-REFERENCES.md](../CONTRIBUTORS-REFERENCES.md) — 1262 записи в 11 проектах (один человек может быть в нескольких).

| Проект | Людей |
|---|---|
| ECC | 413 |
| Graphify | 328 |
| Spec Kit | 312 |
| Ponytail | 114 |
| Superpowers | 43 |
| Agent Reach | 39 |
| free-llm-api-resources | 6 |
| emilkowalski/skills | 4 |
| Claudex, prompt-agent, HIGAgentSkills | по 1 |

Список собран из истории коммитов на зафиксированных версиях: имена и логины GitHub, которые авторы сами опубликовали. Адресов почты в нём нет. Боты указаны отдельно. С доступом к API GitHub список можно пересобрать по аккаунтам: `borshkit атрибуция контрибьюторы владелец/репо …`.

Спасибо каждому. Без вашей открытой работы этого борща бы не было.
