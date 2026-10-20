---
bk-type: reference
related: ["../architecture.md", "../roadmap.md"]
---
# 詳細資料與限制 — 0.12

## 看得見的團隊

<p align="center"><img src="../../assets/diagrams/team.zh-TW.svg" alt="任務 → 角色 → 執行者 → 模型/API → 結果 → 獨立審查；提案、套用、啟動、驗證與驗收是不同階段" width="100%"></p>

`borshkit team` 顯示模型、連線檢查的新鮮度、角色評估、已分配的池及已知資源。`borshkit team plan <任務>` 說明候選者並保留獨立審查用的模型家族。`team propose` 儲存設定提案；套用與啟動工作分開執行。過期資料會阻止套用。免費 API 資格須在帳號中確認；未知餘額明確標示。

新增的 `design-prompter` 角色撰寫視覺設計需求。模型依角色評估選擇，而非品牌。[指令與格式](../../docs/reference/team-resources.md) · [架構與後續階段](../../docs/concepts/team-workspace.md) · [稽核](../../docs/discussions/modernization-2026-10-08.md)（俄文文件）。

`borshkit setup` 儲存環境、隱私、明確模型及角色選擇。終端機使用 `--interactive`；應用程式可使用逐步指令。[指南](../../docs/guide/setup.md)（俄文）。相容性與角色品質分開；提案不會套用設定或啟動工作。

<p align="center"><img src="../../assets/diagrams/setup.zh-TW.svg" alt="設定：環境、隱私、模型、職責、提案；套用、評估、指派及啟動分開" width="100%"></p>

可信任的初次配對後，可使用手機 passkey 確認設定與重要問題。已加入 `assessment`、共用預算/WIP、任務依賴及檢查點、明確的 `monitor start/stop`、Gemini CLI/API、本機 VSIX，以及需要重新驗證的檔案移轉。Copilot/Roo/Cline 使用匯出的指示；不宣稱提供原生執行轉接器。自動駕駛保持關閉。

[操作及安全限制](../../docs/guide/team-operations.md) · [實作檢查](../../docs/discussions/modernization-2026-10-09.md)（俄文）。本機測試不能取代真實模型、手機瀏覽器、VS Code 及確切提交版本的 CI 驗證。

<p align="center"><img src="../../assets/diagrams/operations.zh-TW.svg" alt="團隊：評估、預算、提案、passkey 與獨立啟動；監控提出建議，移轉需重新驗證" width="100%"></p>
>
> **語言說明：** Borshkit 的訊息目前是俄文。每個指令和旗標也都有英文名稱，本 README 使用的就是英文名稱。

## 核心概念

<p align="center"><img src="../../assets/diagrams/flow.zh-TW.svg" alt="任務流程：目標與標準 → 代理在專案的獨立副本中工作 → 檢查 → 由另一個執行者審查 → 驗收單；結果：需要修正、未驗證、等你處理、已驗收；驗收後合併進 main 並推送" width="100%"></p>

模型說「完成」，還不算驗收：
- 每一份證據都綁定檔案的確切狀態；
- 能自動檢查的，就自動檢查；
- 無法自動檢查的，會變成一份給你的簡短說明；
- 沒有檢查過的，就直接標成：**未檢查**。

## 安裝

需要 Node.js 22+ 和 Git。沒有外部相依套件。

**作為 Claude Code 外掛：**

```
/plugin marketplace add ParkPavel/borshkit
/plugin install borshkit@borshkit
```

外掛會為代理加上 Borshkit 技能、防護用的 hooks，並在 Claude Code 的終端機裡提供 `borshkit` 和 `borsch` 指令。若也想在自己的終端機使用，請另外依下方方式安裝指令。

**作為終端機指令：**

```sh
git clone https://github.com/ParkPavel/borshkit.git
cd borshkit && npm link        # 新增 borshkit 和 borsch 兩個指令
```

