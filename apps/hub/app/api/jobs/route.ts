import { NextResponse } from "next/server";
import { z } from "zod";
import { Pipeline } from "@everygithub/protocol";
import { currentUser, supabaseServer } from "@/lib/supabase";
import { createJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";
const LOCAL = new Set(["open", "remove", "pick_folder"]);
const isLocalJob = (j: any) => Array.isArray(j.steps) && j.steps.length > 0 && j.steps.every((s: string) => LOCAL.has(s));

const Body = z.object({ url: z.string(), pipeline: Pipeline.default("quick"), deviceId: z.string().uuid().optional() });

/** 웹에서 링크 제출 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  try {
    const job = await createJob(user.id, { ...body.data, origin: { channel: "web" } });
    return NextResponse.json({ id: job.id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

/** 최근 잡 목록 (홈 피드 실시간 갱신용) */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 12);
  const sb = await supabaseServer();
  const { data } = await sb.from("jobs").select("id,source,pipeline,steps,status,origin,created_at,finished_at,repo_id").order("created_at", { ascending: false }).limit(limit + 10);
  return NextResponse.json({ jobs: (data ?? []).filter((j) => !isLocalJob(j)).slice(0, limit) });
}
