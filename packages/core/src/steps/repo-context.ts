import { promises as fs } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import type { RunContext } from "../context";

/** AI 스텝이 공통으로 쓰는 레포 컨텍스트 (README, 매니페스트, 트리, 스택) */
export async function collectRepoContext(ctx: RunContext) {
  const root = analysisRoot(ctx);
  const readme = await readFirst(root, ["README.md", "readme.md", "README.MD", "Readme.md", "README.rst", "README.txt", "README"]);
  const pkg = await readFirst(root, ["package.json"]);
  const pyproject = await readFirst(root, ["pyproject.toml"]);
  const cargo = await readFirst(root, ["Cargo.toml"]);
  const compose = await readFirst(root, ["docker-compose.yml", "compose.yaml"]);
  const envExample = await readFirst(root, [".env.example", ".env.sample"]);
  const docs = await fg(["docs/**/*.md", "doc/**/*.md"], { cwd: root, onlyFiles: true }).then((l) => l.slice(0, 5));
  let docsText = "";
  for (const d of docs) docsText += `\n\n--- ${d} ---\n` + (await fs.readFile(path.join(root, d), "utf8")).slice(0, 4000);
  const { source } = ctx.job;
  return {
    root,
    repoName: `${source.owner}/${source.name}`,
    url: source.url,
    readme: clip(readme, 40_000),
    manifest: clip(pkg ?? pyproject ?? cargo ?? "", 6_000),
    compose: clip(compose ?? "", 3_000),
    envExample: clip(envExample ?? "", 2_000),
    docsText: clip(docsText, 12_000),
    tree: ctx.tree ?? "",
    stack: ctx.stack,
    license: ctx.license ?? null,
  };
}

export function analysisRoot(ctx: RunContext) {
  const { source } = ctx.job;
  if (!ctx.localPath) throw new Error("clone 스텝이 먼저 실행되어야 합니다");
  return source.kind === "subdir" && source.path ? path.join(ctx.localPath, source.path) : ctx.localPath;
}

async function readFirst(root: string, names: string[]) {
  for (const n of names) { try { return await fs.readFile(path.join(root, n), "utf8"); } catch {} }
  return null;
}
const clip = (s: string | null, n: number) => (s ?? "").length > n ? (s ?? "").slice(0, n) + "\n…(생략)" : (s ?? "");

export function contextBlock(c: Awaited<ReturnType<typeof collectRepoContext>>) {
  return [
    `# 레포: ${c.repoName}`, `URL: ${c.url}`, `라이선스: ${c.license ?? "없음"}`,
    `스택: ${JSON.stringify({ languages: c.stack?.languages, framework: c.stack?.framework, packageManager: c.stack?.packageManager, runtime: c.stack?.runtime, scripts: c.stack?.scripts, isMcpServer: c.stack?.isMcpServer, isClaudeSkill: c.stack?.isClaudeSkill, hasTests: c.stack?.hasTests, hasDocker: c.stack?.hasDocker, envKeys: c.stack?.envKeys })}`,
    "", "## 폴더 구조", "```", c.tree, "```",
    c.manifest ? "\n## 매니페스트 (package.json / pyproject 등)\n```\n" + c.manifest + "\n```" : "",
    c.envExample ? "\n## .env.example\n```\n" + c.envExample + "\n```" : "",
    c.compose ? "\n## docker compose\n```\n" + c.compose + "\n```" : "",
    "\n## README 원문\n" + (c.readme || "(README 없음)"),
    c.docsText ? "\n## docs/ 발췌" + c.docsText : "",
  ].join("\n");
}
