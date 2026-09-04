# everygithub_gold

깃허브 링크 하나를 던지면 **내 PC 의 지정 폴더에 클론**하고, 분석·한국어 설명서·클로드코드 스킬 등록·설치/테스트까지 해주는 깃허브 전용 봇.

- `apps/hub` — 웹 대시보드 + API + 텔레그램 웹훅 (Vercel). 독립 npm 프로젝트
- `apps/agent` — PC 에 설치되는 에이전트 CLI/데몬. esbuild 로 `apps/agent/dist/cli.js` 단일 파일 번들
- `packages/protocol` — 허브·에이전트가 공유하는 잡/레포 스키마 (zod). 허브는 `apps/hub/lib/protocol` 복사본 사용 (`npm run sync:hub`)
- `packages/core` — 파이프라인 엔진과 스텝 (clone / analyze / summary …)
- `supabase/migrations` — DB 스키마 + RLS

> 워크스페이스/심볼릭 링크를 쓰지 않는 구조 (Windows 에서 symlink 가 막힌 환경 대응)

기획서: `docs/everygithub-plan-v0.2.md`

---

## 배포자 (한 번만)

1. **Supabase** 프로젝트 생성 → SQL Editor 에 `supabase/migrations/0001_init.sql` 실행
   → Authentication > Providers > GitHub 활성화 (GitHub OAuth App 의 callback 은 `https://<project>.supabase.co/auth/v1/callback`)
   → Authentication > URL Configuration 의 Site URL / Redirect URLs 에 허브 주소 추가
2. **텔레그램** @BotFather 에서 봇 생성 → 토큰 확보
3. **Vercel** 에 `apps/hub` 배포 (Root Directory: `apps/hub`, 모노레포 자동 인식) → 환경변수:

   | 키 | 값 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service role key (서버 전용) |
   | `TELEGRAM_BOT_TOKEN` | BotFather 토큰 |
   | `TELEGRAM_WEBHOOK_SECRET` | 아무 긴 랜덤 문자열 |
   | `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | 봇 username (@ 제외) |
   | `HUB_URL` | `https://<배포주소>` |

4. 배포 후 브라우저에서 `https://<배포주소>/api/telegram/setup?key=<TELEGRAM_WEBHOOK_SECRET>` 한 번 열기 → 웹훅 등록 완료

## 사용자

1. 허브 접속 → GitHub 로그인 → **[+ 디바이스 추가]** → 6자리 코드
2. PC 에서 `npx everygithub` (또는 `everygithub.exe`) → 폴더 경로 붙여넣기 → 코드 입력 → (선택) Claude API 키
3. 대시보드 **[텔레그램 연결]** → 봇에 `/start` 후 코드 전송
4. 이제 웹이든 텔레그램이든 링크만 던지면 됨. 에이전트 창은 켜 둔다 (`everygithub` = 데몬 시작)

허브 없이 혼자 쓰기: `everygithub add https://github.com/owner/repo -p quick|docs|full|skill`

## 개발

```bash
# 루트 = 에이전트 + 공용 패키지
npm install
npm run build                    # 에이전트 번들 + 허브용 protocol 복사
npm run agent -- add https://github.com/owner/repo
npm run typecheck

# 허브 (별도 npm 프로젝트, Vercel Root Directory = apps/hub)
npm run hub:install
npm run hub                      # apps/hub/.env.local 필요 (.env.example 참고)
npm run hub:build
```

`packages/protocol` 을 수정하면 `npm run sync:hub` 로 허브 복사본을 갱신하고 커밋한다.

Windows exe: `bun build apps/agent/dist/cli.js --compile --outfile release/everygithub.exe` (bun 필요)

## 현재 구현 상태 (S1~S4 골격)

- [x] URL 파싱 (repo / branch / subdir sparse / PR / commit / gist / release)
- [x] clone → analyze(스택·라이선스·env 키·MCP/스킬 감지) → summary 카드
- [x] 허브: GitHub 로그인, 디바이스 페어링, 잡 큐(폴링 claim), 이벤트 로그, 레포 아카이브, 공유 링크
- [x] 텔레그램: 연결 코드, 링크 수신 → 파이프라인 버튼 → 잡 생성 → 완료 카드 회신
- [ ] docs(AI 설명서) / install / test / dev / skill / mcp / claude_md / obsidian 스텝
- [ ] 슬랙·디스코드 어댑터, 레포 워치·다이제스트, 실시간 로그 뷰
