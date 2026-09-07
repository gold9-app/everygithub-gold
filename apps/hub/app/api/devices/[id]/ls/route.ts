import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, supabaseAdmin } from "@/lib/supabase";

const Body = z.object({ path: z.string().default("") });
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** 폴더 브라우저: list_dirs 잡을 만들고 에이전트의 결과 이벤트를 최대 15초 기다려 돌려준다 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: device } = await sb.from("devices").select("id,last_seen").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!device) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!device.last_seen || Date.now() - new Date(device.last_seen).getTime() > 60_000) return NextResponse.json({ error: "PC 가 오프라인입니다" }, { status: 409 });

  const { data: job, error } = await sb.from("jobs").insert({
    user_id: user.id, device_id: id, source: { url: "https://github.com/everygithub/local", kind: "repo", owner: "everygithub", name: "local" },
    pipeline: "custom", steps: ["list_dirs"], options: { shallow: true, lang: "ko", approve: "ask", targetDir: body.data.path }, origin: { channel: "web" },
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const { data: ev } = await sb.from("job_events").select("level,payload").eq("job_id", job.id).in("level", ["result", "error"]).limit(1).maybeSingle();
    if (ev) {
      if (ev.level === "error") return NextResponse.json({ error: (ev.payload as any).message }, { status: 400 });
      return NextResponse.json(ev.payload);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return NextResponse.json({ error: "PC 응답이 없습니다. 에이전트가 켜져 있는지 확인하세요." }, { status: 504 });
}
