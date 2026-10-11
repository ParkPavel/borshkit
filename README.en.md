<p align="center">
  <img src="assets/diagrams/banner.en.svg" alt="Borshkit — Modular AI Workspace: tasks, evidence, acceptance, knowledge" width="100%">
</p>

<p align="center">
  <a href="https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml"><img src="https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml/badge.svg" alt="CI: Linux, Windows and macOS"></a>
  <img src="https://img.shields.io/badge/version-0.12.0-b3261e" alt="version 0.12.0">
  <a href="https://github.com/ParkPavel/borshkit/releases"><img src="https://img.shields.io/github/downloads/ParkPavel/borshkit/total?label=downloads&color=b3261e" alt="release archive downloads"></a>
  <img src="https://img.shields.io/badge/node-%E2%89%A522-2b1d1d" alt="Node.js 22 or newer">
  <img src="https://img.shields.io/badge/dependencies-0-2e7d32" alt="zero dependencies">
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-8c1c13" alt="Claude Code plugin">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-6b5757" alt="license Apache-2.0"></a>
  <a href="https://t.me/parkpavel_chigon"><img src="https://img.shields.io/badge/Telegram-author%27s%20channel-26a5e4?logo=telegram&logoColor=white" alt="The author's Telegram channel"></a>
</p>

<p align="center">
  <a href="README.md">Русский</a> · <b>English</b> · <a href="README.de.md">Deutsch</a> · <a href="README.ko.md">한국어</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.fr.md">Français</a>
</p>

# Borshkit

**Modular AI Workspace** — a workplace for AI agents in any project: a web app, a plugin, a library, a mobile app or a piece of research.

You say what should come out. Agents do the work. Borshkit shows what has been **proven** by checks and what you need to look at yourself. Borshkit takes a model’s word only where you allowed it for that kind of criterion and a measurement backs it.

