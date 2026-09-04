import { NextResponse } from "next/server";
import { PairRequest } from "@everygithub/protocol";
import { supabaseAdmin } from "@/lib/supabase";
import { newToken, sha256 } from "@/lib/agent-auth";

/** 에이전트 → 6자리 코드로 페어링. 코드는 10분 유효, 1회용 */
export async function POST(req: Request) {
  const body = PairRequest.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: code } = await sb.from("pairing_codes").select("*").eq("code", body.data.code).is("used_at", null).maybeSingle();
  if (!code || new Date(code.expires_at) < new Date()) return NextResponse.json({ error: "코드가 없거나 만료됨" }, { status: 400 });

  const token = newToken();
  const { data: device, error } = await sb.from("devices").insert({
    user_id: code.user_id, name: body.data.name, os: body.data.os, agent_version: body.data.agentVersion,
    workspace_path: body.data.workspacePath, token_hash: sha256(token), last_seen: new Date().toISOString(),
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.from("pairing_codes").update({ used_at: new Date().toISOString() }).eq("code", code.code);

  return NextResponse.json({
    deviceId: device.id, deviceToken: token,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
