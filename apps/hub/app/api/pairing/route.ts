import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { sixDigits } from "@/lib/agent-auth";

/** 디바이스 추가용 6자리 코드 발급 (10분) */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const code = sixDigits();
  await supabaseAdmin().from("pairing_codes").insert({ code, user_id: user.id, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
  return NextResponse.json({ code, expiresInSec: 600 });
}
