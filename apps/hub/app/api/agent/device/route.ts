import { NextResponse } from "next/server";
import { z } from "zod";
import { authDevice } from "@/lib/agent-auth";
import { supabaseAdmin } from "@/lib/supabase";

const Body = z.object({ workspacePath: z.string().min(1).optional() });

/** 에이전트가 자기 디바이스 정보 갱신 (폴더 선택창 결과 등) */
export async function PATCH(req: Request) {
  const device = await authDevice(req);
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const patch: Record<string, string> = {};
  if (body.data.workspacePath) patch.workspace_path = body.data.workspacePath;
  await supabaseAdmin().from("devices").update(patch).eq("id", device.id);
  return NextResponse.json({ ok: true });
}
