import { supabaseAdmin } from "./supabase";

/** 디바이스별 브로드캐스트 토픽 — 토큰 해시 일부라 추측 불가. 에이전트도 같은 식으로 계산한다 */
export const deviceTopic = (tokenHash: string) => `eg:${tokenHash.slice(0, 24)}`;

/**
 * 사이트 → PC 깨우기. Supabase Realtime 의 REST 브로드캐스트로 "job"(새 잡) / "settings"(설정 변경) 신호만 보낸다.
 * 내용은 비어 있고, PC 는 신호를 받으면 평소처럼 허브 API 로 가져간다. 실패해도 60초 폴링이 받쳐주므로 오류는 삼킨다.
 */
export async function wakeDevices(deviceIds: string[], event: "job" | "settings") {
  const ids = [...new Set(deviceIds.filter(Boolean))];
  if (!ids.length) return;
  try {
    const { data } = await supabaseAdmin().from("devices").select("id,token_hash").in("id", ids);
    const messages = (data ?? []).filter((d) => d.token_hash).map((d) => ({ topic: deviceTopic(d.token_hash), event, payload: {} }));
    if (!messages.length) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ messages }),
    });
  } catch {}
}

/** 사용자의 모든 디바이스 깨우기 (설정 변경 등) */
export async function wakeUserDevices(userId: string, event: "job" | "settings") {
  const { data } = await supabaseAdmin().from("devices").select("id").eq("user_id", userId);
  await wakeDevices((data ?? []).map((d) => d.id), event);
}
