import type { Job, JobEvent, StepName, StackInfo } from "@everygithub/protocol";

/** 스텝 간에 공유되는 실행 컨텍스트. 각 스텝은 여기에 결과를 채워 넣는다. */
export interface RunContext {
  job: Job;
  workspacePath: string;
  /** clone 스텝이 채움 */
  localPath?: string;
  /** analyze 스텝이 채움 */
  stack?: StackInfo;
  license?: string | null;
  tree?: string;
  /** summary/docs 스텝이 채움 (kind → markdown) */
  artifacts: Record<string, string>;
  /** AI 키. 없으면 AI 스텝은 건너뜀 */
  anthropicApiKey?: string;
  emit: (e: Omit<JobEvent, "jobId" | "ts">) => void;
}

export interface Step {
  name: StepName;
  /** true 를 반환하면 다음 스텝으로, 예외를 던지면 잡 실패 */
  run(ctx: RunContext): Promise<void>;
}

export function log(ctx: RunContext, step: StepName, message: string) {
  ctx.emit({ step, level: "log", payload: { message } });
}
