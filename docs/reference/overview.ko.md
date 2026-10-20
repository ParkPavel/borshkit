---
bk-type: reference
related: ["../architecture.md", "../roadmap.md"]
---
# 상세 설명과 한계 — 0.12

## 보이는 팀

<p align="center"><img src="../../assets/diagrams/team.ko.svg" alt="작업 → 역할 → 실행자 → 모델/API → 결과 → 독립 검토; 제안, 적용, 실행, 검증, 인수는 별개" width="100%"></p>

`borshkit team`은 모델, 연결 확인의 유효성, 역할 평가, 할당된 풀과 알려진 자원을 보여 줍니다. `borshkit team plan <작업>`은 후보를 설명하고 독립 검토용 모델 계열을 남겨 둡니다. `team propose`는 설정 제안을 저장합니다. 적용과 실행은 별도 동작이며 오래된 데이터는 적용을 막습니다. 무료 API 이용 조건은 계정에서 확인해야 하며 알 수 없는 잔량은 그대로 표시합니다.

새 `design-prompter` 역할은 시각 디자인 브리프를 작성합니다. 모델은 브랜드가 아니라 역할 평가로 선택합니다. [명령과 형식](../../docs/reference/team-resources.md) · [아키텍처와 다음 단계](../../docs/concepts/team-workspace.md) · [감사](../../docs/discussions/modernization-2026-10-08.md) (러시아어 문서).

`borshkit setup`은 환경, 보안, 명시적인 모델과 역할 선택을 저장합니다. 터미널에서는 `--interactive`, 앱에서는 단계별 명령을 사용합니다. [안내](../../docs/guide/setup.md) (러시아어). 호환성과 역할 품질은 별개이며 제안은 설정을 적용하거나 작업을 실행하지 않습니다.

<p align="center"><img src="../../assets/diagrams/setup.ko.svg" alt="설정: 환경, 보안, 모델, 담당 업무, 제안; 적용, 평가, 배정, 실행은 별도 단계" width="100%"></p>

신뢰할 수 있는 기기 등록 후 휴대폰 passkey로 설정과 중요 질문을 승인할 수 있습니다. `assessment`, 공유 예산/WIP, 작업 의존성 및 체크포인트, 명시적인 `monitor start/stop`, Gemini CLI/API, 로컬 VSIX와 재검증이 필요한 파일 이전을 구현했습니다. Copilot/Roo/Cline에는 지침을 내보내며 전용 실행 어댑터 지원을 주장하지 않습니다. 자동 운용은 꺼진 상태입니다.

[운영 및 보안 범위](../../docs/guide/team-operations.md) · [구현 점검](../../docs/discussions/modernization-2026-10-09.md) (러시아어). 로컬 테스트는 실제 모델, 휴대폰 브라우저, VS Code 및 해당 커밋의 CI 검증을 대신하지 않습니다.

<p align="center"><img src="../../assets/diagrams/operations.ko.svg" alt="팀: 평가, 예산, 제안, passkey 및 별도 실행; 모니터는 제안하고 이전 후 다시 검증" width="100%"></p>
>
> **언어 안내:** Borshkit의 메시지는 지금은 러시아어로만 나옵니다. 모든 명령과 플래그에는 영어 이름도 있으며, 이 README는 영어 이름을 씁니다.

## 핵심 아이디어

<p align="center"><img src="../../assets/diagrams/flow.ko.svg" alt="작업의 흐름: 목표와 기준 → 에이전트가 프로젝트의 별도 사본에서 작업 → 검사 → 다른 실행기의 리뷰 → 인수 시트; 결과: 수정 필요, 미검증, 당신을 기다림, 인수됨; 인수 후 main에 병합하고 푸시" width="100%"></p>

모델이 “완료”라고 말해도 아직 인수된 것은 아닙니다.
- 모든 증거는 파일의 정확한 상태에 묶여 있습니다.
- 자동으로 검사할 수 있는 것은 자동으로 검사합니다.
- 자동으로 검사할 수 없는 것은 사용자가 따라 할 짧은 안내가 됩니다.
- 검사하지 않은 것은 그대로 **검사되지 않음**이라고 표시합니다.

## 설치

Node.js 22+와 Git이 필요합니다. 외부 의존성은 없습니다.

**Claude Code 플러그인으로 설치:**

```
/plugin marketplace add ParkPavel/borshkit
/plugin install borshkit@borshkit
```

플러그인은 에이전트에게 Borshkit 스킬과 보호 훅을 주고, Claude Code 터미널에 `borshkit`·`borsch` 명령을 추가합니다. 자신의 터미널에서도 쓰려면 아래처럼 명령도 설치하세요.

**터미널 명령으로 설치:**

