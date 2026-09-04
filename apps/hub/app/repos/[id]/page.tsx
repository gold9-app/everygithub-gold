import { notFound, redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase";
import { ShareButton } from "./share-button";

export const dynamic = "force-dynamic";
const KIND_LABEL: Record<string, string> = { summary: "요약", docs_ko: "한국어 설명서", tree: "구조", env_example: ".env.example", skill_md: "SKILL.md", claude_md: "CLAUDE.md", test_report: "테스트 결과" };

/** 레포 아카이브 페이지: 산출물을 종류별로 보여주고 공유 링크 발급 */
export default async function RepoPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) redirect("/");
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: repo } = await sb.from("repos").select("*").eq("id", id).maybeSingle();
  if (!repo) notFound();
  const { data: artifacts } = await sb.from("artifacts").select("id,kind,content,share_token,created_at").eq("repo_id", id).order("created_at", { ascending: false });
  const latest = new Map<string, any>();
  for (const a of artifacts ?? []) if (!latest.has(a.kind)) latest.set(a.kind, a);
  const order = ["summary", "docs_ko", "skill_md", "claude_md", "env_example", "test_report", "tree"];

  return (
    <>
      <section className="card">
        <h2>{repo.owner}/{repo.name}</h2>
        <p className="mute"><a href={repo.url} target="_blank">{repo.url}</a> · <code>{repo.local_path}</code></p>
        <p className="mute">{[...(repo.stack?.languages ?? []), repo.stack?.framework, repo.stack?.packageManager].filter(Boolean).join(" · ")} · 라이선스 {repo.license ?? "-"}</p>
      </section>
      {order.filter((k) => latest.has(k)).map((k) => {
        const a = latest.get(k);
        return (
          <section className="card" key={a.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>{KIND_LABEL[k] ?? k}</h2>
              <ShareButton artifactId={a.id} token={a.share_token} />
            </div>
            <pre style={{ marginTop: 12 }}>{a.content}</pre>
          </section>
        );
      })}
      {!latest.size && <p className="mute">아직 산출물이 없습니다.</p>}
    </>
  );
}
