"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Activity as ActIcon } from "lucide-react";
import clsx from "clsx";
import { StatusBadge, PipelineLabel, timeAgo, EmptyState } from "@/components/ui";

type Job = { id: string; source: any; pipeline: string; steps: string[]; status: string; origin: any; created_at: string; finished_at: string | null; repo_id: string | null };
type Ev = { id: number; step: string; level: string; payload: any; ts: string };

export function ActivityList({ jobs }: { jobs: Job[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, Ev[]>>({});
  const toggle = async (id: string) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (!events[id]) { const r = await fetch(`/api/jobs/${id}/events`); if (r.ok) { const data = await r.json(); setEvents((e) => ({ ...e, [id]: data.events })); } }
  };
  if (!jobs.length) return <div className="card"><EmptyState icon={<ActIcon size={18} />} title="아직 활동이 없어요" desc="홈에서 링크를 던지면 여기에 이력이 남습니다." /></div>;
  return (
    <div className="card divide-y divide-line">
      {jobs.map((j) => (
        <div key={j.id}>
          <button onClick={() => toggle(j.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-panel-2">
            <ChevronDown size={14} className={clsx("text-mute transition-transform", open === j.id && "rotate-180")} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{j.source.owner}/{j.source.name}{j.source.path ? ` · ${j.source.path}` : ""}</div>
              <div className="text-xs text-mute"><PipelineLabel p={j.pipeline} /> · {j.origin.channel} · {timeAgo(j.created_at)}{j.finished_at ? ` · ${Math.round((new Date(j.finished_at).getTime() - new Date(j.created_at).getTime()) / 1000)}초` : ""}</div>
            </div>
            <StatusBadge status={j.status} />
          </button>
          {open === j.id && (
            <div className="px-4 pb-4 pl-11">
              <div className="flex gap-1 mb-3 flex-wrap">{j.steps.map((s) => <span key={s} className="kbd">{s}</span>)}</div>
              <div className="rounded-md bg-bg-raised border border-line p-3 mono text-[12px] leading-5 max-h-80 overflow-auto">
                {!events[j.id] ? <span className="text-mute">불러오는 중…</span> : !events[j.id].length ? <span className="text-mute">로그 없음</span> : events[j.id].map((e) => (
                  <div key={e.id} className={clsx(e.level === "error" ? "text-bad" : e.level === "skipped" ? "text-warn" : e.level === "result" ? "text-ok" : "text-fg-2")}>
                    <span className="text-mute">[{e.step}]</span> {e.level === "log" ? e.payload.message : e.level === "progress" ? `${e.payload.state}` : e.level === "skipped" ? `건너뜀 (${e.payload.reason})` : e.level === "error" ? e.payload.message : e.level === "result" ? "결과 저장" : JSON.stringify(e.payload).slice(0, 200)}
                  </div>
                ))}
              </div>
              {j.repo_id && <Link href={`/app/repos/${j.repo_id}`} className="text-xs text-gold mt-2 inline-block">레포 열기 →</Link>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
