import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase";
import { AGENT_BUNDLE_SHA } from "./agent-bundle";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => "egh_" + randomBytes(24).toString("hex");
export const sixDigits = () => String(Math.floor(100000 + Math.random() * 900000));

/** Authorization: Bearer <deviceToken> → device row (없으면 null). last_seen 갱신 */
export async function authDevice(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const sb = supabaseAdmin();
  const { data } = await sb.from("devices").select("*").eq("token_hash", sha256(token)).maybeSingle();
  if (!data) return null;
  await sb.from("devices").update({ last_seen: new Date().toISOString() }).eq("id", data.id);
  return data as { id: string; user_id: string; workspace_path: string; name: string; token_hash: string };
}

/** 에이전트에게 주는 응답. 헤더에 현재 배포된 에이전트 번들 해시를 실어 보내 PC 가 추가 요청 없이 업데이트 여부를 알게 한다 */
export function agentJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, { status: init?.status ?? 200, headers: { "x-agent-sha": AGENT_BUNDLE_SHA } });
}
