---
bk-type: guide
related: ["roadmap.md", "architecture.md", "guide/handoff.md"]
documents: ["../.github/workflows/release.yml", "../scripts/verify-release.mjs", "../scripts/provenance.mjs"]
---
# Как выпускается Borshkit

Стабильный релиз 0.13.1 включает CLI, плагин Claude Code и устанавливаемый VSIX. «Стабильный» означает версионированный выпуск с тестами и проверенной упаковкой, а не доказанную пригодность каждой модели или устройства.

[Состав 0.13.1, обновление и известные ограничения](release-0.13.1.md).

Промежуточный выпуск **0.14.0** публикуется как Pre-release. [Изменения, установка и ограничения](release-0.14.0.md). Ссылка `latest` продолжает указывать на стабильный 0.13.1.

## Проверяемая процедура

1. Согласовать версии `package.json`, `.claude-plugin/plugin.json`, `integrations/vscode/package.json` и changelog.
2. Выполнить `npm run verify`; получить успешный CI точного коммита на Linux, Windows и macOS. Слить PR.
3. Создать тег выбранной версии (для промежуточного выпуска `0.14.0`) на этом коммите и draft GitHub Release с описанием реализованного и ограничений.
4. Запустить `Release archive` через `workflow_dispatch`, передав тег. Workflow проверяет версию, прогоняет verify, собирает архивы вне checkout, устанавливает точный tgz и проверяет VSIX. Создаёт checksum, provenance и GitHub OIDC attestation, прикладывает их к draft.
5. Проверить скачанные артефакты и checksum. Только после успешного workflow опубликовать draft: стабильный выпуск как latest, промежуточный — как Pre-release без смены latest.

Workflow намеренно запускается явно: событие публикации не пересобирает и не заменяет уже проверенные архивы.

## Установка выпуска

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/latest/download/borshkit.tgz
borshkit помощь
```

VS Code: скачать `borshkit.vsix` из релиза, затем Extensions → Install from VSIX. Обновления расширений Roo/Cline и модель Copilot выбираются в самой среде.

## Работа с исходниками

Для разработки самой утилиты вместо установки архива:

```sh
git clone https://github.com/ParkPavel/borshkit.git
cd borshkit
npm link
```

`npm link` связывает команду с этим клоном: изменения исходников сразу влияют на CLI. Создавай пользовательское пространство из папки своего проекта. Ветка main может содержать изменения документации после релиза; точный состав опубликованного архива задаётся тегом и provenance.

## Что приложено

- `borshkit.tgz` — CLI и плагин;
- `borshkit.vsix` — расширение VS Code с собственным runtime;
- `SHA256SUMS` — SHA-256 архивов;
- `build-provenance.json` — версия, точный commit/tree, чистота checkout и среда;
- `release-smoke.json` — результат установки точного архива и проверки VSIX;
- GitHub attestation — подписанное происхождение архивов через workflow, доступное на странице релиза/attestations.

Checksum не заменяет подпись. При несовпадении checksum архив не устанавливай. Для проверки GitHub attestation используется `gh attestation verify borshkit.tgz --repo ParkPavel/borshkit`.

## Реестр npm

Пакет подготовлен к публикации без `private: true`. Публикация в registry.npmjs.org требует отдельной авторизации владельца npm; GitHub-аккаунт её не заменяет. Пока она не выполнена, `npm install -g borshkit` не является поддерживаемой инструкцией. Ссылка на архив GitHub Release работает через npm без публикации в реестр.

## Живые испытания

По решению владельца живые модели, VS Code с аккаунтами и физические устройства проверят пользователи. `node scripts/live-check.mjs --out live-check.json` создаёт честный NOT_RUN. Опциональный `--run` вызывает существующую подписку Codex в ограниченном временном проекте и может расходовать квоту. Это отдельная проверка, не часть обычного CI.

## Связи

- [Roadmap и статус направлений](roadmap.md)
- [Архитектура](architecture.md)
- [Передача задачи](guide/handoff.md)
