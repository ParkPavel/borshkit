# Borshkit

[![Borshkit — tasks, context, evidence](assets/product/hero.webp)](https://parkpavel.github.io/borshkit/)

<sub>Illustration of the workflow: tasks, context and evidence.</sub>

**Tasks, portable context and verifiable results for AI coding.**

Describe the outcome. Let an agent work. Get evidence tied to the exact file state and a clear checklist for human review.

<a href="README.md">ru</a> · <a href="README.en.md">en</a> · <a href="README.de.md">de</a> · <a href="README.ko.md">ko</a> · <a href="README.zh-TW.md">zh-TW</a> · <a href="README.fr.md">fr</a>

[![Release](https://img.shields.io/github/v/release/ParkPavel/borshkit?style=flat-square&color=d6edaf)](https://github.com/ParkPavel/borshkit/releases) [![CI](https://img.shields.io/github/actions/workflow/status/ParkPavel/borshkit/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml) [![Apache-2.0](https://img.shields.io/github/license/ParkPavel/borshkit?style=flat-square&color=aeb4bb)](LICENSE)

[![Get started](https://img.shields.io/badge/Get%20started-d6edaf?style=for-the-badge&labelColor=20252b)](https://parkpavel.github.io/borshkit/read/guide/quickstart.html) [![Documentation](https://img.shields.io/badge/Documentation-aeb4bb?style=for-the-badge&labelColor=20252b)](https://parkpavel.github.io/borshkit/read/index.html) [![Download](https://img.shields.io/badge/Download-aeb4bb?style=for-the-badge&labelColor=20252b)](https://github.com/ParkPavel/borshkit/releases/tag/0.13.1) [![Support](https://img.shields.io/badge/Support-d6edaf?style=for-the-badge&labelColor=20252b)](https://web.tribute.tg/d/Sh8)

## Get started

0.13.1 · Node.js 22+ · Git

**In 0.13.1:** detailed process diagnostics, bounded timeouts, and explicit BLOCKED/UNKNOWN when a check cannot run. [Changes and known limitations](https://parkpavel.github.io/borshkit/read/release-0.13.1.html) (Russian).

Install the verified GitHub Release archive. The package is not published to the npm registry. To edit the source, use [git clone and npm link](https://parkpavel.github.io/borshkit/read/release.html).

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/download/0.13.1/borshkit.tgz
borshkit help
```

[Quickstart](https://parkpavel.github.io/borshkit/read/guide/quickstart.html) · [Guide](https://parkpavel.github.io/borshkit/read/guide/workflow.html) · [Commands](https://parkpavel.github.io/borshkit/read/reference/commands.html) · [Website](https://parkpavel.github.io/borshkit/)

## Available today

CLI, Claude Code plugin and VSIX. Claude Code, Codex, Gemini and API executors; native Copilot/Roo/Cline APIs from VS Code with explicit capability limits. Task handoff and static JS/TS, Python, Go and Swift maps. [Native support and limits](https://parkpavel.github.io/borshkit/read/guide/native-integrations.html).

PASS: a check passed. FAIL: a check did not pass. UNKNOWN: evidence is missing. Live model and device trials await community reports. CLI messages and most guides are in Russian; commands have English aliases.

[Architecture](https://parkpavel.github.io/borshkit/read/architecture.html) · [Roadmap](https://parkpavel.github.io/borshkit/read/roadmap.html) · [Details and limitations](https://parkpavel.github.io/borshkit/read/reference/overview.en.html) · [Context handoff](https://parkpavel.github.io/borshkit/read/guide/handoff.html)


| Tasks | Context | Evidence |
|---|---|---|
| [Goals, scope and criteria](https://parkpavel.github.io/borshkit/read/reference/contract.html) | [Handoff across environments](https://parkpavel.github.io/borshkit/read/guide/handoff.html) | [Checks bound to a file state](https://parkpavel.github.io/borshkit/read/concepts/evidence.html) |

<details>
<summary>Do I need a paid AI model?</summary>

Tasks and local checks do not need a model. Agent work uses a separately configured environment and its billing.

</details>

<details>
<summary>What does a handoff include?</summary>

The contract, decisions and bounded context with provenance. Chat history and trusted acceptance are not transferred.

</details>

> ### Support Borshkit
>
> Open source grows through people. Help fund development time and a more approachable tool.
>
> [![Support Borshkit](https://img.shields.io/badge/Support%20Borshkit-d6edaf?style=for-the-badge&labelColor=20252b)](https://web.tribute.tg/d/Sh8)


<details>
<summary>Credits / Источники</summary>


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

The full recipe with versions and licenses is in [docs/ingredients.md](https://parkpavel.github.io/borshkit/read/ingredients.html) (Russian). **All contributors** of these projects, 1262 entries: [CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md). Thank you, every one of you!


API references (no copied code): [VS Code Language Model API](https://github.com/microsoft/vscode) · [Roo Code API](https://github.com/RooCodeInc/Roo-Code) · [Cline API](https://github.com/cline/cline)

[Marked](https://github.com/markedjs/marked) · MIT · Markdown → HTML documentation.

</details>

Apache-2.0 · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [Security](SECURITY.md)

Pavel Park · [GitHub](https://github.com/ParkPavel) · [Telegram](https://t.me/parkpavel_chigon) · [Support / Поддержать](https://web.tribute.tg/d/Sh8)
