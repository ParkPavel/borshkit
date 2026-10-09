<p align="center">
  <img src="assets/diagrams/banner.zh-TW.svg" alt="Borshkit — Modular AI Workspace：任務、證據、驗收、知識" width="100%">
</p>

<p align="center">
  <a href="https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml"><img src="https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml/badge.svg" alt="CI：Linux、Windows 與 macOS"></a>
  <img src="https://img.shields.io/badge/version-0.12.0-b3261e" alt="版本 0.12.0">
  <a href="https://github.com/ParkPavel/borshkit/releases"><img src="https://img.shields.io/github/downloads/ParkPavel/borshkit/total?label=%E4%B8%8B%E8%BC%89&color=b3261e" alt="發布封存檔下載次數"></a>
  <img src="https://img.shields.io/badge/node-%E2%89%A522-2b1d1d" alt="Node.js 22 或更新版本">
  <img src="https://img.shields.io/badge/dependencies-0-2e7d32" alt="零相依套件">
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-8c1c13" alt="Claude Code 外掛">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-6b5757" alt="授權 Apache-2.0"></a>
  <a href="https://t.me/parkpavel_chigon"><img src="https://img.shields.io/badge/Telegram-%E4%BD%9C%E8%80%85%E9%A0%BB%E9%81%93-26a5e4?logo=telegram&logoColor=white" alt="作者的 Telegram 頻道"></a>
</p>

<p align="center">
  <a href="README.md">Русский</a> · <a href="README.en.md">English</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ko.md">한국어</a> · <b>繁體中文</b> · <a href="README.fr.md">Français</a>
</p>

# Borshkit

**Modular AI Workspace**——讓 AI 代理在任何專案裡工作的地方：網頁應用程式、外掛、函式庫、行動 App，或是一項研究。

你說明想要的結果，代理負責動手。Borshkit 會告訴你哪些已經由檢查**證明**，哪些需要你自己看一下。只有在你允許該類準則採信模型、而且有實際量測支持時，Borshkit 才會採信模型的話。

