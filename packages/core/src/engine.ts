import { AI_STEPS, type Job, type JobEvent, type StepName } from "@everygithub/protocol";
import type { RunContext, Step } from "./context";
import { cloneStep } from "./steps/clone";
import { analyzeStep } from "./steps/analyze";
import { summaryStep } from "./steps/summary";

const REGISTRY: Partial<Record<StepName, Step>> = {
  clone: cloneStep,
  analyze: analyzeStep,
  summary: summaryStep,
  // docs / install / test / dev / skill / mcp / claude_md / obsidian / archive → 다음 단계에서 추가
};

export interface EngineOptions {
  workspacePath: string;
  anthropicApiKey?: string;
  onEvent: (e: JobEvent) => void;
}

/** 잡의 steps 를 순서대로 실행한다. 미구현 스텝·AI 스텝(키 없음)은 skipped 로 남기고 계속 간다. */
export async function runJob(job: Job, opts: EngineOptions): Promise<RunContext> {
  const ctx: RunContext = {
    job,
    workspacePath: opts.workspacePath,
    artifacts: {},
    anthropicApiKey: opts.anthropicApiKey,
    emit: (e) => opts.onEvent({ ...e, jobId: job.id, ts: new Date().toISOString() }),
  };

  for (const name of job.steps) {
    const step = REGISTRY[name];
    if (!step) {
      ctx.emit({ step: name, level: "skipped", payload: { reason: "not_implemented" } });
      continue;
    }
    if (AI_STEPS.includes(name) && !ctx.anthropicApiKey) {
      ctx.emit({ step: name, level: "skipped", payload: { reason: "no_api_key" } });
      continue;
    }
    ctx.emit({ step: name, level: "progress", payload: { state: "start" } });
    await step.run(ctx);
    ctx.emit({ step: name, level: "progress", payload: { state: "end" } });
  }
  return ctx;
}
