import { webhookCallback } from "grammy";
import { getBot } from "@/lib/telegram";

export const dynamic = "force-dynamic";
const handler = () => webhookCallback(getBot(), "std/http", { secretToken: process.env.TELEGRAM_WEBHOOK_SECRET });
export const POST = (req: Request) => handler()(req);
