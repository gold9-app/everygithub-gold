# everygithub_gold — 깃허브 전용 봇 서비스 기획서 (v0.2)

> 서비스명 **everygithub_gold** (패키지/CLI명: `everygithub`). 
> 확정 사항: 로컬 에이전트 + 웹 허브(Vercel) 구조 / 입구는 웹 대시보드·텔레그램·슬랙/디스코드 / 스택은 Node·TypeScript 모노레포.

---

## 1. 한 줄 정의

깃허브 링크 하나를 던지면 **내 PC의 지정 폴더에 클론**하고, **한국어 설명서를 만들고**, 원하면 **클로드코드 스킬/MCP로 등록**하거나 **설치·테스트·dev 서버 실행까지** 해주는 봇. 링크는 웹·텔레그램·슬랙 어디서 던져도 되고, 실제 작업은 내 PC에 깔린 에이전트가 수행한다.

---

## 2. 왜 "로컬 에이전트 + 허브" 구조인가

| 요구 | 클라우드 단독 | 로컬 단독 | 로컬 에이전트 + 허브 (채택) |
|---|---|---|---|
| 내 PC 폴더에 클론 | 불가 | 가능 | 가능 |
| ~/.claude/skills 등록 | 불가 | 가능 | 가능 |
| 폰/텔레그램에서 원격 명령 | 가능 | 불가 | 가능 |
| 팀원 각자 PC에 배포 | 불가 | 가능 | 가능 (허브 1개 + 에이전트 N개) |
| 서버 비용 | 있음 | 없음 | 허브만 (Vercel/Supabase 무료 티어로 충분) |

핵심 원칙: **허브는 "명령 우체통"이고, 실행·비밀정보(깃허브 토큰, Claude API 키)는 전부 로컬 에이전트에만 존재한다.** 허브가 털려도 내 PC 토큰은 안 새고, 허브 없이도 에이전트 단독(로컬 모드)으로 100% 동작한다.

---

## 3. 시스템 아키텍처

```
┌─────────────── 입구 (어디서든 링크 던지기) ───────────────┐
│  웹 대시보드   텔레그램 봇   슬랙 앱   디스코드 봇   CLI    │
└───────────────┬────────────────────────────────┬───────────┘
                │ HTTPS                          │ localhost
        ┌───────▼────────┐                       │
        │   HUB (Vercel) │  Next.js App Router    │
        │  - Auth(GitHub)│  - Job 큐 (Postgres)   │
        │  - 디바이스 페어링│ - Realtime 채널       │
        │  - 웹훅 수신    │  - 결과/문서 저장       │
        └───────┬────────┘                       │
   Supabase Realtime (에이전트→허브 아웃바운드 연결, 포트포워딩 불필요)
                │                                │
        ┌───────▼────────────────────────────────▼───────┐
        │  LOCAL AGENT (사용자 PC, Node 데몬 / 단일 exe)   │
        │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
        │  │ Job Runner│ │ Analyzer │ │ Claude Layer     │ │
        │  │ clone/pull│ │ 스택감지  │ │ Agent SDK 또는   │ │
        │  │ install   │ │ 라이선스  │ │ claude -p 헤드리스│ │
        │  │ test/dev  │ │ 보안스캔  │ │ (번역·요약·스킬) │ │
        │  └──────────┘ └──────────┘ └──────────────────┘ │
        │  Integrations: ~/.claude (skills/mcp/CLAUDE.md), │
        │  Obsidian vault, Docker(선택), OS 키체인          │
        └──────────────────────────────────────────────────┘
```

### 3.1 컴포넌트

**① Local Agent (`everygithub-agent`)**
- Node 22 데몬. `npx everygithub init` 한 줄로 설치, 또는 GitHub Releases에서 `everygithub.exe / everygithub-mac / everygithub-linux` 단일 바이너리(bun `--compile`).
- 로컬 HTTP 서버(`localhost:7777`, Hono)로 CLI·로컬 대시보드 제공. 허브 없이도 이 UI만으로 전 기능 사용 가능(로컬 모드).
- 허브와는 **아웃바운드 WebSocket(Supabase Realtime)** 으로만 연결 → 방화벽/공유기 설정 불필요.
- 설정·토큰은 OS 키체인(keytar) 또는 `~/.everygithub/config.json`(암호화)에 저장.
- Windows 트레이 앱은 Phase 5에서 Tauri로 감싸는 것으로 미룸(핵심은 데몬).

