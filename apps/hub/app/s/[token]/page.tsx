import { notFound } from "next/navigation";
import { marked } from "marked";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
const KIND_LABEL: Record<string, string> = { summary: "요약", docs_ko: "한국어 설명서", tree: "구조", env_example: ".env.example", skill_md: "SKILL.md", claude_md: "CLAUDE.md", test_report: "테스트 결과" };

/** 공개 공유 페이지 (로그인 불필요) */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: a } = await supabaseAdmin().from("artifacts").select("kind,content,created_at,repos(owner,name,url)").eq("share_token", token).maybeSingle();
  if (!a) notFound();
  const repo = a.repos as any;
  const isMd = !["tree", "env_example"].includes(a.kind);
  return (
    <div className="min-h-screen">
      <header className="h-14 border-b border-line px-6 flex items-center justify-between max-w-[860px] mx-auto">
        <a href="/" className="font-bold text-sm">everygithub<span className="text-gold">_gold</span></a>
        <span className="text-xs text-mute">공유된 {KIND_LABEL[a.kind] ?? a.kind}</span>
      </header>
      <main className="max-w-[860px] mx-auto px-6 py-8">
        <div className="text-sm text-mute">{repo?.owner}</div>
        <h1 className="text-2xl font-bold mb-1">{repo?.name}</h1>
        <a href={repo?.url} target="_blank" className="text-xs text-info underline">{repo?.url}</a>
        <div className="card p-6 mt-6">
          {isMd ? <div className="prose-doc" dangerouslySetInnerHTML={{ __html: String(marked.parse(a.content)) }} /> : <pre className="mono text-[12.5px] leading-6 text-fg-2 whitespace-pre-wrap">{a.content}</pre>}
        </div>
        <p className="text-xs text-mute text-center mt-8">everygithub_gold 로 생성 · <a href="/" className="text-gold">나도 써보기</a></p>
      </main>
    </div>
  );
}
