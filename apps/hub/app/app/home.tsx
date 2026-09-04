"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Link2, Zap, FileText, TerminalSquare, Sparkles, Send, Globe, MonitorSmartphone, Check, X, Loader2 } from "lucide-react";
import clsx from "clsx";
import { StatusBadge, PipelineLabel, timeAgo, EmptyState } from "@/components/ui";

const PIPELINES = [
  { id: "quick", label: "빠른 분석", icon: Zap, hint: "클론 + 스택·라이선스 카드 (초 단위)" },
  { id: "docs", label: "설명서", icon: FileText, hint: "+ README 한국어 설명서 (AI 키 필요)" },
  { id: "full", label: "설치+테스트", icon: TerminalSquare, hint: "+ 의존성 설치, 테스트 실행" },
  { id: "skill", label: "스킬 등록", icon: Sparkles, hint: "+ 클로드코드 스킬로 등록" },
];

/** 명령 바: 붙여넣기 즉시 파이프라인 칩 선택 → 실행 */
export function CommandBar({ devices, hasAnyDevice }: { devices: { id: string; name: string }[]; hasAnyDevice: boolean }) {
  const [url, setUrl] = useState("");
  const [pipeline, setPipeline] = useState("quick");
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  // PC 가 하나라도 연결돼 있으면 오프라인이어도 대기열에 넣을 수 있다 (켜지면 자동 실행)
  const disabled = !hasAnyDevice;
  const offline = hasAnyDevice && devices.length === 0;
  const valid = /github\.com\//.test(url);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); ref.current?.focus(); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = async () => {
    if (!valid || disabled) return;
    setBusy(true); setErr("");
    const res = await fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: url.trim(), pipeline, deviceId: deviceId || undefined }) });
    setBusy(false);
    if (res.ok) { setUrl(""); router.refresh(); window.dispatchEvent(new Event("eg:job-created")); }
    else setErr((await res.json()).error ?? "실패");
  };

  return (
    <div className={clsx("card p-2 md:p-3", disabled && "opacity-80")}>
      <div className="flex items-center gap-2">
        <Link2 size={18} className="text-mute ml-2 shrink-0" />
        <input ref={ref} className="flex-1 bg-transparent h-11 text-[15px] outline-none placeholder:text-mute min-w-0" placeholder={disabled ? "먼저 PC 를 연결하세요" : offline ? "https://github.com/owner/repo  — PC 가 켜지면 실행됩니다" : "https://github.com/owner/repo  (⌘K)"}
          value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} disabled={disabled} autoFocus />
        {devices.length > 1 && (
          <select className="select h-9 text-xs" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>{devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        )}
        <button onClick={submit} disabled={!valid || busy || disabled} className="btn btn-primary">{busy ? <Loader2 size={16} className="animate-spin" /> : "실행"}</button>
      </div>
      <div className="flex flex-wrap gap-1.5 px-2 pt-2 pb-1">
        {PIPELINES.map((p) => (
          <button key={p.id} onClick={() => setPipeline(p.id)} title={p.hint}
            className={clsx("inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs border transition-colors", pipeline === p.id ? "border-gold/50 bg-gold-dim text-gold" : "border-line text-fg-2 hover:border-line-2 hover:text-fg")}>
            <p.icon size={12} />{p.label}
          </button>
        ))}
        <span className="text-[11px] text-mute self-center ml-2 hidden sm:inline">{PIPELINES.find((p) => p.id === pipeline)?.hint}</span>
        {offline && !err && <span className="text-xs text-warn self-center ml-auto">PC 오프라인 — 대기열에 쌓이고 켜지면 자동 실행</span>}
        {err && <span className="text-xs text-bad self-center ml-auto">{err}</span>}
        {disabled && !hasAnyDevice && <Link href="/welcome" className="text-xs text-gold self-center ml-auto">PC 연결하기 →</Link>}
      </div>
    </div>
  );
}

type JobRow = { id: string; source: any; pipeline: string; status: string; origin: any; created_at: string; finished_at: string | null; repo_id: string | null };

/** 실시간 피드: 진행 중인 잡이 있으면 2초, 아니면 8초 간격 갱신 */
export function LiveFeed({ initial }: { initial: JobRow[] }) {
  const [jobs, setJobs] = useState(initial);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try { const r = await fetch("/api/jobs?limit=12"); if (r.ok && alive) setJobs((await r.json()).jobs); } catch {}
    };
    const active = jobs.some((j) => j.status === "queued" || j.status === "running");
    const t = setInterval(tick, active ? 2000 : 8000);
    const onCreated = () => tick();
    window.addEventListener("eg:job-created", onCreated);
    return () => { alive = false; clearInterval(t); window.removeEventListener("eg:job-created", onCreated); };
  }, [jobs]);

  if (!jobs.length) return <div className="card"><EmptyState icon={<Zap size={18} />} title="아직 작업이 없어요" desc="위 명령 바에 깃허브 링크를 붙여넣고 실행하면 여기에 실시간으로 표시됩니다." /></div>;

  return (
    <div className="card divide-y divide-line">
      {jobs.map((j) => {
        const active = j.status === "queued" || j.status === "running";
        const inner = (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className={clsx("w-8 h-8 rounded-md flex items-center justify-center shrink-0", active ? "bg-gold-dim text-gold" : j.status === "done" ? "bg-ok/10 text-ok" : j.status === "failed" ? "bg-bad/10 text-bad" : "bg-panel-2 text-mute")}>
              {active ? <Loader2 size={15} className="animate-spin" /> : j.status === "done" ? <Check size={15} /> : j.status === "failed" ? <X size={15} /> : <Zap size={15} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{j.source.owner}/<span className="text-fg">{j.source.name}</span>{j.source.path && <span className="text-mute font-normal"> · {j.source.path}</span>}{j.source.prNumber && <span className="text-mute font-normal"> · PR #{j.source.prNumber}</span>}</div>
              <div className="text-xs text-mute flex items-center gap-2 mt-0.5">
                <PipelineLabel p={j.pipeline} />
                <span>·</span>
                {j.origin.channel === "telegram" ? <Send size={11} /> : j.origin.channel === "web" ? <Globe size={11} /> : <MonitorSmartphone size={11} />}
                <span>{timeAgo(j.created_at)}</span>
              </div>
            </div>
            <StatusBadge status={j.status} />
          </div>
        );
        return j.repo_id ? <Link key={j.id} href={`/app/repos/${j.repo_id}`} className="block hover:bg-panel-2 transition-colors">{inner}</Link> : <div key={j.id}>{inner}</div>;
      })}
    </div>
  );
}
