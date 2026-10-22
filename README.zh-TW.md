# Borshkit

[![Borshkit — tasks, context, evidence](assets/product/hero.webp)](https://parkpavel.github.io/borshkit/)

<sub>工作流程示意圖：任務、情境與證據。</sub>

**AI 程式開發的任務、可攜情境與可驗證成果。**

說明預期成果，交給代理執行，再取得綁定確切檔案狀態的證據與人工驗收清單。

<a href="README.md">ru</a> · <a href="README.en.md">en</a> · <a href="README.de.md">de</a> · <a href="README.ko.md">ko</a> · <a href="README.zh-TW.md">zh-TW</a> · <a href="README.fr.md">fr</a>

[![Release](https://img.shields.io/github/v/release/ParkPavel/borshkit?style=flat-square&color=d6edaf)](https://github.com/ParkPavel/borshkit/releases) [![CI](https://img.shields.io/github/actions/workflow/status/ParkPavel/borshkit/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml) [![Apache-2.0](https://img.shields.io/github/license/ParkPavel/borshkit?style=flat-square&color=aeb4bb)](LICENSE)

[![開始使用](https://img.shields.io/badge/%E9%96%8B%E5%A7%8B%E4%BD%BF%E7%94%A8-d6edaf?style=for-the-badge&labelColor=20252b)](https://parkpavel.github.io/borshkit/read/guide/quickstart.html) [![文件](https://img.shields.io/badge/%E6%96%87%E4%BB%B6-aeb4bb?style=for-the-badge&labelColor=20252b)](https://parkpavel.github.io/borshkit/read/index.html) [![下載](https://img.shields.io/badge/%E4%B8%8B%E8%BC%89-aeb4bb?style=for-the-badge&labelColor=20252b)](https://github.com/ParkPavel/borshkit/releases/tag/0.13.0) [![支持](https://img.shields.io/badge/%E6%94%AF%E6%8C%81-d6edaf?style=for-the-badge&labelColor=20252b)](https://web.tribute.tg/d/Sh8)

## 開始使用

0.13.0 · Node.js 22+ · Git

請安裝已驗證的 GitHub Release 壓縮檔。套件尚未發布至 npm 登錄庫。修改原始碼請用 [git clone 和 npm link](https://parkpavel.github.io/borshkit/read/release.html)。

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/download/0.13.0/borshkit.tgz
borshkit help
```

[Quickstart](https://parkpavel.github.io/borshkit/read/guide/quickstart.html) · [Guide](https://parkpavel.github.io/borshkit/read/guide/workflow.html) · [Commands](https://parkpavel.github.io/borshkit/read/reference/commands.html) · [Website](https://parkpavel.github.io/borshkit/)

## 目前支援

提供 CLI、Claude Code 外掛與 VSIX，支援 Claude Code、Codex、Gemini、API 執行器，以及 VS Code 中的 Copilot、Roo、Cline 原生 API，並明確標示限制。提供任務交接及 JS/TS、Python、Go、Swift 靜態程式地圖。[支援範圍與限制](https://parkpavel.github.io/borshkit/read/guide/native-integrations.html)。

PASS：檢查通過。FAIL：檢查未通過。UNKNOWN：缺少證據。實際模型與裝置測試正等待使用者回饋。CLI 訊息和大部分指南為俄文，命令另有英文別名。

[Architecture](https://parkpavel.github.io/borshkit/read/architecture.html) · [Roadmap](https://parkpavel.github.io/borshkit/read/roadmap.html) · [詳細資料與限制](https://parkpavel.github.io/borshkit/read/reference/overview.zh-TW.html) · [Context handoff](https://parkpavel.github.io/borshkit/read/guide/handoff.html)


| 任務 | 情境 | 證據 |
|---|---|---|
| [目標、範圍與驗收條件](https://parkpavel.github.io/borshkit/read/reference/contract.html) | [跨環境交接](https://parkpavel.github.io/borshkit/read/guide/handoff.html) | [綁定檔案狀態的檢查](https://parkpavel.github.io/borshkit/read/concepts/evidence.html) |

<details>
<summary>需要付費 AI 模型嗎？</summary>

任務與本機檢查不需要模型。代理工作使用另外設定的環境及其費率。

</details>

<details>
<summary>交接包含什麼？</summary>

契約、決策與附帶來源的有限情境。不移轉聊天紀錄或受信任的驗收結果。

</details>

> ### 支持 Borshkit
>
> 開源依靠人們的參與成長。協助支持開發時間，讓工具更易於使用。
>
> [![支持 Borshkit](https://img.shields.io/badge/%E6%94%AF%E6%8C%81%20Borshkit-d6edaf?style=for-the-badge&labelColor=20252b)](https://web.tribute.tg/d/Sh8)


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

完整食譜（含版本與授權）見 [docs/ingredients.md](https://parkpavel.github.io/borshkit/read/ingredients.html)（俄文）。這些專案的**所有貢獻者**，共 1262 筆：[CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md)。謝謝你們每一位！


API 參考（未複製程式碼）: [VS Code Language Model API](https://github.com/microsoft/vscode) · [Roo Code API](https://github.com/RooCodeInc/Roo-Code) · [Cline API](https://github.com/cline/cline)

[Marked](https://github.com/markedjs/marked) · MIT · Markdown → HTML documentation.

</details>

Apache-2.0 · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [Security](SECURITY.md)

Pavel Park · [GitHub](https://github.com/ParkPavel) · [Telegram](https://t.me/parkpavel_chigon) · [Support / Поддержать](https://web.tribute.tg/d/Sh8)
