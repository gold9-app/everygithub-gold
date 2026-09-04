"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Library as LibIcon, LayoutGrid, List } from "lucide-react";
import clsx from "clsx";
import { Badge, LangDot, EmptyState, timeAgo } from "@/components/ui";

type Repo = { id: string; owner: string; name: string; url: string; ref: string | null; local_path: string; stack: any; license: string | null; stars: number | null; tags: string[]; cloned_at: string; updated_at: string };

/** 라이브러리: 검색 + 종류/언어 필터 + 정렬, 그리드/리스트 */
export function Library({ repos }: { repos: Repo[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "mcp" | "skill" | "web" | "tests">("all");
  const [lang, setLang] = useState("all");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [view, setView] = useState<"grid" | "list">("grid");

  const langs = useMemo(() => { const s = new Set<string>(); repos.forEach((r) => r.stack?.languages?.[0] && s.add(r.stack.languages[0])); return [...s].sort(); }, [repos]);
  const list = useMemo(() => {
    let l = repos.filter((r) => {
      if (q && !`${r.owner}/${r.name} ${r.stack?.framework ?? ""} ${r.license ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (kind === "mcp" && !r.stack?.isMcpServer) return false;
      if (kind === "skill" && !r.stack?.isClaudeSkill) return false;
      if (kind === "web" && !r.stack?.framework) return false;
      if (kind === "tests" && !r.stack?.hasTests) return false;
      if (lang !== "all" && r.stack?.languages?.[0] !== lang) return false;
      return true;
    });
    if (sort === "name") l = [...l].sort((a, b) => `${a.owner}/${a.name}`.localeCompare(`${b.owner}/${b.name}`));
    return l;
  }, [repos, q, kind, lang, sort]);

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div><h1 className="text-2xl font-bold tracking-tight">라이브러리</h1><p className="text-sm text-fg-2 mt-1">내 PC 에 클론된 레포 {repos.length}개</p></div>
        <div className="hidden sm:flex border border-line rounded-md overflow-hidden">
          <button onClick={() => setView("grid")} className={clsx("px-2.5 h-8", view === "grid" ? "bg-panel-2 text-fg" : "text-mute")}><LayoutGrid size={14} /></button>
          <button onClick={() => setView("list")} className={clsx("px-2.5 h-8", view === "list" ? "bg-panel-2 text-fg" : "text-mute")}><List size={14} /></button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" /><input className="input pl-9" placeholder="레포 이름, 프레임워크, 라이선스 검색" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="select" value={lang} onChange={(e) => setLang(e.target.value)}><option value="all">모든 언어</option>{langs.map((l) => <option key={l} value={l}>{l}</option>)}</select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as any)}><option value="recent">최근 갱신순</option><option value="name">이름순</option></select>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {([["all", "전체"], ["mcp", "MCP 서버"], ["skill", "클로드 스킬"], ["web", "웹 프레임워크"], ["tests", "테스트 있음"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setKind(k)} className={clsx("h-7 px-3 rounded-full text-xs border", kind === k ? "border-gold/50 bg-gold-dim text-gold" : "border-line text-fg-2 hover:text-fg")}>{l}</button>
        ))}
      </div>

      {!list.length ? (
        <div className="card"><EmptyState icon={<LibIcon size={18} />} title={repos.length ? "조건에 맞는 레포가 없어요" : "아직 클론한 레포가 없어요"} desc={repos.length ? "검색어나 필터를 바꿔보세요." : "홈에서 링크를 던지면 여기에 쌓입니다."} /></div>
      ) : view === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((r) => (
            <Link key={r.id} href={`/app/repos/${r.id}`} className="card card-hover p-4 flex flex-col">
              <div className="text-xs text-mute">{r.owner}</div>
              <div className="font-semibold truncate text-[15px]">{r.name}</div>
              <div className="text-xs text-mute mt-1 truncate">{r.stack?.framework ?? r.stack?.packageManager ?? ""}{r.ref ? ` · ${r.ref}` : ""}</div>
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                <LangDot lang={r.stack?.languages?.[0]} />
                {r.stack?.isMcpServer && <Badge tone="gold">MCP</Badge>}
                {r.stack?.isClaudeSkill && <Badge tone="gold">스킬</Badge>}
                {r.license && <Badge>{r.license}</Badge>}
              </div>
              <div className="text-[11px] text-mute mt-3 pt-3 border-t border-line flex justify-between"><span>{r.stack?.fileCount ?? "-"} 파일</span><span>{timeAgo(r.updated_at)}</span></div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card divide-y divide-line">
          {list.map((r) => (
            <Link key={r.id} href={`/app/repos/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-panel-2">
              <div className="flex-1 min-w-0"><span className="text-mute text-sm">{r.owner}/</span><span className="font-medium">{r.name}</span></div>
              <LangDot lang={r.stack?.languages?.[0]} />
              {r.stack?.isMcpServer && <Badge tone="gold">MCP</Badge>}
              {r.license && <Badge>{r.license}</Badge>}
              <span className="text-xs text-mute w-16 text-right">{timeAgo(r.updated_at)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
