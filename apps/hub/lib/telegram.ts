import { Bot, InlineKeyboard } from "grammy";
import { extractGithubUrl, type Pipeline } from "@everygithub/protocol";
import { supabaseAdmin } from "./supabase";
import { createJob } from "./jobs";

let bot: Bot | null = null;

/** 텔레그램 봇 (웹훅 모드). 배포자가 BotFather 토큰 하나만 등록하면 모든 사용자가 공유 */
export function getBot() {
  if (bot) return bot;
  bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
  const sb = supabaseAdmin();

  const userByChat = async (chatId: string) => {
    const { data } = await sb.from("profiles").select("id").eq("telegram_chat_id", chatId).maybeSingle();
    return data?.id ?? null;
  };

  bot.command("start", async (ctx) => {
    const userId = await userByChat(String(ctx.chat.id));
    if (userId) return ctx.reply("연결돼 있습니다. 깃허브 링크를 보내면 PC 에 클론합니다.");
    await ctx.reply("사이트에서 [텔레그램 연결] 을 눌러 받은 6자리 코드를 보내주세요.");
  });

  bot.command("status", async (ctx) => {
    const userId = await userByChat(String(ctx.chat.id));
    if (!userId) return ctx.reply("먼저 연결 코드를 보내주세요.");
    const { data } = await sb.from("devices").select("name,last_seen").eq("user_id", userId).order("last_seen", { ascending: false });
    if (!data?.length) return ctx.reply("연결된 디바이스가 없습니다.");
    await ctx.reply(data.map((d) => `• ${d.name} — 마지막 접속 ${d.last_seen ?? "없음"}`).join("\n"));
  });

  bot.on("message:text", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const text = ctx.message.text.trim();
    let userId = await userByChat(chatId);

    // 연결 코드
    if (!userId && /^\d{6}$/.test(text)) {
      const { data: code } = await sb.from("channel_link_codes").select("*").eq("code", text).eq("channel", "telegram").is("used_at", null).maybeSingle();
      if (!code || new Date(code.expires_at) < new Date()) return ctx.reply("코드가 없거나 만료됐습니다.");
      await sb.from("profiles").update({ telegram_chat_id: chatId }).eq("id", code.user_id);
      await sb.from("channel_link_codes").update({ used_at: new Date().toISOString() }).eq("code", text);
      return ctx.reply("✔ 연결 완료. 이제 깃허브 링크를 보내면 됩니다.");
    }
    if (!userId) return ctx.reply("먼저 사이트에서 발급한 6자리 연결 코드를 보내주세요.");

    const url = extractGithubUrl(text);
    if (!url) return ctx.reply("깃허브 링크를 찾지 못했습니다.");

    // 파이프라인 선택 버튼
    const kb = new InlineKeyboard()
      .text("빠른 분석", `run:quick:${encodeURIComponent(url)}`)
      .text("설명서까지", `run:docs:${encodeURIComponent(url)}`).row()
      .text("설치+테스트", `run:full:${encodeURIComponent(url)}`)
      .text("스킬 등록", `run:skill:${encodeURIComponent(url)}`);
    await ctx.reply(`어떻게 처리할까요?\n${url}`, { reply_markup: kb });
  });

  bot.callbackQuery(/^run:(quick|docs|full|skill):(.+)$/, async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const userId = await userByChat(chatId);
    if (!userId) return ctx.answerCallbackQuery({ text: "연결이 필요합니다" });
    const pipeline = ctx.match[1] as Pipeline;
    const url = decodeURIComponent(ctx.match[2]);
    try {
      const job = await createJob(userId, { url, pipeline, origin: { channel: "telegram", chatId, messageId: String(ctx.callbackQuery.message?.message_id ?? "") } });
      await ctx.editMessageText(`⏳ 잡 생성됨 (${pipeline})\n${url}\n#${job.id.slice(0, 8)}`);
    } catch (err) {
      await ctx.editMessageText(`✖ ${(err as Error).message}`);
    }
    await ctx.answerCallbackQuery();
  });

  return bot;
}

export async function sendTelegram(chatId: string, text: string) {
  await getBot().api.sendMessage(chatId, text.slice(0, 4000), { parse_mode: "Markdown" }).catch(async () => {
    await getBot().api.sendMessage(chatId, text.slice(0, 4000));
  });
}
