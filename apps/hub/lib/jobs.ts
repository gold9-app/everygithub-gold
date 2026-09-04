import { CreateJobInput, PIPELINE_STEPS, parseGithubUrl, type JobOrigin, type Pipeline } from "@everygithub/protocol";
import { supabaseAdmin } from "./supabase";

/** 어떤 채널에서 오든 잡 생성은 여기 한 곳. deviceId 없으면 사용자의 최근 접속 디바이스 */
export async function createJob(userId: string, input: { url: string; pipeline?: Pipeline; steps?: any[]; origin: JobOrigin; deviceId?: string }) {
  const parsed = CreateJobInput.parse(input);
  const source = parseGithubUrl(parsed.url);
  if (!source) throw new Error("깃허브 링크를 인식하지 못했습니다");
  const sb = supabaseAdmin();

  let deviceId = parsed.deviceId;
  if (!deviceId) {
    const { data } = await sb.from("devices").select("id").eq("user_id", userId).order("last_seen", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    if (!data) throw new Error("연결된 디바이스가 없습니다. PC 에 에이전트를 설치하고 페어링하세요.");
    deviceId = data.id;
  }
  const steps = parsed.steps ?? PIPELINE_STEPS[parsed.pipeline];
  const { data, error } = await sb.from("jobs").insert({
    user_id: userId, device_id: deviceId, source, pipeline: parsed.pipeline, steps,
    options: { shallow: true, lang: "ko", approve: "ask", ...(parsed.options ?? {}) },
    origin: parsed.origin,
  }).select("*").single();
  if (error) throw error;
  return data;
}

/** DB row → protocol Job (camelCase) */
export function rowToJob(r: any) {
  return {
    id: r.id, userId: r.user_id, deviceId: r.device_id, repoId: r.repo_id ?? null,
    source: r.source, pipeline: r.pipeline, steps: r.steps, options: r.options,
    status: r.status, origin: r.origin, createdAt: r.created_at, finishedAt: r.finished_at ?? null,
  };
}