```sh
git clone https://github.com/ParkPavel/borshkit.git
cd borshkit && npm link        # borshkit, borsch 명령이 추가됩니다
```

또는 클론 없이 최신 릴리스에서 명령 하나로:

```sh
npm install -g https://github.com/ParkPavel/borshkit/releases/latest/download/borshkit.tgz
```

아직 npm에는 패키지를 올리지 않았습니다. 상단의 다운로드 수는 이 아카이브만 셉니다. 플러그인 설치와 `git clone`은 포함되지 않습니다.

## 첫 작업

```sh
cd my-project
borshkit init                                     # 루트에 borshkit/ 폴더 생성, 프로젝트 히스토리에서는 제외
borshkit executor add codex
borshkit executor add claude                      # 구독으로 쓰는 Claude Code, 터미널에서 직접 확인
borshkit task new dark-mode --goal "Dark theme in settings"
borshkit job run dark-mode --role architect --executor claude     # 목표와 기준을 제안
# architect-proposal.json을 검토하고 합의한 goals, criteria, checks를 contract.json에 복사하세요.
borshkit job run dark-mode --role implementer --executor claude   # 별도 복사본에서 코드 작성
borshkit task verify dark-mode                        # 테스트, 빌드, 린터
borshkit job run dark-mode --role reviewer --executor codex       # 다른 모델 계열이 리뷰
borshkit task converge dark-mode                      # 인수 시트: 증명된 것, 사용자를 기다리는 것
borshkit task confirm dark-mode C3 yes "saw the dark theme after a restart"
borshkit merge dark-mode && borshkit push             # 메인 버전에 병합하고 GitHub에 푸시. 사용자가 “yes”라고 한 뒤에만
```

모든 명령은 [명령 레퍼런스](../../docs/reference/commands.md)에 있습니다(러시아어 이름과 영어 이름을 나란히 적었습니다). 단계별 안내는 [빠른 시작](../../docs/guide/quickstart.md)에 있습니다(러시아어).

## 동작 방식

[현재 아키텍처와 지원 수준](../architecture.md), [작업 흐름](../guide/workflow.md)을 참고하세요.

## 할 수 있는 일

| 영역 | 얻는 것 |
|---|---|
| **목표 기반 인수** | `auto` / `model` / `manual` 기준, 인수 시트, 측정으로 확인한 모델 신뢰 목표 |
| **작업 공간** | `borshkit/` 폴더는 자체 히스토리가 있는 Obsidian 볼트. `.gitignore` 규칙은 자동으로 추가하고 검사 |
| **실행자** | Claude Code, Codex(GPT Image 포함), 모든 OpenAI 호환 API, 직접 만든 프로그램. 대체 실행자로 넘기는 풀 |
| **역할 21개** | 아키텍트, 개발자, 리뷰어, 테스터, 리서처, 디자이너, 디자인 프롬프트 작성자, README 일러스트레이터… |
| **오토파일럿** | 일상적인 질문은 1분 뒤 기본 답으로 처리. 중대한 질문에서는 보고서와 맥락 인계를 남기고 멈춤 |
| **상황판** | 누가 작업을 받았는지, 누가 일하는 중인지, 무엇이 사용자를 기다리는지. 터미널, `STATUS.md`, Claude Code 상태 줄에서 확인 |
| **리서치** | 출처는 사본으로 저장. `citations` 검사가 모든 인용을 한 단어씩 대조 |
| **프라이버시** | 모드 3가지. 에이전트에게 보내는 작업 묶음은 보내기 전에 키와 개인 정보를 검사함. 설정은 제안을 거쳐야만 바뀜 |
| **초보자를 위한 Git** | “무엇이 바뀌었나”, “누가 바꿨나”, “되돌려 줘”를 쉬운 말로. 파괴적인 명령은 쓰지 않음 |
| **크레딧** | `attribution`, `readme-assets` 검사, 모든 출처의 전체 기여자 목록 |

## 프런트엔드, 디자인, iOS

Borshkit에는 인터페이스용 역할이 있고, 역할마다 자기에게 맞는 스킬만 받습니다.

| 역할 | 하는 일 | 스킬과 1차 자료 |
|---|---|---|
| `ui-engineer` | 인터페이스 구현: 모든 상태, 모션, 키보드 | Emil Kowalski, ECC; Vercel Web Interface Guidelines, shadcn/ui, Radix, React Aria, WCAG |
| `ios-designer` | iPhone·iPad 인터페이스 리뷰 | `apple-design`, Liquid Glass, SwiftUI; Apple HIG, SF Symbols |
| `motion-reviewer` | 애니메이션을 엄격하게 리뷰 | `review-animations`, `animation-vocabulary`, `motion-foundations` |
| `a11y-reviewer` | WCAG 2.2 AA 기준으로 접근성 리뷰 | ECC `accessibility`, `frontend-a11y`; WAI-ARIA APG, axe-core |
| `designer` | 최악의 데이터로 인터페이스를 깨뜨려 봄 | `break-ui` |

