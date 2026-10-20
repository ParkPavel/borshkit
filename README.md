# Borshkit

**Переносимый рабочий слой для ИИ в коде.**

Опиши результат. Поручи работу агенту. Получи доказательства, привязанные к состоянию файлов, и понятный список того, что проверить самому.

<a href="README.md">ru</a> · <a href="README.en.md">en</a> · <a href="README.de.md">de</a> · <a href="README.ko.md">ko</a> · <a href="README.zh-TW.md">zh-TW</a> · <a href="README.fr.md">fr</a>

## Начать

Node.js 22+ · Git

```sh
git clone https://github.com/ParkPavel/borshkit.git
cd borshkit
npm link
```

[Quickstart](docs/guide/quickstart.md) · [Руководство](docs/guide/workflow.md) · [Команды](docs/reference/commands.md) · [Сайт](https://parkpavel.github.io/borshkit/)

## Что работает сейчас

CLI и плагин Claude Code; запуск Claude Code, Codex, Gemini и API-исполнителей. Для Copilot, Roo и Cline — экспорт инструкций. Экспорт, запуск и полноценная интеграция — разные уровни поддержки.

Ответ «готово» не принимает задачу. Проверки, независимое ревью и решения человека сохраняются отдельно. Изменение файлов делает старые доказательства устаревшими.

[Архитектура](docs/architecture.md) · [План](docs/roadmap.md) · [Подробности и ограничения](docs/reference/overview.ru.md) · [Передача контекста](docs/guide/handoff.md)

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

Полный рецепт с версиями и лицензиями — [docs/ingredients.md](docs/ingredients.md). **Все контрибьюторы** этих проектов, 1262 записи — [CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md). Спасибо каждому!


</details>

Apache-2.0 · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [Безопасность](SECURITY.md)

Pavel Park · [GitHub](https://github.com/ParkPavel) · [Telegram](https://t.me/parkpavel_chigon) · [Support / Поддержать](https://web.tribute.tg/d/Sh8)
