import { NextResponse } from "next/server";
import { z } from "zod";
import { Pipeline } from "@everygithub/protocol";
import { currentUser } from "@/lib/supabase";
import { createJob } from "@/lib/jobs";

const Body = z.object({ url: z.string(), pipeline: Pipeline.default("quick"), deviceId: z.string().uuid().optional() });

/** 웹 대시보드에서 링크 제출 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  try {
    const job = await createJob(user.id, { ...body.data, origin: { channel: "web" } });
    return NextResponse.json({ id: job.id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
