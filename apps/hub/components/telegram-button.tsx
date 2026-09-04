"use client";
import { useState } from "react";
import { Send } from "lucide-react";

/** 텔레그램 딥링크 연결 — 누르면 텔레그램이 열리고 [시작] 한 번 */
export function TelegramButton({ onOpened }: { onOpened?: () => void }) {
  const [state, setState] = useState<"idle" | "opened" | "code">("idle");
  const [code, setCode] = useState("");
  const [link, setLink] = useState("");
  const go = async () => {
    const res = await fetch("/api/link-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channel: "telegram" }) });
    const data = await res.json();
    if (data.deepLink) { setLink(data.deepLink); window.open(data.deepLink, "_blank"); setState("opened"); onOpened?.(); }
    else { setCode(data.code); setState("code"); }
  };
  if (state === "code") return <p className="text-sm text-fg-2">봇에 이 코드를 보내세요: <b className="mono text-gold">{code}</b></p>;
  if (state === "opened") return <p className="text-sm text-fg-2">텔레그램이 열렸습니다. 안 열렸으면 <a className="text-info underline" href={link} target="_blank">여기</a> → [시작]. 연결되면 자동으로 반영됩니다.</p>;
  return <button onClick={go} className="btn btn-ghost"><Send size={15} />텔레그램 연결</button>;
}
