import { z } from "zod";
import { Source } from "./source";

export const StepName = z.enum([
  "clone", "analyze", "summary", // 기본층 (AI 키 불필요)
  "docs", "install", "test", "dev", // docs는 AI층, 나머지는 기본층
  "skill", "mcp", "claude_md", "obsidian", "archive",
  "open", "remove", "pick_folder", // 로컬 명령: 탐색기로 폴더 열기 / 로컬 폴더 삭제 (clone 불필요, options.targetDir 사용)
]);
export type StepName = z.infer<typeof StepName>;

/** AI 키가 있어야 실행되는 스텝. 키 없으면 에이전트가 건너뛰고 'skipped' 이벤트를 남긴다. */
export const AI_STEPS: StepName[] = ["docs", "claude_md"];

export const Pipeline = z.enum(["quick", "docs", "full", "skill", "custom"]);
export type Pipeline = z.infer<typeof Pipeline>;

export const PIPELINE_STEPS: Record<Pipeline, StepName[]> = {
  quick: ["clone", "analyze", "summary"],
  docs: ["clone", "analyze", "summary", "docs", "archive"],
  full: ["clone", "analyze", "summary", "docs", "install", "test", "archive"],
  skill: ["clone", "analyze", "summary", "skill"],
  custom: [],
};

export const JobStatus = z.enum(["queued", "running", "waiting_approval", "done", "failed", "cancelled"]);
export type JobStatus = z.infer<typeof JobStatus>;

export const Channel = z.enum(["web", "telegram", "slack", "discord", "cli"]);
export type Channel = z.infer<typeof Channel>;

export const JobOrigin = z.object({
  channel: Channel,
  chatId: z.string().optional(),
  messageId: z.string().optional(),
});
export type JobOrigin = z.infer<typeof JobOrigin>;

export const JobOptions = z.object({
  targetDir: z.string().optional(),
  shallow: z.boolean().default(true),
  lang: z.enum(["ko", "en"]).default("ko"),
  approve: z.enum(["auto", "ask"]).default("ask"),
});
export type JobOptions = z.infer<typeof JobOptions>;

export const Job = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceId: z.string().uuid(),
  repoId: z.string().uuid().nullable().optional(),
  source: Source,
  pipeline: Pipeline,
  steps: z.array(StepName),
  options: JobOptions,
  status: JobStatus,
  origin: JobOrigin,
  createdAt: z.string(),
  finishedAt: z.string().nullable().optional(),
});
export type Job = z.infer<typeof Job>;

export const JobEventLevel = z.enum(["log", "progress", "result", "error", "approval", "skipped"]);
export const JobEvent = z.object({
  jobId: z.string().uuid(),
  step: StepName,
  level: JobEventLevel,
  payload: z.record(z.unknown()),
  ts: z.string(),
});
export type JobEvent = z.infer<typeof JobEvent>;

/** 채널 어댑터 → 허브 잡 생성 요청 (허브가 id/userId/deviceId를 채운다) */
export const CreateJobInput = z.object({
  url: z.string(),
  pipeline: Pipeline.default("quick"),
  steps: z.array(StepName).optional(),
  options: JobOptions.partial().optional(),
  origin: JobOrigin,
  deviceId: z.string().uuid().optional(),
});
export type CreateJobInput = z.infer<typeof CreateJobInput>;
