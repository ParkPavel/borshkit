<p align="center">
  <img src="assets/diagrams/banner.de.svg" alt="Borshkit — Modular AI Workspace: Aufgaben, Nachweise, Abnahme, Wissen" width="100%">
</p>

<p align="center">
  <a href="https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml"><img src="https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml/badge.svg" alt="CI: Linux und Windows"></a>
  <img src="https://img.shields.io/badge/version-0.10.1-b3261e" alt="Version 0.10.1">
  <img src="https://img.shields.io/badge/node-%E2%89%A522-2b1d1d" alt="Node.js 22 oder neuer">
  <img src="https://img.shields.io/badge/dependencies-0-2e7d32" alt="keine Abhängigkeiten">
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-8c1c13" alt="Claude-Code-Plugin">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-6b5757" alt="Lizenz Apache-2.0"></a>
  <a href="https://t.me/parkpavel_chigon"><img src="https://img.shields.io/badge/Telegram-Kanal%20des%20Autors-26a5e4?logo=telegram&logoColor=white" alt="Telegram-Kanal des Autors"></a>
</p>

<p align="center">
  <a href="README.md">Русский</a> · <a href="README.en.md">English</a> · <b>Deutsch</b> · <a href="README.ko.md">한국어</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.fr.md">Français</a>
</p>

# Borshkit

**Modular AI Workspace** – ein Arbeitsplatz für KI-Agenten in jedem Projekt: einer Web-App, einem Plugin, einer Bibliothek, einer Mobile-App oder einer Forschungsarbeit.

Du sagst, was herauskommen soll. Die Agenten arbeiten. Borshkit zeigt, was Prüfungen **belegt** haben und was du dir selbst ansehen musst. Nichts wird auf Treu und Glauben abgenommen.

