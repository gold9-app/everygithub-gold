import { AI_STEPS, type Job, type JobEvent, type StepName } from "@everygithub/protocol";
import type { RunContext, Step } from "./context";
import { cloneStep } from "./steps/clone";
import { analyzeStep } from "./steps/analyze";
import { summaryStep } from "./steps/summary";
import { openStep, removeStep, pickFolderStep, listDirsStep } from "./steps/local";
import { docsStep } from "./steps/docs";
import { skillStep, claudeMdStep, mcpStep } from "./steps/claude";
import { installStep, testStep } from "./steps/exec";

const REGISTRY: Partial<Record<StepName, Step>> = {
  clone: cloneStep,
  analyze: analyzeStep,
  summary: summaryStep,
  open: openStep,
  remove: removeStep,
  pick_folder: pickFolderStep,
  list_dirs: listDirsStep,
  docs: docsStep,
  skill: skillStep,
  claude_md: claudeMdStep,
  mcp: mcpStep,
  install: installStep,
  test: testStep,
  // dev / obsidian / archive → 이후 단계
};

export interface EngineOptions {
  workspacePath: string;
  anthropicApiKey?: string;
  approvePolicy?: "auto" | "ask";
  onEvent: (e: JobEvent) => void;
}

/** 잡의 steps 를 순서대로 실행한다. 미구현 스텝·AI 스텝(키 없음)은 skipped 로 남기고 계속 간다. */
export async function runJob(job: Job, opts: EngineOptions): Promise<RunContext> {
  const ctx: RunContext = {
    job,
    workspacePath: opts.workspacePath,
    artifacts: {},
    anthropicApiKey: opts.anthropicApiKey,
    approvePolicy: opts.approvePolicy ?? "ask",
    emit: (e) => opts.onEvent({ ...e, jobId: job.id, ts: new Date().toISOString() }),
  };

  // clone 없이 로컬 명령만 실행하는 잡은 options.targetDir 가 대상 경로
  if (!job.steps.includes("clone") && job.options.targetDir) ctx.localPath = job.options.targetDir;

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
