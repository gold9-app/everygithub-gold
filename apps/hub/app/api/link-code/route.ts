import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { sixDigits } from "@/lib/agent-auth";

/** 텔레그램 등 채널 연결 코드 발급 (10분) */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { channel = "telegram" } = await req.json().catch(() => ({}));
  const code = sixDigits();
  await supabaseAdmin().from("channel_link_codes").insert({ code, user_id: user.id, channel, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
  return NextResponse.json({ code, botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "" });
}