**② Hub (`everygithub-hub`, Vercel)**
- Next.js 15 App Router. GitHub OAuth 로그인(Supabase Auth).
- 역할: 대시보드 UI / 잡 큐 / 디바이스 페어링 / 메신저 웹훅 수신 / 결과물(설명서 마크다운) 보관·공유 링크.
- Vercel 서버리스는 WebSocket을 못 잡으므로 실시간은 **Supabase Realtime**(Postgres 변경 구독)에 위임. 에이전트는 `jobs` 테이블의 자기 device_id 행을 구독.
- 레포 업데이트 감시는 Vercel Cron(`0 * * * *`)이 GitHub API로 최신 커밋/릴리즈 확인 → 변경 시 알림 잡 생성.

**③ 메신저 어댑터**
- 텔레그램: grammY, 웹훅 모드. 인라인 버튼으로 후속 액션 선택.
- 슬랙: Bolt(HTTP 모드). 링크 공유 → 스레드에 결과 카드.
- 디스코드: discord.js Interactions 엔드포인트(서버리스 호환).
- 모두 "URL 파싱 → job 생성 → 결과 카드 렌더"라는 동일 인터페이스(`packages/adapters`)를 구현.

**④ 공용 프로토콜 (`packages/protocol`)**
- zod 스키마로 Job/Event/Artifact 정의. 허브·에이전트·어댑터가 같은 타입을 공유.

```ts
type Job = {
  id: string; deviceId: string; userId: string;
  source: { url: string; kind: 'repo'|'pr'|'gist'|'subdir'|'release'; ref?: string; path?: string };
  pipeline: 'quick' | 'full' | 'skill' | 'custom';
  steps: StepName[];            // ['clone','analyze','docs','install','test','dev','skill','mcp','obsidian']
  options: { targetDir?: string; shallow?: boolean; lang?: 'ko'; approve?: 'auto'|'ask' };
  status: 'queued'|'running'|'waiting_approval'|'done'|'failed';
};
type JobEvent = { jobId; step; level: 'log'|'progress'|'result'|'error'; payload; ts };
```

---

## 4. 핵심 사용자 흐름

1. 링크 던짐 (`https://github.com/owner/repo`, 브랜치/서브폴더/PR/gist/릴리즈 URL 모두 인식)
2. 에이전트가 **기본 파이프라인 `quick`** 실행: 클론 → 스택·라이선스·규모 분석 → 한국어 요약 카드 (10~30초)
3. 결과 카드에 **추천 액션 버튼**이 붙음. 레포 종류에 따라 버튼이 달라짐:
   - MCP 서버 레포 → `[MCP로 등록]`
   - CLI/라이브러리 → `[클로드코드 스킬로 등록]`
   - 웹앱 → `[설치+dev 서버 실행]`
   - 어떤 레포든 → `[전체 설명서 생성]` `[테스트 실행]` `[옵시디언에 저장]`
4. 자연어도 됨: "이거 클론하고 테스트까지 돌려줘" → Claude가 의도 → steps 배열로 변환(`custom` 파이프라인)
5. 완료/실패/승인요청은 던진 채널로 되돌아옴 (텔레그램에서 던졌으면 텔레그램으로)

파이프라인 프리셋:

| 프리셋 | 스텝 | 소요 |
|---|---|---|
| `quick` (기본) | clone → analyze → summary | 초 단위 |
| `docs` | quick + README 번역 + 설명서 생성 + 옵시디언 저장 | 1분 내외 |
| `full` | docs + install + test + env 추출 | 수 분 |
| `skill` | quick + SKILL.md 생성 + ~/.claude/skills 등록 | 1분 내외 |
| `custom` | 자연어로 조합 | — |

---

## 5. 기능 카탈로그 (추천 전부 포함, ★ = MVP)

