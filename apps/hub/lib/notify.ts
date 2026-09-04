import { sendTelegram } from "./telegram";

/** 잡이 끝나면 잡을 만든 채널로 결과를 돌려보낸다 */
export async function notifyJobDone(job: any, status: "done" | "failed", error?: string, summary?: string) {
  const origin = job.origin as { channel: string; chatId?: string };
  const hub = process.env.HUB_URL ?? "";
  const link = job.repo_id ? `${hub}/repos/${job.repo_id}` : `${hub}/dashboard`;
  const text = status === "done"
    ? `✔ 완료 — ${job.source.owner}/${job.source.name}\n${link}\n\n${(summary ?? "").slice(0, 2500)}`
    : `✖ 실패 — ${job.source.owner}/${job.source.name}\n${error ?? ""}`;
  if (origin.channel === "telegram" && origin.chatId && process.env.TELEGRAM_BOT_TOKEN) {
    await sendTelegram(origin.chatId, text);
  }
  // slack / discord 어댑터는 이후 단계에서 여기에 추가
}
