"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import clsx from "clsx";

/** 본인 전용 설치 파일 다운로드 (토큰 내장) */
export function InstallButton({ variant = "primary", label = "PC 연결 파일 받기" }: { variant?: "primary" | "ghost"; label?: string }) {
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
    <button onClick={download} disabled={busy} className={clsx("btn", variant === "primary" ? "btn-primary btn-lg" : "btn-ghost")}>
      {busy ? <span className="spinner" /> : <Download size={16} />}{label}
    </button>
  );
}