### A. 수집·클론
- ★ URL 파싱: repo / branch / tag / commit / 서브폴더(`/tree/main/packages/x` → sparse checkout) / PR(`/pull/12` → PR 브랜치 체크아웃) / gist / 릴리즈 에셋 다운로드
- ★ 폴더 규칙: `{workspace}/{owner}/{repo}` 기본, 잡별 `targetDir` 오버라이드, 워크스페이스 여러 개 등록(예: `~/dev`, `D:\lab`)
- ★ shallow(기본) / full clone 선택, 이미 있으면 `pull` 로 갱신 (로컬 변경 있으면 stash 여부 질문)
- 프라이빗 레포: GitHub PAT는 에이전트에만 저장, 허브는 모름
- Git LFS·서브모듈 자동 감지 후 처리
- 레포 태그/즐겨찾기/메모, 아카이브(폴더 zip 후 삭제), 완전 삭제
- 내 클론 목록 검색: 자연어("텔레그램 봇 관련으로 받아둔 거") → 요약 임베딩 검색

### B. 분석·문서화
- ★ **README 한국어 번역 + 설명서 생성**: 단순 번역이 아니라 "설치 → 설정 → 첫 실행 → 자주 쓰는 명령 → 주의점" 구조로 재편집. 원문 링크·코드블록은 그대로 보존
- ★ 레포 구조 요약: 디렉토리 트리 + 핵심 파일 역할 한 줄씩 (`package.json`, 진입점, 설정 파일)
- ★ 스택/의존성 감지: 언어, 패키지 매니저(pnpm/npm/yarn/bun/pip/uv/poetry/cargo/go), 프레임워크, 필요한 런타임 버전(`.nvmrc`, `engines`, `pyproject`)
- ★ 라이선스 판독: SPDX 식별 + "상업 이용 가능? 수정 배포 시 의무?" 한국어 3줄 요약 (법률 자문 아님 표기)
- 건강도 카드: 스타/포크/마지막 커밋/오픈 이슈/릴리즈 주기/메인테이너 활동 → "활발/유지/방치" 등급
- 보안 사전 점검: `postinstall`·`preinstall` 스크립트 존재 경고, `npm audit`/`pip-audit` 요약, 하드코딩 시크릿 패턴 스캔, 별 수 적고 최근 생성된 레포 경고
- 필요 환경변수 추출 → `.env.example` 자동 생성 + 각 변수 설명(코드에서 `process.env.X` 사용처 근거)
- 유사 레포 비교: "같은 목적 레포 3개와 비교표" (GitHub 검색 + Claude)
- 코드 규모: 파일 수/LOC/언어 비율
- 변경 요약: 이미 클론한 레포를 pull 했을 때 "지난번 이후 뭐가 바뀌었나" 커밋 로그 한국어 요약

### C. 실행·테스트 (개발단)
- ★ 설치 자동화: 감지된 패키지 매니저로 `install` 실행, 런타임 버전 불일치 시 경고 (nvm/uv 권장 명령 제시)
- ★ 테스트 실행: `test` 스크립트/pytest/cargo test 감지 → 실행 → 실패 항목 한국어 요약
- dev 서버 실행: `dev`/`start` 감지 → 백그라운드 실행 → 포트 감지 → `http://localhost:PORT` 반환, 중지 명령 제공
- 예제/데모 스크립트 실행 (`examples/` 폴더 감지)
- 샌드박스: Docker 있으면 컨테이너 안에서 install/test (기본값), 없으면 로컬에서 실행하되 승인 필요
- 실행 결과 로그를 잡 이벤트로 스트리밍 (대시보드에서 실시간 tail)
- "빠른 스모크": 설치 후 `--help` 또는 import 한 번 해보고 동작 여부만 확인

