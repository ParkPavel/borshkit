# Borshkit

**Eine portable Grundlage für KI beim Programmieren.**

Beschreibe das Ergebnis. Lass einen Agenten arbeiten. Erhalte Nachweise zum genauen Dateistand und eine klare Checkliste für deine Prüfung.

<a href="README.md">ru</a> · <a href="README.en.md">en</a> · <a href="README.de.md">de</a> · <a href="README.ko.md">ko</a> · <a href="README.zh-TW.md">zh-TW</a> · <a href="README.fr.md">fr</a>

## Starten

0.13.0 · Node.js 22+ · Git

```sh
git clone https://github.com/ParkPavel/borshkit.git
cd borshkit
npm link
```

[Quickstart](docs/guide/quickstart.md) · [Guide](docs/guide/workflow.md) · [Commands](docs/reference/commands.md) · [Website](https://parkpavel.github.io/borshkit/)

## Heute verfügbar

CLI, Claude-Code-Plugin und VSIX. Ausführung über Claude Code, Codex, Gemini und APIs; native Copilot/Roo/Cline-APIs in VS Code mit klaren Grenzen. Aufgabenübergabe und statische Karten für JS/TS, Python, Go und Swift. [Funktionen und Grenzen](docs/guide/native-integrations.md).

PASS / FAIL / UNKNOWN: evidence follows the exact file state. A model response alone does not accept a task. CLI messages are currently in Russian; commands also have English aliases.

[Architecture](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [Details und Grenzen](docs/reference/overview.de.md) · [Context handoff](docs/guide/handoff.md)

<details>
<summary>Credits / Источники</summary>


Borshkit ist ein Borschtsch: gekocht aus den besten Zutaten, die andere angebaut und offen geteilt haben.

> Manche Zutaten wurden zweimal gegart. Spec Kit kam zuerst in Claudex in den Schmortopf, köchelte dann noch einmal als Spezifikationsprüfung und wurde erst danach in Borshkit gar. Auf den Tisch kam alles tadellos: Lizenzen erhalten, Autoren genannt.

| Zutat | Was übernommen wurde |
|---|---|
| [Claudex](https://github.com/ParkPavel/claudex) | der Kern: Aufgabenvertrag, Nachweise, Abgleich, CLI-Adapter |
| [Ponytail](https://github.com/DietrichGebert/ponytail) ([unterstützen](https://github.com/sponsors/DietrichGebert)) | der „faule Senior“ – nur das Nötigste tun, einfach bleiben |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | 14 Skills für Design Engineering und Animation |
| [ECC](https://github.com/affaan-m/ECC) ([unterstützen](https://github.com/sponsors/affaan-m)) | 9 Frontend-Skills, die Idee der Module |
| [Spec Kit](https://github.com/github/spec-kit) | der Weg „Absicht → Spezifikation → Aufgaben → Abgleich“ (über Claudex, zweimal) |
| [Superpowers](https://github.com/obra/superpowers) ([unterstützen](https://github.com/sponsors/obra)) | eine eigene Kopie für den Agenten, der Test vor dem Fix (über Claudex) |
| [Graphify](https://github.com/Graphify-Labs/graphify) ([unterstützen](https://github.com/sponsors/safishamsi)) | die Herkunft von Verknüpfungen in einer Code-Karte (Idee, über Claudex) |
| [prompt-agent](https://github.com/kvyb/prompt-agent) | die Bewertung vergangener Aufträge (Idee, über Claudex) |
| [HIGAgentSkills](https://github.com/justinwetch/HIGAgentSkills) | Routing anhand der Apple HIG (nur Link) |
| [Agent Reach](https://github.com/panniantong/agent-reach) | Wege, auf denen der Rechercheur Inhalte im Web sammelt |
| [free-llm-api-resources](https://github.com/raullenchai/free-llm-api-resources) | eine Orientierungshilfe bei der Wahl kostenloser APIs (nur Link) |

Das vollständige Rezept mit Versionen und Lizenzen steht in [docs/ingredients.md](docs/ingredients.md) (auf Russisch). **Alle Mitwirkenden** dieser Projekte, 1262 Einträge: [CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md). Danke an jede und jeden von euch!


</details>

Apache-2.0 · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [Security](SECURITY.md)

Pavel Park · [GitHub](https://github.com/ParkPavel) · [Telegram](https://t.me/parkpavel_chigon) · [Support / Поддержать](https://web.tribute.tg/d/Sh8)


API references (no copied code): [VS Code Language Model API](https://github.com/microsoft/vscode) · [Roo Code API](https://github.com/RooCodeInc/Roo-Code) · [Cline API](https://github.com/cline/cline)
