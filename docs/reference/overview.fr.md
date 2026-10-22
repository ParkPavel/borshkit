---
bk-type: reference
related: ["../architecture.md", "../roadmap.md"]
---
# Détails et limites — 0.13

## Une équipe visible

<p align="center"><img src="../../assets/diagrams/team.fr.svg" alt="Tâche → rôle → exécutant → modèle/API → résultat → revue indépendante ; proposition, application, lancement, vérification et acceptation sont séparés" width="100%"></p>

`borshkit team` affiche les modèles, la fraîcheur des vérifications, les évaluations par rôle, les pools attribués et les ressources connues. `borshkit team plan <tâche>` explique les candidats et réserve une famille de modèles pour la revue indépendante. `team propose` enregistre une proposition ; application et lancement sont distincts. Des données périmées bloquent l’application. La gratuité des API doit être vérifiée dans le compte ; les soldes inconnus restent explicites.

Le nouveau rôle `design-prompter` rédige un brief de design visuel. Le modèle est choisi selon une évaluation du rôle. [Commandes et formats](../../docs/reference/team-resources.md) · [Architecture et prochaines étapes](../../docs/concepts/team-workspace.md) · [Audit](../../docs/discussions/modernization-2026-10-08.md) (documentation russe).

`borshkit setup` enregistre l’environnement, la confidentialité, les modèles explicites et les rôles. `--interactive` ouvre le dialogue du terminal ; les commandes par étape fonctionnent depuis l’application. [Guide](../../docs/guide/setup.md) (russe). Compatibilité et qualité du rôle sont distinctes ; une proposition n’applique pas les réglages et ne lance pas le travail.

<p align="center"><img src="../../assets/diagrams/setup.fr.svg" alt="Configuration : environnement, confidentialité, modèles, responsabilités et proposition ; application, évaluation, affectation et lancement séparés" width="100%"></p>

La confirmation par passkey des réglages et questions critiques est implémentée après un appairage de confiance. La version inclut `assessment`, budget/WIP communs, dépendances et checkpoints, `monitor start/stop` explicite, Gemini CLI/API, un VSIX local et le transfert de fichiers avec de nouvelles vérifications.

La version 0.13 propose l’export des instructions et des points d’entrée natifs dans le VSIX : Copilot renvoie du texte sans outils ; Roo fournit ID, événements et annulation ; Cline permet seulement le lancement avec un état inconnu. Le mode de confidentialité strict bloque cette voie native. [Fonctions, installation et limites](../guide/native-integrations.md) (russe). L’autopilote est désactivé par défaut.

[Exploitation et limites de sécurité](../../docs/guide/team-operations.md) · [Contrôle de l’implémentation](../../docs/discussions/modernization-2026-10-09.md) (russe). Les tests locaux ne remplacent pas les validations du modèle réel, du navigateur du téléphone, de VS Code et du commit CI exact.

<p align="center"><img src="../../assets/diagrams/operations.fr.svg" alt="Équipe : évaluation, budget, proposition, passkey et lancement séparé ; le moniteur propose, le transfert demande de nouvelles vérifications" width="100%"></p>
>
> **Note sur la langue :** pour l’instant, les messages de Borshkit sont en russe. Chaque commande et chaque option a aussi un nom anglais, et ce README utilise ces noms-là.

## L’idée principale

<p align="center"><img src="../../assets/diagrams/flow.fr.svg" alt="Parcours d’une tâche : objectif et critères → l’agent travaille dans sa propre copie du projet → vérifications → revue par un autre exécutant → fiche de recette ; issues : à corriger, non vérifié, t’attend, accepté ; une fois acceptée, fusion dans main et envoi" width="100%"></p>

Un modèle dit « terminé ». Ce n’est pas encore une recette :
- chaque preuve est liée à l’état exact des fichiers ;
- ce qui peut être vérifié automatiquement l’est automatiquement ;
- ce qui ne peut pas l’être devient une courte consigne pour toi ;
- ce qui n’a pas été vérifié porte exactement ce nom : **non vérifié**.

## Installation

Il te faut Node.js 22+ et Git. Il n’y a aucune dépendance externe.

**Comme plugin Claude Code :**

```
/plugin marketplace add ParkPavel/borshkit
/plugin install borshkit@borshkit
```

