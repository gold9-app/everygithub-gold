import { promises as fs } from "node:fs";
import path from "node:path";
import { execa } from "execa";
import type { Step, RunContext } from "../context";
import { log } from "../context";
import { askClaude } from "../ai";
import { analysisRoot } from "./repo-context";

async function exists(p: string) { try { await fs.access(p); return true; } catch { return false; } }

/** 남의 코드를 실행하는 스텝은 승인 정책을 따른다: 잡이 명시적으로 auto 가 아니고 설정이 ask 면 건너뜀 */
function needsApproval(ctx: RunContext) {
  return ctx.job.options.approve !== "auto" && ctx.approvePolicy === "ask";
}

function installCommand(pm: string | undefined, root: string): { cmd: string; args: string[] } | null {
  switch (pm) {
    case "pnpm": return { cmd: "pnpm", args: ["install"] };
    case "yarn": return { cmd: "yarn", args: ["install"] };
    case "bun": return { cmd: "bun", args: ["install"] };
    case "npm": return { cmd: "npm", args: ["install"] };
    case "uv": return { cmd: "uv", args: ["sync"] };
    case "poetry": return { cmd: "poetry", args: ["install"] };
    case "pip": return { cmd: "pip", args: ["install", "-r", "requirements.txt"] };
    case "cargo": return { cmd: "cargo", args: ["build"] };
    case "go": return { cmd: "go", args: ["mod", "download"] };
    default: return null;
  }
}

async function run(ctx: RunContext, step: "install" | "test", cmd: string, args: string[], cwd: string, timeoutMs: number) {
  log(ctx, step, `$ ${cmd} ${args.join(" ")}`);
  const r = await execa(cmd, args, { cwd, reject: false, timeout: timeoutMs, all: true, windowsHide: true, env: { ...process.env, CI: "1", FORCE_COLOR: "0" }, shell: process.platform === "win32" });
  const out = (r.all ?? "").toString();
  const tail = out.split(/\r?\n/).slice(-60).join("\n");
  for (const line of tail.split("\n").slice(-12)) if (line.trim()) log(ctx, step, line.slice(0, 300));
  return { code: r.exitCode ?? -1, out, timedOut: r.timedOut };
}

export const installStep: Step = {
  name: "install",
  async run(ctx) {
    if (needsApproval(ctx)) { ctx.emit({ step: "install", level: "skipped", payload: { reason: "needs_approval" } }); return; }
    const root = analysisRoot(ctx);
    const pm = ctx.stack?.packageManager;
    const ic = installCommand(pm, root);
    if (!ic) { ctx.emit({ step: "install", level: "skipped", payload: { reason: "no_package_manager" } }); return; }
    if (pm === "pip" && !(await exists(path.join(root, "requirements.txt")))) { ic.args = ["install", "-e", "."]; }
    const r = await run(ctx, "install", ic.cmd, ic.args, root, 15 * 60_000);
    if (r.code !== 0) throw new Error(`설치 실패 (${ic.cmd} exit ${r.code}${r.timedOut ? ", 타임아웃" : ""})\n` + r.out.split(/\r?\n/).slice(-8).join("\n"));
    // TS 레포면 build 스크립트도 시도 (MCP 진입점 등)
    if (ctx.stack?.scripts?.build && ["npm", "pnpm", "yarn", "bun"].includes(pm ?? "")) {
      const b = await run(ctx, "install", pm === "npm" ? "npm" : pm!, ["run", "build"], root, 10 * 60_000);
      if (b.code !== 0) log(ctx, "install", "⚠ build 실패 (설치는 완료)");
    }
    ctx.emit({ step: "install", level: "result", payload: { command: `${ic.cmd} ${ic.args.join(" ")}` } });
  },
};

export const testStep: Step = {
  name: "test",
  async run(ctx) {
    if (needsApproval(ctx)) { ctx.emit({ step: "test", level: "skipped", payload: { reason: "needs_approval" } }); return; }
    const root = analysisRoot(ctx);
    const pm = ctx.stack?.packageManager;
    let cmd = "", args: string[] = [];
    if (ctx.stack?.scripts?.test && ["npm", "pnpm", "yarn", "bun"].includes(pm ?? "")) { cmd = pm === "npm" ? "npm" : pm!; args = ["test", "--silent"]; }
    else if (pm === "uv") { cmd = "uv"; args = ["run", "pytest", "-q"]; }
    else if (pm === "poetry") { cmd = "poetry"; args = ["run", "pytest", "-q"]; }
    else if (pm === "pip") { cmd = "python"; args = ["-m", "pytest", "-q"]; }
    else if (pm === "cargo") { cmd = "cargo"; args = ["test"]; }
    else if (pm === "go") { cmd = "go"; args = ["test", "./..."]; }
    if (!cmd) { ctx.emit({ step: "test", level: "skipped", payload: { reason: "no_test_command" } }); return; }
    const r = await run(ctx, "test", cmd, args, root, 15 * 60_000);
    const ok = r.code === 0;
    const rawTail = r.out.split(/\r?\n/).slice(-80).join("\n");
    let report = `# 테스트 결과: ${ok ? "✅ 통과" : "❌ 실패"}\n- 명령: \`${cmd} ${args.join(" ")}\`\n- 종료 코드: ${r.code}${r.timedOut ? " (타임아웃)" : ""}\n\n\`\`\`\n${rawTail}\n\`\`\``;
    if (ctx.anthropicApiKey) {
      try {
        const summary = await askClaude(`아래는 ${ctx.job.source.owner}/${ctx.job.source.name} 레포의 테스트 출력입니다. 결과를 한국어로 5줄 이내로 요약하고, 실패가 있으면 원인 후보와 다음 조치를 적으세요. 마크다운, 코드펜스로 전체를 감싸지 마세요.\n\n명령: ${cmd} ${args.join(" ")}\n종료 코드: ${r.code}\n\n${rawTail.slice(0, 12_000)}`, { apiKey: ctx.anthropicApiKey, maxTokens: 800 });
        report = `# 테스트 결과: ${ok ? "✅ 통과" : "❌ 실패"}\n\n${summary}\n\n---\n- 명령: \`${cmd} ${args.join(" ")}\` · 종료 코드 ${r.code}\n\n\`\`\`\n${rawTail}\n\`\`\``;
      } catch (e) { log(ctx, "test", "AI 요약 실패: " + (e as Error).message); }
    }
    ctx.artifacts.test_report = report;
    ctx.emit({ step: "test", level: "result", payload: { ok, code: r.code } });
  },
};
