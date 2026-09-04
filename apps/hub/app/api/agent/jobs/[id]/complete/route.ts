import { NextResponse } from "next/server";
import { z } from "zod";
import { StackInfo } from "@everygithub/protocol";
import { authDevice } from "@/lib/agent-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyJobDone } from "@/lib/notify";

const Body = z.object({
  status: z.enum(["done", "failed"]),
  error: z.string().optional(),
  repo: z.object({ localPath: z.string(), stack: StackInfo.nullable(), license: z.string().nullable(), ref: z.string().nullable() }).optional(),
  artifacts: z.record(z.string()).optional(),
});

/** 잡 완료 보고: repos upsert → artifacts 저장 → 잡 상태 갱신 → 원래 채널로 알림 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const device = await authDevice(req);
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: job } = await sb.from("jobs").select("*").eq("id", id).eq("device_id", device.id).maybeSingle();
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });

  let repoId: string | null = job.repo_id ?? null;
  if (body.data.repo) {
    const src = job.source as { url: string; owner: string; name: string };
    const { data: repo } = await sb.from("repos").upsert({
      user_id: job.user_id, device_id: device.id, url: src.url, owner: src.owner, name: src.name,
      ref: body.data.repo.ref, local_path: body.data.repo.localPath, stack: body.data.repo.stack,
      license: body.data.repo.license, updated_at: new Date().toISOString(),
    }, { onConflict: "device_id,local_path" }).select("id").single();
    repoId = repo?.id ?? null;
  }
  if (repoId && body.data.artifacts) {
    const rows = Object.entries(body.data.artifacts).map(([kind, content]) => ({ user_id: job.user_id, repo_id: repoId, job_id: id, kind, content }));
    if (rows.length) await sb.from("artifacts").insert(rows);
  }
  await sb.from("jobs").update({ status: body.data.status, repo_id: repoId, finished_at: new Date().toISOString() }).eq("id", id);
  await notifyJobDone({ ...job, repo_id: repoId }, body.data.status, body.data.error, body.data.artifacts?.summary);
  return NextResponse.json({ ok: true });
}
