import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** 공개 공유 페이지 (로그인 불필요) */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = supabaseAdmin();
  const { data: a } = await sb.from("artifacts").select("kind,content,created_at,repos(owner,name,url)").eq("share_token", token).maybeSingle();
  if (!a) notFound();
  const repo = a.repos as any;
  return (
    <section className="card">
      <h2>{repo?.owner}/{repo?.name} — {a.kind}</h2>
      <p className="mute"><a href={repo?.url} target="_blank">{repo?.url}</a> · everygithub_gold 로 생성</p>
      <pre>{a.content}</pre>
    </section>
  );
}
