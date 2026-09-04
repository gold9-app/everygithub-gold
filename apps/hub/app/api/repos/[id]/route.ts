import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { createJob } from "@/lib/jobs";

const Body = z.object({ local: z.boolean().default(false) });

/** 라이브러리에서 삭제. local=true 면 PC 폴더까지 삭제하는 잡을 먼저 만든다 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => ({})));
  const local = body.success && body.data.local;
  const sb = supabaseAdmin();
  const { data: repo } = await sb.from("repos").select("id,url,device_id,local_path").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!repo) return NextResponse.json({ error: "not found" }, { status: 404 });

  let jobId: string | null = null;
  if (local) {
    const job = await createJob(user.id, { url: repo.url, pipeline: "custom", steps: ["remove"], origin: { channel: "web" }, deviceId: repo.device_id, options: { targetDir: repo.local_path } as any });
    jobId = job.id;
  }
  await sb.from("repos").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true, jobId });
}
