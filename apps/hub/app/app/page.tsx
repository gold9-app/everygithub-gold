import Link from "next/link";
import { ArrowRight, Library } from "lucide-react";
import { currentUser, supabaseServer } from "@/lib/supabase";
import { meStatus } from "@/lib/data";
import { CommandBar, LiveFeed } from "./home";
import { SectionTitle, LangDot, Badge, timeAgo } from "@/components/ui";

export const dynamic = "force-dynamic";

/** 홈: 매일 쓰는 화면. 명령 바 + 실시간 피드 + 최근 레포 */
export default async function Home() {
  const user = (await currentUser())!;
  const s = await meStatus(user.id);
  const sb = await supabaseServer();
  const [{ data: jobs }, { data: repos }, { count: repoCount }] = await Promise.all([
    sb.from("jobs").select("id,source,pipeline,status,origin,created_at,finished_at,repo_id").order("created_at", { ascending: false }).limit(12),
    sb.from("repos").select("id,owner,name,stack,license,updated_at").order("updated_at", { ascending: false }).limit(6),
    sb.from("repos").select("id", { count: "exact", head: true }),
  ]);
  const onlineDevices = s.devices.filter((d) => d.online);

  return (
    <div className="space-y-10">
      <section className="fade-up">
        <h1 className="text-2xl font-bold tracking-tight mb-1">무엇을 가져올까요?</h1>
        <p className="text-sm text-fg-2 mb-5">깃허브 링크를 붙여넣으면 {onlineDevices[0]?.name ?? "내 PC"} 에 클론하고 분석합니다.</p>
        <CommandBar devices={onlineDevices} hasAnyDevice={s.devices.length > 0} />
      </section>

      <section>
        <SectionTitle right={<Link href="/app/activity" className="text-xs text-mute hover:text-fg flex items-center gap-1">전체 보기 <ArrowRight size={12} /></Link>}>최근 작업</SectionTitle>
        <LiveFeed initial={jobs ?? []} />
      </section>

      <section>
        <SectionTitle right={<Link href="/app/repos" className="text-xs text-mute hover:text-fg flex items-center gap-1">라이브러리 {repoCount ?? 0} <ArrowRight size={12} /></Link>}>최근 레포</SectionTitle>
        {repos?.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {repos.map((r) => (
              <Link key={r.id} href={`/app/repos/${r.id}`} className="card card-hover p-4 block">
                <div className="text-xs text-mute">{r.owner}</div>
                <div className="font-semibold truncate">{r.name}</div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <LangDot lang={r.stack?.languages?.[0]} />
                  {r.stack?.isMcpServer && <Badge tone="gold">MCP</Badge>}
                  {r.stack?.isClaudeSkill && <Badge tone="gold">스킬</Badge>}
                  {r.license && <Badge>{r.license}</Badge>}
                  <span className="text-[11px] text-mute ml-auto">{timeAgo(r.updated_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card"><div className="flex items-center gap-3 p-5 text-sm text-mute"><Library size={16} />클론한 레포가 여기 쌓입니다. 위에 링크를 하나 던져보세요.</div></div>
        )}
      </section>
    </div>
  );
}
