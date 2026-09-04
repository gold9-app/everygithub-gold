import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, supabaseServer } from "@/lib/supabase";

const Body = z.object({ workspacePath: z.string().min(1).optional(), name: z.string().min(1).optional() });

/** 디바이스 설정 변경 (워크스페이스 경로 등) — 다음 폴링 때 에이전트에 반영 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const sb = await supabaseServer();
  const patch: Record<string, string> = {};
  if (body.data.workspacePath) patch.workspace_path = body.data.workspacePath;
  if (body.data.name) patch.name = body.data.name;
  const { error } = await sb.from("devices").update(patch).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = await supabaseServer();
  await sb.from("devices").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