> **Package version: 0.12.0.** Tests use fake executors; CI targets Linux, Windows and macOS. Live model quality and future features are not claimed as implemented. [Limits](#limits).

## A visible team

<p align="center"><img src="assets/diagrams/team.en.svg" alt="Task → role → executor → model/API → result → independent review; proposal, application, launch, verification and acceptance are separate" width="100%"></p>

`borshkit team` shows models, connection freshness, role assessments, assigned pools and known resources. `borshkit team plan <task>` explains candidates and reserves a model family for independent review. `team propose` saves a settings proposal; applying it and starting work are separate actions. Stale data blocks application. Free API access must be checked in the account; unknown balances stay explicit.

The new `design-prompter` role writes a visual design brief. Choose a model using a role assessment rather than its brand. [Commands and formats](docs/reference/team-resources.md) · [Team architecture and next stages](docs/concepts/team-workspace.md) · [Audit](docs/discussions/modernization-2026-10-08.md) (Russian documentation).

`borshkit setup` saves the host, privacy, explicit models and roles. Use `--interactive` in a terminal or step commands from an app. [Guide](docs/guide/setup.md) (Russian). Compatibility is separate from role quality; a proposal neither applies settings nor launches work.

<p align="center"><img src="assets/diagrams/setup.en.svg" alt="Setup: host, privacy, models, responsibilities and proposal; application, assessments, routing and launch are separate" width="100%"></p>

Passkey approval for settings and critical questions is implemented after trusted enrollment. The branch adds `assessment`, shared budget/WIP, dependencies and checkpoints, explicit `monitor start/stop`, Gemini CLI/API, a local VSIX and explicit source transfer with fresh verification. Copilot/Roo/Cline use instruction exports; native executors are not claimed. Autopilot stays off.

[Operations and security limits](docs/guide/team-operations.md) · [Implementation audit](docs/discussions/modernization-2026-10-09.md) (Russian). Local tests do not substitute for real model, phone browser, VS Code or exact-commit CI validation.

<p align="center"><img src="assets/diagrams/operations.en.svg" alt="Team: assessment, budget, proposal, passkey and separate launch; monitor suggests, transfer requires fresh checks" width="100%"></p>
>
> **Language note:** Borshkit's messages are in Russian for now. Every command and flag also has an English name, and this README uses those.

## The main idea

<p align="center"><img src="assets/diagrams/flow.en.svg" alt="How a task travels: goal and criteria → agent works in its own copy of the project → checks → review by a different executor → acceptance sheet; outcomes: needs a fix, unverified, waiting for you, accepted; once accepted it is merged into main and pushed" width="100%"></p>

A model says “done”. That is not acceptance yet:
- every piece of evidence is bound to the exact state of the files;
- whatever can be checked automatically is checked automatically;
- whatever cannot becomes a short instruction for you;
- whatever was not checked is called exactly that: **not checked**.

## Install

You need Node.js 22+ and Git. There are no external dependencies.

**As a Claude Code plugin:**

```
/plugin marketplace add ParkPavel/borshkit
/plugin install borshkit@borshkit
```

The plugin gives the agent the Borshkit skill, protective hooks, and the `borshkit` and `borsch` commands inside Claude Code's terminal. To use them in your own terminal too, also install the command as shown below.

**As a terminal command:**

```sh
git clone https://github.com/ParkPavel/borshkit.git
cd borshkit && npm link        # adds the borshkit and borsch commands
```

Or with one command from the latest release, no clone needed:

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/latest/download/borshkit.tgz
```

The package is not on npm yet. The download counter at the top counts this archive only: plugin installs and `git clone` are not included.

## Your first task

```sh
cd my-project
borshkit init                                     # borshkit/ folder in the root, hidden from the project's history
borshkit executor add claude                      # Claude Code on your subscription; you confirm in the terminal
borshkit task new theme --goal "Dark theme in settings"
borshkit job run theme --role architect --executor claude     # proposes goals and criteria
borshkit job run theme --role implementer --executor claude   # writes code in a separate copy
borshkit task verify theme                        # tests, build, linter
borshkit job run theme --role reviewer --executor codex       # review by a different model family
borshkit task converge theme                      # acceptance sheet: what is proven, what waits for you
borshkit task confirm theme C3 yes "saw the dark theme after a restart"
borshkit merge theme && borshkit push             # into the main version and to GitHub — only after your “yes”
```

All commands: [command reference](docs/reference/commands.md) (Russian and English names side by side). Step-by-step guide (in Russian): [quick start](docs/guide/quickstart.md).

## How it works

<p align="center"><img src="assets/diagrams/architecture.en.svg" alt="Layout: you, Claude Code and Codex call the same borshkit command; core modules live in core/; files live in borshkit/, .state/ and in a separate task copy on its own branch; executors plug in through adapters" width="100%"></p>

**What it is made of.** You, Claude Code and Codex all call the same `borshkit` command. The core is the modules in `core/`. All state is plain files in `borshkit/` and `.state/`, and the agent works in a separate copy of the project on its own branch. Executors plug in through adapters. [More](docs/concepts/space.md)

<p align="center"><img src="assets/diagrams/evidence.en.svg" alt="State fingerprint: commit and files, contract, settings, materials and Borshkit code; an evidence record stores this fingerprint and goes stale on any mismatch" width="100%"></p>

**Evidence goes stale.** Borshkit remembers the exact state a check passed on: the commit and a hash of every file, uncommitted edits included. Change a single byte and the check must run again. [More](docs/concepts/evidence.md)

<p align="center"><img src="assets/diagrams/pool.en.svg" alt="Picking an executor: candidates pass the privacy, capability, reviewer-is-not-the-author and hand-over-limit filters; on a limit or failure the job moves to the next one, and with no candidates left there is a critical stop with a report, waiting for you" width="100%"></p>

**A limit is not a stop.** A pool is a queue of executors: Claude Code, Codex, free and local APIs. When one hits a limit, the job moves on to the next one that the privacy mode allows and that can do the work. Critical questions wait for you and only you. [More](docs/concepts/executors.md)

<p align="center"><img src="assets/diagrams/kb.en.svg" alt="Knowledge: code, tests, docs, tasks and lessons are built into notes in knowledge/_generated/ and an index in .state/kb.sqlite; job context, SQL queries and the Obsidian export all read from them" width="100%"></p>

**Knowledge is notes, not a black box.** The project becomes notes with `[[links]]` for Obsidian and, on top of them, an SQL index. Each job gets its own slice of context. This documentation works the same way: Borshkit built its [documentation graph](docs/graph/README.md) itself.

## What it does

| Area | What you get |
|---|---|
| **Acceptance by goals** | `auto` / `model` / `manual` criteria, an acceptance sheet, trust goals for models confirmed by measurement |
| **Workspace** | the `borshkit/` folder is an Obsidian vault with its own history; the `.gitignore` rule is added and checked automatically |
| **Executors** | Claude Code, Codex (with GPT Image), any OpenAI-compatible API, your own programs; pools with fallback |
| **21 roles** | architect, developer, reviewers, tester, researcher, designers, design prompt author, README illustrator… |
| **Autopilot** | routine questions get their default answer after a minute; critical ones stop with a report and a context hand-over |
| **Dispatcher** | who got the job, who is working, what waits for you: in the terminal, in `STATUS.md` and in the Claude Code status line |
| **Research** | sources are stored as copies; the `citations` check verifies every quote word for word |
| **Privacy** | three modes; the agent’s task packet is checked for keys and personal data before it leaves; settings change only through proposals |
| **Git for beginners** | “what changed”, “who changed this”, “put it back” — in plain words, with no destructive commands |
| **Credits** | `attribution` and `readme-assets` checks, the full list of contributors of every source |

## Frontend, design and iOS

Borshkit has roles for interfaces, and each one gets only its own skills:

| Role | What it does | Skills and primary sources |
|---|---|---|
| `ui-engineer` | builds the interface: every state, motion, keyboard | Emil Kowalski, ECC; Vercel Web Interface Guidelines, shadcn/ui, Radix, React Aria, WCAG |
| `ios-designer` | reviews iPhone and iPad interfaces | `apple-design`, Liquid Glass, SwiftUI; Apple HIG, SF Symbols |
| `motion-reviewer` | reviews animations strictly | `review-animations`, `animation-vocabulary`, `motion-foundations` |
| `a11y-reviewer` | reviews accessibility against WCAG 2.2 AA | ECC `accessibility`, `frontend-a11y`; WAI-ARIA APG, axe-core |
| `designer` | breaks the interface with worst-case data | `break-ui` |

The [library](library/README.md) holds 3 skill packs (25 skills) and 63 verified links: components, motion, design systems, accessibility, icons, fonts, quality tools. In the terminal: `borshkit skills` and `borshkit library`.

## The recipe

Borshkit is borscht: it is cooked from the best ingredients that other people grew and shared openly.

> Some ingredients were cooked twice. Spec Kit was first stewed in Claudex, then simmered again as a specification check, and only then finished in Borshkit. Everything reached the table in fine shape: licenses kept, authors named.

| Ingredient | What was taken |
|---|---|
| [Claudex](https://github.com/ParkPavel/claudex) | the core: task contract, evidence, convergence, CLI adapters |
| [Ponytail](https://github.com/DietrichGebert/ponytail) ([sponsor](https://github.com/sponsors/DietrichGebert)) | the “lazy senior” — do the minimum, keep it simple |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | 14 design-engineering and motion skills |
| [ECC](https://github.com/affaan-m/ECC) ([sponsor](https://github.com/sponsors/affaan-m)) | 9 frontend skills, the idea of modules |
| [Spec Kit](https://github.com/github/spec-kit) | the path “intent → specification → tasks → convergence” (through Claudex, twice) |
| [Superpowers](https://github.com/obra/superpowers) ([sponsor](https://github.com/sponsors/obra)) | a separate copy for the agent, test before the fix (through Claudex) |
| [Graphify](https://github.com/Graphify-Labs/graphify) ([sponsor](https://github.com/sponsors/safishamsi)) | provenance of links in a code map (idea, through Claudex) |
| [prompt-agent](https://github.com/kvyb/prompt-agent) | scoring past jobs (idea, through Claudex) |
| [HIGAgentSkills](https://github.com/justinwetch/HIGAgentSkills) | routing through Apple HIG (link only) |
| [Agent Reach](https://github.com/panniantong/agent-reach) | web collection routes for the researcher |
| [free-llm-api-resources](https://github.com/raullenchai/free-llm-api-resources) | a pointer when choosing free APIs (link only) |

The full recipe with versions and licenses is in [docs/ingredients.md](docs/ingredients.md) (Russian). **All contributors** of these projects, 1262 entries: [CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md). Thank you, every one of you!

## Limits

- Borshkit checks the task packet it sends to an agent. It does not see what Claude Code or Codex read from the files of the project copy afterwards: ignored files (`.env`) are not in the copy, but the agent can read every other file.
- Task checks (tests, build) run with your environment, because tests sometimes need keys. The environment filter applies only to executors.
- The knowledge map understands links in JS/TS code and Markdown. Swift, Python, Go and other languages are not mapped yet; acceptance does not depend on it.
- The Claude Code, Codex and Gemini adapters are tested against fake programs with the same event format. The flags of an installed Claude Code have been checked. CI does not run real models.
- Images through Codex (GPT Image) are not tested yet: `borshkit executor probe codex` shows it on your subscription.
- Whether the Obsidian graph shows links from note properties is not tested. That is why links are repeated as ordinary links in the text.
- Borshkit's messages are in Russian only for now; commands and flags are in Russian and English.
- `node:sqlite` is still experimental in Node 22.
- Pattern-based detection of keys and personal data does not catch everything.

## Documentation

The documentation is in Russian for now:
- [Documentation map](docs/README.md) — quick start, concepts, reference.
- [Specification](docs/spec.md) — the original analysis and decisions D1–D22.
- [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [For agent developers](AGENTS.md)

## Development

```sh
npm run verify   # static checks and all tests; CI runs them on Linux, Windows and macOS
```

## Author

**Pavel Park** — [GitHub](https://github.com/ParkPavel) · [Telegram channel](https://t.me/parkpavel_chigon)

## License

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE). The skills in `packs/` are MIT, each pack with its author's license.
