import { NextResponse } from "next/server";
import { currentUser, supabaseServer } from "@/lib/supabase";

/** 대기 중인 잡 취소 (실행 시작 전에만) */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = await supabaseServer();
  const { data } = await sb.from("jobs").update({ status: "cancelled", finished_at: new Date().toISOString() }).eq("id", id).eq("status", "queued").select("id").maybeSingle();
  if (!data) return NextResponse.json({ error: "이미 실행 중이거나 끝난 작업입니다" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
