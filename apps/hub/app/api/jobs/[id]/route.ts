import { NextResponse } from "next/server";
import { currentUser, supabaseServer } from "@/lib/supabase";

/** 대기 중이면 취소, 끝난 작업이면 기록 삭제 (실행 중은 불가) */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: job } = await sb.from("jobs").select("status").eq("id", id).maybeSingle();
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (job.status === "running") return NextResponse.json({ error: "실행 중인 작업은 끝난 뒤 지울 수 있습니다" }, { status: 409 });
  if (job.status === "queued") {
    await sb.from("jobs").update({ status: "cancelled", finished_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ ok: true, cancelled: true });
  }
  await sb.from("jobs").delete().eq("id", id);
  return NextResponse.json({ ok: true, deleted: true });
}
