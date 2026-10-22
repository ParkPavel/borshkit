# Borshkit

**A portable foundation for AI coding.**

Describe the outcome. Let an agent work. Get evidence tied to the exact file state and a clear checklist for human review.

<a href="README.md">ru</a> · <a href="README.en.md">en</a> · <a href="README.de.md">de</a> · <a href="README.ko.md">ko</a> · <a href="README.zh-TW.md">zh-TW</a> · <a href="README.fr.md">fr</a>

## Get started

0.13.0 · Node.js 22+ · Git

```sh
git clone https://github.com/ParkPavel/borshkit.git
cd borshkit
npm link
```

[Quickstart](docs/guide/quickstart.md) · [Guide](docs/guide/workflow.md) · [Commands](docs/reference/commands.md) · [Website](https://parkpavel.github.io/borshkit/)

## Available today

CLI, Claude Code plugin and VSIX. Claude Code, Codex, Gemini and API executors; native Copilot/Roo/Cline APIs from VS Code with explicit capability limits. Task handoff and static JS/TS, Python, Go and Swift maps. [Native support and limits](docs/guide/native-integrations.md).

PASS / FAIL / UNKNOWN: evidence follows the exact file state. A model response alone does not accept a task. CLI messages are currently in Russian; commands also have English aliases.

[Architecture](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [Details and limitations](docs/reference/overview.en.md) · [Context handoff](docs/guide/handoff.md)

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

The full recipe with versions and licenses is in [docs/ingredients.md](docs/ingredients.md) (Russian). **All contributors** of these projects, 1262 entries: [CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md). Thank you, every one of you!


</details>

Apache-2.0 · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [Security](SECURITY.md)

Pavel Park · [GitHub](https://github.com/ParkPavel) · [Telegram](https://t.me/parkpavel_chigon) · [Support / Поддержать](https://web.tribute.tg/d/Sh8)


API references (no copied code): [VS Code Language Model API](https://github.com/microsoft/vscode) · [Roo Code API](https://github.com/RooCodeInc/Roo-Code) · [Cline API](https://github.com/cline/cline)
