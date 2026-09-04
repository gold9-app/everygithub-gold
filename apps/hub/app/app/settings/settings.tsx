"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Send, KeyRound, User, Check, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { InstallButton } from "@/components/install-button";
import { TelegramButton } from "@/components/telegram-button";

type Device = { id: string; name: string; os: string; agent_version: string; workspace_path: string; last_seen: string | null; online: boolean };
type Props = { devices: Device[]; telegram: boolean; login: string; settings: { hasKey: boolean; approve: "auto" | "ask"; defaultWorkspace: string } };

const TABS = [{ k: "pc", l: "내 PC", i: Monitor }, { k: "channels", l: "연결", i: Send }, { k: "ai", l: "AI · 실행", i: KeyRound }, { k: "account", l: "계정", i: User }] as const;

export function SettingsView({ devices, telegram, login, settings }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["k"]>("pc");
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">설정</h1>
      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-48 shrink-0 flex md:flex-col gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={clsx("flex items-center gap-2 px-3 h-9 rounded-md text-sm whitespace-nowrap", tab === t.k ? "bg-panel-2 text-fg font-medium" : "text-fg-2 hover:text-fg")}><t.i size={15} className={tab === t.k ? "text-gold" : ""} />{t.l}</button>
          ))}
        </nav>
        <div className="flex-1 min-w-0 space-y-4">
          {tab === "pc" && <PcTab devices={devices} />}
          {tab === "channels" && <ChannelsTab telegram={telegram} />}
          {tab === "ai" && <AiTab settings={settings} />}
          {tab === "account" && <AccountTab login={login} />}
        </div>
      </div>
    </div>
  );
}

function PcTab({ devices }: { devices: Device[] }) {
  const router = useRouter();
  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-line">
          <div><div className="font-semibold">연결된 PC</div><div className="text-xs text-mute">에이전트가 설치된 컴퓨터. 링크는 이 PC 들 중 하나에서 실행됩니다.</div></div>
          <InstallButton variant="ghost" label="다른 PC 연결" />
        </div>
        {devices.length ? devices.map((d) => <DeviceRow key={d.id} d={d} onChange={() => router.refresh()} />) : <div className="p-6 text-sm text-mute">아직 연결된 PC 가 없습니다.</div>}
      </div>
      <div className="card p-4 text-sm text-fg-2 leading-6">
        <div className="font-semibold text-fg mb-1">에이전트가 오프라인이면?</div>
        PC 를 켜면 자동으로 시작됩니다. 바로 켜려면 시작 프로그램의 <code className="mono">everygithub.vbs</code> 를 실행하거나 연결 파일을 다시 실행하세요. 로그: <code className="mono">%LOCALAPPDATA%\everygithub\agent.log</code>
      </div>
    </>
  );
}

