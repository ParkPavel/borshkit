# Происхождение и благодарности

Borshkit вырос из чужой и собственной работы. Здесь перечислено, что взято, откуда, как и на каких условиях. Версии зафиксированы на дату анализа (2026-10-05/06); подробности — в [спецификации](spec.md), §0–§1 и §9.

| Проект | Авторы | Лицензия | Что берёт Borshkit | Как | Поддержать |
|---|---|---|---|---|---|
| [Claudex](https://github.com/ParkPavel/claudex) @ `ed73017` | Pavel Park | Apache-2.0 | контракт задачи, снимок состояния, доказательства и сверку, шаблоны секретов | **код адаптирован** в `core/` (см. `NOTICE`) | — |
| [ECC](https://github.com/affaan-m/ECC) @ `ef648e0` | Affaan Mustafa и контрибьюторы | MIT | идею устанавливаемых модулей и профилей; отдельные скиллы — позже, после оценки | пока только идеи, код не скопирован | [GitHub Sponsors](https://github.com/sponsors/affaan-m), [ecc.tools](https://ecc.tools) |
| [Ponytail](https://github.com/DietrichGebert/ponytail) @ `552acd5` | DietrichGebert и контрибьюторы | MIT | «ленивый сеньор» — линза для `implementer` и `simplicity-reviewer` | планируется как пакет с фиксированной версией, без hooks | [GitHub Sponsors](https://github.com/sponsors/DietrichGebert) |
| [Agent Reach](https://github.com/panniantong/agent-reach) @ `a19a171` | Panniantong и контрибьюторы | MIT | сбор из интернета для `researcher` | планируется как внешний инструмент с фиксированной версией | спонсорство — через контакт в README проекта |
| [free-llm-api-resources](https://github.com/raullenchai/free-llm-api-resources) @ `fb47629` | Jun Siang Cheah (зеркало у raullenchai) | лицензия не указана | подсказка при поиске бесплатных API | **только ссылка**, данные не копируются | — |

Унаследованные через Claudex источники идей — Spec Kit (GitHub), Superpowers (Jesse Vincent), Graphify (Safi Shamsi и контрибьюторы), emilkowalski/skills, prompt-agent (kvyb), HIGAgentSkills (Justin Wetch) — описаны в [lineage Claudex](https://github.com/ParkPavel/claudex/blob/main/docs/explanation/lineage.md). Код Graphify в Borshkit не входит.

## Все контрибьюторы

По решению D14 указываются **все** контрибьюторы референс-проектов. Полный список генерирует роль `attribution-steward` из API GitHub; она ещё не реализована, поэтому файла со списком пока нет. По `git log` на зафиксированных версиях это около 590 имён авторов: ECC — 426, Ponytail — 115, Agent Reach — 40, free-llm-api-resources — 7, Claudex — 2. Точное число по аккаунтам GitHub даст API.
