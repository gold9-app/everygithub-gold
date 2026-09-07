import { sendTelegram } from "./telegram";

/** 잡이 끝나면 잡을 만든 채널로 결과를 돌려보낸다 */
export async function notifyJobDone(job: any, status: "done" | "failed", error?: string, summary?: string, skipped: { step: string; reason: string }[] = []) {
  if (job.pipeline === "custom" && (job.steps as string[]).every((s) => ["open", "remove", "pick_folder", "list_dirs"].includes(s))) return; // 로컬 명령은 알림 없음
  const origin = job.origin as { channel: string; chatId?: string };
  const hub = process.env.HUB_URL ?? "";
  const link = job.repo_id ? `${hub}/app/repos/${job.repo_id}` : `${hub}/app`;
  const skipNote = skipped.filter((s) => s.reason !== "cancelled").map((s) => `↷ ${s.step} 건너뜀 (${s.reason === "no_api_key" ? "AI 키 없음" : s.reason === "needs_approval" ? "확인 필요" : s.reason})`).join("\n");
  const text = status === "done"
    ? `✔ 완료 — ${job.source.owner}/${job.source.name}\n${link}\n${skipNote ? skipNote + "\n" : ""}\n${(summary ?? "").slice(0, 2500)}`
    : `✖ 실패 — ${job.source.owner}/${job.source.name}\n${error ?? ""}`;
  if (origin.channel === "telegram" && origin.chatId && process.env.TELEGRAM_BOT_TOKEN) {
    await sendTelegram(origin.chatId, text);
  }
  // slack / discord 어댑터는 이후 단계에서 여기에 추가
}
