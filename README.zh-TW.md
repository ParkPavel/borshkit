# Borshkit

**AI 程式開發的可攜基礎層.**

說明預期成果，交給代理執行，再取得綁定確切檔案狀態的證據與人工驗收清單。

<a href="README.md">ru</a> · <a href="README.en.md">en</a> · <a href="README.de.md">de</a> · <a href="README.ko.md">ko</a> · <a href="README.zh-TW.md">zh-TW</a> · <a href="README.fr.md">fr</a>

## 開始使用

Node.js 22+ · Git

```sh
git clone https://github.com/ParkPavel/borshkit.git
cd borshkit
npm link
```

[Quickstart](docs/guide/quickstart.md) · [Guide](docs/guide/workflow.md) · [Commands](docs/reference/commands.md) · [Website](https://parkpavel.github.io/borshkit/)

## 目前支援

提供 CLI、Claude Code 外掛，以及 Claude Code、Codex、Gemini 和 API 執行器。Copilot、Roo、Cline 支援指令匯出。匯出指令、啟動執行器與完整整合是不同支援層級。

PASS / FAIL / UNKNOWN: evidence follows the exact file state. A model response alone does not accept a task. CLI messages are currently in Russian; commands also have English aliases.

[Architecture](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [詳細資料與限制](docs/reference/overview.zh-TW.md) · [Context handoff](docs/guide/handoff.md)

<details>
<summary>Credits / Источники</summary>


Borshkit 就是一鍋羅宋湯：用別人親手種出、公開分享的最好食材煮成。

> 有些食材下鍋了兩次。Spec Kit 先在 Claudex 裡燉過一輪，又以規格檢查的身分再熬一次，最後才在 Borshkit 裡起鍋。端上桌時一切完好：授權都保留了，作者也都有署名。

| 食材 | 取用了什麼 |
|---|---|
| [Claudex](https://github.com/ParkPavel/claudex) | 核心：任務契約、證據、收斂、CLI 轉接器 |
| [Ponytail](https://github.com/DietrichGebert/ponytail)（[贊助](https://github.com/sponsors/DietrichGebert)） | 「懶惰的資深工程師」——只做必要的事，保持簡單 |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | 14 個設計工程與動態效果技能 |
| [ECC](https://github.com/affaan-m/ECC)（[贊助](https://github.com/sponsors/affaan-m)） | 9 個前端技能，以及模組化的想法 |
| [Spec Kit](https://github.com/github/spec-kit) | 「意圖 → 規格 → 任務 → 收斂」這條路徑（經由 Claudex，兩次） |
| [Superpowers](https://github.com/obra/superpowers)（[贊助](https://github.com/sponsors/obra)） | 給代理的獨立副本、先寫測試再修正（經由 Claudex） |
| [Graphify](https://github.com/Graphify-Labs/graphify)（[贊助](https://github.com/sponsors/safishamsi)） | 程式碼地圖中連結的來源出處（想法，經由 Claudex） |
| [prompt-agent](https://github.com/kvyb/prompt-agent) | 為過去的工作評分（想法，經由 Claudex） |
| [HIGAgentSkills](https://github.com/justinwetch/HIGAgentSkills) | 依 Apple HIG 分派（僅連結） |
| [Agent Reach](https://github.com/panniantong/agent-reach) | 研究員用的網路蒐集路徑 |
| [free-llm-api-resources](https://github.com/raullenchai/free-llm-api-resources) | 挑選免費 API 時的參考（僅連結） |

完整食譜（含版本與授權）見 [docs/ingredients.md](docs/ingredients.md)（俄文）。這些專案的**所有貢獻者**，共 1262 筆：[CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md)。謝謝你們每一位！


</details>

Apache-2.0 · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [Security](SECURITY.md)

Pavel Park · [GitHub](https://github.com/ParkPavel) · [Telegram](https://t.me/parkpavel_chigon) · [Support / Поддержать](https://web.tribute.tg/d/Sh8)
