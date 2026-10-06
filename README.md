<p align="center">
  <img src="assets/diagrams/banner.ru.svg" alt="Borshkit — Modular AI Workspace: задачи, доказательства, приёмка, знания" width="100%">
</p>

<p align="center">
  <a href="https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml"><img src="https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml/badge.svg" alt="CI: Linux и Windows"></a>
  <img src="https://img.shields.io/badge/version-0.10.1-b3261e" alt="версия 0.10.1">
  <img src="https://img.shields.io/badge/node-%E2%89%A522-2b1d1d" alt="Node.js 22 и новее">
  <img src="https://img.shields.io/badge/dependencies-0-2e7d32" alt="ноль зависимостей">
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-8c1c13" alt="плагин Claude Code">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-6b5757" alt="лицензия Apache-2.0"></a>
  <a href="https://t.me/parkpavel_chigon"><img src="https://img.shields.io/badge/Telegram-%D0%BA%D0%B0%D0%BD%D0%B0%D0%BB%20%D0%B0%D0%B2%D1%82%D0%BE%D1%80%D0%B0-26a5e4?logo=telegram&logoColor=white" alt="Telegram-канал автора"></a>
</p>

<p align="center">
  <b>Русский</b> · <a href="README.en.md">English</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ko.md">한국어</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.fr.md">Français</a>
</p>

# Borshkit (Борщкит)

**Modular AI Workspace** — рабочее место для AI-агентов в любом проекте: веб-приложении, плагине, библиотеке, мобильном приложении или исследовании.

Ты говоришь, что должно получиться. Агенты работают. Borshkit показывает, что **доказано** проверками, а что нужно посмотреть тебе самому. Ничего не принимается на слово.

