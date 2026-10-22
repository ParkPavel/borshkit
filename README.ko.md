# Borshkit

**AI 코딩을 위한 작업, 이식 가능한 컨텍스트와 검증 가능한 결과.**

결과를 정의하고 에이전트에게 작업을 맡기세요. 정확한 파일 상태에 연결된 증거와 사람이 확인할 체크리스트를 받습니다.

<a href="README.md">ru</a> · <a href="README.en.md">en</a> · <a href="README.de.md">de</a> · <a href="README.ko.md">ko</a> · <a href="README.zh-TW.md">zh-TW</a> · <a href="README.fr.md">fr</a>

[릴리스 0.13.0](https://github.com/ParkPavel/borshkit/releases/tag/0.13.0) · [CI](https://github.com/ParkPavel/borshkit/actions/workflows/ci.yml) · [문서 (러시아어)](docs/README.md)

## 시작하기

0.13.0 · Node.js 22+ · Git

검증된 GitHub Release 압축 파일을 설치하세요. npm 레지스트리에는 아직 게시되지 않았습니다. 소스를 수정하려면 [git clone 및 npm link](docs/release.md)를 사용하세요.

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/download/0.13.0/borshkit.tgz
borshkit help
```

[Quickstart](docs/guide/quickstart.md) · [Guide](docs/guide/workflow.md) · [Commands](docs/reference/commands.md) · [Website](https://parkpavel.github.io/borshkit/)

## 현재 지원

CLI, Claude Code 플러그인과 VSIX를 제공합니다. Claude Code·Codex·Gemini·API 실행기와 VS Code의 Copilot·Roo·Cline 네이티브 API를 지원하며 한계를 명시합니다. 작업 전달과 JS/TS·Python·Go·Swift 정적 지도를 제공합니다. [지원 범위와 한계](docs/guide/native-integrations.md).

PASS: 검사 통과. FAIL: 검사 실패. UNKNOWN: 증거 없음. 실제 모델과 기기 시험은 사용자 피드백을 기다립니다. CLI 메시지와 대부분의 안내는 러시아어이며 명령에는 영어 별칭이 있습니다.

[Architecture](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [상세 설명과 한계](docs/reference/overview.ko.md) · [Context handoff](docs/guide/handoff.md)

<details>
<summary>Credits / Источники</summary>


Borshkit은 보르시입니다. 다른 사람들이 기르고 누구나 쓸 수 있게 공개한 최고의 재료로 끓였습니다.

> 재료 중에는 두 번 익힌 것도 있습니다. Spec Kit은 먼저 Claudex에서 한 번 조렸고, 명세 검사로 다시 한 번 뭉근히 끓인 다음에야 Borshkit에서 완성됐습니다. 그래도 모두 멀쩡하게 식탁에 올랐습니다. 라이선스는 지켰고, 저자도 밝혔습니다.

| 재료 | 가져온 것 |
|---|---|
| [Claudex](https://github.com/ParkPavel/claudex) | 핵심: 작업 계약, 증거, 수렴, CLI 어댑터 |
| [Ponytail](https://github.com/DietrichGebert/ponytail) ([후원](https://github.com/sponsors/DietrichGebert)) | “게으른 시니어”: 최소한만, 단순하게 |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | 디자인 엔지니어링·모션 스킬 14개 |
| [ECC](https://github.com/affaan-m/ECC) ([후원](https://github.com/sponsors/affaan-m)) | 프런트엔드 스킬 9개, 모듈이라는 아이디어 |
| [Spec Kit](https://github.com/github/spec-kit) | “의도 → 명세 → 작업 → 수렴” 흐름 (Claudex를 거쳐, 두 번) |
| [Superpowers](https://github.com/obra/superpowers) ([후원](https://github.com/sponsors/obra)) | 에이전트용 별도 복사본, 수정 전에 테스트 먼저 (Claudex를 거쳐) |
| [Graphify](https://github.com/Graphify-Labs/graphify) ([후원](https://github.com/sponsors/safishamsi)) | 코드 맵에서 링크의 출처 추적 (아이디어, Claudex를 거쳐) |
| [prompt-agent](https://github.com/kvyb/prompt-agent) | 지난 작업 평가 (아이디어, Claudex를 거쳐) |
| [HIGAgentSkills](https://github.com/justinwetch/HIGAgentSkills) | Apple HIG 기준 라우팅 (링크만) |
| [Agent Reach](https://github.com/panniantong/agent-reach) | 리서처용 웹 수집 경로 |
| [free-llm-api-resources](https://github.com/raullenchai/free-llm-api-resources) | 무료 API를 고를 때 참고 (링크만) |

버전과 라이선스까지 담은 전체 레시피는 [docs/ingredients.md](docs/ingredients.md)(러시아어)에 있습니다. 이 프로젝트들의 **모든 기여자** 목록(1262개 항목)은 [CONTRIBUTORS-REFERENCES.md](CONTRIBUTORS-REFERENCES.md)에 있습니다. 한 분 한 분 모두 감사합니다!


API 참조 (코드 복사 없음): [VS Code Language Model API](https://github.com/microsoft/vscode) · [Roo Code API](https://github.com/RooCodeInc/Roo-Code) · [Cline API](https://github.com/cline/cline)

</details>

Apache-2.0 · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [Security](SECURITY.md)

Pavel Park · [GitHub](https://github.com/ParkPavel) · [Telegram](https://t.me/parkpavel_chigon) · [Support / Поддержать](https://web.tribute.tg/d/Sh8)
