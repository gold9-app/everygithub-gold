/**
 * Anthropic Messages API 호출 (SDK 없이 fetch). 사용자 키로 사용자 PC 에서만 호출된다.
 */
export const DEFAULT_MODEL = "claude-sonnet-4-5";

export interface AiOptions { apiKey: string; model?: string; maxTokens?: number; system?: string }

export async function askClaude(prompt: string, opts: AiOptions): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? 6000,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let msg = `Anthropic API ${res.status}`;
    try { msg += ": " + (JSON.parse(body).error?.message ?? body.slice(0, 300)); } catch { msg += ": " + body.slice(0, 300); }
    if (res.status === 401) msg = "Claude API 키가 올바르지 않습니다 (401). 설정 → AI 에서 키를 확인하세요.";
    if (res.status === 429) msg = "Claude API 사용량 한도(429). 잠시 후 다시 시도하세요.";
    throw new Error(msg);
  }
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n").trim();
}

/** 코드펜스로 감싸 돌아온 마크다운을 벗긴다 */
export function stripFence(md: string) {
  const m = md.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/);
  return m ? m[1] : md;
}
