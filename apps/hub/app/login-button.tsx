"use client";
import { createBrowserClient } from "@supabase/ssr";

export function LoginButton() {
  const login = async () => {
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    await sb.auth.signInWithOAuth({ provider: "github", options: { redirectTo: `${location.origin}/auth/callback` } });
  };
  return <button onClick={login}>GitHub 로 시작하기</button>;
}
