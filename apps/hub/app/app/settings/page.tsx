import { currentUser, supabaseServer } from "@/lib/supabase";
import { isOnline } from "@/lib/data";
import { SettingsView } from "./settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = (await currentUser())!;
  const sb = await supabaseServer();
  const [{ data: devices }, { data: profile }] = await Promise.all([
    sb.from("devices").select("id,name,os,agent_version,workspace_path,last_seen,created_at").order("created_at"),
    sb.from("profiles").select("telegram_chat_id,settings,github_login").eq("id", user.id).maybeSingle(),
  ]);
  const s = (profile?.settings ?? {}) as any;
  return <SettingsView
    devices={(devices ?? []).map((d) => ({ ...d, online: isOnline(d.last_seen) }))}
    telegram={Boolean(profile?.telegram_chat_id)}
    login={profile?.github_login ?? ""}
    settings={{ hasKey: Boolean(s.anthropicApiKey), approve: s.approve ?? "ask", defaultWorkspace: s.defaultWorkspace ?? "" }} />;
}
