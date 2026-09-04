import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** 로그인 사용자 컨텍스트 (RLS 적용) — 페이지·웹 API 용 */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (all: { name: string; value: string; options?: any }[]) => { try { all.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {} },
    },
  });
}

/** service role — 에이전트 API·텔레그램 웹훅 등 서버 내부 용. 절대 클라이언트로 노출 금지 */
export function supabaseAdmin() {
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function currentUser() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return data.user;
}
