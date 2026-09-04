import { redirect } from "next/navigation";
import { ArrowRight, GitBranch, FileText, Terminal, Bot, Shield, Zap } from "lucide-react";
import { currentUser } from "@/lib/supabase";
import { LoginButton } from "@/components/login-button";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: GitBranch, title: "링크 하나로 클론", desc: "레포·브랜치·서브폴더·PR·gist 어떤 링크든 내 PC 지정 폴더에 정리해서 클론합니다." },
  { icon: Zap, title: "즉시 분석 카드", desc: "언어·프레임워크·패키지 매니저·라이선스·필요 환경변수·MCP/스킬 여부를 몇 초 만에." },
  { icon: FileText, title: "한국어 설명서", desc: "README 를 설치 → 설정 → 첫 실행 순서로 재구성한 설명서. 내 사이트에 아카이브." },
  { icon: Terminal, title: "설치·테스트 실행", desc: "패키지 매니저를 감지해 설치하고 테스트를 돌려 결과를 한국어로 요약합니다." },
  { icon: Bot, title: "클로드코드 등록", desc: "SKILL.md 생성, MCP 서버 등록, CLAUDE.md 작성까지 한 번에." },
  { icon: Shield, title: "안전 우선", desc: "postinstall 스크립트 경고, 라이선스 판독, 실행 전 승인. 토큰은 내 PC 에만." },
];

export default async function Landing() {
  if (await currentUser()) redirect("/app");
  return (
    <div className="min-h-screen">
      <header className="max-w-[1080px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <span className="w-6 h-6 rounded-md bg-gold text-black font-black text-[13px] flex items-center justify-center">eg</span>
          everygithub<span className="text-gold">_gold</span>
        </div>
        <LoginButton small />
      </header>

      <section className="max-w-[1080px] mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
        <div className="fade-up">
          <div className="badge badge-gold mb-5">텔레그램 · 웹 · 어디서든</div>
          <h1 className="text-4xl md:text-[52px] leading-[1.1] font-extrabold tracking-tight">
            깃허브 링크 하나,<br />나머지는 내 PC 가 합니다.
          </h1>
          <p className="mt-5 text-lg text-fg-2 max-w-xl">
            링크를 던지면 클론하고, 분석하고, 한국어 설명서를 만들고, 클로드코드에 등록합니다. 서버는 명령만 전달하고 실행은 내 PC 에서 — 토큰과 코드는 밖으로 나가지 않습니다.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <LoginButton />
            <span className="text-sm text-mute">무료 · 1분 설치 · Windows</span>
          </div>
        </div>

        {/* 데모 카드 */}
        <div className="card p-5 fade-up" style={{ animationDelay: ".1s" }}>
          <div className="flex items-center gap-2 text-xs text-mute mb-3"><span className="w-2 h-2 rounded-full bg-ok" />데스크톱-PC · 온라인</div>
          <div className="input flex items-center text-fg-2 text-sm mb-4">https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem</div>
          <div className="rounded-md border border-line bg-bg-raised p-4 text-[13px] leading-6">
            <div className="font-semibold text-fg mb-1">modelcontextprotocol/servers <span className="text-mute font-normal">· src/filesystem</span></div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="badge badge-gold">MCP 서버</span><span className="badge">TypeScript</span><span className="badge">npm</span><span className="badge badge-ok">MIT</span><span className="badge">테스트 있음</span>
            </div>
            <div className="text-warn">⚠ 설치 시 자동 실행 스크립트: prepare — 설치 전 확인 권장</div>
            <div className="mt-3 flex gap-2">
              <span className="btn btn-primary btn-sm">MCP 로 등록</span><span className="btn btn-ghost btn-sm">설명서 생성</span><span className="btn btn-ghost btn-sm">테스트</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1080px] mx-auto px-6 pb-24 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-5">
            <f.icon size={18} className="text-gold mb-3" />
            <div className="font-semibold mb-1">{f.title}</div>
            <div className="text-sm text-fg-2 leading-6">{f.desc}</div>
          </div>
        ))}
      </section>

      <section className="border-t border-line">
        <div className="max-w-[1080px] mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">설치는 파일 하나 실행이 전부</h2>
          <p className="text-fg-2 mt-2">GitHub 로그인 → 연결 파일 다운로드 → 실행. 코드 입력도, 터미널도 없습니다.</p>
          <div className="mt-6 inline-flex"><LoginButton /></div>
        </div>
      </section>
      <footer className="border-t border-line text-xs text-mute text-center py-6">everygithub_gold · 배포자가 한 번 올리면 누구나 쓰는 오픈 셀프호스팅 서비스</footer>
    </div>
  );
}
