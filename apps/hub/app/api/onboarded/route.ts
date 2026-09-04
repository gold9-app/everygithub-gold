import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
/** 온보딩 완료/건너뛰기 표시 → 이후 /welcome 안 보임 */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sb = supabaseAdmin();
  const { data } = await sb.from("profiles").select("settings").eq("id", user.id).maybeSingle();
  await sb.from("profiles").update({ settings: { ...(data?.settings ?? {}), onboarded: true } }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