### D. 클로드코드 연동 (차별점)
- ★ **스킬 등록**: 레포 사용법을 `SKILL.md`로 생성(설명·트리거 조건·명령 예시) → `~/.claude/skills/{repo}/` 에 설치. 레포 자체가 스킬 레포면(`SKILL.md` 존재) 그대로 심볼릭 링크
- ★ **MCP 서버 등록**: MCP 서버 레포 감지(`@modelcontextprotocol/sdk` 의존, `mcp.json`) → 빌드 → `claude mcp add` 실행 또는 `.claude.json` 편집. 필요한 env 키 입력 요청
- 플러그인 레포 감지 → `claude plugin` 설치
- `CLAUDE.md` 자동 생성: 레포 컨텍스트 요약 + 빌드/테스트 명령 → 클로드코드가 바로 작업 가능한 상태
- "클로드코드로 열기": 해당 폴더에서 `claude` 세션 시작, 첫 프롬프트 자동 주입(예: "이 레포를 우리 파이프라인에 붙이려면 어떻게 해야 해?")
- 커스텀 에이전트/서브에이전트 정의 레포(`.claude/agents/*.md`) 감지 → 등록
- 등록된 스킬/MCP 인벤토리 대시보드: 어떤 레포에서 왔는지 역추적, 레포 업데이트 시 재등록 버튼

### E. 감시·알림
- 레포 워치: 새 릴리즈/커밋/보안 advisory → 텔레그램/슬랙 알림, "자동 pull" 옵션
- 주간 다이제스트: 이번 주 클론한 것, 업데이트된 것, 안 쓴지 오래된 것(정리 제안)
- 잡 진행 알림: 시작/완료/실패/승인요청
- 승인 게이트: install·test·skill 등록 등 부작용 있는 스텝은 정책 설정(`auto` / `ask`) — 기본은 quick 이외 `ask`

### F. 내보내기·공유
- ★ 옵시디언 저장: 설명서 마크다운을 지정 vault 폴더로(프론트매터: url, stars, license, tags, cloned_at). 기존 INDEX 구조와 호환되도록 템플릿 커스텀 가능
- 노션 페이지 생성 (Notion API)
- 허브 공유 링크: 설명서를 팀원에게 URL로 공유(로그인 필요/공개 선택)
- 설명서 PDF/HTML 내보내기

### G. 안전·운영
- 에이전트는 자기 사용자가 만든 잡만 실행 (device ↔ user 바인딩, 잡에 서명)
- 실행 가능한 명령 allowlist (임의 셸 명령 금지, 스텝 단위만)
- 토큰은 로컬 키체인, 허브 DB에는 절대 저장 안 함
- 디스크 용량 감시: 워크스페이스 용량 상한, 초과 시 아카이브 제안
- 잡 동시성 제한, 타임아웃, 재시도
- 감사 로그: 언제 어느 채널에서 무엇을 실행했는지

---

## 6. 데이터 모델 (Supabase Postgres)

| 테이블 | 핵심 컬럼 |
|---|---|
| `users` | id, github_login, plan |
| `devices` | id, user_id, name, os, agent_version, last_seen, pairing_code(임시) |
| `repos` | id, user_id, device_id, url, owner, name, ref, local_path, stack(jsonb), license, stars, health, tags[], cloned_at, updated_at |
| `jobs` | id, user_id, device_id, repo_id, source(jsonb), pipeline, steps[], options, status, origin(channel, chat_id, msg_id), created_at, finished_at |
| `job_events` | id, job_id, step, level, payload(jsonb), ts |
| `artifacts` | id, repo_id, job_id, kind(docs_ko, tree, env_example, skill_md, claude_md), content(text), share_token |
| `integrations` | user_id, kind(telegram/slack/discord/obsidian/notion), config(jsonb, 비밀값은 로컬) |
| `watches` | repo_id, kind(release/commit/advisory), last_seen_sha, auto_pull |

로컬 모드에서는 동일 스키마를 SQLite(`~/.everygithub/db.sqlite`)로 미러링 → 허브 없이도 동작.

---

## 7. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 모노레포 | pnpm + Turborepo | hub/agent/adapters 타입 공유 |
| 허브 | Next.js 15 (App Router), Tailwind, shadcn/ui | Vercel 원클릭 배포 |
| DB/Auth/실시간 | Supabase | Postgres+Auth+Realtime 한 번에, 무료 티어 |
| 에이전트 서버 | Hono + Node 22 | 가볍고 bun 컴파일 호환 |
| Git | simple-git + 시스템 git | sparse/shallow/LFS 지원 |
| 프로세스 실행 | execa | 로그 스트리밍·타임아웃 |
| AI | Claude Agent SDK (기본) / `claude -p` 헤드리스(설치돼 있으면 우선) | 사용자 본인 키·구독 사용 |
| 텔레그램/슬랙/디스코드 | grammY / Bolt / discord.js | 서버리스 웹훅 호환 |
| 패키징 | `npm i -g everygithub` + bun `--compile` 바이너리 + GitHub Releases | exe 요구 충족 |
| 자동 업데이트 | 에이전트 기동 시 Releases 버전 확인 → 안내/자동 교체 | |

