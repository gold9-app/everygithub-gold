"use client";
import { useEffect, useState } from "react";
import { FolderOpen, Folder, ChevronRight, ArrowUp, HardDrive, Home, Loader2, FolderPlus, X, Check } from "lucide-react";
import clsx from "clsx";
import { toast } from "./toast";

type Listing = { path: string; parent: string | null; entries: { name: string; path: string }[]; roots: { name: string; path: string }[]; shortcuts: { name: string; path: string }[]; current: string };

/** 사이트 안 폴더 브라우저: 에이전트가 PC 폴더 목록을 읽어 보내준다. OS 창 불필요 */
export function FolderPicker({ deviceId, current, online, onPicked, small }: { deviceId: string; current: string; online: boolean; onPicked?: (p: string) => void; small?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} disabled={!online} title={online ? "" : "PC 가 온라인이어야 합니다"} className={small ? "btn btn-ghost btn-sm" : "btn btn-ghost"}>
        <FolderOpen size={14} />폴더 선택
      </button>
      {open && <FolderBrowser deviceId={deviceId} current={current} onClose={() => setOpen(false)} onPicked={(p) => { setOpen(false); onPicked?.(p); }} />}
    </>
  );
}

function FolderBrowser({ deviceId, current, onClose, onPicked }: { deviceId: string; current: string; onClose: () => void; onPicked: (p: string) => void }) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (p: string) => {
    setLoading(true); setErr("");
    try {
      const r = await fetch(`/api/devices/${deviceId}/ls`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: p }) });
      const d = await r.json();
      if (!r.ok) { if (p) { await load(""); return; } setErr(d.error ?? "실패"); } else setListing(d);
    } catch { setErr("네트워크 오류"); }
    setLoading(false);
  };
  useEffect(() => { load(current || ""); }, []); // eslint-disable-line

  const sep = listing?.path.includes("/") && !listing?.path.includes("\\") ? "/" : "\\";
  const choose = async (p: string) => {
    setSaving(true);
    const r = await fetch(`/api/devices/${deviceId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspacePath: p }) });
    setSaving(false);
    if (r.ok) { toast(`클론 폴더: ${p}`, "ok"); onPicked(p); } else toast("저장 실패", "bad");
  };
  const crumbs = listing?.path ? listing.path.split(/[\\/]+/).filter(Boolean) : [];
  const crumbPath = (i: number) => { const parts = crumbs.slice(0, i + 1); return sep === "\\" ? parts.join("\\") + (i === 0 ? "\\" : "") : "/" + parts.join("/"); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl h-[70vh] flex flex-col fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 h-12 border-b border-line">
          <div className="font-semibold text-sm">클론 폴더 선택 <span className="text-mute font-normal">— PC 의 폴더를 직접 고릅니다</span></div>
          <button onClick={onClose} className="text-mute hover:text-fg"><X size={16} /></button>
        </div>
        <div className="flex flex-1 min-h-0">
          <aside className="w-44 shrink-0 border-r border-line p-2 overflow-auto">
            <div className="text-[10px] text-mute uppercase tracking-wide px-2 py-1">바로가기</div>
            {listing?.shortcuts.map((s) => <button key={s.path} onClick={() => load(s.path)} className="w-full flex items-center gap-2 px-2 h-8 rounded text-[13px] text-fg-2 hover:bg-panel-2 hover:text-fg"><Home size={13} />{s.name}</button>)}
            <div className="text-[10px] text-mute uppercase tracking-wide px-2 py-1 mt-2">드라이브</div>
            {listing?.roots.map((s) => <button key={s.path} onClick={() => load(s.path)} className="w-full flex items-center gap-2 px-2 h-8 rounded text-[13px] text-fg-2 hover:bg-panel-2 hover:text-fg"><HardDrive size={13} />{s.name}</button>)}
          </aside>
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-1 px-3 h-10 border-b border-line text-xs overflow-x-auto">
              <button onClick={() => listing?.parent && load(listing.parent)} disabled={!listing?.parent} className="btn btn-subtle btn-sm px-1.5 disabled:opacity-30"><ArrowUp size={13} /></button>
              {crumbs.length === 0 ? <span className="text-mute">위치를 선택하세요</span> : crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1 whitespace-nowrap">{i > 0 && <ChevronRight size={11} className="text-mute" />}<button onClick={() => load(crumbPath(i))} className="hover:text-gold mono">{c}</button></span>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-2">
              {loading ? <div className="flex items-center justify-center h-full text-mute text-sm gap-2"><Loader2 size={15} className="animate-spin" />PC 에서 읽는 중…</div>
                : err ? <div className="p-4 text-sm text-bad">{err}</div>
                : !listing?.path ? <div className="p-4 text-sm text-mute">왼쪽에서 드라이브나 바로가기를 고르세요.</div>
                : listing.entries.length === 0 ? <div className="p-4 text-sm text-mute">하위 폴더가 없습니다. 이 폴더를 그대로 선택하거나 아래에서 새 폴더를 만드세요.</div>
                : listing.entries.map((e) => (
                  <button key={e.path} onDoubleClick={() => load(e.path)} onClick={() => load(e.path)} className="w-full flex items-center gap-2 px-2 h-8 rounded text-[13px] text-fg-2 hover:bg-panel-2 hover:text-fg text-left">
                    <Folder size={14} className="text-gold" /><span className="truncate">{e.name}</span><ChevronRight size={12} className="ml-auto text-mute" />
                  </button>
                ))}
            </div>
            <div className="border-t border-line p-3 space-y-2">
              <div className="flex items-center gap-2">
                <FolderPlus size={14} className="text-mute" />
                <input className="input h-8 text-xs" placeholder="여기에 새 폴더 만들기 (이름 입력)" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={!listing?.path} />
                <button disabled={!listing?.path || !newName.trim() || saving} onClick={() => choose(listing!.path + (listing!.path.endsWith(sep) ? "" : sep) + newName.trim())} className="btn btn-ghost btn-sm whitespace-nowrap">만들고 선택</button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className={clsx("mono text-xs truncate", listing?.path ? "text-fg" : "text-mute")}>{listing?.path || "선택된 폴더 없음"}</code>
                <button disabled={!listing?.path || saving} onClick={() => choose(listing!.path)} className="btn btn-primary btn-sm whitespace-nowrap">{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}이 폴더 선택</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
