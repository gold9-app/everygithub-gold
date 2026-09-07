"use client";
import { useState } from "react";
import { FolderOpen, X, Check, Loader2, ClipboardPaste } from "lucide-react";
import { toast } from "./toast";

/** 클론 폴더 지정: 탐색기 주소창 경로를 붙여넣는 단순한 방식 */
export function FolderPicker({ deviceId, current, onPicked, small }: { deviceId: string; current: string; online?: boolean; onPicked?: (p: string) => void; small?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={small ? "btn btn-ghost btn-sm" : "btn btn-ghost"}><FolderOpen size={14} />폴더 선택</button>
      {open && <PathDialog deviceId={deviceId} current={current} onClose={() => setOpen(false)} onPicked={(p) => { setOpen(false); onPicked?.(p); }} />}
    </>
  );
}

const WIN_PATH = /^[A-Za-z]:[\\/]/;

function PathDialog({ deviceId, current, onClose, onPicked }: { deviceId: string; current: string; onClose: () => void; onPicked: (p: string) => void }) {
  const [value, setValue] = useState(current.startsWith("~") ? "" : current);
  const [saving, setSaving] = useState(false);
  const cleaned = value.trim().replace(/^["']|["']$/g, "").replace(/[\\/]+$/, "");
  const valid = WIN_PATH.test(cleaned) || cleaned.startsWith("/");

  const save = async () => {
    setSaving(true);
    const r = await fetch(`/api/devices/${deviceId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspacePath: cleaned }) });
    setSaving(false);
    if (r.ok) { toast(`클론 폴더: ${cleaned}`, "ok"); onPicked(cleaned); } else toast("저장 실패", "bad");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-5 fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-semibold text-[15px]">클론 폴더 지정</div>
          <button onClick={onClose} className="text-mute hover:text-fg"><X size={16} /></button>
        </div>
        <p className="text-sm text-fg-2 mb-4">레포가 저장될 폴더의 경로를 붙여넣으세요. 없는 폴더면 자동으로 만들어집니다.</p>

        <ol className="text-sm text-fg-2 space-y-1.5 mb-4 pl-5 list-decimal">
          <li>Windows 탐색기에서 원하는 폴더를 연다</li>
          <li>위쪽 <b className="text-fg">주소창을 한 번 클릭</b> → 경로가 글자로 바뀜 (예: <code className="mono text-xs">D:\repos</code>)</li>
          <li><span className="kbd">Ctrl</span>+<span className="kbd">C</span> 로 복사 → 아래 칸에 <span className="kbd">Ctrl</span>+<span className="kbd">V</span></li>
        </ol>

        <div className="flex items-center gap-2">
          <ClipboardPaste size={16} className="text-mute shrink-0" />
          <input autoFocus className="input mono" placeholder="D:\repos" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && valid && save()} />
        </div>
        {value && !valid && <p className="text-xs text-bad mt-2">`D:\폴더` 처럼 드라이브 문자로 시작하는 전체 경로여야 합니다.</p>}
        <p className="text-xs text-mute mt-2">현재: <code className="mono">{current}</code></p>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost">취소</button>
          <button onClick={save} disabled={!valid || saving} className="btn btn-primary">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}이 폴더로 저장</button>
        </div>
      </div>
    </div>
  );
}