> **Status: 0.10.1.** Alles, was hier beschrieben ist, funktioniert und ist unter Linux und Windows durch Tests abgedeckt. In den Tests laufen statt echter Modelle Fake-Ausführer. Was noch nicht live ausprobiert wurde, steht unter [Grenzen](#grenzen).
>
> **Hinweis zur Sprache:** Die Meldungen von Borshkit sind vorerst auf Russisch. Jeder Befehl und jedes Flag hat auch einen englischen Namen, und dieses README verwendet sie.

## Die Grundidee

<p align="center"><img src="assets/diagrams/flow.de.svg" alt="Der Weg einer Aufgabe: Ziel → ein Agent arbeitet in einer Kopie des Projekts → Prüfungen → Abnahmeblatt → Abgenommen; was sich nicht automatisch prüfen lässt, geht an dich" width="100%"></p>

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

Das Plugin gibt dem Agenten den Borshkit-Skill, schützende Hooks und die Befehle `borshkit` und `borsch` im Terminal von Claude Code. Willst du sie auch in deinem eigenen Terminal nutzen, installiere zusätzlich den Befehl wie unten beschrieben.

**Als Befehl im Terminal:**

```sh
git clone https://github.com/ParkPavel/borshkit.git
cd borshkit && npm link        # fügt die Befehle borshkit und borsch hinzu
```

Auf npm gibt es das Paket noch nicht.

## Deine erste Aufgabe

```sh
cd my-project
borshkit init                                     # Ordner borshkit/ im Projektstamm, taucht nicht in der Projekthistorie auf
borshkit executor add claude                      # Claude Code mit deinem Abo; du bestätigst im Terminal
borshkit task new theme --goal "Dark theme in settings"
borshkit job run theme --role architect --executor claude     # schlägt Ziele und Kriterien vor
borshkit job run theme --role implementer --executor claude   # schreibt Code in einer eigenen Kopie
borshkit task verify theme                        # Tests, Build, Linter
borshkit job run theme --role reviewer --executor codex       # Review durch eine andere Modellfamilie
borshkit task converge theme                      # Abnahmeblatt: was belegt ist, was auf dich wartet
borshkit task confirm theme C3 yes "saw the dark theme after a restart"
borshkit merge theme && borshkit push             # in die Hauptversion und zu GitHub – erst nach deinem „Ja“
```

Alle Befehle: [Befehlsreferenz](docs/reference/commands.md) (russische und englische Namen nebeneinander). Schritt für Schritt (auf Russisch): [Schnellstart](docs/guide/quickstart.md).

## So funktioniert es

<p align="center"><img src="assets/diagrams/evidence.de.svg" alt="Nachweise veralten: Eine Prüfung hat für den Zustand a1b2c3 bestanden, eine Datei hat sich geändert, der Nachweis ist veraltet, eine neue Prüfung hat für f9e8d7 bestanden" width="100%"></p>

**Nachweise veralten.** Borshkit merkt sich den genauen Zustand, auf dem eine Prüfung bestanden hat: den Commit und einen Hash jeder Datei, nicht committete Änderungen eingeschlossen. Ändert sich auch nur ein Byte, muss die Prüfung neu laufen. [Mehr](docs/concepts/evidence.md)

<p align="center"><img src="assets/diagrams/pool.de.svg" alt="Ausführer-Pool: Claude Code hat sein Limit erreicht, der Auftrag ging an Codex und wurde abgeschlossen; der Leitstand zeigt jede Übergabe" width="100%"></p>

**Ein Limit ist kein Stopp.** Ein Pool ist eine Warteschlange von Ausführern: Claude Code, Codex, kostenlose und lokale APIs. Erreicht einer ein Limit, geht der Auftrag an den nächsten, den der Datenschutzmodus erlaubt und der die Arbeit kann. Kritische Fragen warten auf dich und nur auf dich. [Mehr](docs/concepts/executors.md)

<p align="center"><img src="assets/diagrams/kb.de.svg" alt="Wissen: Projektdateien werden zu Notizen mit Links, und du kannst sie mit SQL abfragen" width="100%"></p>

**Wissen besteht aus Notizen, nicht aus einer Blackbox.** Das Projekt wird zu Notizen mit `[[links]]` für Obsidian, darüber liegt ein SQL-Index. Jeder Auftrag bekommt seinen eigenen Ausschnitt des Kontexts. Diese Dokumentation funktioniert genauso: Ihren [Dokumentationsgraphen](docs/graph/README.md) hat Borshkit selbst gebaut.

## Was Borshkit kann

| Bereich | Was du bekommst |
|---|---|
| **Abnahme nach Zielen** | Kriterien `auto` / `model` / `manual`, ein Abnahmeblatt, Vertrauensziele für Modelle, durch Messung bestätigt |
| **Arbeitsbereich** | der Ordner `borshkit/` ist ein Obsidian-Vault mit eigener Historie; die `.gitignore`-Regel wird automatisch eingetragen und geprüft |
| **Ausführer** | Claude Code, Codex (mit GPT Image), jede OpenAI-kompatible API, deine eigenen Programme; Pools mit Fallback |
| **17 Rollen** | Architekt, Entwickler, Reviewer, Tester, Rechercheur, Designer, README-Illustrator… |
| **Autopilot** | Routinefragen bekommen nach einer Minute ihre Standardantwort; bei kritischen hält er an, mit Bericht und Übergabe des Kontexts |
| **Leitstand** | wer den Auftrag bekommen hat, wer arbeitet, was auf dich wartet: im Terminal, in `STATUS.md` und in der Statuszeile von Claude Code |
| **Recherche** | Quellen werden als Kopien gespeichert; die Prüfung `citations` gleicht jedes Zitat Wort für Wort ab |
| **Datenschutz** | drei Modi; Schlüssel und personenbezogene Daten verlassen den Rechner nicht; Einstellungen ändern sich nur über Vorschläge |
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

Die [Bibliothek](library/README.md) enthält 3 Skill-Pakete (25 Skills) und 63 geprüfte Links: Komponenten, Animation, Designsysteme, Barrierefreiheit, Icons, Schriften, Qualitätswerkzeuge. Im Terminal: `borshkit skills` und `borshkit library`.

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

Das vollständige Rezept mit Versionen und Lizenzen steht in [docs/ingredients.md](docs/ingredients.md) (auf Russisch). **Alle Mitwirkenden** dieser Projekte, 1262 Einträge: [CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md). Danke an jede und jeden von euch!

## Grenzen

- Die Adapter für Claude Code und Codex sind gegen Fake-Programme mit demselben Ereignisformat getestet. Die Flags eines installierten Claude Code wurden geprüft. Die CI startet keine echten Modelle.
- Bilder über Codex (GPT Image) sind noch nicht getestet: `borshkit executor probe codex` zeigt dir das mit deinem Abo.
- Ob der Obsidian-Graph Links aus den Eigenschaften von Notizen anzeigt, ist nicht getestet. Deshalb stehen die Links zusätzlich als normale Links im Text.
- Die Meldungen von Borshkit gibt es vorerst nur auf Russisch; Befehle und Flags auf Russisch und Englisch.
- `node:sqlite` ist in Node 22 noch experimentell.
- Die musterbasierte Erkennung von Schlüsseln und personenbezogenen Daten findet nicht alles.

## Dokumentation

Die Dokumentation ist vorerst auf Russisch:
- [Übersicht der Dokumentation](docs/README.md) – Schnellstart, Konzepte, Referenz.
- [Spezifikation](docs/spec.md) – die ursprüngliche Analyse und die Entscheidungen D1–D22.
- [Changelog](CHANGELOG.md) · [Mitwirken](CONTRIBUTING.md) · [Sicherheit](SECURITY.md) · [Für Entwickler-Agenten](AGENTS.md)

## Entwicklung

```sh
npm run verify   # statische Prüfungen und alle Tests; die CI führt sie unter Linux und Windows aus
```

## Autor

**Pavel Park** — [GitHub](https://github.com/ParkPavel) · [Telegram-Kanal](https://t.me/parkpavel_chigon)

## Lizenz

Apache-2.0 – siehe [LICENSE](LICENSE) und [NOTICE](NOTICE). Die Skills in `packs/` stehen unter MIT, jedes Paket mit der Lizenz seines Autors.
