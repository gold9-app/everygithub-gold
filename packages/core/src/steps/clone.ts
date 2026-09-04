import { promises as fs } from "node:fs";
import path from "node:path";
import { simpleGit } from "simple-git";
import type { Step } from "../context";
import { log } from "../context";

/** 워크스페이스 안의 목적지: {workspace}/{owner}/{repo}. targetDir 옵션이 있으면 그대로 사용 */
export function resolveTargetDir(workspace: string, owner: string, name: string, targetDir?: string) {
  if (targetDir) return path.resolve(targetDir);
  return path.join(workspace, safe(owner), safe(name));
}
const safe = (s: string) => s.replace(/[<>:"/\\|?*]/g, "_");

async function exists(p: string) {
  try { await fs.access(p); return true; } catch { return false; }
}

export const cloneStep: Step = {
  name: "clone",
  async run(ctx) {
    const { source, options } = ctx.job;
    const dest = resolveTargetDir(ctx.workspacePath, source.owner, source.name, options.targetDir);
    ctx.localPath = dest;

    const repoUrl = source.kind === "gist"
      ? `https://gist.github.com/${source.gistId}.git`
      : `https://github.com/${source.owner}/${source.name}.git`;

    if (await exists(path.join(dest, ".git"))) {
      log(ctx, "clone", `이미 클론됨 → pull: ${dest}`);
      const git = simpleGit(dest);
      const status = await git.status();
      if (!status.isClean()) {
        log(ctx, "clone", "로컬 변경사항이 있어 pull 을 건너뜁니다 (수동 확인 필요)");
      } else {
        await git.pull();
      }
      ctx.emit({ step: "clone", level: "result", payload: { localPath: dest, mode: "pull" } });
      return;
    }

    await fs.mkdir(path.dirname(dest), { recursive: true });
    const args: string[] = [];
    if (options.shallow && source.kind !== "commit") args.push("--depth", "1");
    if (source.ref && source.kind !== "commit" && source.kind !== "pr") args.push("--branch", source.ref);
    if (source.kind === "subdir") args.push("--filter=blob:none", "--sparse");

    log(ctx, "clone", `git clone ${args.join(" ")} ${repoUrl} → ${dest}`);
    const git = simpleGit();
    await git.clone(repoUrl, dest, args);
    const repo = simpleGit(dest);

    if (source.kind === "subdir" && source.path) {
      await repo.raw(["sparse-checkout", "set", source.path]);
      log(ctx, "clone", `sparse-checkout: ${source.path}`);
    }
    if (source.kind === "pr" && source.prNumber) {
      const branch = `pr-${source.prNumber}`;
      await repo.fetch("origin", `pull/${source.prNumber}/head:${branch}`);
      await repo.checkout(branch);
      log(ctx, "clone", `PR #${source.prNumber} 체크아웃 (${branch})`);
    }
    if (source.kind === "commit" && source.ref) {
      await repo.checkout(source.ref);
      log(ctx, "clone", `commit ${source.ref} 체크아웃`);
    }
    ctx.emit({ step: "clone", level: "result", payload: { localPath: dest, mode: "clone" } });
  },
};
