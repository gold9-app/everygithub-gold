"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Monitor, Send, Link2, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { InstallButton } from "@/components/install-button";
import { TelegramButton } from "@/components/telegram-button";
import { FolderPicker } from "@/components/folder-picker";
import { FolderOpen } from "lucide-react";

type Props = { initial: { hasDevice: boolean; online: boolean; telegram: boolean; deviceId?: string; workspacePath?: string } };

/** 1회성 온보딩. PC 온라인을 실시간으로 감지해 다음 단계로 넘어간다 */
export function Welcome({ initial }: Props) {
  const router = useRouter();
  const [online, setOnline] = useState(initial.online);
  const [telegram, setTelegram] = useState(initial.telegram);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initial.online ? 2 : 1);
  const [deviceId, setDeviceId] = useState(initial.deviceId ?? "");
  const [workspace, setWorkspace] = useState(initial.workspacePath ?? "");
  const [url, setUrl] = useState("https://github.com/sindresorhus/is-online");
  const [msg, setMsg] = useState("");

  // PC 온라인/텔레그램 연결을 3초마다 확인
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/me/status"); if (!r.ok) return;
        const s = await r.json();
        const on = s.devices.some((d: any) => d.online);
        const d = s.devices.find((x: any) => x.online) ?? s.devices[0];
        if (d) { setDeviceId(d.id); setWorkspace(d.workspacePath ?? ""); }
        setOnline(on); setTelegram(s.telegram);
        if (on && step === 1) setStep(2);
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [step]);

  const finish = async () => { await fetch("/api/onboarded", { method: "POST" }); router.push("/app"); };
  const runFirst = async () => {
    setMsg("보내는 중…");
    const r = await fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, pipeline: "quick" }) });
    if (r.ok) { await fetch("/api/onboarded", { method: "POST" }); router.push("/app"); } else setMsg("✖ " + (await r.json()).error);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 px-6 flex items-center justify-between max-w-[880px] w-full mx-auto">
        <div className="font-bold">everygithub<span className="text-gold">_gold</span></div>
        <button onClick={finish} className="text-sm text-mute hover:text-fg">나중에 할게요 →</button>
      </header>

      <main className="flex-1 max-w-[880px] w-full mx-auto px-6 pb-16">
        <div className="mt-6 mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight">1분이면 준비됩니다</h1>
          <p className="text-fg-2 mt-2">이 설정은 처음 한 번만 합니다. 이후엔 링크만 던지면 돼요.</p>
        </div>

        <ol className="space-y-4">
          <Step n={1} icon={Monitor} title="PC 연결" done={online} active={step === 1}
            desc="연결 파일을 받아 실행하세요. 설치·연결·자동 시작까지 알아서 진행되고, 끝나면 여기 표시가 초록으로 바뀝니다.">
            <div className="flex flex-wrap items-center gap-3">
              <InstallButton />
              <span className="flex items-center gap-2 text-sm text-mute">
                {online ? <><span className="dot-online" />연결됨</> : <><span className="spinner" />PC 신호 기다리는 중…</>}
              </span>
            </div>
            <p className="text-xs text-mute mt-3">Windows 10/11. Node.js 가 없으면 자동 설치를 시도합니다. 클론 폴더 기본값은 <code className="mono">내 문서\everygithub</code> (설정에서 변경 가능).</p>
          </Step>

          <Step n={2} icon={FolderOpen} title="클론 폴더 정하기" done={step > 2} active={step === 2}
            desc="레포가 저장될 폴더입니다. 기본값을 그대로 써도 되고, 버튼을 누르면 PC 화면에 폴더 선택창이 뜹니다.">
            <div className="flex flex-wrap items-center gap-3">
              <code className="mono text-sm bg-bg-raised border border-line rounded-md px-3 h-9 inline-flex items-center">{workspace || "내 문서\\everygithub"}</code>
              {deviceId && <FolderPicker deviceId={deviceId} current={workspace} online={online} onPicked={(p) => setWorkspace(p)} />}
              <button onClick={() => setStep(3)} className="btn btn-primary btn-sm">이대로 할게요 <ArrowRight size={14} /></button>
            </div>
          </Step>

          <Step n={3} icon={Send} title="텔레그램 연결 (선택)" done={telegram} active={step === 3}
            desc="폰에서 링크를 던지고 결과를 받으려면 연결하세요. 버튼 → 텔레그램 열림 → [시작] 한 번.">
            <div className="flex flex-wrap items-center gap-3">
              {telegram ? <span className="flex items-center gap-2 text-sm text-ok"><Check size={14} />연결됨</span> : <TelegramButton />}
              {!telegram && <button onClick={() => setStep(4)} className="btn btn-subtle btn-sm">건너뛰기</button>}
              {telegram && step === 3 && <button onClick={() => setStep(4)} className="btn btn-primary btn-sm">다음 <ArrowRight size={14} /></button>}
            </div>
          </Step>

          <Step n={4} icon={Link2} title="첫 링크 던져보기" done={false} active={step === 4}
            desc="샘플 레포로 한 번 돌려봅니다. 몇 초 뒤 홈에서 결과 카드를 볼 수 있어요.">
            <div className="flex flex-col sm:flex-row gap-2">
              <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} disabled={!online} />
              <button onClick={runFirst} disabled={!online || !url} className="btn btn-primary">실행하고 시작 <ArrowRight size={14} /></button>
            </div>
            {msg && <p className="text-sm text-mute mt-2">{msg}</p>}
            {!online && <p className="text-xs text-mute mt-2">PC 가 연결되면 실행할 수 있습니다.</p>}
          </Step>
        </ol>
      </main>
    </div>
  );
}

function Step({ n, icon: Icon, title, desc, done, active, children }: { n: number; icon: any; title: string; desc: string; done: boolean; active: boolean; children: React.ReactNode }) {
  return (
    <li className={clsx("card p-5 md:p-6 transition-colors", active && "border-gold/50", !active && !done && "opacity-70")}>
      <div className="flex gap-4">
        <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center shrink-0 border", done ? "bg-ok/15 border-ok/40 text-ok" : active ? "bg-gold-dim border-gold/40 text-gold" : "border-line text-mute")}>
          {done ? <Check size={16} /> : <Icon size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-mute mb-0.5">STEP {n}</div>
          <div className="font-semibold text-[15px]">{title}</div>
          <p className="text-sm text-fg-2 mt-1 mb-4">{desc}</p>
          {children}
        </div>
      </div>
    </li>
  );
}