function DeviceRow({ d, onChange }: { d: Device; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [path, setPath] = useState(d.workspace_path);
  const [name, setName] = useState(d.name);
  const save = async () => {
    await fetch(`/api/devices/${d.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspacePath: path, name }) });
    setEdit(false); onChange();
  };
  const remove = async () => {
    if (!confirm(`${d.name} 연결을 해제할까요? PC 의 파일은 그대로 남습니다.`)) return;
    await fetch(`/api/devices/${d.id}`, { method: "DELETE" }); onChange();
  };
  return (
    <div className="p-4 border-b border-line last:border-0">
      <div className="flex items-center gap-3">
        <span className={d.online ? "dot-online" : "dot-offline"} />
        <div className="flex-1 min-w-0">
          {edit ? <input className="input h-8 max-w-xs" value={name} onChange={(e) => setName(e.target.value)} /> : <div className="font-medium">{d.name} <span className="text-xs text-mute font-normal">{d.os} · v{d.agent_version} · {d.online ? "온라인" : "오프라인"}</span></div>}
          <div className="text-xs text-mute mt-1">클론 폴더</div>
          {edit ? <input className="input h-8 mt-1 mono text-xs" value={path} onChange={(e) => setPath(e.target.value)} placeholder="D:\repos 또는 ~/everygithub" /> : <code className="mono text-xs text-fg-2">{d.workspace_path}</code>}
        </div>
        {edit ? <><button onClick={save} className="btn btn-primary btn-sm"><Check size={13} />저장</button><button onClick={() => setEdit(false)} className="btn btn-subtle btn-sm">취소</button></>
          : <><button onClick={() => setEdit(true)} className="btn btn-subtle btn-sm"><Pencil size={13} />수정</button><button onClick={remove} className="btn btn-danger btn-sm"><Trash2 size={13} /></button></>}
      </div>
    </div>
  );
}

function ChannelsTab({ telegram }: { telegram: boolean }) {
  const router = useRouter();
  return (
    <div className="card divide-y divide-line">
      <Row title="텔레그램" desc="봇에 링크를 보내면 PC 에서 실행하고 결과 카드를 돌려줍니다.">
        {telegram ? <span className="text-sm text-ok flex items-center gap-1"><Check size={14} />연결됨</span> : <TelegramButton onOpened={() => setTimeout(() => router.refresh(), 8000)} />}
      </Row>
      <Row title="슬랙" desc="채널에 공유된 깃허브 링크를 자동 처리. (준비 중)"><span className="badge">곧 제공</span></Row>
      <Row title="디스코드" desc="서버 채널 연동. (준비 중)"><span className="badge">곧 제공</span></Row>
    </div>
  );
}

function AiTab({ settings }: { settings: Props["settings"] }) {
  const [key, setKey] = useState("");
  const [approve, setApprove] = useState(settings.approve);
  const [ws, setWs] = useState(settings.defaultWorkspace);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const save = async (extra: Record<string, string> = {}) => {
    setMsg("저장 중…");
    const body: Record<string, string> = { approve, defaultWorkspace: ws, ...extra };
    if (key) body.anthropicApiKey = key;
    const r = await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setMsg(r.ok ? "✔ 저장됨 — 에이전트에 1분 내 반영" : "✖ 실패"); setKey(""); router.refresh();
  };
  return (
    <>
      <div className="card p-5 space-y-5">
        <div>
          <div className="font-semibold">Claude API 키 <span className="badge ml-1">선택</span></div>
          <p className="text-xs text-mute mt-1 mb-2">있으면 README 한국어 설명서, 자연어 명령, SKILL.md 자동 작성 등 AI 기능이 켜집니다. 없어도 클론·분석·설치·테스트는 전부 동작합니다.</p>
          <div className="flex gap-2">
            <input type="password" className="input max-w-md" placeholder={settings.hasKey ? "저장됨 ●●●●●● — 바꾸려면 새 키 입력" : "sk-ant-…"} value={key} onChange={(e) => setKey(e.target.value)} />
            {settings.hasKey && <button className="btn btn-ghost" onClick={() => save({ anthropicApiKey: "" })}>삭제</button>}
          </div>
        </div>
        <div>
          <div className="font-semibold">설치·테스트 실행 전 확인</div>
          <p className="text-xs text-mute mt-1 mb-2">남의 코드를 실행하는 스텝은 기본적으로 확인을 거칩니다.</p>
          <select className="select" value={approve} onChange={(e) => setApprove(e.target.value as any)}><option value="ask">매번 확인 (권장)</option><option value="auto">자동 실행</option></select>
        </div>
        <div>
          <div className="font-semibold">새 PC 의 기본 클론 폴더</div>
          <p className="text-xs text-mute mt-1 mb-2">비우면 <code className="mono">내 문서\everygithub</code>. 이미 연결된 PC 는 [내 PC] 탭에서 개별 변경.</p>
          <input className="input max-w-md mono text-xs" placeholder="D:\repos" value={ws} onChange={(e) => setWs(e.target.value)} />
        </div>
        <div className="flex items-center gap-3"><button onClick={() => save()} className="btn btn-primary">저장</button><span className="text-xs text-mute">{msg}</span></div>
      </div>
    </>
  );
}

function AccountTab({ login }: { login: string }) {
  return (
    <div className="card divide-y divide-line">
      <Row title="GitHub 계정" desc="로그인에 사용된 계정"><span className="text-sm">@{login}</span></Row>
      <Row title="로그아웃" desc="이 브라우저에서 로그아웃합니다."><a href="/auth/signout" className="btn btn-ghost btn-sm">로그아웃</a></Row>
    </div>
  );
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 p-4"><div><div className="font-medium">{title}</div><div className="text-xs text-mute mt-0.5">{desc}</div></div><div className="shrink-0">{children}</div></div>;
}