Claude 호출 정책: 번역·요약·스킬 생성은 **사용자 PC의 에이전트**가 사용자 키로 호출(허브는 LLM 호출 안 함 → 허브 운영비 0). 클로드코드가 설치돼 있으면 `claude -p --output-format json` 으로 위임해 구독 요금제 활용.

---

## 8. 배포·설치 경험 ("누구나 바로 받아 쓰는 구조")

**사용자(팀원) 입장 3단계**
1. 허브 접속 → GitHub 로그인 → "새 디바이스 연결" 클릭 → 6자리 페어링 코드 표시
2. PC에서 `npx everygithub init` (또는 exe 실행) → 코드 입력 → 워크스페이스 폴더 선택 → Claude 키/클로드코드 감지
3. 텔레그램에서 `/start` 후 허브에서 발급한 연결 코드 입력 → 끝. 이후 링크만 던지면 됨

**운영자(허브 배포) 입장**
- 옵션 1: 제공되는 호스티드 허브에 가입만 (멀티테넌트)
- 옵션 2: `Deploy to Vercel` 버튼 + Supabase 프로젝트 생성 + env 6개 입력 → 자체 허브

**허브 없이 쓰기(로컬 모드)**
- `npx everygithub` 실행 → `localhost:7777` 대시보드 + CLI(`everygithub add <url> --pipeline full`)만으로 전 기능. 텔레그램은 이 경우 롱폴링 모드로 에이전트가 직접 연결 가능(서버 없이도 텔레그램 입구 사용 가능).

---

## 9. 모노레포 구조

```
everygithub/
├─ apps/
│  ├─ hub/            Next.js (Vercel) — 대시보드, API, 웹훅
│  └─ agent/          Node 데몬 + CLI + 로컬 UI (bun compile 대상)
├─ packages/
│  ├─ protocol/       zod 스키마 (Job, Event, Artifact)
│  ├─ core/           파이프라인 엔진, 스텝 구현(clone/analyze/docs/install/test/dev/skill/mcp)
│  ├─ analyzers/      스택·라이선스·보안·env 추출기
│  ├─ ai/             Claude 호출 래퍼 (Agent SDK ↔ claude -p 자동 선택), 프롬프트 템플릿
│  ├─ adapters/       telegram / slack / discord / web 공통 인터페이스
│  └─ ui/             공용 컴포넌트 (허브·로컬 UI 공유)
├─ supabase/          마이그레이션, RLS 정책
└─ .github/workflows/ 릴리즈 바이너리 빌드
```

---

## 10. 로드맵

| Phase | 범위 | 산출물 |
|---|---|---|
| **1. MVP (로컬)** | agent CLI + 로컬 대시보드, URL 파싱·클론·분석·README 번역/설명서, 옵시디언 저장, SQLite | `npx everygithub` 로 혼자 쓰기 시작 |
| **2. 허브+텔레그램** | Supabase 스키마, 페어링, 잡 큐/Realtime, 텔레그램 어댑터, 결과 카드+인라인 버튼 | 폰에서 링크 던지기 |
| **3. 개발단** | install/test/dev 스텝, Docker 샌드박스, env 추출, 승인 게이트 | "테스트까지 돌려줘" |
| **4. 클로드코드 연동** | 스킬/MCP/CLAUDE.md 생성·등록, 인벤토리, 클로드코드로 열기 | 차별 기능 완성 |
| **5. 감시·확장** | 워치/다이제스트(Vercel Cron), 슬랙·디스코드, 노션, 유사 레포 비교, 보안 스캔 | 팀 배포 |
| **6. 패키징** | bun 바이너리(exe/mac/linux), 자동 업데이트, Tauri 트레이, Deploy to Vercel 템플릿, 문서 | 누구나 설치 |

