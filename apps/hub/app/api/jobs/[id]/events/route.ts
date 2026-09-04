import { NextResponse } from "next/server";
import { currentUser, supabaseServer } from "@/lib/supabase";
export const dynamic = "force-dynamic";
/** 잡 이벤트 로그 (활동 화면에서 펼쳐 보기) */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = await supabaseServer();
  const { data } = await sb.from("job_events").select("id,step,level,payload,ts").eq("job_id", id).order("id", { ascending: true }).limit(500);
  return NextResponse.json({ events: data ?? [] });
}
