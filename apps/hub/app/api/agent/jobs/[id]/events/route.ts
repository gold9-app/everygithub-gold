import { NextResponse } from "next/server";
import { z } from "zod";
import { JobEvent } from "@everygithub/protocol";
import { authDevice } from "@/lib/agent-auth";
import { supabaseAdmin } from "@/lib/supabase";

const Body = z.object({ events: z.array(JobEvent) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const device = await authDevice(req);
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: job } = await sb.from("jobs").select("id").eq("id", id).eq("device_id", device.id).maybeSingle();
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });
  await sb.from("job_events").insert(body.data.events.map((e) => ({ job_id: id, step: e.step, level: e.level, payload: e.payload, ts: e.ts })));
  return NextResponse.json({ ok: true });
}
