import { NextResponse } from "next/server";
import { authDevice } from "@/lib/agent-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { rowToJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";

/** 에이전트 폴링: 가장 오래된 queued 잡을 running 으로 바꿔 반환 (원자적 claim) */
export async function GET(req: Request) {
  const device = await authDevice(req);
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sb = supabaseAdmin();
  const { data: candidate } = await sb.from("jobs").select("id").eq("device_id", device.id).eq("status", "queued")
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!candidate) return NextResponse.json({ job: null });
  const { data: claimed } = await sb.from("jobs").update({ status: "running" })
    .eq("id", candidate.id).eq("status", "queued").select("*").maybeSingle();
  return NextResponse.json({ job: claimed ? rowToJob(claimed) : null });
}
