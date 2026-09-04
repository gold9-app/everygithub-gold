"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, TerminalSquare, Sparkles, Plug, RefreshCw, Share2, Copy, Check, Loader2, FlaskConical } from "lucide-react";
import clsx from "clsx";

type Tab = { key: string; label: string; html: string | null; raw: string | null; artifactId: string; shareToken: string | null; createdAt: string };

export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [cur, setCur] = useState(tabs[0].key);
  const t = tabs.find((x) => x.key === cur)!;
  return (
    <div className="card">
      <div className="flex items-center gap-1 px-2 pt-2 border-b border-line overflow-x-auto">
        {tabs.map((x) => (
          <button key={x.key} onClick={() => setCur(x.key)} className={clsx("px-3 h-9 text-sm border-b-2 -mb-px whitespace-nowrap", cur === x.key ? "border-gold text-fg font-medium" : "border-transparent text-mute hover:text-fg")}>{x.label}</button>
        ))}
        <div className="ml-auto pr-2 flex items-center gap-2"><ShareButton artifactId={t.artifactId} token={t.shareToken} /></div>
      </div>
      <div className="p-5 md:p-6">
        {t.html ? <div className="prose-doc" dangerouslySetInnerHTML={{ __html: t.html }} /> : <pre className="mono text-[12.5px] leading-6 text-fg-2 whitespace-pre-wrap">{t.raw}</pre>}
      </div>
    </div>
  );
}

function ShareButton({ artifactId, token }: { artifactId: string; token: string | null }) {
  const [t, setT] = useState(token);
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const res = await fetch(`/api/artifacts/${artifactId}/share`, { method: "POST" });
    const data = await res.json(); setT(data.token);
  };
  const copy = async () => { await navigator.clipboard.writeText(`${location.origin}/s/${t}`); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  if (!t) return <button onClick={share} className="btn btn-subtle btn-sm"><Share2 size={13} />공유</button>;
  return <button onClick={copy} className="btn btn-subtle btn-sm">{copied ? <Check size={13} className="text-ok" /> : <Copy size={13} />}{copied ? "복사됨" : "공유 링크 복사"}</button>;
}

export function CopyPath({ path }: { path: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(path); setOk(true); setTimeout(() => setOk(false), 1500); }} className="mono hover:text-fg inline-flex items-center gap-1" title="경로 복사">
      {path}{ok ? <Check size={11} className="text-ok" /> : <Copy size={11} />}
    </button>
  );
}

/** 우측 액션 패널: 레포 종류에 따라 추천 액션이 위로 */
export function RepoActions({ repoId, stack, hasDocs, deviceOnline, running }: { repoId: string; stack: any; hasDocs: boolean; deviceOnline: boolean; running: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const run = async (key: string, body: any) => {
    setBusy(key); setMsg("");
    const res = await fetch(`/api/repos/${repoId}/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(null);
    if (res.ok) { setMsg("⏳ 대기열에 추가됐습니다"); router.refresh(); } else setMsg("✖ " + (await res.json()).error);
  };
  const actions = [
    stack?.isMcpServer && { key: "mcp", icon: Plug, label: "클로드코드에 MCP 등록", body: { steps: ["clone", "analyze", "mcp"] }, primary: true },
    stack?.isClaudeSkill && { key: "skill", icon: Sparkles, label: "클로드코드 스킬 등록", body: { pipeline: "skill" }, primary: true },
    { key: "docs", icon: FileText, label: hasDocs ? "설명서 다시 생성" : "한국어 설명서 생성", body: { pipeline: "docs" }, primary: !stack?.isMcpServer && !stack?.isClaudeSkill },
    !stack?.isClaudeSkill && { key: "skill2", icon: Sparkles, label: "스킬로 등록", body: { pipeline: "skill" } },
    { key: "install", icon: TerminalSquare, label: "의존성 설치", body: { steps: ["clone", "analyze", "install"] } },
    stack?.hasTests && { key: "test", icon: FlaskConical, label: "테스트 실행", body: { steps: ["clone", "analyze", "install", "test"] } },
    { key: "pull", icon: RefreshCw, label: "최신으로 pull + 재분석", body: { pipeline: "quick" } },
  ].filter(Boolean) as { key: string; icon: any; label: string; body: any; primary?: boolean }[];

  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-fg-2 uppercase tracking-wide mb-3">작업</div>
      {!deviceOnline && <div className="text-xs text-warn mb-3">이 레포가 있는 PC 가 오프라인입니다. 에이전트가 켜지면 실행됩니다.</div>}
      <div className="space-y-1.5">
        {actions.map((a) => (
          <button key={a.key} onClick={() => run(a.key, a.body)} disabled={busy !== null || running}
            className={clsx("w-full btn justify-start", a.primary ? "btn-primary" : "btn-ghost")}>
            {busy === a.key ? <Loader2 size={15} className="animate-spin" /> : <a.icon size={15} />}{a.label}
          </button>
        ))}
      </div>
      {running && <div className="text-xs text-mute mt-3 flex items-center gap-1.5"><span className="spinner" />작업 진행 중</div>}
      {msg && <div className="text-xs text-fg-2 mt-3">{msg}</div>}
    </div>
  );
}
