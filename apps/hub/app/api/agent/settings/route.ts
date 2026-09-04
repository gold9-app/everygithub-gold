import { NextResponse } from "next/server";
import { authDevice } from "@/lib/agent-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** 에이전트가 시작 시·주기적으로 내려받는 설정 (사이트에서 변경한 값 반영) */
export async function GET(req: Request) {
  const device = await authDevice(req);
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sb = supabaseAdmin();
  const { data: profile } = await sb.from("profiles").select("settings").eq("id", device.user_id).maybeSingle();
  const s = (profile?.settings ?? {}) as Record<string, any>;
  return NextResponse.json({
    workspacePath: device.workspace_path,
    anthropicApiKey: s.anthropicApiKey || undefined,
    approve: s.approve ?? "ask",
    pollIntervalMs: 3000,
  });
}
