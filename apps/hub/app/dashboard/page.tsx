import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase";
import { AddLink, PairingCode, TelegramLink } from "./widgets";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await currentUser();
  if (!user) redirect("/");
  const sb = await supabaseServer();
  const [{ data: devices }, { data: repos }, { data: jobs }, { data: profile }] = await Promise.all([
    sb.from("devices").select("id,name,os,agent_version,workspace_path,last_seen").order("last_seen", { ascending: false }),
    sb.from("repos").select("id,owner,name,license,stack,updated_at").order("updated_at", { ascending: false }).limit(50),
    sb.from("jobs").select("id,source,pipeline,status,origin,created_at,repo_id").order("created_at", { ascending: false }).limit(20),
    sb.from("profiles").select("telegram_chat_id").eq("id", user.id).maybeSingle(),
  ]);
  const online = (t: string | null) => t && Date.now() - new Date(t).getTime() < 60_000;

  return (
    <>
      <section className="card">
        <h2>링크 던지기</h2>
        <AddLink devices={(devices ?? []).map((d) => ({ id: d.id, name: d.name }))} />
        <p className="mute">레포 · 브랜치 · 서브폴더 · PR · gist 링크 모두 가능. 실행은 선택한 PC 의 에이전트가 합니다.</p>
      </section>

      <section className="card" id="devices">
        <h2>디바이스</h2>
        {devices?.length ? (
          <table><thead><tr><th>이름</th><th>OS</th><th>워크스페이스</th><th>상태</th></tr></thead><tbody>
            {devices.map((d) => (
              <tr key={d.id}><td>{d.name} <span className="mute">v{d.agent_version}</span></td><td>{d.os}</td><td><code>{d.workspace_path}</code></td>
                <td><span className={`pill ${online(d.last_seen) ? "done" : ""}`}>{online(d.last_seen) ? "온라인" : "오프라인"}</span></td></tr>
            ))}
          </tbody></table>
        ) : <p className="mute">아직 연결된 PC 가 없습니다.</p>}
        <PairingCode />
      </section>

      <section className="card" id="telegram">
        <h2>텔레그램</h2>
        {profile?.telegram_chat_id ? <p>✔ 연결됨 — 봇에 깃허브 링크를 보내면 됩니다.</p> : <TelegramLink />}
      </section>

      <section className="card">
        <h2>최근 잡</h2>
        {jobs?.length ? (
          <table><thead><tr><th>레포</th><th>파이프라인</th><th>채널</th><th>상태</th><th>시각</th></tr></thead><tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.repo_id ? <a href={`/repos/${j.repo_id}`}>{j.source.owner}/{j.source.name}</a> : `${j.source.owner}/${j.source.name}`}</td>
                <td>{j.pipeline}</td><td>{j.origin.channel}</td>
                <td><span className={`pill ${j.status}`}>{j.status}</span></td>
                <td className="mute">{new Date(j.created_at).toLocaleString("ko-KR")}</td>
              </tr>
            ))}
          </tbody></table>
        ) : <p className="mute">아직 잡이 없습니다.</p>}
      </section>

      <section className="card">
        <h2>내 레포 아카이브</h2>
        {repos?.length ? (
          <table><thead><tr><th>레포</th><th>스택</th><th>라이선스</th><th>갱신</th></tr></thead><tbody>
            {repos.map((r) => (
              <tr key={r.id}>
                <td><a href={`/repos/${r.id}`}>{r.owner}/{r.name}</a></td>
                <td className="mute">{[...(r.stack?.languages ?? []).slice(0, 2), r.stack?.framework].filter(Boolean).join(" · ")}</td>
                <td>{r.license ?? "-"}</td>
                <td className="mute">{new Date(r.updated_at).toLocaleDateString("ko-KR")}</td>
              </tr>
            ))}
          </tbody></table>
        ) : <p className="mute">클론된 레포가 여기 쌓입니다.</p>}
      </section>
    </>
  );
}
