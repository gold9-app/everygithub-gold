import { NextResponse } from "next/server";
import { authDevice, agentJson } from "@/lib/agent-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { deviceTopic } from "@/lib/realtime";

export const dynamic = "force-dynamic";

/** 에이전트가 시작 시·신호 받을 때·잡 수령 시 내려받는 설정 (사이트에서 변경한 값 반영) */
export async function GET(req: Request) {
  const device = await authDevice(req);
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sb = supabaseAdmin();
  const { data: profile } = await sb.from("profiles").select("settings").eq("id", device.user_id).maybeSingle();
  const s = (profile?.settings ?? {}) as Record<string, any>;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return agentJson({
    workspacePath: device.workspace_path,
    anthropicApiKey: s.anthropicApiKey || undefined,
    approve: s.approve ?? "ask",
    pollIntervalMs: 60_000,
    realtime: url && anonKey ? { url, anonKey, topic: deviceTopic(device.token_hash) } : undefined,
  });
}
