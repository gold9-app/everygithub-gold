import { supabaseServer } from "./supabase";

export const ONLINE_MS = 60_000;
export const isOnline = (t: string | null) => Boolean(t && Date.now() - new Date(t).getTime() < ONLINE_MS);

/** 셸 상태: 디바이스 온라인 여부 + 텔레그램 연결 */
export async function meStatus(userId: string) {
  const sb = await supabaseServer();
  const [{ data: devices }, { data: profile }] = await Promise.all([
    sb.from("devices").select("id,name,last_seen").order("last_seen", { ascending: false }),
    sb.from("profiles").select("telegram_chat_id,settings,github_login").eq("id", userId).maybeSingle(),
  ]);
  return {
    devices: (devices ?? []).map((d) => ({ id: d.id, name: d.name, online: isOnline(d.last_seen) })),
    telegram: Boolean(profile?.telegram_chat_id),
    settings: (profile?.settings ?? {}) as Record<string, any>,
    login: profile?.github_login ?? "",
  };
}
