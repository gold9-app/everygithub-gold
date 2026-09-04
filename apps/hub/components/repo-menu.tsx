"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, FolderOpen, ExternalLink, Copy, RefreshCw, Trash2 } from "lucide-react";
import clsx from "clsx";
import { toast } from "./toast";
import { confirmDialog } from "./confirm";

type Repo = { id: string; owner: string; name: string; url: string; local_path: string };

/** 레포 공용 액션: 폴더 열기 / GitHub / 경로 복사 / 재분석 / 삭제. 카드 ⋯ 메뉴와 상세 상단에서 사용 */
export async function repoAction(kind: "open" | "github" | "copy" | "rescan" | "delete", repo: Repo, router: ReturnType<typeof useRouter>) {
  if (kind === "github") { window.open(repo.url, "_blank"); return; }
  if (kind === "copy") { await navigator.clipboard.writeText(repo.local_path); toast("경로를 복사했습니다", "ok"); return; }
  if (kind === "open") {
    const r = await fetch(`/api/repos/${repo.id}/open`, { method: "POST" });
    toast(r.ok ? "PC 에서 폴더를 엽니다" : "실패: " + (await r.json()).error, r.ok ? "ok" : "bad"); return;
  }
  if (kind === "rescan") {
    const r = await fetch(`/api/repos/${repo.id}/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pipeline: "quick" }) });
    toast(r.ok ? "다시 분석을 시작합니다" : "실패", r.ok ? "ok" : "bad"); router.refresh(); return;
  }
  if (kind === "delete") {
    const choice = await confirmDialog({
      title: `${repo.owner}/${repo.name} 삭제`,
      desc: <>어떻게 삭제할까요? PC 경로: <code className="mono text-xs">{repo.local_path}</code></>,
      options: [
        { key: "app", label: "라이브러리에서만 제거", desc: "PC 의 폴더는 그대로 둡니다" },
        { key: "local", label: "PC 폴더까지 삭제", desc: "폴더를 완전히 지웁니다. 되돌릴 수 없습니다", danger: true },
      ],
    });
    if (!choice) return;
    const r = await fetch(`/api/repos/${repo.id}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ local: choice === "local" }) });
    if (r.ok) { toast(choice === "local" ? "삭제 요청됨 — PC 에서 폴더를 지웁니다" : "라이브러리에서 제거했습니다", "ok"); router.push("/app/repos"); router.refresh(); }
    else toast("삭제 실패", "bad");
  }
}

export function RepoMenu({ repo, className }: { repo: Repo; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    const on = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", on); return () => document.removeEventListener("mousedown", on);
  }, []);
  const items = [
    { k: "open", i: FolderOpen, l: "PC 폴더 열기" },
    { k: "github", i: ExternalLink, l: "GitHub 에서 보기" },
    { k: "copy", i: Copy, l: "경로 복사" },
    { k: "rescan", i: RefreshCw, l: "다시 분석" },
    { k: "delete", i: Trash2, l: "삭제…", danger: true },
  ] as const;
  return (
    <div ref={ref} className={clsx("relative", className)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <button onClick={() => setOpen((o) => !o)} className="w-7 h-7 rounded-md flex items-center justify-center text-mute hover:text-fg hover:bg-panel-2"><MoreHorizontal size={16} /></button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-44 card p-1 shadow-xl fade-up">
          {items.map((it) => (
            <button key={it.k} onClick={() => { setOpen(false); repoAction(it.k, repo, router); }}
              className={clsx("w-full flex items-center gap-2 px-2.5 h-8 rounded text-[13px] text-left", "danger" in it && it.danger ? "text-bad hover:bg-bad/10" : "text-fg-2 hover:text-fg hover:bg-panel-2")}>
              <it.i size={14} />{it.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
