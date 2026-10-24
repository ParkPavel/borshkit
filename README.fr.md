# Borshkit

[![Borshkit — tasks, context, evidence](assets/product/hero.webp)](https://parkpavel.github.io/borshkit/)

<sub>Illustration du parcours : tâches, contexte et preuves.</sub>

**Des tâches, un contexte portable et des résultats vérifiables pour coder avec l’IA.**

Décris le résultat. Confie le travail à un agent. Obtiens des preuves liées à l’état exact des fichiers et une liste claire de vérifications humaines.

<a href="README.md">ru</a> · <a href="README.en.md">en</a> · <a href="README.de.md">de</a> · <a href="README.ko.md">ko</a> · <a href="README.zh-TW.md">zh-TW</a> · <a href="README.fr.md">fr</a>

[![Release](https://img.shields.io/github/v/release/ParkPavel/borshkit?style=flat-square&color=d6edaf)](https://github.com/ParkPavel/borshkit/releases) [![CI](https://img.shields.io/github/actions/workflow/status/ParkPavel/borshkit/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml) [![Apache-2.0](https://img.shields.io/github/license/ParkPavel/borshkit?style=flat-square&color=aeb4bb)](LICENSE)

[![Commencer](https://img.shields.io/badge/Commencer-d6edaf?style=for-the-badge&labelColor=20252b)](https://parkpavel.github.io/borshkit/read/guide/quickstart.html) [![Documentation](https://img.shields.io/badge/Documentation-aeb4bb?style=for-the-badge&labelColor=20252b)](https://parkpavel.github.io/borshkit/read/index.html) [![Télécharger](https://img.shields.io/badge/T%C3%A9l%C3%A9charger-aeb4bb?style=for-the-badge&labelColor=20252b)](https://github.com/ParkPavel/borshkit/releases/tag/0.13.1) [![Soutenir](https://img.shields.io/badge/Soutenir-d6edaf?style=for-the-badge&labelColor=20252b)](https://web.tribute.tg/d/Sh8)

## Commencer

0.13.1 · Node.js 22+ · Git

**Dans 0.13.1 :** diagnostic détaillé des processus, délais limités et états BLOCKED/UNKNOWN quand une vérification ne peut pas aboutir. [Changements et limites connues](https://parkpavel.github.io/borshkit/read/release-0.13.1.html) (russe).

Installe l’archive vérifiée de GitHub Release. Le paquet n’est pas encore publié dans le registre npm. Pour modifier les sources : [git clone et npm link](https://parkpavel.github.io/borshkit/read/release.html).

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/download/0.13.1/borshkit.tgz
borshkit help
```

[Quickstart](https://parkpavel.github.io/borshkit/read/guide/quickstart.html) · [Guide](https://parkpavel.github.io/borshkit/read/guide/workflow.html) · [Commands](https://parkpavel.github.io/borshkit/read/reference/commands.html) · [Website](https://parkpavel.github.io/borshkit/)

## Disponible aujourd’hui

CLI, plugin Claude Code et VSIX. Exécution via Claude Code, Codex, Gemini et API ; API natives Copilot/Roo/Cline dans VS Code avec des limites explicites. Transfert de tâches et carte statique JS/TS, Python, Go et Swift. [Capacités et limites](https://parkpavel.github.io/borshkit/read/guide/native-integrations.html).

PASS : vérification réussie. FAIL : vérification échouée. UNKNOWN : preuve manquante. Les essais réels avec modèles et appareils attendent les retours des utilisateurs. Les messages CLI et la plupart des guides sont en russe ; les commandes ont des alias anglais.

[Architecture](https://parkpavel.github.io/borshkit/read/architecture.html) · [Roadmap](https://parkpavel.github.io/borshkit/read/roadmap.html) · [Détails et limites](https://parkpavel.github.io/borshkit/read/reference/overview.fr.html) · [Context handoff](https://parkpavel.github.io/borshkit/read/guide/handoff.html)


| Tâches | Contexte | Preuves |
|---|---|---|
| [Objectifs, périmètre et critères](https://parkpavel.github.io/borshkit/read/reference/contract.html) | [Passage entre environnements](https://parkpavel.github.io/borshkit/read/guide/handoff.html) | [Vérifications liées aux fichiers](https://parkpavel.github.io/borshkit/read/concepts/evidence.html) |

<details>
<summary>Faut-il une IA payante ?</summary>

Les tâches et vérifications locales ne nécessitent pas de modèle. Le travail de l’agent utilise un environnement configuré séparément et son tarif.

</details>

<details>
<summary>Que contient le transfert ?</summary>

Le contrat, les décisions et un contexte limité avec sa provenance. L’historique du chat et la recette validée ne sont pas transférés.

</details>

> ### Soutenir Borshkit
>
> L’open source avance grâce aux personnes. Aide à financer le temps de développement et un outil plus accessible.
>
> [![Soutenir Borshkit](https://img.shields.io/badge/Soutenir%20Borshkit-d6edaf?style=for-the-badge&labelColor=20252b)](https://web.tribute.tg/d/Sh8)


<details>
<summary>Credits / Источники</summary>


Borshkit, c’est un bortsch : il est cuisiné avec les meilleurs ingrédients, que d’autres ont fait pousser et partagés ouvertement.

> Certains ingrédients ont été cuits deux fois. Spec Kit a d’abord mijoté dans Claudex, puis est repassé sur le feu sous forme de vérification de spécification, avant de finir sa cuisson dans Borshkit. Tout est arrivé à table en parfait état : licences conservées, auteurs cités.

| Ingrédient | Ce qui a été pris |
|---|---|
| [Claudex](https://github.com/ParkPavel/claudex) | le noyau : contrat de tâche, preuves, convergence, adaptateurs CLI |
| [Ponytail](https://github.com/DietrichGebert/ponytail) ([soutenir](https://github.com/sponsors/DietrichGebert)) | le « senior paresseux » — faire le minimum, rester simple |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | 14 skills d’ingénierie du design et d’animation |
| [ECC](https://github.com/affaan-m/ECC) ([soutenir](https://github.com/sponsors/affaan-m)) | 9 skills frontend, l’idée des modules |
| [Spec Kit](https://github.com/github/spec-kit) | le chemin « intention → spécification → tâches → convergence » (via Claudex, deux fois) |
| [Superpowers](https://github.com/obra/superpowers) ([soutenir](https://github.com/sponsors/obra)) | une copie séparée pour l’agent, le test avant le correctif (via Claudex) |
| [Graphify](https://github.com/Graphify-Labs/graphify) ([soutenir](https://github.com/sponsors/safishamsi)) | la provenance des liens dans une carte du code (idée, via Claudex) |
| [prompt-agent](https://github.com/kvyb/prompt-agent) | l’évaluation des travaux passés (idée, via Claudex) |
| [HIGAgentSkills](https://github.com/justinwetch/HIGAgentSkills) | l’aiguillage selon Apple HIG (lien seulement) |
| [Agent Reach](https://github.com/panniantong/agent-reach) | les chemins de collecte sur le web pour le chercheur |
| [free-llm-api-resources](https://github.com/raullenchai/free-llm-api-resources) | un repère pour choisir des API gratuites (lien seulement) |

La recette complète, avec les versions et les licences, se trouve dans [docs/ingredients.md](https://parkpavel.github.io/borshkit/read/ingredients.html) (en russe). **Tous les contributeurs** de ces projets, 1262 entrées : [CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md). Merci à chacun d’entre vous !


Références API (sans copie de code): [VS Code Language Model API](https://github.com/microsoft/vscode) · [Roo Code API](https://github.com/RooCodeInc/Roo-Code) · [Cline API](https://github.com/cline/cline)

[Marked](https://github.com/markedjs/marked) · MIT · Markdown → HTML documentation.

</details>

Apache-2.0 · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [Security](SECURITY.md)

Pavel Park · [GitHub](https://github.com/ParkPavel) · [Telegram](https://t.me/parkpavel_chigon) · [Support / Поддержать](https://web.tribute.tg/d/Sh8)
