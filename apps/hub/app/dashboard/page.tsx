import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase";
import { AddLink, InstallButton, TelegramLink, SettingsForm, DeviceRow } from "./widgets";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await currentUser();
  if (!user) redirect("/");
  const sb = await supabaseServer();
  const [{ data: devices }, { data: repos }, { data: jobs }, { data: profile }] = await Promise.all([
    sb.from("devices").select("id,name,os,agent_version,workspace_path,last_seen").order("last_seen", { ascending: false }),
    sb.from("repos").select("id,owner,name,license,stack,updated_at").order("updated_at", { ascending: false }).limit(50),
    sb.from("jobs").select("id,source,pipeline,status,origin,created_at,repo_id").order("created_at", { ascending: false }).limit(20),
    sb.from("profiles").select("telegram_chat_id,settings").eq("id", user.id).maybeSingle(),
  ]);
  const online = (t: string | null) => Boolean(t && Date.now() - new Date(t).getTime() < 60_000);
  const hasDevice = (devices?.length ?? 0) > 0;
  const anyOnline = devices?.some((d) => online(d.last_seen)) ?? false;
  const settings = (profile?.settings ?? {}) as { anthropicApiKey?: string; approve?: "auto" | "ask"; defaultWorkspace?: string };

  return (
    <>
      {/* 온보딩: PC 연결 전에는 이것만 크게 */}
      {!hasDevice && (
        <section className="card hero-card">
          <h2>1분 안에 시작하기</h2>
          <ol className="steps">
            <li><b>PC 연결 파일</b>을 내려받아 실행하세요. 설치·연결·자동 시작까지 알아서 됩니다.</li>
            <li>끝나면 이 페이지에 PC 가 <span className="pill done">온라인</span> 으로 뜹니다.</li>
            <li>그다음 아래에 깃허브 링크를 던지면 그 PC 에 클론됩니다.</li>
          </ol>
          <InstallButton />
          <p className="mute">Windows 기준. Node.js 가 없으면 자동 설치를 시도합니다. 클론 폴더는 기본 <code>내 문서\everygithub</code> 이고 아래 설정에서 바꿀 수 있습니다.</p>
        </section>
      )}

      <section className="card">
        <h2>링크 던지기</h2>
        <AddLink devices={(devices ?? []).map((d) => ({ id: d.id, name: d.name }))} disabled={!anyOnline} />
        <p className="mute">{anyOnline ? "레포 · 브랜치 · 서브폴더 · PR · gist 링크 모두 가능." : "PC 가 온라인이어야 실행됩니다."}</p>
      </section>

      <section className="card" id="devices">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>내 PC</h2>
          {hasDevice && <InstallButton small />}
        </div>
        {hasDevice ? (
          <table style={{ marginTop: 12 }}><thead><tr><th>이름</th><th>클론 폴더</th><th>상태</th><th></th></tr></thead><tbody>
            {devices!.map((d) => <DeviceRow key={d.id} device={d} online={online(d.last_seen)} />)}
          </tbody></table>
        ) : <p className="mute">아직 연결된 PC 가 없습니다. 위의 설치 파일을 실행하세요.</p>}
      </section>

      <section className="card" id="telegram">
        <h2>텔레그램</h2>
        {profile?.telegram_chat_id
          ? <p>✔ 연결됨 — 봇에 깃허브 링크를 보내면 됩니다.</p>
          : <><p className="mute">폰에서도 링크를 던지려면 연결하세요. 버튼 → 텔레그램 열림 → 시작 한 번이면 끝.</p><TelegramLink /></>}
      </section>

      <section className="card" id="settings">
        <h2>설정</h2>
        <SettingsForm initial={{ hasKey: Boolean(settings.anthropicApiKey), approve: settings.approve ?? "ask", defaultWorkspace: settings.defaultWorkspace ?? "" }} />
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
