"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddLink({ devices }: { devices: { id: string; name: string }[] }) {
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
      <input type="text" placeholder="https://github.com/owner/repo" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      <select value={pipeline} onChange={(e) => setPipeline(e.target.value)}>
        <option value="quick">빠른 분석</option><option value="docs">설명서까지</option><option value="full">설치+테스트</option><option value="skill">스킬 등록</option>
      </select>
      {devices.length > 1 && (
        <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>{devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      )}
      <button onClick={submit} disabled={!url}>실행</button>
      {msg && <span className="mute">{msg}</span>}
    </div>
  );
}

export function PairingCode() {
  const [code, setCode] = useState<string | null>(null);
  const issue = async () => {
    const res = await fetch("/api/pairing", { method: "POST" });
    setCode((await res.json()).code);
  };
  return (
    <div style={{ marginTop: 14 }}>
      {code ? (
        <div>
          <div className="code">{code}</div>
          <p className="mute">PC 에서 <code>npx everygithub</code> (또는 everygithub.exe) 실행 → 폴더 경로 입력 → 이 코드 입력. 10분 유효.</p>
        </div>
      ) : <button className="ghost" onClick={issue}>+ 디바이스 추가</button>}
    </div>
  );
}

export function TelegramLink() {
  const [data, setData] = useState<{ code: string; botUsername: string } | null>(null);
  const issue = async () => {
    const res = await fetch("/api/link-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channel: "telegram" }) });
    setData(await res.json());
  };
  return data ? (
    <div>
      <div className="code">{data.code}</div>
      <p className="mute">텔레그램에서 {data.botUsername ? <a href={`https://t.me/${data.botUsername}`} target="_blank">@{data.botUsername}</a> : "봇"} 에게 /start 후 이 코드를 보내세요. 10분 유효.</p>
    </div>
  ) : <button className="ghost" onClick={issue}>텔레그램 연결</button>;
}
