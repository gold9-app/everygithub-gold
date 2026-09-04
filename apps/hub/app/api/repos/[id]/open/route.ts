import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { createJob } from "@/lib/jobs";

/** PC 탐색기로 폴더 열기 (에이전트에 open 잡) */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data: repo } = await sb.from("repos").select("url,device_id,local_path").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!repo) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const job = await createJob(user.id, { url: repo.url, pipeline: "custom", steps: ["open"], origin: { channel: "web" }, deviceId: repo.device_id, options: { targetDir: repo.local_path } as any });
    return NextResponse.json({ id: job.id });
  } catch (err) { return NextResponse.json({ error: (err as Error).message }, { status: 400 }); }
}
