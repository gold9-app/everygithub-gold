import { z } from "zod";

export const PackageManager = z.enum(["pnpm", "npm", "yarn", "bun", "pip", "uv", "poetry", "cargo", "go", "unknown"]);
export type PackageManager = z.infer<typeof PackageManager>;

export const StackInfo = z.object({
  languages: z.array(z.string()),
  packageManager: PackageManager,
  framework: z.string().optional(),
  runtime: z.string().optional(), // "node>=20", "python>=3.11"
  scripts: z.record(z.string()).optional(),
  hasDocker: z.boolean(),
  hasTests: z.boolean(),
  isMcpServer: z.boolean(),
  isClaudeSkill: z.boolean(),
  installScripts: z.array(z.string()), // postinstall 등 경고 대상
  fileCount: z.number(),
  envKeys: z.array(z.string()), // process.env.X / os.environ["X"] 에서 추출
});
export type StackInfo = z.infer<typeof StackInfo>;

export const RepoRecord = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceId: z.string().uuid(),
  url: z.string(),
  owner: z.string(),
  name: z.string(),
  ref: z.string().nullable(),
  localPath: z.string(),
  stack: StackInfo.nullable(),
  license: z.string().nullable(),
  stars: z.number().nullable(),
  tags: z.array(z.string()),
  clonedAt: z.string(),
  updatedAt: z.string(),
});
export type RepoRecord = z.infer<typeof RepoRecord>;

export const ArtifactKind = z.enum(["summary", "docs_ko", "tree", "env_example", "skill_md", "claude_md", "test_report"]);
export type ArtifactKind = z.infer<typeof ArtifactKind>;

export const Artifact = z.object({
  id: z.string().uuid(),
  repoId: z.string().uuid(),
  jobId: z.string().uuid(),
  kind: ArtifactKind,
  content: z.string(),
  shareToken: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type Artifact = z.infer<typeof Artifact>;
