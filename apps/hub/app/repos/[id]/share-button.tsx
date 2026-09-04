"use client";
import { useState } from "react";

export function ShareButton({ artifactId, token }: { artifactId: string; token: string | null }) {
  const [t, setT] = useState(token);
  const share = async () => {
    const res = await fetch(`/api/artifacts/${artifactId}/share`, { method: "POST" });
    setT((await res.json()).token);
  };
  if (t) return <a className="mute" href={`/share/${t}`} target="_blank">공유 링크 열기 ↗</a>;
  return <button className="ghost" onClick={share}>공유 링크 만들기</button>;
}
