import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, supabaseAdmin } from "@/lib/supabase";

const Body = z.object({
  anthropicApiKey: z.string().optional(),
  approve: z.enum(["auto", "ask"]).optional(),
  defaultWorkspace: z.string().optional(),
});

/** 사이트 설정 저장 (profiles.settings 에 병합). 빈 문자열은 삭제로 처리 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: profile } = await sb.from("profiles").select("settings").eq("id", user.id).maybeSingle();
  const merged: Record<string, unknown> = { ...(profile?.settings ?? {}) };
  for (const [k, v] of Object.entries(body.data)) {
    if (v === undefined) continue;
    if (v === "") delete merged[k]; else merged[k] = v;
  }
  await sb.from("profiles").update({ settings: merged }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
