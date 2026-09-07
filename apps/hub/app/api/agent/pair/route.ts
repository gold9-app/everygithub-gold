import { NextResponse } from "next/server";
import { PairRequest } from "@everygithub/protocol";
import { supabaseAdmin } from "@/lib/supabase";
import { newToken, sha256 } from "@/lib/agent-auth";

/** 에이전트 → 코드/설치토큰으로 페어링. 10분 유효, 1회용 */
export async function POST(req: Request) {
  const body = PairRequest.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: code } = await sb.from("pairing_codes").select("*").eq("code", body.data.code).is("used_at", null).maybeSingle();
  if (!code || new Date(code.expires_at) < new Date()) return NextResponse.json({ error: "코드가 없거나 만료됨" }, { status: 400 });

  // 워크스페이스 기본값: 사용자 설정 → 없으면 OS 기본 (에이전트가 홈 기준으로 해석)
  const { data: profile } = await sb.from("profiles").select("settings").eq("id", code.user_id).maybeSingle();
  const workspacePath = body.data.workspacePath || profile?.settings?.defaultWorkspace || "~/everygithub";

  const token = newToken();
  // 같은 사용자의 같은 PC(호스트명)면 새 행을 만들지 않고 토큰만 갱신 → 설치 파일을 여러 번 실행해도 PC 는 하나
  const { data: existing } = await sb.from("devices").select("id").eq("user_id", code.user_id).eq("name", body.data.name).maybeSingle();
  let deviceId: string;
  if (existing) {
    await sb.from("devices").update({ os: body.data.os, agent_version: body.data.agentVersion, token_hash: sha256(token), last_seen: new Date().toISOString() }).eq("id", existing.id);
    deviceId = existing.id;
  } else {
    const { data: device, error } = await sb.from("devices").insert({
      user_id: code.user_id, name: body.data.name, os: body.data.os, agent_version: body.data.agentVersion,
      workspace_path: workspacePath, token_hash: sha256(token), last_seen: new Date().toISOString(),
    }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    deviceId = device.id;
  }
  await sb.from("pairing_codes").update({ used_at: new Date().toISOString() }).eq("code", code.code);
  return NextResponse.json({ deviceId, deviceToken: token });
}
