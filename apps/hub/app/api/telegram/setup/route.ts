import { NextResponse } from "next/server";
import { getBot } from "@/lib/telegram";

/** 배포 후 한 번 호출: GET /api/telegram/setup?key=<TELEGRAM_WEBHOOK_SECRET> → 웹훅 등록 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key || key !== process.env.TELEGRAM_WEBHOOK_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const hub = (process.env.HUB_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  const url = `${hub}/api/telegram`;
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const tokenShape = token ? `${token.length}자, ${/^\d+:[A-Za-z0-9_-]{30,}$/.test(token) ? "형식 정상" : "형식 이상"}` : "없음";
  try {
    const bot = getBot();
    const me = await bot.api.getMe();
    await bot.api.setWebhook(url, { secret_token: process.env.TELEGRAM_WEBHOOK_SECRET });
    await bot.api.setMyCommands([{ command: "start", description: "연결/안내" }, { command: "status", description: "디바이스 상태" }]);
    return NextResponse.json({ ok: true, bot: me.username, webhook: url });
  } catch (err: any) {
    // 원인을 바로 보이게: 토큰 형식/길이와 텔레그램 쪽 응답 (토큰 값 자체는 노출하지 않음)
    return NextResponse.json({ ok: false, error: err?.description ?? err?.message ?? String(err), token: tokenShape, webhook: url }, { status: 500 });
  }
}