> **套件版本：0.12.0。** 測試使用假的執行者；CI 以 Linux、Windows 和 macOS 為目標。不宣稱真實模型品質或未來功能已經驗證。[限制](#限制)。

## 看得見的團隊

<p align="center"><img src="assets/diagrams/team.zh-TW.svg" alt="任務 → 角色 → 執行者 → 模型/API → 結果 → 獨立審查；提案、套用、啟動、驗證與驗收是不同階段" width="100%"></p>

`borshkit team` 顯示模型、連線檢查的新鮮度、角色評估、已分配的池及已知資源。`borshkit team plan <任務>` 說明候選者並保留獨立審查用的模型家族。`team propose` 儲存設定提案；套用與啟動工作分開執行。過期資料會阻止套用。免費 API 資格須在帳號中確認；未知餘額明確標示。

新增的 `design-prompter` 角色撰寫視覺設計需求。模型依角色評估選擇，而非品牌。[指令與格式](docs/reference/team-resources.md) · [架構與後續階段](docs/concepts/team-workspace.md) · [稽核](docs/discussions/modernization-2026-10-08.md)（俄文文件）。

`borshkit setup` 儲存環境、隱私、明確模型及角色選擇。終端機使用 `--interactive`；應用程式可使用逐步指令。[指南](docs/guide/setup.md)（俄文）。相容性與角色品質分開；提案不會套用設定或啟動工作。

<p align="center"><img src="assets/diagrams/setup.zh-TW.svg" alt="設定：環境、隱私、模型、職責、提案；套用、評估、指派及啟動分開" width="100%"></p>

可信任的初次配對後，可使用手機 passkey 確認設定與重要問題。已加入 `assessment`、共用預算/WIP、任務依賴及檢查點、明確的 `monitor start/stop`、Gemini CLI/API、本機 VSIX，以及需要重新驗證的檔案移轉。Copilot/Roo/Cline 使用匯出的指示；不宣稱提供原生執行轉接器。自動駕駛保持關閉。

[操作及安全限制](docs/guide/team-operations.md) · [實作檢查](docs/discussions/modernization-2026-10-09.md)（俄文）。本機測試不能取代真實模型、手機瀏覽器、VS Code 及確切提交版本的 CI 驗證。

<p align="center"><img src="assets/diagrams/operations.zh-TW.svg" alt="團隊：評估、預算、提案、passkey 與獨立啟動；監控提出建議，移轉需重新驗證" width="100%"></p>
>
> **語言說明：** Borshkit 的訊息目前是俄文。每個指令和旗標也都有英文名稱，本 README 使用的就是英文名稱。

## 核心概念

<p align="center"><img src="assets/diagrams/flow.zh-TW.svg" alt="任務流程：目標與標準 → 代理在專案的獨立副本中工作 → 檢查 → 由另一個執行者審查 → 驗收單；結果：需要修正、未驗證、等你處理、已驗收；驗收後合併進 main 並推送" width="100%"></p>

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
borshkit executor add claude                      # 使用你訂閱的 Claude Code；在終端機中確認
borshkit task new theme --goal "Dark theme in settings"
borshkit job run theme --role architect --executor claude     # 提出目標與準則
borshkit job run theme --role implementer --executor claude   # 在獨立的副本中寫程式
borshkit task verify theme                        # 測試、建置、linter
borshkit job run theme --role reviewer --executor codex       # 由另一個模型家族審查
borshkit task converge theme                      # 驗收清單：哪些已證明、哪些在等你
borshkit task confirm theme C3 yes "saw the dark theme after a restart"
borshkit merge theme && borshkit push             # 合併進主版本並推送到 GitHub——要等你說 yes 才會執行
```

所有指令：[指令參考](docs/reference/commands.md)（俄文與英文名稱並列）。逐步指南（俄文）：[快速入門](docs/guide/quickstart.md)。

## 運作方式

<p align="center"><img src="assets/diagrams/architecture.zh-TW.svg" alt="結構：你、Claude Code 與 Codex 呼叫同一個 borshkit 指令；核心模組在 core/；檔案位於 borshkit/、.state/ 以及獨立分支上的任務副本；執行者透過轉接器接入" width="100%"></p>

**由什麼組成。** 你、Claude Code 與 Codex 都呼叫同一個 `borshkit` 指令。核心是 `core/` 中的模組。所有狀態都是 `borshkit/` 與 `.state/` 中的一般檔案，代理在獨立分支上的專案副本中工作。執行者透過轉接器接入。[詳細](docs/concepts/space.md)

<p align="center"><img src="assets/diagrams/evidence.zh-TW.svg" alt="狀態指紋：提交與檔案、合約、設定、資料與 Borshkit 程式碼；證據記錄保存此指紋，任何不一致都會使其過期" width="100%"></p>

**證據會過期。** Borshkit 會記住檢查是在哪個確切狀態下通過的：提交，以及每個檔案的雜湊值，連尚未提交的修改也算在內。只要改動一個位元組，就必須重新檢查。[詳細說明](docs/concepts/evidence.md)

<p align="center"><img src="assets/diagrams/pool.zh-TW.svg" alt="選擇執行者：候選者依序通過隱私、能力、「審查者不是作者」與切換上限篩選；遇到額度或失敗時交給下一位，沒有候選者時進入嚴重停止，附報告並等你處理" width="100%"></p>

**達到上限不等於停工。** 執行者池就是一個執行者佇列：Claude Code、Codex、免費與本機的 API。某個執行者達到上限時，工作會交給下一個隱私模式允許、而且有能力完成的執行者。關鍵問題只會等你本人回答。[詳細說明](docs/concepts/executors.md)

<p align="center"><img src="assets/diagrams/kb.zh-TW.svg" alt="知識：程式碼、測試、文件、任務與教訓建置成 knowledge/_generated/ 的筆記與 .state/kb.sqlite 索引；工作上下文、SQL 查詢與 Obsidian 匯出都從這裡讀取" width="100%"></p>

**知識是筆記，不是黑盒子。** 專案會轉成帶有 `[[links]]` 的 Obsidian 筆記，上面再建一層 SQL 索引。每項工作只拿到屬於它的那一部分脈絡。這份文件也是這樣組成的：Borshkit 自己建出了它的[文件圖譜](docs/graph/README.md)。

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

[資源庫](library/README.md)收錄 3 個技能包（25 個技能）和 63 個經過驗證的連結：元件、動態效果、設計系統、無障礙、圖示、字型、品質工具。在終端機中：`borshkit skills` 和 `borshkit library`。

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

完整食譜（含版本與授權）見 [docs/ingredients.md](docs/ingredients.md)（俄文）。這些專案的**所有貢獻者**，共 1262 筆：[CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md)。謝謝你們每一位！

## 限制

- Borshkit 會檢查它自己送給代理的任務包。之後 Claude Code 或 Codex 從專案副本的檔案裡讀了什麼，它看不到：被忽略的檔案（`.env`）不在副本裡，但其他檔案代理都能讀。
- 任務的檢查（測試、建置）會用你的環境變數執行，因為測試有時需要金鑰。環境過濾只套用在執行者身上。
- 知識地圖只理解 JS/TS 程式碼和 Markdown 之間的連結。Swift、Python、Go 等其他語言目前還不會收進地圖；驗收結果不受影響。
- Claude Code 和 Codex 的轉接器，是用事件格式相同的假程式測試的。已安裝的 Claude Code 的旗標已經核對過。CI 不會執行真正的模型。
- 透過 Codex（GPT Image）產生圖片還沒有測試：`borshkit executor probe codex` 會用你的訂閱實際確認。
- Obsidian 圖譜會不會顯示筆記屬性裡的連結，還沒有測試。所以連結也會以一般連結的形式在內文中再寫一次。
- Borshkit 的訊息目前只有俄文；指令和旗標有俄文和英文兩種。
- `node:sqlite` 在 Node 22 仍是實驗性功能。
- 用模式比對偵測金鑰和個人資料，無法抓到所有情況。

## 文件

文件目前是俄文：
- [文件地圖](docs/README.md)——快速入門、概念、參考。
- [規格](docs/spec.md)——最初的分析，以及決策 D1–D22。
- [變更紀錄](CHANGELOG.md) · [參與貢獻](CONTRIBUTING.md) · [安全性](SECURITY.md) · [給開發 Borshkit 的代理](AGENTS.md)

## 開發

```sh
npm run verify   # 靜態檢查與所有測試；CI 會在 Linux 和 Windows 上執行
```

## 作者

**Pavel Park** — [GitHub](https://github.com/ParkPavel) · [Telegram 頻道](https://t.me/parkpavel_chigon)

## 授權

Apache-2.0——見 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)。`packs/` 中的技能採用 MIT 授權，每個技能包附有其作者的授權。