[라이브러리](../../library/README.md)에는 스킬 팩 3개(스킬 25개)와 검증된 링크 63개가 있습니다. 컴포넌트, 모션, 디자인 시스템, 접근성, 아이콘, 폰트, 품질 도구를 다룹니다. 터미널에서는 `borshkit skills`와 `borshkit library`로 볼 수 있습니다.

## 레시피

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

버전과 라이선스까지 담은 전체 레시피는 [docs/ingredients.md](../../docs/ingredients.md)(러시아어)에 있습니다. 이 프로젝트들의 **모든 기여자** 목록(1262개 항목)은 [CONTRIBUTORS-REFERENCES.md](../../CONTRIBUTORS-REFERENCES.md)에 있습니다. 한 분 한 분 모두 감사합니다!

## 한계

- Borshkit은 자신이 에이전트에게 보내는 작업 묶음을 검사합니다. 그 뒤에 Claude Code나 Codex가 프로젝트 복사본의 파일에서 무엇을 읽는지는 보지 못합니다. 무시되는 파일(`.env`)은 복사본에 없지만, 나머지 파일은 에이전트가 모두 읽을 수 있습니다.
- 작업 검사(테스트, 빌드)는 사용자의 환경 변수로 실행됩니다. 테스트에 키가 필요할 때가 있기 때문입니다. 환경 필터는 실행자에게만 적용됩니다.
- 지식 지도는 JS/TS 코드와 Markdown의 연결만 이해합니다. Swift, Python, Go 등 다른 언어는 아직 지도에 들어가지 않습니다. 인수 결과는 이것과 무관합니다.
- Claude Code, Codex, Gemini 어댑터는 같은 이벤트 형식을 쓰는 가짜 프로그램으로 테스트했습니다. 설치된 Claude Code의 플래그는 확인했습니다. CI에서는 실제 모델을 실행하지 않습니다.
- Codex(GPT Image)를 통한 이미지 생성은 아직 테스트하지 않았습니다. 사용자의 구독에서 되는지는 `borshkit executor probe codex`로 확인할 수 있습니다.
- Obsidian 그래프가 노트 속성에 있는 링크를 보여 주는지는 테스트하지 않았습니다. 그래서 같은 링크를 본문에도 일반 링크로 한 번 더 적어 둡니다.
- Borshkit의 메시지는 아직 러시아어로만 나옵니다. 명령과 플래그는 러시아어와 영어 둘 다 있습니다.
- Node 22에서 `node:sqlite`는 아직 실험 기능입니다.
- 패턴으로 키와 개인 정보를 찾는 기능은 모든 경우를 잡아내지 못합니다.

## 문서

문서는 지금은 러시아어로만 되어 있습니다.
- [문서 지도](../../docs/README.md) — 빠른 시작, 개념, 레퍼런스.
- [명세](../../docs/spec.md) — 초기 분석과 결정 D1–D22.
- [변경 기록](../../CHANGELOG.md) · [기여 안내](../../CONTRIBUTING.md) · [보안](../../SECURITY.md) · [개발 에이전트를 위한 안내](../../AGENTS.md)

## 개발

```sh
npm run verify   # 정적 검사와 전체 테스트. CI가 Linux, Windows 및 macOS에서 실행
```

## 만든 사람

**Pavel Park** — [GitHub](https://github.com/ParkPavel) · [Telegram 채널](https://t.me/parkpavel_chigon)

## 프로젝트 후원

Borshkit은 무료 오픈 소스입니다. 도움이 되었다면 Tribute를 통해 후원해 주세요.

<p><a href="https://web.tribute.tg/d/Sh8"><img src="https://img.shields.io/badge/Tribute-%ED%9B%84%EC%9B%90%ED%95%98%EA%B8%B0-e8554e?style=for-the-badge&logo=telegram&logoColor=white" alt="후원하기"></a></p>

터미널에서: `borshkit support`는 링크를 보여 주고 브라우저에서 열지 묻습니다. GitHub 별표와 동료에게 소개하는 것도 큰 도움이 됩니다.

## 라이선스

Apache-2.0입니다. 자세한 내용은 [LICENSE](../../LICENSE)와 [NOTICE](../../NOTICE)에 있습니다. `packs/`의 스킬은 MIT이며, 팩마다 해당 저자의 라이선스가 들어 있습니다.


## Связи

- [Текущая архитектура](../architecture.md)
- [Дорожная карта](../roadmap.md)
