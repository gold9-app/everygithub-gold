import type { ReactNode } from "react";
import clsx from "clsx";

export function Badge({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "gold" | "ok" | "bad" | "info"; className?: string }) {
  return <span className={clsx("badge", tone !== "default" && `badge-${tone}`, className)}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "default" | "gold" | "ok" | "bad" | "info"; label: string }> = {
    queued: { tone: "default", label: "대기" },
    running: { tone: "gold", label: "실행 중" },
    waiting_approval: { tone: "info", label: "승인 대기" },
    done: { tone: "ok", label: "완료" },
    failed: { tone: "bad", label: "실패" },
    cancelled: { tone: "default", label: "취소" },
  };
  const m = map[status] ?? { tone: "default" as const, label: status };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function PipelineLabel({ p }: { p: string }) {
  const map: Record<string, string> = { quick: "빠른 분석", docs: "설명서", full: "설치+테스트", skill: "스킬 등록", custom: "커스텀" };
  return <>{map[p] ?? p}</>;
}

export function EmptyState({ icon, title, desc, action }: { icon?: ReactNode; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon && <div className="w-12 h-12 rounded-xl bg-panel-2 border border-line flex items-center justify-center text-mute mb-4">{icon}</div>}
      <div className="font-semibold text-fg">{title}</div>
      {desc && <div className="text-sm text-mute mt-1 max-w-sm">{desc}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-fg-2 tracking-wide uppercase">{children}</h2>
      {right}
    </div>
  );
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "-";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

export const LANG_COLOR: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", Rust: "#dea584", Go: "#00ADD8", Java: "#b07219",
  Kotlin: "#A97BFF", Ruby: "#701516", PHP: "#4F5D95", "C#": "#178600", "C++": "#f34b7d", C: "#555555", Swift: "#F05138", Dart: "#00B4AB", Shell: "#89e051",
};
export function LangDot({ lang }: { lang?: string }) {
  if (!lang) return null;
  return <span className="inline-flex items-center gap-1.5 text-xs text-fg-2"><span className="w-2 h-2 rounded-full" style={{ background: LANG_COLOR[lang] ?? "#8b93a1" }} />{lang}</span>;
}
