import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { currentUser, supabaseServer } from "@/lib/supabase";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const token = randomBytes(12).toString("hex");
  const sb = await supabaseServer();
  const { error } = await sb.from("artifacts").update({ share_token: token }).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ token });
}
