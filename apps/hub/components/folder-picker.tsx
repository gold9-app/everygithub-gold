"use client";
import { useEffect, useRef, useState } from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { toast } from "./toast";

/** [PC 에서 폴더 선택]: PC 에 네이티브 선택창 → 선택 결과를 status 폴링으로 감지 */
export function FolderPicker({ deviceId, current, online, onPicked, small }: { deviceId: string; current: string; online: boolean; onPicked?: (p: string) => void; small?: boolean }) {
  const [busy, setBusy] = useState(false);
  const timer = useRef<any>(null);
  useEffect(() => () => clearInterval(timer.current), []);
  const pick = async () => {
    const r = await fetch(`/api/devices/${deviceId}/pick`, { method: "POST" });
    if (!r.ok) return toast("요청 실패", "bad");
    setBusy(true); toast("PC 화면에 폴더 선택창이 떴습니다", "info");
    let n = 0;
    timer.current = setInterval(async () => {
      n++;
      const s = await fetch("/api/me/status").then((x) => x.json()).catch(() => null);
      const d = s?.devices?.find((x: any) => x.id === deviceId);
      if (d && d.workspacePath !== current) { clearInterval(timer.current); setBusy(false); onPicked?.(d.workspacePath); toast(`클론 폴더: ${d.workspacePath}`, "ok"); }
      else if (n > 60) { clearInterval(timer.current); setBusy(false); toast("선택이 취소됐거나 응답이 없습니다", "warn"); }
    }, 2000);
  };
  return (
    <button onClick={pick} disabled={!online || busy} title={online ? "" : "PC 가 온라인이어야 합니다"} className={small ? "btn btn-ghost btn-sm" : "btn btn-ghost"}>
      {busy ? <Loader2 size={14} className="animate-spin" /> : <FolderOpen size={14} />}PC 에서 폴더 선택
    </button>
  );
}
