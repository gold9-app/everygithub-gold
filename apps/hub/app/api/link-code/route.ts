import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { randomBytes } from "node:crypto";

/** 텔레그램 등 채널 연결 코드 발급 (10분) */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { channel = "telegram" } = await req.json().catch(() => ({}));
  // 텔레그램 딥링크 payload 는 영숫자/_/- 만 허용 → 랜덤 토큰
  const code = "tg" + randomBytes(12).toString("hex");
  await supabaseAdmin().from("channel_link_codes").insert({ code, user_id: user.id, channel, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";
  return NextResponse.json({ code, botUsername, deepLink: botUsername ? `https://t.me/${botUsername}?start=${code}` : null });
}
