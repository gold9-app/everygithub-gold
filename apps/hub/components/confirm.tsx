"use client";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";

type Req = { id: number; title: string; desc?: ReactNode; confirmText?: string; danger?: boolean; options?: { key: string; label: string; desc?: string; danger?: boolean }[]; resolve: (v: string | null) => void };
let seq = 0;

/** 서비스 스타일 확인창. confirm({title, desc}) → 선택 key 또는 null */
export function confirmDialog(opts: Omit<Req, "id" | "resolve">): Promise<string | null> {
  return new Promise((resolve) => window.dispatchEvent(new CustomEvent("eg:confirm", { detail: { ...opts, id: ++seq, resolve } })));
}

export function ConfirmHost() {
  const [req, setReq] = useState<Req | null>(null);
  useEffect(() => {
    const on = (e: Event) => setReq((e as CustomEvent<Req>).detail);
    window.addEventListener("eg:confirm", on); return () => window.removeEventListener("eg:confirm", on);
  }, []);
  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(null); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });
  const close = (v: string | null) => { req?.resolve(v); setReq(null); };
  if (!req) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => close(null)}>
      <div className="card w-full max-w-md p-5 fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="font-semibold text-[15px]">{req.title}</div>
        {req.desc && <div className="text-sm text-fg-2 mt-1.5 leading-6">{req.desc}</div>}
        {req.options ? (
          <div className="mt-4 space-y-2">
            {req.options.map((o) => (
              <button key={o.key} onClick={() => close(o.key)} className={clsx("w-full text-left rounded-md border p-3 transition-colors", o.danger ? "border-bad/40 hover:bg-bad/10" : "border-line hover:bg-panel-2")}>
                <div className={clsx("text-sm font-medium", o.danger && "text-bad")}>{o.label}</div>
                {o.desc && <div className="text-xs text-mute mt-0.5">{o.desc}</div>}
              </button>
            ))}
            <button onClick={() => close(null)} className="btn btn-subtle w-full justify-center">취소</button>
          </div>
        ) : (
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => close(null)} className="btn btn-ghost">취소</button>
            <button onClick={() => close("ok")} className={clsx("btn", req.danger ? "bg-bad text-white hover:bg-bad/90" : "btn-primary")}>{req.confirmText ?? "확인"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
