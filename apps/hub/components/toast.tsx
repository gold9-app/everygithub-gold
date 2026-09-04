"use client";
import { useEffect, useState } from "react";
import { Check, X, Info, AlertTriangle } from "lucide-react";
import clsx from "clsx";

type Toast = { id: number; kind: "ok" | "bad" | "info" | "warn"; text: string };
let seq = 0;

/** 어디서든 toast("...") 로 호출. window 이벤트로 전달돼 프로바이더 불필요 */
export function toast(text: string, kind: Toast["kind"] = "info") {
  window.dispatchEvent(new CustomEvent("eg:toast", { detail: { id: ++seq, kind, text } }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const t = (e as CustomEvent<Toast>).detail;
      setItems((l) => [...l, t]);
      setTimeout(() => setItems((l) => l.filter((x) => x.id !== t.id)), 3800);
    };
    window.addEventListener("eg:toast", on); return () => window.removeEventListener("eg:toast", on);
  }, []);
  const Icon = { ok: Check, bad: X, info: Info, warn: AlertTriangle };
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <div key={t.id} className={clsx("fade-up pointer-events-auto flex items-center gap-2.5 rounded-lg border bg-panel px-3.5 py-2.5 text-sm shadow-xl min-w-[240px] max-w-sm",
          t.kind === "ok" ? "border-ok/40" : t.kind === "bad" ? "border-bad/40" : t.kind === "warn" ? "border-warn/40" : "border-line-2")}>
          {(() => { const I = Icon[t.kind]; return <I size={15} className={t.kind === "ok" ? "text-ok" : t.kind === "bad" ? "text-bad" : t.kind === "warn" ? "text-warn" : "text-info"} />; })()}
          <span className="text-fg">{t.text}</span>
        </div>
      ))}
    </div>
  );
}