Le plugin ajoute le skill, les commandes slash et les hooks de protection de Claude Code. Il n’installe pas de commande globale dans le PATH. Installe séparément la CLI pour utiliser `borshkit` et `borsch` dans un terminal.

**Comme commande dans le terminal :**

```sh
git clone https://github.com/ParkPavel/borshkit.git
cd borshkit && npm link        # ajoute les commandes borshkit et borsch
```

Ou en une commande depuis la dernière version, sans clone :

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/latest/download/borshkit.tgz
```

Le paquet n’est pas encore publié dans le registre npm ; la commande ci-dessus installe directement l’archive GitHub.


## Ta première tâche

```sh
cd my-project
borshkit init                                     # dossier borshkit/ à la racine, caché de l’historique du projet
borshkit executor add codex
borshkit executor add claude                      # Claude Code avec ton abonnement ; tu confirmes dans le terminal
borshkit task new dark-mode --goal "Dark theme in settings"
borshkit job run dark-mode --role architect --executor claude     # propose des objectifs et des critères
# Vérifie architect-proposal.json et reporte les goals, criteria et checks validés dans contract.json.
borshkit job run dark-mode --role implementer --executor claude   # écrit le code dans une copie séparée
borshkit task verify dark-mode                        # tests, build, linter
borshkit job run dark-mode --role reviewer --executor codex       # relecture par une autre famille de modèles
borshkit task converge dark-mode                      # feuille de recette : ce qui est prouvé, ce qui t’attend
borshkit task confirm dark-mode C3 yes "saw the dark theme after a restart"
borshkit merge dark-mode && borshkit push             # dans la version principale et sur GitHub — seulement après ton « oui »
```

Toutes les commandes : [référence des commandes](../../docs/reference/commands.md) (noms russes et anglais côte à côte). Guide pas à pas (en russe) : [démarrage rapide](../../docs/guide/quickstart.md).

## Comment ça marche

Voir [l’architecture actuelle et les niveaux de prise en charge](../architecture.md) et le [guide du cycle de travail](../guide/workflow.md).

## Ce qu’il sait faire

| Domaine | Ce que tu obtiens |
|---|---|
| **Recette par objectifs** | critères `auto` / `model` / `manual`, une feuille de recette, des objectifs de confiance envers les modèles, confirmés par la mesure |
| **Espace de travail** | le dossier `borshkit/` est un coffre Obsidian avec son propre historique ; la règle `.gitignore` est ajoutée et vérifiée automatiquement |
| **Exécutants** | Claude Code, Codex (avec GPT Image), toute API compatible OpenAI, tes propres programmes ; des pools avec bascule |
| **21 rôles** | architecte, développeur, relecteurs, testeur, chercheur, designers, auteur de prompts de design, illustrateur de README… |
| **Pilote automatique** | les questions de routine reçoivent leur réponse par défaut au bout d’une minute ; les questions critiques arrêtent tout, avec un rapport et une passation du contexte |
| **Tableau de bord** | qui a reçu le travail, qui travaille, ce qui t’attend : dans le terminal, dans `STATUS.md` et dans la ligne d’état de Claude Code |
| **Recherche** | les sources sont conservées en copie ; la vérification `citations` contrôle chaque citation mot pour mot |
| **Confidentialité** | trois modes ; le paquet de tâche envoyé à l’agent est vérifié avant l’envoi (clés, données personnelles) ; les réglages ne changent que par des propositions |
| **Git pour débutants** | « qu’est-ce qui a changé », « qui a modifié ça », « remets comme avant » — avec des mots simples, sans commande destructrice |
| **Remerciements** | vérifications `attribution` et `readme-assets`, la liste complète des contributeurs de chaque source |

## Frontend, design et iOS

Borshkit a des rôles pour les interfaces, et chacun ne reçoit que ses propres skills (compétences) :

| Rôle | Ce qu’il fait | Skills et sources primaires |
|---|---|---|
| `ui-engineer` | construit l’interface : chaque état, les animations, le clavier | Emil Kowalski, ECC; Vercel Web Interface Guidelines, shadcn/ui, Radix, React Aria, WCAG |
| `ios-designer` | passe en revue les interfaces iPhone et iPad | `apple-design`, Liquid Glass, SwiftUI; Apple HIG, SF Symbols |
| `motion-reviewer` | passe les animations en revue avec rigueur | `review-animations`, `animation-vocabulary`, `motion-foundations` |
| `a11y-reviewer` | contrôle l’accessibilité selon WCAG 2.2 AA | ECC `accessibility`, `frontend-a11y`; WAI-ARIA APG, axe-core |
| `designer` | casse l’interface avec les pires données possibles | `break-ui` |

La [bibliothèque](../../library/README.md) contient 3 packs de skills (25 skills) et 63 liens vérifiés : composants, animation, systèmes de design, accessibilité, icônes, polices, outils de qualité. Dans le terminal : `borshkit skills` et `borshkit library`.

## La recette

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

La recette complète, avec les versions et les licences, se trouve dans [docs/ingredients.md](../../docs/ingredients.md) (en russe). **Tous les contributeurs** de ces projets, 1262 entrées : [CONTRIBUTORS-REFERENCES.md](../../CONTRIBUTORS-REFERENCES.md). Merci à chacun d’entre vous !

## Limites

- Borshkit vérifie le paquet de tâche qu’il envoie lui-même à l’agent. Ce que Claude Code ou Codex lisent ensuite dans les fichiers de la copie du projet, il ne le voit pas : les fichiers ignorés (`.env`) ne sont pas dans la copie, mais l’agent peut lire tous les autres.
- Les vérifications des tâches (tests, build) tournent avec ton environnement, car les tests ont parfois besoin de clés. Le filtre d’environnement ne s’applique qu’aux exécutants.
- La carte des connaissances comprend les liens du code JS/TS et du Markdown. Swift, Python, Go et les autres langages n’y entrent pas encore ; la recette n’en dépend pas.
- Les adaptateurs Claude Code, Codex et Gemini sont testés avec de faux programmes qui produisent le même format d’événements. Les options d’un Claude Code installé ont été vérifiées. La CI ne lance pas de vrais modèles.
- Les images via Codex (GPT Image) ne sont pas encore testées : `borshkit executor probe codex` te le dira pour ton abonnement.
- On n’a pas testé si le graphe d’Obsidian affiche les liens issus des propriétés des notes. C’est pourquoi les liens sont répétés sous forme de liens ordinaires dans le texte.
- Pour l’instant, les messages de Borshkit sont uniquement en russe ; les commandes et les options existent en russe et en anglais.
- `node:sqlite` est encore expérimental dans Node 22.
- La détection des clés et des données personnelles par motifs ne repère pas tout.

## Documentation

La documentation est en russe pour l’instant :
- [Plan de la documentation](../../docs/README.md) — démarrage rapide, concepts, référence.
- [Spécification](../../docs/spec.md) — l’analyse d’origine et les décisions D1–D22.
- [Journal des modifications](../../CHANGELOG.md) · [Contribuer](../../CONTRIBUTING.md) · [Sécurité](../../SECURITY.md) · [Pour les agents développeurs](../../AGENTS.md)

## Développement

```sh
npm run verify   # vérifications statiques et tous les tests ; la CI les lance sous Linux, Windows et macOS
```

## Auteur

**Pavel Park** — [GitHub](https://github.com/ParkPavel) · [chaîne Telegram](https://t.me/parkpavel_chigon)

## Soutenir le projet

Borshkit est gratuit et open source. S’il vous aide, soutenez son développement par un don via Tribute.

<p><a href="https://web.tribute.tg/d/Sh8"><img src="https://img.shields.io/badge/Tribute-Faire%20un%20don-e8554e?style=for-the-badge&logo=telegram&logoColor=white" alt="Faire un don"></a></p>

Depuis le terminal : `borshkit support` affiche le lien et propose de l’ouvrir dans le navigateur. Une étoile sur GitHub et en parler à vos collègues aident aussi beaucoup.

## Licence

Apache-2.0 — voir [LICENSE](../../LICENSE) et [NOTICE](../../NOTICE). Les skills de `packs/` sont sous licence MIT, chaque pack avec la licence de son auteur.


## Связи

- [Текущая архитектура](../architecture.md)
- [Дорожная карта](../roadmap.md)
