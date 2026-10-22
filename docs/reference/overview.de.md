---
bk-type: reference
related: ["../architecture.md", "../roadmap.md"]
---
# Details und Grenzen — 0.13

## Ein sichtbares Team

<p align="center"><img src="../../assets/diagrams/team.de.svg" alt="Aufgabe → Rolle → Ausführer → Modell/API → Ergebnis → unabhängiges Review; Vorschlag, Anwendung, Start, Prüfung und Abnahme sind getrennt" width="100%"></p>

`borshkit team` zeigt Modelle, Aktualität der Verbindung, Rollenbewertungen, zugewiesene Pools und bekannte Ressourcen. `borshkit team plan <aufgabe>` erklärt Kandidaten und reserviert eine Modellfamilie für unabhängiges Review. `team propose` speichert einen Vorschlag; Anwendung und Arbeitsstart sind getrennte Aktionen. Veraltete Daten verhindern die Anwendung. Kostenloser API-Zugang muss im Konto geprüft werden; unbekannte Restwerte bleiben sichtbar.

Die neue Rolle `design-prompter` erstellt ein Briefing für visuelles Design. Die Modellwahl beruht auf der Rollenbewertung. [Befehle und Formate](../../docs/reference/team-resources.md) · [Architektur und nächste Etappen](../../docs/concepts/team-workspace.md) · [Audit](../../docs/discussions/modernization-2026-10-08.md) (russische Dokumentation).

`borshkit setup` speichert Umgebung, Datenschutz, konkrete Modelle und Rollen. `--interactive` öffnet den Terminaldialog; Schrittbefehle funktionieren aus der App. [Anleitung](../../docs/guide/setup.md) (Russisch). Kompatibilität und Rollenqualität sind getrennt; ein Vorschlag wendet keine Einstellungen an und startet keine Arbeit.

<p align="center"><img src="../../assets/diagrams/setup.de.svg" alt="Einrichtung: Umgebung, Datenschutz, Modelle, Aufgaben und Vorschlag; Anwendung, Bewertung, Zuordnung und Start sind getrennt" width="100%"></p>

Passkey-Bestätigung für Einstellungen und kritische Fragen ist nach vertrauenswürdiger Kopplung implementiert. Dazu kommen `assessment`, gemeinsames Budget/WIP, Abhängigkeiten und Checkpoints, explizites `monitor start/stop`, Gemini CLI/API, ein lokales VSIX und Dateiübertragung mit erneuter Prüfung.

Version 0.13 bietet exportierte Anweisungen und native VSIX-Einstiegspunkte: Copilot liefert Text ohne Werkzeuge; Roo bietet Aufgaben-IDs, Ereignisse und Abbruch; Cline bietet nur den Start mit unbekanntem Status. Strikte Privatsphäre blockiert diesen nativen Weg. [Funktionen, Installation und Grenzen](../guide/native-integrations.md) (Russisch). Autopilot ist standardmäßig aus.

[Betrieb und Sicherheitsgrenzen](../../docs/guide/team-operations.md) · [Implementierungsprüfung](../../docs/discussions/modernization-2026-10-09.md) (Russisch). Lokale Tests ersetzen keine Prüfung echter Modelle, des Telefonbrowsers, von VS Code oder des exakten CI-Commits.

<p align="center"><img src="../../assets/diagrams/operations.de.svg" alt="Team: Bewertung, Budget, Vorschlag, Passkey und separater Start; Monitor schlägt vor, Übertragung verlangt neue Prüfungen" width="100%"></p>
>
> **Hinweis zur Sprache:** Die Meldungen von Borshkit sind vorerst auf Russisch. Jeder Befehl und jedes Flag hat auch einen englischen Namen, und dieses README verwendet sie.

## Die Grundidee

<p align="center"><img src="../../assets/diagrams/flow.de.svg" alt="Weg einer Aufgabe: Ziel und Kriterien → Agent arbeitet in einer eigenen Projektkopie → Prüfungen → Review durch einen anderen Ausführer → Abnahmeblatt; Ergebnisse: Korrektur nötig, ungeprüft, wartet auf dich, abgenommen; danach Merge in main und Push" width="100%"></p>

Ein Modell sagt „fertig“. Das ist noch keine Abnahme:
- jeder Nachweis ist an den genauen Zustand der Dateien gebunden;
- was sich automatisch prüfen lässt, wird automatisch geprüft;
- was nicht, wird zu einer kurzen Anleitung für dich;
- was nicht geprüft wurde, heißt genau so: **nicht geprüft**.

## Installation

Du brauchst Node.js 22+ und Git. Externe Abhängigkeiten gibt es nicht.

