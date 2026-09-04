import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";

/** PC 에 폴더 선택창 띄우기 (pick_folder 잡). 결과는 에이전트가 devices.workspace_path 에 반영 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data: device } = await sb.from("devices").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!device) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: job, error } = await sb.from("jobs").insert({
    user_id: user.id, device_id: id, source: { url: "https://github.com/everygithub/local", kind: "repo", owner: "everygithub", name: "local" },
    pipeline: "custom", steps: ["pick_folder"], options: { shallow: true, lang: "ko", approve: "ask" }, origin: { channel: "web" },
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: job.id });
}
