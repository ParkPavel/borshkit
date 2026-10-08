<p align="center">
  <img src="assets/diagrams/banner.fr.svg" alt="Borshkit — Modular AI Workspace : tâches, preuves, recette, connaissances" width="100%">
</p>

<p align="center">
  <a href="https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml"><img src="https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml/badge.svg" alt="CI : Linux et Windows"></a>
  <img src="https://img.shields.io/badge/version-0.12.0-b3261e" alt="version 0.12.0">
  <a href="https://github.com/ParkPavel/borshkit/releases"><img src="https://img.shields.io/github/downloads/ParkPavel/borshkit/total?label=t%C3%A9l%C3%A9chargements&color=b3261e" alt="téléchargements de l’archive des versions"></a>
  <img src="https://img.shields.io/badge/node-%E2%89%A522-2b1d1d" alt="Node.js 22 ou plus récent">
  <img src="https://img.shields.io/badge/dependencies-0-2e7d32" alt="zéro dépendance">
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-8c1c13" alt="plugin Claude Code">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-6b5757" alt="licence Apache-2.0"></a>
  <a href="https://t.me/parkpavel_chigon"><img src="https://img.shields.io/badge/Telegram-cha%C3%AEne%20de%20l%E2%80%99auteur-26a5e4?logo=telegram&logoColor=white" alt="Chaîne Telegram de l’auteur"></a>
</p>

<p align="center">
  <a href="README.md">Русский</a> · <a href="README.en.md">English</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ko.md">한국어</a> · <a href="README.zh-TW.md">繁體中文</a> · <b>Français</b>
</p>

# Borshkit

**Modular AI Workspace** — un poste de travail pour les agents d’IA, dans n’importe quel projet : une application web, un plugin, une bibliothèque, une application mobile ou un travail de recherche.

Tu dis ce que tu veux obtenir. Les agents font le travail. Borshkit montre ce qui est **prouvé** par des vérifications et ce que tu dois regarder toi-même. Borshkit ne croit un modèle sur parole que là où tu l’as autorisé pour ce type de critère et qu’une mesure le confirme.