> **Статус: 0.10.1.** Всё описанное ниже работает и покрыто тестами на Linux и Windows. В тестах вместо настоящих моделей — поддельные исполнители. Что ещё не проверено вживую, честно перечислено в разделе [«Границы»](#границы).

## Главная идея

<p align="center"><img src="assets/diagrams/flow.ru.svg" alt="Путь задачи: цель → работа агента в копии проекта → проверки → лист приёмки → принято; пункты, которые не проверить автоматически, уходят к тебе" width="100%"></p>

Модель пишет «готово». Это ещё не приёмка:
- каждое доказательство привязано к точному состоянию файлов;
- что можно проверить автоматически, проверяется автоматически;
- что нельзя, становится короткой инструкцией для тебя;
- что не проверено, так и называется: **не проверено**.

## Установка

Нужны Node.js 22+ и Git. Внешних зависимостей нет.

**Плагин Claude Code:**

```
/plugin marketplace add ParkPavel/borshkit
/plugin install borshkit@borshkit
```

Плагин добавляет агенту навык Borshkit, защитные хуки и команды `borshkit` и `borsch` в терминал Claude Code. Чтобы пользоваться ими и в своём терминале, поставь ещё команду — как ниже.

**Команда в терминале:**

```sh
git clone https://github.com/ParkPavel/borshkit.git
cd borshkit && npm link        # появятся команды borshkit и borsch
```

В npm пакет пока не опубликован.

## Первая задача

```sh
cd мой-проект
borshkit начать                                   # папка borshkit/ в корне, скрыта от истории проекта
borshkit исполнитель добавить claude              # Claude Code по подписке; подтверждаешь в терминале
borshkit задача новая тема --цель "Тёмная тема в настройках"
borshkit работа запустить тема --роль architect --исполнитель claude    # предложит цели и критерии
borshkit работа запустить тема --роль implementer --исполнитель claude  # пишет код в отдельной копии
borshkit задача проверить тема                    # тесты, сборка, линтер
borshkit работа запустить тема --роль reviewer --исполнитель codex      # ревью от другой семьи моделей
borshkit задача итог тема                         # лист приёмки: что доказано, что ждёт тебя
borshkit задача подтвердить тема C3 да "видел тёмную тему после перезапуска"
borshkit собрать тема && borshkit отправить       # в основную версию и на GitHub — только с твоего «да»
```

Подробно, с объяснением каждого шага: [быстрый старт](docs/guide/quickstart.md). Все команды есть и по-английски (`init`, `task new`, `job run` …) — [справочник](docs/reference/commands.md).

## Как это работает

<p align="center"><img src="assets/diagrams/evidence.ru.svg" alt="Доказательство устаревает: проверка прошла для состояния a1b2c3, файл изменился, доказательство устарело, повторная проверка прошла для f9e8d7" width="100%"></p>

**Доказательства устаревают.** Borshkit помнит, на каком именно состоянии прошла проверка: коммит и хеш каждого файла, включая несохранённые правки. Изменился хоть байт — проверку надо повторить. [Подробнее](docs/concepts/evidence.md)

<p align="center"><img src="assets/diagrams/pool.ru.svg" alt="Пул исполнителей: Claude Code упёрся в лимит, работа перешла к Codex и завершилась; диспетчерская показывает каждую передачу" width="100%"></p>

**Лимит — не остановка.** Пул — это очередь исполнителей: Claude Code, Codex, бесплатные и локальные API. Упёрся в лимит — работа переходит к следующему, кому это разрешено режимом приватности и кто это умеет. Критические вопросы ждут только тебя. [Подробнее](docs/concepts/executors.md)

<p align="center"><img src="assets/diagrams/kb.ru.svg" alt="Знания: файлы проекта превращаются в заметки со связями, а по ним можно задавать SQL-запросы" width="100%"></p>

**Знания — это заметки, а не чёрный ящик.** Проект превращается в заметки с `[[связями]]` для Obsidian, а поверх них — в SQL-индекс. Каждая работа получает свой срез контекста. Эта документация устроена так же: [граф документации](docs/graph/README.md) Borshkit собрал сам.

## Что умеет

| Область | Что это даёт |
|---|---|
| **Приёмка по целям** | критерии `auto` / `model` / `manual`, лист приёмки, цели доверия к моделям, подтверждённые измерением |
| **Пространство** | папка `borshkit/` = хранилище Obsidian со своей историей; правило `.gitignore` ставится и проверяется само |
| **Исполнители** | Claude Code, Codex (с GPT Image), любые OpenAI-совместимые API, свои программы; пулы с переключением |
| **17 ролей** | архитектор, разработчик, ревьюеры, тестировщик, исследователь, дизайнеры, оформитель README… |
| **Автопилот** | рутинные вопросы решаются ответом по умолчанию через минуту; критические — стоп с отчётом и передачей контекста |
| **Диспетчерская** | кому ушло, кто работает, что ждёт тебя: в терминале, в `STATUS.md` и в строке статуса Claude Code |
| **Исследования** | источники хранятся копиями; проверка `citations` сверяет каждую цитату дословно |
| **Приватность** | три режима; ключи и персональные данные не уходят наружу; настройки меняются только через предложения |
| **Git для новичка** | «что изменилось», «кто это менял», «верни как было» — простыми словами и без разрушающих команд |
| **Благодарности** | проверки `attribution` и `readme-assets`, полный список контрибьюторов всех источников |

## Фронтенд, дизайн и iOS

В Borshkit есть роли для интерфейсов, и каждая получает только свои навыки:

| Роль | Что делает | Навыки и первоисточники |
|---|---|---|
| `ui-engineer` | делает интерфейс: все состояния, анимация, клавиатура | Emil Kowalski, ECC; Vercel Web Interface Guidelines, shadcn/ui, Radix, React Aria, WCAG |
| `ios-designer` | проверяет интерфейс iPhone и iPad | `apple-design`, Liquid Glass, SwiftUI; Apple HIG, SF Symbols |
| `motion-reviewer` | строго проверяет анимации | `review-animations`, `animation-vocabulary`, `motion-foundations` |
| `a11y-reviewer` | проверяет доступность по WCAG 2.2 AA | ECC `accessibility`, `frontend-a11y`; WAI-ARIA APG, axe-core |
| `designer` | ломает интерфейс худшими данными | `break-ui` |

[Библиотека](library/README.md): 3 пакета навыков (25 навыков) и 63 проверенные ссылки — компоненты, анимация, дизайн-системы, доступность, иконки, шрифты, инструменты качества. В терминале: `borshkit навыки` и `borshkit библиотека`.

## Рецепт

Borshkit — это борщ: собран из лучших ингредиентов, которые другие люди вырастили и открыто выложили.

> Некоторые ингредиенты прошли термическую обработку дважды. Spec Kit сначала потушили в Claudex, потом ещё раз — уже как проверку спецификации, и только после этого он доварился в Borshkit. До стола всё дошло в лучшем виде: лицензии сохранены, авторы названы.

| Ингредиент | Что взято |
|---|---|
| [Claudex](https://github.com/ParkPavel/claudex) | ядро: контракт задачи, доказательства, сверка, адаптеры CLI |
| [Ponytail](https://github.com/DietrichGebert/ponytail) ([поддержать](https://github.com/sponsors/DietrichGebert)) | «ленивый сеньор» — делать минимально и просто |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | 14 навыков дизайн-инженерии и анимации |
| [ECC](https://github.com/affaan-m/ECC) ([поддержать](https://github.com/sponsors/affaan-m)) | 9 фронтенд-навыков, идея модулей |
| [Spec Kit](https://github.com/github/spec-kit) | путь «намерение → спецификация → задачи → сверка» (через Claudex, дважды) |
| [Superpowers](https://github.com/obra/superpowers) ([поддержать](https://github.com/sponsors/obra)) | отдельная копия для агента, тест до исправления (через Claudex) |
| [Graphify](https://github.com/Graphify-Labs/graphify) ([поддержать](https://github.com/sponsors/safishamsi)) | происхождение связей в карте кода (идея, через Claudex) |
| [prompt-agent](https://github.com/kvyb/prompt-agent) | оценка прошлых работ (идея, через Claudex) |
| [HIGAgentSkills](https://github.com/justinwetch/HIGAgentSkills) | маршрутизация по Apple HIG (только ссылка) |
| [Agent Reach](https://github.com/panniantong/agent-reach) | маршруты сбора из интернета для исследователя |
| [free-llm-api-resources](https://github.com/raullenchai/free-llm-api-resources) | подсказка при выборе бесплатных API (только ссылка) |

Полный рецепт с версиями и лицензиями — [docs/ingredients.md](docs/ingredients.md). **Все контрибьюторы** этих проектов, 1262 записи — [CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md). Спасибо каждому!

## Границы

- Адаптеры Claude Code и Codex проверены на поддельных программах с тем же форматом событий. Флаги установленного Claude Code сверены. Живых запусков с настоящими моделями в CI нет.
- Картинки через Codex (GPT Image) не проверены: это покажет `borshkit исполнитель проверить codex` на твоей подписке.
- Видит ли граф Obsidian связи из свойств заметок, не проверено. Поэтому связи продублированы обычными ссылками в тексте.
- Сообщения Borshkit пока только на русском; команды и флаги — на русском и английском.
- `node:sqlite` в Node 22 пока экспериментальный.
- Поиск ключей и персональных данных по шаблонам ловит не всё.

## Документация

- [Документация](docs/README.md) — карта всех страниц: быстрый старт, понятия, справочник.
- [Спецификация](docs/spec.md) — исходный анализ и решения D1–D22.
- [Изменения](CHANGELOG.md) · [Как помочь](CONTRIBUTING.md) · [Безопасность](SECURITY.md) · [Для агентов-разработчиков](AGENTS.md)

## Разработка

```sh
npm run verify   # статические проверки и все тесты; CI запускает их на Linux и Windows
```

## Автор

**Pavel Park** — [GitHub](https://github.com/ParkPavel) · [Telegram-канал](https://t.me/parkpavel_chigon)

## Лицензия

Apache-2.0 — см. [LICENSE](LICENSE) и [NOTICE](NOTICE). Навыки в `packs/` — MIT, каждый пакет с лицензией своего автора.
