# Borshkit

[![Borshkit — tasks, context, evidence](assets/product/hero.webp)](https://parkpavel.github.io/borshkit/)

<sub>Иллюстрация рабочего цикла: задача, контекст и доказательства.</sub>

**Задачи, переносимый контекст и доказательства результата для ИИ-разработки.**

Опиши результат. Поручи работу агенту. Получи доказательства, привязанные к состоянию файлов, и понятный список того, что проверить самому.

<a href="README.md">ru</a> · <a href="README.en.md">en</a> · <a href="README.de.md">de</a> · <a href="README.ko.md">ko</a> · <a href="README.zh-TW.md">zh-TW</a> · <a href="README.fr.md">fr</a>

[![Release](https://img.shields.io/github/v/release/ParkPavel/borshkit?style=flat-square&color=d6edaf)](https://github.com/ParkPavel/borshkit/releases) [![CI](https://img.shields.io/github/actions/workflow/status/ParkPavel/borshkit/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml) [![Apache-2.0](https://img.shields.io/github/license/ParkPavel/borshkit?style=flat-square&color=aeb4bb)](LICENSE)

[![Начать](https://img.shields.io/badge/%D0%9D%D0%B0%D1%87%D0%B0%D1%82%D1%8C-d6edaf?style=for-the-badge&labelColor=20252b)](https://parkpavel.github.io/borshkit/read/guide/quickstart.html) [![Документация](https://img.shields.io/badge/%D0%94%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D0%B0%D1%86%D0%B8%D1%8F-aeb4bb?style=for-the-badge&labelColor=20252b)](https://parkpavel.github.io/borshkit/read/index.html) [![Скачать](https://img.shields.io/badge/%D0%A1%D0%BA%D0%B0%D1%87%D0%B0%D1%82%D1%8C-aeb4bb?style=for-the-badge&labelColor=20252b)](https://github.com/ParkPavel/borshkit/releases/tag/0.13.0) [![Поддержать](https://img.shields.io/badge/%D0%9F%D0%BE%D0%B4%D0%B4%D0%B5%D1%80%D0%B6%D0%B0%D1%82%D1%8C-d6edaf?style=for-the-badge&labelColor=20252b)](https://web.tribute.tg/d/Sh8)

## Начать

0.13.0 · Node.js 22+ · Git

Основной путь — проверенный архив GitHub Release. Публикации в реестре npm пока нет. Для правок исходников используй [клонирование и npm link](https://parkpavel.github.io/borshkit/read/release.html).

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/download/0.13.0/borshkit.tgz
borshkit помощь
```

[Quickstart](https://parkpavel.github.io/borshkit/read/guide/quickstart.html) · [Руководство](https://parkpavel.github.io/borshkit/read/guide/workflow.html) · [Команды](https://parkpavel.github.io/borshkit/read/reference/commands.html) · [Сайт](https://parkpavel.github.io/borshkit/)

## Что работает сейчас

CLI, плагин Claude Code и VSIX. Запуск Claude Code, Codex, Gemini и API-исполнителей; нативные API Copilot/Roo/Cline из VS Code с явными ограничениями. Передача задачи между средами и статическая карта JS/TS, Python, Go, Swift. [Нативные возможности и границы](https://parkpavel.github.io/borshkit/read/guide/native-integrations.html).

Ответ «готово» не принимает задачу. Проверки, независимое ревью и решения человека сохраняются отдельно. Изменение файлов делает старые доказательства устаревшими.

PASS — проверка прошла; FAIL — проверка не прошла; UNKNOWN — доказательств нет. Живые испытания моделей и устройств ожидаются от пользователей.

[Архитектура](https://parkpavel.github.io/borshkit/read/architecture.html) · [План](https://parkpavel.github.io/borshkit/read/roadmap.html) · [Подробности и ограничения](https://parkpavel.github.io/borshkit/read/reference/overview.ru.html) · [Передача контекста](https://parkpavel.github.io/borshkit/read/guide/handoff.html)


| Задача | Контекст | Доказательства |
|---|---|---|
| [Цель, границы и критерии](https://parkpavel.github.io/borshkit/read/reference/contract.html) | [Перенос между средами](https://parkpavel.github.io/borshkit/read/guide/handoff.html) | [Проверки для состояния файлов](https://parkpavel.github.io/borshkit/read/concepts/evidence.html) |

<details>
<summary>Нужен ли платный ИИ?</summary>

Для задач и локальных проверок модель не нужна. Работа агента использует отдельно настроенную среду и её тариф.

</details>

<details>
<summary>Что переносится между средами?</summary>

Контракт, решения и ограниченный контекст с происхождением. История чата и доверенная приёмка не переносятся.

</details>

> ### Поддержать Borshkit
>
> Открытый код развивается благодаря участию людей. Помоги оплатить время разработки и сделать инструмент удобнее.
>
> [![Поддержать Borshkit](https://img.shields.io/badge/%D0%9F%D0%BE%D0%B4%D0%B4%D0%B5%D1%80%D0%B6%D0%B0%D1%82%D1%8C%20Borshkit-d6edaf?style=for-the-badge&labelColor=20252b)](https://web.tribute.tg/d/Sh8)


<details>
<summary>Credits / Источники</summary>


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

Полный рецепт с версиями и лицензиями — [docs/ingredients.md](https://parkpavel.github.io/borshkit/read/ingredients.html). **Все контрибьюторы** этих проектов, 1262 записи — [CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md). Спасибо каждому!


Контракты API (код не копировался): [VS Code Language Model API](https://github.com/microsoft/vscode) · [Roo Code API](https://github.com/RooCodeInc/Roo-Code) · [Cline API](https://github.com/cline/cline)

[Marked](https://github.com/markedjs/marked) · MIT · Markdown → HTML documentation.

</details>

Apache-2.0 · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [Безопасность](SECURITY.md)

Pavel Park · [GitHub](https://github.com/ParkPavel) · [Telegram](https://t.me/parkpavel_chigon) · [Support / Поддержать](https://web.tribute.tg/d/Sh8)
