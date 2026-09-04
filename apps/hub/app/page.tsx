import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";
import { LoginButton } from "./login-button";

export default async function Home() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <div className="hero">
      <h1>깃허브 링크 하나로 끝.</h1>
      <p>클론 · 분석 · 한국어 설명서 · 클로드코드 스킬 등록 — 링크만 던지면 내 PC 가 알아서 합니다.</p>
      <LoginButton />
    </div>
  );
}
