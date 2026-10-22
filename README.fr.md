# Borshkit

**Des tâches, un contexte portable et des résultats vérifiables pour coder avec l’IA.**

Décris le résultat. Confie le travail à un agent. Obtiens des preuves liées à l’état exact des fichiers et une liste claire de vérifications humaines.

<a href="README.md">ru</a> · <a href="README.en.md">en</a> · <a href="README.de.md">de</a> · <a href="README.ko.md">ko</a> · <a href="README.zh-TW.md">zh-TW</a> · <a href="README.fr.md">fr</a>

[Version 0.13.0](https://github.com/ParkPavel/borshkit/releases/tag/0.13.0) · [CI](https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml) · [Documentation (russe)](docs/README.md)

## Commencer

0.13.0 · Node.js 22+ · Git

Installe l’archive vérifiée de GitHub Release. Le paquet n’est pas encore publié dans le registre npm. Pour modifier les sources : [git clone et npm link](docs/release.md).

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/download/0.13.0/borshkit.tgz
borshkit help
```

[Quickstart](docs/guide/quickstart.md) · [Guide](docs/guide/workflow.md) · [Commands](docs/reference/commands.md) · [Website](https://parkpavel.github.io/borshkit/)

## Disponible aujourd’hui

CLI, plugin Claude Code et VSIX. Exécution via Claude Code, Codex, Gemini et API ; API natives Copilot/Roo/Cline dans VS Code avec des limites explicites. Transfert de tâches et carte statique JS/TS, Python, Go et Swift. [Capacités et limites](docs/guide/native-integrations.md).

PASS : vérification réussie. FAIL : vérification échouée. UNKNOWN : preuve manquante. Les essais réels avec modèles et appareils attendent les retours des utilisateurs. Les messages CLI et la plupart des guides sont en russe ; les commandes ont des alias anglais.

[Architecture](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [Détails et limites](docs/reference/overview.fr.md) · [Context handoff](docs/guide/handoff.md)

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

La recette complète, avec les versions et les licences, se trouve dans [docs/ingredients.md](docs/ingredients.md) (en russe). **Tous les contributeurs** de ces projets, 1262 entrées : [CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md). Merci à chacun d’entre vous !


Références API (sans copie de code): [VS Code Language Model API](https://github.com/microsoft/vscode) · [Roo Code API](https://github.com/RooCodeInc/Roo-Code) · [Cline API](https://github.com/cline/cline)

</details>

Apache-2.0 · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [Security](SECURITY.md)

Pavel Park · [GitHub](https://github.com/ParkPavel) · [Telegram](https://t.me/parkpavel_chigon) · [Support / Поддержать](https://web.tribute.tg/d/Sh8)