**Als Claude-Code-Plugin:**

```
/plugin marketplace add ParkPavel/borshkit
/plugin install borshkit@borshkit
```

Das Plugin liefert den Skill, Slash-Befehle und Schutz-Hooks für Claude Code. Es installiert keine globalen Befehle im PATH. Für `borshkit` und `borsch` im Terminal installiere die CLI wie unten beschrieben.

**Als Befehl im Terminal:**

```sh
git clone https://github.com/ParkPavel/borshkit.git
cd borshkit && npm link        # fügt die Befehle borshkit und borsch hinzu
```

Oder mit einem Befehl aus dem neuesten Release, ohne Klonen:

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/latest/download/borshkit.tgz
```

Das Paket ist noch nicht in der npm-Registry veröffentlicht; der Befehl oben installiert das GitHub-Archiv direkt.


## Deine erste Aufgabe

```sh
cd my-project
borshkit init                                     # Ordner borshkit/ im Projektstamm, taucht nicht in der Projekthistorie auf
borshkit executor add codex
borshkit executor add claude                      # Claude Code mit deinem Abo; du bestätigst im Terminal
borshkit task new dark-mode --goal "Dark theme in settings"
borshkit job run dark-mode --role architect --executor claude     # schlägt Ziele und Kriterien vor
# Prüfe architect-proposal.json und übernimm vereinbarte goals, criteria und checks in contract.json.
borshkit job run dark-mode --role implementer --executor claude   # schreibt Code in einer eigenen Kopie
borshkit task verify dark-mode                        # Tests, Build, Linter
borshkit job run dark-mode --role reviewer --executor codex       # Review durch eine andere Modellfamilie
borshkit task converge dark-mode                      # Abnahmeblatt: was belegt ist, was auf dich wartet
borshkit task confirm dark-mode C3 yes "saw the dark theme after a restart"
borshkit merge dark-mode && borshkit push             # in die Hauptversion und zu GitHub – erst nach deinem „Ja“
```

Alle Befehle: [Befehlsreferenz](../../docs/reference/commands.md) (russische und englische Namen nebeneinander). Schritt für Schritt (auf Russisch): [Schnellstart](../../docs/guide/quickstart.md).

## So funktioniert es

Siehe [aktuelle Architektur und Unterstützung](../architecture.md) und den [Arbeitsablauf](../guide/workflow.md).

## Was Borshkit kann

| Bereich | Was du bekommst |
|---|---|
| **Abnahme nach Zielen** | Kriterien `auto` / `model` / `manual`, ein Abnahmeblatt, Vertrauensziele für Modelle, durch Messung bestätigt |
| **Arbeitsbereich** | der Ordner `borshkit/` ist ein Obsidian-Vault mit eigener Historie; die `.gitignore`-Regel wird automatisch eingetragen und geprüft |
| **Ausführer** | Claude Code, Codex (mit GPT Image), jede OpenAI-kompatible API, deine eigenen Programme; Pools mit Fallback |
| **21 Rollen** | Architekt, Entwickler, Reviewer, Tester, Rechercheur, Designer, Design-Prompt-Autor, README-Illustrator… |
| **Autopilot** | Routinefragen bekommen nach einer Minute ihre Standardantwort; bei kritischen hält er an, mit Bericht und Übergabe des Kontexts |
| **Leitstand** | wer den Auftrag bekommen hat, wer arbeitet, was auf dich wartet: im Terminal, in `STATUS.md` und in der Statuszeile von Claude Code |
| **Recherche** | Quellen werden als Kopien gespeichert; die Prüfung `citations` gleicht jedes Zitat Wort für Wort ab |
| **Datenschutz** | drei Modi; das Aufgabenpaket für den Agenten wird vor dem Senden auf Schlüssel und personenbezogene Daten geprüft; Einstellungen ändern sich nur über Vorschläge |
| **Git für Einsteiger** | „was hat sich geändert“, „wer hat das geändert“, „stell es wieder her“ – in einfachen Worten, ohne zerstörerische Befehle |
| **Danksagungen** | die Prüfungen `attribution` und `readme-assets`, die vollständige Liste der Mitwirkenden jeder Quelle |

## Frontend, Design und iOS

Borshkit hat Rollen für Oberflächen, und jede bekommt nur ihre eigenen Skills:

| Rolle | Was sie tut | Skills und Primärquellen |
|---|---|---|
| `ui-engineer` | baut die Oberfläche: alle Zustände, Animation, Tastatur | Emil Kowalski, ECC; Vercel Web Interface Guidelines, shadcn/ui, Radix, React Aria, WCAG |
| `ios-designer` | prüft Oberflächen für iPhone und iPad | `apple-design`, Liquid Glass, SwiftUI; Apple HIG, SF Symbols |
| `motion-reviewer` | prüft Animationen streng | `review-animations`, `animation-vocabulary`, `motion-foundations` |
| `a11y-reviewer` | prüft die Barrierefreiheit nach WCAG 2.2 AA | ECC `accessibility`, `frontend-a11y`; WAI-ARIA APG, axe-core |
| `designer` | macht die Oberfläche mit Worst-Case-Daten kaputt | `break-ui` |

Die [Bibliothek](../../library/README.md) enthält 3 Skill-Pakete (25 Skills) und 63 geprüfte Links: Komponenten, Animation, Designsysteme, Barrierefreiheit, Icons, Schriften, Qualitätswerkzeuge. Im Terminal: `borshkit skills` und `borshkit library`.

## Das Rezept

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

Das vollständige Rezept mit Versionen und Lizenzen steht in [docs/ingredients.md](../../docs/ingredients.md) (auf Russisch). **Alle Mitwirkenden** dieser Projekte, 1262 Einträge: [CONTRIBUTORS-REFERENCES.md](../../CONTRIBUTORS-REFERENCES.md). Danke an jede und jeden von euch!

## Grenzen

- Borshkit prüft das Aufgabenpaket, das es selbst an einen Agenten schickt. Was Claude Code oder Codex danach aus den Dateien der Projektkopie lesen, sieht es nicht: Ignorierte Dateien (`.env`) sind nicht in der Kopie, alle anderen kann der Agent lesen.
- Prüfungen der Aufgaben (Tests, Build) laufen mit deiner Umgebung, weil Tests manchmal Schlüssel brauchen. Der Umgebungsfilter gilt nur für Ausführer.
- Die Wissenskarte versteht Verknüpfungen in JS/TS-Code und Markdown. Swift, Python, Go und andere Sprachen werden noch nicht erfasst; die Abnahme hängt davon nicht ab.
- Die Adapter für Claude Code, Codex und Gemini sind gegen Fake-Programme mit demselben Ereignisformat getestet. Die Flags eines installierten Claude Code wurden geprüft. Die CI startet keine echten Modelle.
- Bilder über Codex (GPT Image) sind noch nicht getestet: `borshkit executor probe codex` zeigt dir das mit deinem Abo.
- Ob der Obsidian-Graph Links aus den Eigenschaften von Notizen anzeigt, ist nicht getestet. Deshalb stehen die Links zusätzlich als normale Links im Text.
- Die Meldungen von Borshkit gibt es vorerst nur auf Russisch; Befehle und Flags auf Russisch und Englisch.
- `node:sqlite` ist in Node 22 noch experimentell.
- Die musterbasierte Erkennung von Schlüsseln und personenbezogenen Daten findet nicht alles.

## Dokumentation

Die Dokumentation ist vorerst auf Russisch:
- [Übersicht der Dokumentation](../../docs/README.md) – Schnellstart, Konzepte, Referenz.
- [Spezifikation](../../docs/spec.md) – die ursprüngliche Analyse und die Entscheidungen D1–D22.
- [Changelog](../../CHANGELOG.md) · [Mitwirken](../../CONTRIBUTING.md) · [Sicherheit](../../SECURITY.md) · [Für Entwickler-Agenten](../../AGENTS.md)

## Entwicklung

```sh
npm run verify   # statische Prüfungen und alle Tests; die CI führt sie unter Linux, Windows und macOS aus
```

## Autor

**Pavel Park** — [GitHub](https://github.com/ParkPavel) · [Telegram-Kanal](https://t.me/parkpavel_chigon)

## Projekt unterstützen

Borshkit ist kostenlos und quelloffen. Wenn es dir hilft, unterstütze die Entwicklung mit einer Spende über Tribute.

<p><a href="https://web.tribute.tg/d/Sh8"><img src="https://img.shields.io/badge/Tribute-Spenden-e8554e?style=for-the-badge&logo=telegram&logoColor=white" alt="Spenden"></a></p>

Im Terminal: `borshkit support` zeigt den Link und bietet an, ihn im Browser zu öffnen. Ein Stern auf GitHub und eine Empfehlung an Kollegen helfen ebenfalls sehr.

## Lizenz

Apache-2.0 – siehe [LICENSE](../../LICENSE) und [NOTICE](../../NOTICE). Die Skills in `packs/` stehen unter MIT, jedes Paket mit der Lizenz seines Autors.


## Связи

- [Текущая архитектура](../architecture.md)
- [Дорожная карта](../roadmap.md)
