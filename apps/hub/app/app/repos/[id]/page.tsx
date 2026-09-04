import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Folder } from "lucide-react";
import { marked } from "marked";
import { supabaseServer } from "@/lib/supabase";
import { isOnline } from "@/lib/data";
import { Badge, LangDot, timeAgo } from "@/components/ui";
import { RepoActions, Tabs, CopyPath, HeaderActions } from "./detail";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { summary: "요약", docs_ko: "설명서", tree: "구조", env_example: ".env", skill_md: "SKILL.md", claude_md: "CLAUDE.md", test_report: "테스트" };
const ORDER = ["docs_ko", "summary", "skill_md", "claude_md", "test_report", "env_example", "tree"];

/** 레포 상세: 좌 콘텐츠 탭 / 우 액션 패널 */
export default async function RepoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: repo } = await sb.from("repos").select("*, devices(name,last_seen)").eq("id", id).maybeSingle();
  if (!repo) notFound();
  const [{ data: artifacts }, { data: jobs }] = await Promise.all([
    sb.from("artifacts").select("id,kind,content,share_token,created_at").eq("repo_id", id).order("created_at", { ascending: false }),
    sb.from("jobs").select("id,pipeline,status,created_at").eq("repo_id", id).order("created_at", { ascending: false }).limit(5),
  ]);
  const latest = new Map<string, any>();
  for (const a of artifacts ?? []) if (!latest.has(a.kind)) latest.set(a.kind, a);
  const tabs = ORDER.filter((k) => latest.has(k)).map((k) => {
    const a = latest.get(k);
    const isMd = k === "docs_ko" || k === "summary" || k === "skill_md" || k === "claude_md" || k === "test_report";
    return { key: k, label: KIND_LABEL[k] ?? k, html: isMd ? String(marked.parse(a.content)) : null, raw: isMd ? null : a.content, artifactId: a.id, shareToken: a.share_token as string | null, createdAt: a.created_at };
  });
  const s = repo.stack ?? {};
  const device = repo.devices as any;
  const running = jobs?.some((j) => j.status === "queued" || j.status === "running") ?? false;

  return (
    <div>
      <Link href="/app/repos" className="inline-flex items-center gap-1 text-xs text-mute hover:text-fg mb-4"><ArrowLeft size={12} />라이브러리</Link>
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="flex-1 min-w-0">
          <div className="mb-5">
            <div className="text-sm text-mute">{repo.owner}</div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">{repo.name}
                <a href={repo.url} target="_blank" className="text-mute hover:text-fg"><ExternalLink size={16} /></a>
              </h1>
              <HeaderActions repo={{ id: repo.id, owner: repo.owner, name: repo.name, url: repo.url, local_path: repo.local_path }} />
            </div>
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <LangDot lang={s.languages?.[0]} />
              {s.framework && <Badge>{s.framework}</Badge>}
              {s.packageManager && s.packageManager !== "unknown" && <Badge>{s.packageManager}</Badge>}
              {s.runtime && <Badge>{s.runtime}</Badge>}
              {s.isMcpServer && <Badge tone="gold">MCP 서버</Badge>}
              {s.isClaudeSkill && <Badge tone="gold">클로드 스킬</Badge>}
              {s.hasTests && <Badge tone="info">테스트</Badge>}
              {s.hasDocker && <Badge tone="info">Docker</Badge>}
              {repo.license ? <Badge tone="ok">{repo.license}</Badge> : <Badge tone="bad">라이선스 없음</Badge>}
              {s.installScripts?.length > 0 && <Badge tone="bad">⚠ {s.installScripts.join(",")} 스크립트</Badge>}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-mute"><Folder size={12} /><CopyPath path={repo.local_path} /><span>· {device?.name}</span></div>
          </div>
          {tabs.length ? <Tabs tabs={tabs} /> : <div className="card p-8 text-center text-sm text-mute">아직 산출물이 없습니다. 오른쪽에서 작업을 실행하세요.</div>}
        </div>

        <aside className="w-full lg:w-[300px] shrink-0 space-y-4">
          <RepoActions repoId={id} stack={s} hasDocs={latest.has("docs_ko")} deviceOnline={isOnline(device?.last_seen ?? null)} running={running} />
          <div className="card p-4">
            <div className="text-xs font-semibold text-fg-2 uppercase tracking-wide mb-2">최근 작업</div>
            {jobs?.length ? jobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between text-xs py-1.5 border-b border-line last:border-0"><span className="text-fg-2">{j.pipeline}</span><span className="text-mute">{j.status} · {timeAgo(j.created_at)}</span></div>
            )) : <div className="text-xs text-mute">없음</div>}
          </div>
          {s.envKeys?.length > 0 && (
            <div className="card p-4">
              <div className="text-xs font-semibold text-fg-2 uppercase tracking-wide mb-2">필요 환경변수 {s.envKeys.length}</div>
              <div className="flex flex-wrap gap-1">{s.envKeys.slice(0, 20).map((k: string) => <span key={k} className="kbd">{k}</span>)}</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
