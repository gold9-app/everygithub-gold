"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddLink({ devices, disabled }: { devices: { id: string; name: string }[]; disabled?: boolean }) {
  const [url, setUrl] = useState("");
  const [pipeline, setPipeline] = useState("quick");
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? "");
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const submit = async () => {
    setMsg("생성 중…");
    const res = await fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, pipeline, deviceId: deviceId || undefined }) });
    const data = await res.json();
    setMsg(res.ok ? `⏳ 잡 #${data.id.slice(0, 8)} 대기열에 추가` : `✖ ${data.error}`);
    if (res.ok) { setUrl(""); router.refresh(); }
  };
  return (
    <div className="row">
      <input type="text" placeholder="https://github.com/owner/repo" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} disabled={disabled} />
      <select value={pipeline} onChange={(e) => setPipeline(e.target.value)}>
        <option value="quick">빠른 분석</option><option value="docs">설명서까지</option><option value="full">설치+테스트</option><option value="skill">스킬 등록</option>
      </select>
      {devices.length > 1 && (
        <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>{devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      )}
      <button onClick={submit} disabled={!url || disabled}>실행</button>
      {msg && <span className="mute">{msg}</span>}
    </div>
  );
}

/** 본인 전용 설치 파일 다운로드 — 실행만 하면 페어링·자동시작까지 */
export function InstallButton({ small }: { small?: boolean }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/install");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "everygithub-setup.cmd"; a.click();
      URL.revokeObjectURL(a.href);
    } finally { setBusy(false); }
  };
  return (
    <button className={small ? "ghost" : ""} onClick={download} disabled={busy} style={small ? {} : { fontSize: 16, padding: "12px 20px" }}>
      {busy ? "준비 중…" : small ? "+ 다른 PC 연결" : "⬇ PC 연결 파일 받기 (everygithub-setup.cmd)"}
    </button>
  );
}

export function DeviceRow({ device, online }: { device: { id: string; name: string; os: string; agent_version: string; workspace_path: string }; online: boolean }) {
  const [path, setPath] = useState(device.workspace_path);
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const save = async () => {
    await fetch(`/api/devices/${device.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspacePath: path }) });
    setEditing(false); router.refresh();
  };
  const remove = async () => {
    if (!confirm(`${device.name} 연결을 해제할까요? (PC 의 파일은 남습니다)`)) return;
    await fetch(`/api/devices/${device.id}`, { method: "DELETE" }); router.refresh();
  };
  return (
    <tr>
      <td>{device.name} <span className="mute">{device.os} · v{device.agent_version}</span></td>
      <td>
        {editing
          ? <span className="row"><input type="text" value={path} onChange={(e) => setPath(e.target.value)} style={{ minWidth: 220 }} /><button onClick={save}>저장</button><button className="ghost" onClick={() => setEditing(false)}>취소</button></span>
          : <span><code>{path}</code> <a className="mute" href="#" onClick={(e) => { e.preventDefault(); setEditing(true); }}>변경</a></span>}
      </td>
      <td><span className={`pill ${online ? "done" : ""}`}>{online ? "온라인" : "오프라인"}</span></td>
      <td><a className="mute" href="#" onClick={(e) => { e.preventDefault(); remove(); }}>해제</a></td>
    </tr>
  );
}

/** 텔레그램 딥링크: 누르면 텔레그램이 열리고 [시작] 한 번이면 연결 */
export function TelegramLink() {
  const [link, setLink] = useState<string | null>(null);
  const issue = async () => {
    const res = await fetch("/api/link-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channel: "telegram" }) });
    const data = await res.json();
    if (data.deepLink) { setLink(data.deepLink); window.open(data.deepLink, "_blank"); }
    else setLink(`code:${data.code}`);
  };
  if (!link) return <button onClick={issue}>텔레그램 연결</button>;
  if (link.startsWith("code:")) return <p className="mute">봇에 이 코드를 보내세요: <b>{link.slice(5)}</b></p>;
  return <p className="mute">텔레그램이 열렸습니다. 안 열렸으면 <a href={link} target="_blank">여기</a>를 누르고 [시작] 을 눌러주세요. 연결 후 이 페이지를 새로고침하세요.</p>;
}

export function SettingsForm({ initial }: { initial: { hasKey: boolean; approve: "auto" | "ask"; defaultWorkspace: string } }) {
  const [key, setKey] = useState("");
  const [approve, setApprove] = useState(initial.approve);
  const [ws, setWs] = useState(initial.defaultWorkspace);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const save = async (extra: Record<string, string> = {}) => {
    setMsg("저장 중…");
    const body: Record<string, string> = { approve, defaultWorkspace: ws, ...extra };
    if (key) body.anthropicApiKey = key;
    const res = await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setMsg(res.ok ? "✔ 저장됨 (에이전트에 몇 초 내 반영)" : "✖ 저장 실패");
    setKey(""); router.refresh();
  };
  return (
    <div>
      <div className="field">
        <label>Claude API 키 <span className="mute">(선택 — README 한국어 설명서 등 AI 기능이 켜집니다)</span></label>
        <div className="row">
          <input type="password" placeholder={initial.hasKey ? "저장됨 ●●●●●● — 바꾸려면 새 키 입력" : "sk-ant-…"} value={key} onChange={(e) => setKey(e.target.value)} />
          {initial.hasKey && <button className="ghost" onClick={() => save({ anthropicApiKey: "" })}>키 삭제</button>}
        </div>
      </div>
      <div className="field">
        <label>새 PC 의 기본 클론 폴더 <span className="mute">(비우면 내 문서\everygithub)</span></label>
        <input type="text" placeholder="D:\repos" value={ws} onChange={(e) => setWs(e.target.value)} />
      </div>
      <div className="field">
        <label>설치·테스트 실행 전 확인</label>
        <select value={approve} onChange={(e) => setApprove(e.target.value as "auto" | "ask")}>
          <option value="ask">매번 확인 (권장)</option><option value="auto">자동 실행</option>
        </select>
      </div>
      <div className="row"><button onClick={() => save()}>저장</button>{msg && <span className="mute">{msg}</span>}</div>
    </div>
  );
}
