import pc from "picocolors";
import { runJob } from "@everygithub/core";
import type { Job, JobEvent } from "@everygithub/protocol";
import type { HubClient } from "./hub-client";

export interface RunSettings { workspacePath: string; anthropicApiKey?: string }

function printEvent(e: JobEvent) {
  const tag = pc.dim(`[${e.step}]`);
  switch (e.level) {
    case "log": console.log(tag, (e.payload as any).message); break;
    case "progress": break;
    case "skipped": console.log(tag, pc.yellow(`건너뜀 (${(e.payload as any).reason})`)); break;
    case "error": console.log(tag, pc.red(String((e.payload as any).message))); break;
    case "result": if (e.step === "summary") console.log("\n" + (e.payload as any).summary + "\n"); break;
  }
}

/** 잡 하나를 실행하고 결과를 허브(있으면)와 콘솔에 보고 */
export async function executeJob(job: Job, cfg: RunSettings, hub?: HubClient) {
  console.log(pc.cyan(`▶ ${job.pipeline}: ${job.source.url}`));
  const buffer: JobEvent[] = [];
  let flushTimer: NodeJS.Timeout | null = null;
  const flush = async () => {
    if (!hub || buffer.length === 0) return;
    const batch = buffer.splice(0, buffer.length);
    try { await hub.pushEvents(job.id, batch); } catch (err) { console.error(pc.red("이벤트 전송 실패"), err); }
  };

  try {
    const ctx = await runJob(job, {
      workspacePath: cfg.workspacePath,
      anthropicApiKey: cfg.anthropicApiKey,
      onEvent: (e) => {
        printEvent(e);
        buffer.push(e);
        if (!flushTimer) flushTimer = setTimeout(() => { flushTimer = null; void flush(); }, 500);
      },
    });
    await flush();
    await hub?.complete(job.id, {
      status: "done",
      repo: ctx.localPath ? { localPath: ctx.localPath, stack: ctx.stack ?? null, license: ctx.license ?? null, ref: job.source.ref ?? null } : undefined,
      artifacts: ctx.artifacts,
    });
    console.log(pc.green("✔ 완료"));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(pc.red("✖ 실패:"), message);
    buffer.push({ jobId: job.id, step: job.steps[0], level: "error", payload: { message }, ts: new Date().toISOString() });
    await flush();
    await hub?.complete(job.id, { status: "failed", error: message });
  }
}
