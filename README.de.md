# Borshkit

[![Borshkit — tasks, context, evidence](assets/product/hero.webp)](https://parkpavel.github.io/borshkit/)

<sub>Illustration des Ablaufs: Aufgaben, Kontext und Nachweise.</sub>

**Aufgaben, portabler Kontext und prüfbare Ergebnisse für KI-gestützte Entwicklung.**

Beschreibe das Ergebnis. Lass einen Agenten arbeiten. Erhalte Nachweise zum genauen Dateistand und eine klare Checkliste für deine Prüfung.

<a href="README.md">ru</a> · <a href="README.en.md">en</a> · <a href="README.de.md">de</a> · <a href="README.ko.md">ko</a> · <a href="README.zh-TW.md">zh-TW</a> · <a href="README.fr.md">fr</a>

[![Release](https://img.shields.io/github/v/release/ParkPavel/borshkit?style=flat-square&color=d6edaf)](https://github.com/ParkPavel/borshkit/releases) [![CI](https://img.shields.io/github/actions/workflow/status/ParkPavel/borshkit/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml) [![Apache-2.0](https://img.shields.io/github/license/ParkPavel/borshkit?style=flat-square&color=aeb4bb)](LICENSE)

[![Loslegen](https://img.shields.io/badge/Loslegen-d6edaf?style=for-the-badge&labelColor=20252b)](https://parkpavel.github.io/borshkit/read/guide/quickstart.html) [![Dokumentation](https://img.shields.io/badge/Dokumentation-aeb4bb?style=for-the-badge&labelColor=20252b)](https://parkpavel.github.io/borshkit/read/index.html) [![Download](https://img.shields.io/badge/Download-aeb4bb?style=for-the-badge&labelColor=20252b)](https://github.com/ParkPavel/borshkit/releases/tag/0.13.0) [![Unterstützen](https://img.shields.io/badge/Unterst%C3%BCtzen-d6edaf?style=for-the-badge&labelColor=20252b)](https://web.tribute.tg/d/Sh8)

## Starten

0.13.0 · Node.js 22+ · Git

Installiere das geprüfte Archiv aus GitHub Releases. Das Paket ist noch nicht in der npm-Registry veröffentlicht. Für Änderungen am Quellcode: [git clone und npm link](https://parkpavel.github.io/borshkit/read/release.html).

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/download/0.13.0/borshkit.tgz
borshkit help
```

[Quickstart](https://parkpavel.github.io/borshkit/read/guide/quickstart.html) · [Guide](https://parkpavel.github.io/borshkit/read/guide/workflow.html) · [Commands](https://parkpavel.github.io/borshkit/read/reference/commands.html) · [Website](https://parkpavel.github.io/borshkit/)

## Heute verfügbar

CLI, Claude-Code-Plugin und VSIX. Ausführung über Claude Code, Codex, Gemini und APIs; native Copilot/Roo/Cline-APIs in VS Code mit klaren Grenzen. Aufgabenübergabe und statische Karten für JS/TS, Python, Go und Swift. [Funktionen und Grenzen](https://parkpavel.github.io/borshkit/read/guide/native-integrations.html).

PASS: Prüfung bestanden. FAIL: Prüfung nicht bestanden. UNKNOWN: Nachweise fehlen. Live-Tests mit Modellen und Geräten stehen für Rückmeldungen aus der Community aus. CLI-Meldungen und die meisten Anleitungen sind auf Russisch; Befehle haben englische Aliase.

[Architecture](https://parkpavel.github.io/borshkit/read/architecture.html) · [Roadmap](https://parkpavel.github.io/borshkit/read/roadmap.html) · [Details und Grenzen](https://parkpavel.github.io/borshkit/read/reference/overview.de.html) · [Context handoff](https://parkpavel.github.io/borshkit/read/guide/handoff.html)


| Aufgaben | Kontext | Nachweise |
|---|---|---|
| [Ziele, Umfang und Kriterien](https://parkpavel.github.io/borshkit/read/reference/contract.html) | [Übergabe zwischen Umgebungen](https://parkpavel.github.io/borshkit/read/guide/handoff.html) | [Prüfungen für einen Dateistand](https://parkpavel.github.io/borshkit/read/concepts/evidence.html) |

<details>
<summary>Brauche ich ein bezahltes KI-Modell?</summary>

Aufgaben und lokale Prüfungen brauchen kein Modell. Agenten nutzen eine separat konfigurierte Umgebung und deren Tarif.

</details>

<details>
<summary>Was wird übergeben?</summary>

Vertrag, Entscheidungen und begrenzter Kontext mit Herkunft. Chatverlauf und vertrauenswürdige Abnahme werden nicht übertragen.

</details>

> ### Borshkit unterstützen
>
> Open Source lebt von Menschen. Unterstütze Entwicklungszeit und einen leichter zugänglichen Einstieg.
>
> [![Borshkit unterstützen](https://img.shields.io/badge/Borshkit%20unterst%C3%BCtzen-d6edaf?style=for-the-badge&labelColor=20252b)](https://web.tribute.tg/d/Sh8)


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

Das vollständige Rezept mit Versionen und Lizenzen steht in [docs/ingredients.md](https://parkpavel.github.io/borshkit/read/ingredients.html) (auf Russisch). **Alle Mitwirkenden** dieser Projekte, 1262 Einträge: [CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md). Danke an jede und jeden von euch!


API-Referenzen (kein Code kopiert): [VS Code Language Model API](https://github.com/microsoft/vscode) · [Roo Code API](https://github.com/RooCodeInc/Roo-Code) · [Cline API](https://github.com/cline/cline)

[Marked](https://github.com/markedjs/marked) · MIT · Markdown → HTML documentation.

</details>

Apache-2.0 · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [Security](SECURITY.md)

Pavel Park · [GitHub](https://github.com/ParkPavel) · [Telegram](https://t.me/parkpavel_chigon) · [Support / Поддержать](https://web.tribute.tg/d/Sh8)
