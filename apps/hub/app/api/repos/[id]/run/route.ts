import { NextResponse } from "next/server";
import { z } from "zod";
import { Pipeline, StepName } from "@everygithub/protocol";
import { currentUser, supabaseServer } from "@/lib/supabase";
import { createJob } from "@/lib/jobs";

const Body = z.object({ pipeline: Pipeline.optional(), steps: z.array(StepName).optional() });

/** 레포 상세의 액션 버튼: 같은 레포로 파이프라인/스텝 재실행 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const sb = await supabaseServer();
  const { data: repo } = await sb.from("repos").select("url,device_id").eq("id", id).maybeSingle();
  if (!repo) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const job = await createJob(user.id, { url: repo.url, pipeline: body.data.pipeline ?? "custom", steps: body.data.steps, origin: { channel: "web" }, deviceId: repo.device_id });
    return NextResponse.json({ id: job.id });
  } catch (err) { return NextResponse.json({ error: (err as Error).message }, { status: 400 }); }
}