> **Version de cette branche : 0.12.0, publication en préparation.** Les tests utilisent de faux exécutants ; la CI cible Linux et Windows. La qualité des modèles réels et les fonctions futures ne sont pas présentées comme validées. [Limites](#limites).

## Une équipe visible

<p align="center"><img src="assets/diagrams/team.fr.svg" alt="Tâche → rôle → exécutant → modèle/API → résultat → revue indépendante ; proposition, application, lancement, vérification et acceptation sont séparés" width="100%"></p>

`borshkit team` affiche les modèles, la fraîcheur des vérifications, les évaluations par rôle, les pools attribués et les ressources connues. `borshkit team plan <tâche>` explique les candidats et réserve une famille de modèles pour la revue indépendante. `team propose` enregistre une proposition ; application et lancement sont distincts. Des données périmées bloquent l’application. La gratuité des API doit être vérifiée dans le compte ; les soldes inconnus restent explicites.

Le nouveau rôle `design-prompter` rédige un brief de design visuel. Le modèle est choisi selon une évaluation du rôle. [Commandes et formats](docs/reference/team-resources.md) · [Architecture et prochaines étapes](docs/concepts/team-workspace.md) · [Audit](docs/discussions/modernization-2026-10-08.md) (documentation russe).

L’assistant de configuration, la confirmation sécurisée depuis un téléphone, les adaptateurs natifs Gemini/IDE et le service en arrière-plan restent prévus. Codex et Claude Code sont les entrées principales via leurs outils disponibles ; l’environnement transcrit la voix. `status --watch` fonctionne tant que la CLI tourne. L’autopilote est désactivé par défaut.
>
> **Note sur la langue :** pour l’instant, les messages de Borshkit sont en russe. Chaque commande et chaque option a aussi un nom anglais, et ce README utilise ces noms-là.

## L’idée principale

<p align="center"><img src="assets/diagrams/flow.fr.svg" alt="Parcours d’une tâche : objectif et critères → l’agent travaille dans sa propre copie du projet → vérifications → revue par un autre exécutant → fiche de recette ; issues : à corriger, non vérifié, t’attend, accepté ; une fois acceptée, fusion dans main et envoi" width="100%"></p>

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

Le plugin donne à l’agent le skill Borshkit, des hooks de protection et les commandes `borshkit` et `borsch` dans le terminal de Claude Code. Pour les utiliser aussi dans ton propre terminal, installe en plus la commande comme ci-dessous.

**Comme commande dans le terminal :**

```sh
git clone https://github.com/ParkPavel/borshkit.git
cd borshkit && npm link        # ajoute les commandes borshkit et borsch
```

Ou en une commande depuis la dernière version, sans clone :

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/latest/download/borshkit.tgz
```

Le paquet n’est pas encore publié sur npm. Le compteur de téléchargements en haut ne compte que cette archive : les installations par le plugin et par `git clone` n’y sont pas.

## Ta première tâche

```sh
cd my-project
borshkit init                                     # dossier borshkit/ à la racine, caché de l’historique du projet
borshkit executor add claude                      # Claude Code avec ton abonnement ; tu confirmes dans le terminal
borshkit task new theme --goal "Dark theme in settings"
borshkit job run theme --role architect --executor claude     # propose des objectifs et des critères
borshkit job run theme --role implementer --executor claude   # écrit le code dans une copie séparée
borshkit task verify theme                        # tests, build, linter
borshkit job run theme --role reviewer --executor codex       # relecture par une autre famille de modèles
borshkit task converge theme                      # feuille de recette : ce qui est prouvé, ce qui t’attend
borshkit task confirm theme C3 yes "saw the dark theme after a restart"
borshkit merge theme && borshkit push             # dans la version principale et sur GitHub — seulement après ton « oui »
```

Toutes les commandes : [référence des commandes](docs/reference/commands.md) (noms russes et anglais côte à côte). Guide pas à pas (en russe) : [démarrage rapide](docs/guide/quickstart.md).

## Comment ça marche

<p align="center"><img src="assets/diagrams/architecture.fr.svg" alt="Organisation : toi, Claude Code et Codex appelez la même commande borshkit ; modules du noyau dans core/ ; fichiers dans borshkit/, .state/ et dans une copie de tâche séparée sur sa propre branche ; exécutants branchés par adaptateurs" width="100%"></p>

**De quoi c’est fait.** Toi, Claude Code et Codex appelez tous la même commande `borshkit`. Le noyau, ce sont les modules de `core/`. Tout l’état est fait de fichiers ordinaires dans `borshkit/` et `.state/`, et l’agent travaille dans une copie séparée du projet, sur sa propre branche. Les exécutants se branchent par des adaptateurs. [En savoir plus](docs/concepts/space.md)

<p align="center"><img src="assets/diagrams/evidence.fr.svg" alt="Empreinte d’état : commit et fichiers, contrat, réglages, matériaux et code de Borshkit ; une preuve garde cette empreinte et devient périmée au moindre écart" width="100%"></p>

**Une preuve peut expirer.** Borshkit retient l’état exact sur lequel une vérification est passée : le commit et l’empreinte de chaque fichier, y compris les modifications pas encore commitées. Change un seul octet, et la vérification doit être relancée. [En savoir plus](docs/concepts/evidence.md)

<p align="center"><img src="assets/diagrams/pool.fr.svg" alt="Choix de l’exécutant : les candidats passent les filtres confidentialité, capacités, « le relecteur n’est pas l’auteur » et limite de relais ; en cas de limite ou d’échec le travail passe au suivant, et sans candidat c’est l’arrêt critique avec rapport, en attendant toi" width="100%"></p>

**Une limite n’est pas un arrêt.** Un pool est une file d’exécutants : Claude Code, Codex, des API gratuites et locales. Quand l’un d’eux atteint sa limite, le travail passe au suivant que le mode de confidentialité autorise et qui sait faire ce travail. Les questions critiques n’attendent que toi. [En savoir plus](docs/concepts/executors.md)

<p align="center"><img src="assets/diagrams/kb.fr.svg" alt="Connaissances : code, tests, docs, tâches et leçons deviennent des notes dans knowledge/_generated/ et un index .state/kb.sqlite ; le contexte des travaux, les requêtes SQL et l’export Obsidian s’en servent" width="100%"></p>

**Les connaissances sont des notes, pas une boîte noire.** Le projet devient des notes avec des `[[links]]` pour Obsidian et, par-dessus, un index SQL. Chaque travail reçoit sa propre part du contexte. Cette documentation fonctionne de la même façon : Borshkit a construit lui-même son [graphe de documentation](docs/graph/README.md).

## Ce qu’il sait faire

| Domaine | Ce que tu obtiens |
|---|---|
| **Recette par objectifs** | critères `auto` / `model` / `manual`, une feuille de recette, des objectifs de confiance envers les modèles, confirmés par la mesure |
| **Espace de travail** | le dossier `borshkit/` est un coffre Obsidian avec son propre historique ; la règle `.gitignore` est ajoutée et vérifiée automatiquement |
| **Exécutants** | Claude Code, Codex (avec GPT Image), toute API compatible OpenAI, tes propres programmes ; des pools avec bascule |
| **18 rôles** | architecte, développeur, relecteurs, testeur, chercheur, designers, auteur de prompts de design, illustrateur de README… |
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

La [bibliothèque](library/README.md) contient 3 packs de skills (25 skills) et 63 liens vérifiés : composants, animation, systèmes de design, accessibilité, icônes, polices, outils de qualité. Dans le terminal : `borshkit skills` et `borshkit library`.

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

La recette complète, avec les versions et les licences, se trouve dans [docs/ingredients.md](docs/ingredients.md) (en russe). **Tous les contributeurs** de ces projets, 1262 entrées : [CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md). Merci à chacun d’entre vous !

## Limites

- Borshkit vérifie le paquet de tâche qu’il envoie lui-même à l’agent. Ce que Claude Code ou Codex lisent ensuite dans les fichiers de la copie du projet, il ne le voit pas : les fichiers ignorés (`.env`) ne sont pas dans la copie, mais l’agent peut lire tous les autres.
- Les vérifications des tâches (tests, build) tournent avec ton environnement, car les tests ont parfois besoin de clés. Le filtre d’environnement ne s’applique qu’aux exécutants.
- La carte des connaissances comprend les liens du code JS/TS et du Markdown. Swift, Python, Go et les autres langages n’y entrent pas encore ; la recette n’en dépend pas.
- Les adaptateurs Claude Code et Codex sont testés avec de faux programmes qui produisent le même format d’événements. Les options d’un Claude Code installé ont été vérifiées. La CI ne lance pas de vrais modèles.
- Les images via Codex (GPT Image) ne sont pas encore testées : `borshkit executor probe codex` te le dira pour ton abonnement.
- On n’a pas testé si le graphe d’Obsidian affiche les liens issus des propriétés des notes. C’est pourquoi les liens sont répétés sous forme de liens ordinaires dans le texte.
- Pour l’instant, les messages de Borshkit sont uniquement en russe ; les commandes et les options existent en russe et en anglais.
- `node:sqlite` est encore expérimental dans Node 22.
- La détection des clés et des données personnelles par motifs ne repère pas tout.

## Documentation

La documentation est en russe pour l’instant :
- [Plan de la documentation](docs/README.md) — démarrage rapide, concepts, référence.
- [Spécification](docs/spec.md) — l’analyse d’origine et les décisions D1–D22.
- [Journal des modifications](CHANGELOG.md) · [Contribuer](CONTRIBUTING.md) · [Sécurité](SECURITY.md) · [Pour les agents développeurs](AGENTS.md)

## Développement

```sh
npm run verify   # vérifications statiques et tous les tests ; la CI les lance sous Linux et Windows
```

## Auteur

**Pavel Park** — [GitHub](https://github.com/ParkPavel) · [chaîne Telegram](https://t.me/parkpavel_chigon)

## Licence

Apache-2.0 — voir [LICENSE](LICENSE) et [NOTICE](NOTICE). Les skills de `packs/` sont sous licence MIT, chaque pack avec la licence de son auteur.
