import { NextResponse } from "next/server";
import { getBot } from "@/lib/telegram";

/** 배포 후 한 번 호출: GET /api/telegram/setup?key=<TELEGRAM_WEBHOOK_SECRET> → 웹훅 등록 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key || key !== process.env.TELEGRAM_WEBHOOK_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const url = `${process.env.HUB_URL}/api/telegram`;
  await getBot().api.setWebhook(url, { secret_token: process.env.TELEGRAM_WEBHOOK_SECRET });
  await getBot().api.setMyCommands([{ command: "start", description: "연결/안내" }, { command: "status", description: "디바이스 상태" }]);
  return NextResponse.json({ ok: true, webhook: url });
}