或者不用複製儲存庫，從最新發布一行安裝：

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/latest/download/borshkit.tgz
```

這個套件還沒有發布到 npm。頂部的下載次數只計算這個封存檔：外掛安裝與 `git clone` 不計入。

## 第一個任務

```sh
cd my-project
borshkit init                                     # 在根目錄建立 borshkit/ 資料夾，不會進入專案的版本歷史
borshkit executor add codex
borshkit executor add claude                      # 使用你訂閱的 Claude Code；在終端機中確認
borshkit task new dark-mode --goal "Dark theme in settings"
borshkit job run dark-mode --role architect --executor claude     # 提出目標與準則
# 先審閱 architect-proposal.json，將同意的 goals、criteria、checks 複製到 contract.json。
borshkit job run dark-mode --role implementer --executor claude   # 在獨立的副本中寫程式
borshkit task verify dark-mode                        # 測試、建置、linter
borshkit job run dark-mode --role reviewer --executor codex       # 由另一個模型家族審查
borshkit task converge dark-mode                      # 驗收清單：哪些已證明、哪些在等你
borshkit task confirm dark-mode C3 yes "saw the dark theme after a restart"
borshkit merge dark-mode && borshkit push             # 合併進主版本並推送到 GitHub——要等你說 yes 才會執行
```

所有指令：[指令參考](../../docs/reference/commands.md)（俄文與英文名稱並列）。逐步指南（俄文）：[快速入門](../../docs/guide/quickstart.md)。

## 運作方式

請參閱[目前架構與支援層級](../architecture.md)及[工作流程](../guide/workflow.md)。

## 功能

| 領域 | 你會得到什麼 |
|---|---|
| **依目標驗收** | `auto` / `model` / `manual` 準則、驗收清單，以及經過量測確認的模型信任目標 |
| **工作區** | `borshkit/` 資料夾是一個有自己版本歷史的 Obsidian vault；`.gitignore` 規則會自動加入並檢查 |
| **執行者** | Claude Code、Codex（含 GPT Image）、任何相容 OpenAI 的 API、你自己的程式；可自動遞補的執行者池 |
| **21 種角色** | 架構師、開發者、審查者、測試人員、研究員、設計師、設計提示詞作者、README 插畫師…… |
| **自動駕駛** | 例行問題在一分鐘後套用預設答案；關鍵問題會停下來，附上報告並交接脈絡 |
| **調度台** | 工作交給了誰、誰正在做、什麼在等你：顯示在終端機、`STATUS.md` 和 Claude Code 狀態列 |
| **研究** | 來源以副本保存；`citations` 檢查會逐字核對每一段引文 |
| **隱私** | 三種模式；交給代理的任務包在送出前會檢查金鑰和個人資料；設定只能透過提案變更 |
| **給新手的 Git** | 「改了什麼」、「這是誰改的」、「改回原樣」——用白話說明，也不用任何破壞性指令 |
| **致謝** | `attribution` 和 `readme-assets` 檢查，以及每個來源的完整貢獻者名單 |

## 前端、設計與 iOS

Borshkit 有專門處理介面的角色，每個角色只會拿到自己的技能：

| 角色 | 負責什麼 | 技能與第一手來源 |
|---|---|---|
| `ui-engineer` | 建構介面：所有狀態、動態效果、鍵盤操作 | Emil Kowalski, ECC; Vercel Web Interface Guidelines, shadcn/ui, Radix, React Aria, WCAG |
| `ios-designer` | 審查 iPhone 和 iPad 介面 | `apple-design`, Liquid Glass, SwiftUI; Apple HIG, SF Symbols |
| `motion-reviewer` | 嚴格審查動畫 | `review-animations`, `animation-vocabulary`, `motion-foundations` |
| `a11y-reviewer` | 依 WCAG 2.2 AA 審查無障礙設計 | ECC `accessibility`, `frontend-a11y`; WAI-ARIA APG, axe-core |
| `designer` | 用最糟的資料把介面弄壞 | `break-ui` |

[資源庫](../../library/README.md)收錄 3 個技能包（25 個技能）和 63 個經過驗證的連結：元件、動態效果、設計系統、無障礙、圖示、字型、品質工具。在終端機中：`borshkit skills` 和 `borshkit library`。

## 食譜

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

完整食譜（含版本與授權）見 [docs/ingredients.md](../../docs/ingredients.md)（俄文）。這些專案的**所有貢獻者**，共 1262 筆：[CONTRIBUTORS-REFERENCES.md](../../CONTRIBUTORS-REFERENCES.md)。謝謝你們每一位！

## 限制

- Borshkit 會檢查它自己送給代理的任務包。之後 Claude Code 或 Codex 從專案副本的檔案裡讀了什麼，它看不到：被忽略的檔案（`.env`）不在副本裡，但其他檔案代理都能讀。
- 任務的檢查（測試、建置）會用你的環境變數執行，因為測試有時需要金鑰。環境過濾只套用在執行者身上。
- 知識地圖只理解 JS/TS 程式碼和 Markdown 之間的連結。Swift、Python、Go 等其他語言目前還不會收進地圖；驗收結果不受影響。
- Claude Code、Codex 和 Gemini 的轉接器，是用事件格式相同的假程式測試的。已安裝的 Claude Code 的旗標已經核對過。CI 不會執行真正的模型。
- 透過 Codex（GPT Image）產生圖片還沒有測試：`borshkit executor probe codex` 會用你的訂閱實際確認。
- Obsidian 圖譜會不會顯示筆記屬性裡的連結，還沒有測試。所以連結也會以一般連結的形式在內文中再寫一次。
- Borshkit 的訊息目前只有俄文；指令和旗標有俄文和英文兩種。
- `node:sqlite` 在 Node 22 仍是實驗性功能。
- 用模式比對偵測金鑰和個人資料，無法抓到所有情況。

## 文件

文件目前是俄文：
- [文件地圖](../../docs/README.md)——快速入門、概念、參考。
- [規格](../../docs/spec.md)——最初的分析，以及決策 D1–D22。
- [變更紀錄](../../CHANGELOG.md) · [參與貢獻](../../CONTRIBUTING.md) · [安全性](../../SECURITY.md) · [給開發 Borshkit 的代理](../../AGENTS.md)

## 開發

```sh
npm run verify   # 靜態檢查與所有測試；CI 會在 Linux 和 Windows 上執行
```

## 作者

**Pavel Park** — [GitHub](https://github.com/ParkPavel) · [Telegram 頻道](https://t.me/parkpavel_chigon)

## 支持這個專案

Borshkit 免費且開源。如果它對你有幫助，歡迎透過 Tribute 贊助。

<p><a href="https://web.tribute.tg/d/Sh8"><img src="https://img.shields.io/badge/Tribute-%E8%B4%8A%E5%8A%A9-e8554e?style=for-the-badge&logo=telegram&logoColor=white" alt="贊助"></a></p>

在終端機中：`borshkit support` 會顯示連結並詢問是否在瀏覽器中開啟。在 GitHub 按星號、向同事推薦也很有幫助。

## 授權

Apache-2.0——見 [LICENSE](../../LICENSE) 和 [NOTICE](../../NOTICE)。`packs/` 中的技能採用 MIT 授權，每個技能包附有其作者的授權。


## Связи

- [Текущая архитектура](../architecture.md)
- [Дорожная карта](../roadmap.md)