Phase 1은 허브 없이 완결되므로 바로 가치가 나오고, 이후 단계는 붙이기만 하면 된다.

---

## 11. 확정 사항 (v0.2 반영)

| 항목 | 결정 |
|---|---|
| 이름 | everygithub_gold (CLI: `everygithub`) |
| 워크스페이스 경로 | 에이전트 첫 실행 온보딩에서 사용자가 폴더 경로 붙여넣기 |
| AI 호출 | **키 없이도 전 기본 기능 동작**. Claude API 키 연결은 설정의 "AI 연결(선택)" 추가기능. 키 있으면 AI층 기능 활성화 |
| 배포 | 배포자(운영자)가 허브를 한 번 배포하면 사용자는 가입·에이전트 설치만으로 즉시 사용 (멀티테넌트) |
| 아카이빙 | 기본은 개인 사이트(허브) 계정 페이지에 아카이브(Supabase DB/Storage). 옵시디언 내보내기는 선택 옵션 |
| 텔레그램 | 신규 봇 생성 (배포자가 BotFather 토큰 1개 등록, 사용자는 /start + 연결 코드) |
| 로그인 | GitHub OAuth |
| 개발 순서 | 서비스 골격(사이트+에이전트+텔레그램 얼개) 먼저 → 기능 하나씩 추가 |
| 작업 폴더 / OS | `D:\개발\깃허브 클론 봇`, Windows 우선 지원 |

### 11.1 기능 2층 구조 (AI 키 유무)

| 기본층 (키 불필요) | AI층 (키 연결 시 활성) |
|---|---|
| 클론/pull/sparse/PR 체크아웃, 폴더·태그 관리, 아카이브 | README 한국어 설명서 재편집 |
| 스택·패키지매니저·런타임 버전 감지, 트리 요약, LOC | 자연어 명령 → 파이프라인 변환 |
| 라이선스 SPDX 판독(정적 룰), 건강도(GitHub API) | SKILL.md / CLAUDE.md / MCP 설명 자동 작성 |
| `.env.example` 추출(정규식), postinstall 경고, audit | 커밋 로그 한국어 요약, 유사 레포 비교, 테스트 실패 원인 요약 |
| install / test / dev 서버 / 스킬 폴더 링크·MCP 등록 | 자연어 레포 검색 |

### 11.2 배포자 체크리스트 (3단계)

1. Supabase 프로젝트 생성 → 마이그레이션 실행 (제공 스크립트)
2. Vercel "Deploy" → env 입력: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GITHUB_CLIENT_ID/SECRET`, `TELEGRAM_BOT_TOKEN`, `HUB_URL`
3. 배포 후 `/api/telegram/setup` 한 번 호출로 웹훅 등록 → 끝

### 11.3 사용자 첫 사용 흐름

1. 사이트 접속 → GitHub 로그인 → "디바이스 추가" → 6자리 코드
2. `everygithub.exe` 실행(또는 `npx everygithub`) → 온보딩: 워크스페이스 폴더 경로 붙여넣기 → 페어링 코드 입력 → (선택) Claude API 키
3. 텔레그램 봇 `/start` → 사이트에서 발급한 연결 코드 입력 → 이후 링크만 던지면 됨

## 12. 개발 착수 순서 (골격 우선)

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| S1 | 모노레포 스캐폴딩, protocol 스키마, Supabase 스키마·RLS | `pnpm build` 통과 |
| S2 | 허브: GitHub 로그인, 디바이스 페어링, 레포/잡 목록 페이지 | 로그인→코드 발급 |
| S3 | 에이전트: 온보딩(경로·코드), 허브 연결, clone 스텝, 기본 분석 | 사이트에서 링크 입력 → PC에 클론됨 |
| S4 | 텔레그램: 신규 봇, /start 연결, 링크 수신 → 잡 생성 → 결과 카드 | 폰에서 링크 → 클론 |
| S5 | 아카이브 페이지(설명서 저장·공유), AI 연결 설정 + README 설명서 | 첫 AI 기능 |
| S6~ | 기획서 5절 기능 카탈로그 순서대로 추가 | |
