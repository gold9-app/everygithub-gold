import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import type { Step } from "../context";
import { log } from "../context";
import { askClaude, stripFence } from "../ai";
import { collectRepoContext, contextBlock, analysisRoot } from "./repo-context";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const skillSlug = (owner: string, name: string) => `${owner}-${name}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");

async function exists(p: string) { try { await fs.access(p); return true; } catch { return false; } }
async function hasClaudeCli() { try { await execa("claude", ["--version"], { timeout: 8000 }); return true; } catch { return false; } }

/** 레포를 클로드코드 스킬로 등록: 레포에 SKILL.md 가 있으면 그대로, 없으면 생성(AI 있으면 AI, 없으면 템플릿) → ~/.claude/skills/<slug>/ */
export const skillStep: Step = {
  name: "skill",
  async run(ctx) {
    const c = await collectRepoContext(ctx);
    const { source } = ctx.job;
    const slug = skillSlug(source.owner, source.name);
    const dest = path.join(CLAUDE_DIR, "skills", slug);
    let skillMd: string;
    const own = path.join(c.root, "SKILL.md");
    if (await exists(own)) {
      skillMd = await fs.readFile(own, "utf8");
      log(ctx, "skill", "레포의 SKILL.md 를 그대로 등록합니다");
    } else if (ctx.anthropicApiKey) {
      log(ctx, "skill", "SKILL.md 생성 중 (AI)");
      const prompt = `${contextBlock(c)}

---
이 레포를 Claude Code 의 **스킬(SKILL.md)** 로 만드세요. 스킬은 Claude 가 "언제 이 도구를 써야 하는지"와 "어떻게 쓰는지"를 아는 짧은 지침서입니다.
형식 (그대로 지킬 것):
---
name: ${slug}
description: <한 줄. 어떤 요청이 오면 이 스킬을 써야 하는지 트리거 키워드를 포함해 200자 이내, 한국어>
---
# ${c.repoName}
## 언제 쓰나
## 설치 위치
- 로컬 경로: ${c.root}
## 실행 방법
- 실제 명령어 (README 근거). 설치가 필요하면 그 명령 먼저
## 자주 쓰는 패턴
- 3~5개 예시
## 주의
- 환경변수, 라이선스(${c.license ?? "없음"}), 제한사항
마크다운만 출력하고 코드펜스로 전체를 감싸지 마세요.`;
      skillMd = stripFence(await askClaude(prompt, { apiKey: ctx.anthropicApiKey, maxTokens: 3000 }));
    } else {
      log(ctx, "skill", "SKILL.md 템플릿 생성 (AI 키 없음)");
      const scripts = Object.entries(c.stack?.scripts ?? {}).map(([k, v]) => `- \`${c.stack?.packageManager ?? "npm"} run ${k}\` → ${v}`).join("\n");
      skillMd = `---
name: ${slug}
description: ${c.repoName} 레포를 사용할 때. 로컬 경로 ${c.root}. 관련 요청(${source.name})이 오면 이 스킬을 참고.
---
# ${c.repoName}
- 원본: ${c.url}
- 로컬 경로: \`${c.root}\`
- 스택: ${(c.stack?.languages ?? []).join(", ")} ${c.stack?.framework ?? ""} · ${c.stack?.packageManager ?? ""}
- 라이선스: ${c.license ?? "없음"}

## 스크립트
${scripts || "- (package.json scripts 없음)"}

## README 발췌
${c.readme.slice(0, 3000)}
`;
    }
    await fs.mkdir(dest, { recursive: true });
    await fs.writeFile(path.join(dest, "SKILL.md"), skillMd, "utf8");
    ctx.artifacts.skill_md = skillMd;
    log(ctx, "skill", `등록 완료: ${dest}`);
    ctx.emit({ step: "skill", level: "result", payload: { path: dest, slug } });
  },
};

/** 레포 폴더에 CLAUDE.md 생성 (AI) — 클로드코드가 바로 작업할 수 있는 컨텍스트 */
export const claudeMdStep: Step = {
  name: "claude_md",
  async run(ctx) {
    if (!ctx.anthropicApiKey) { ctx.emit({ step: "claude_md", level: "skipped", payload: { reason: "no_api_key" } }); return; }
    const c = await collectRepoContext(ctx);
    log(ctx, "claude_md", "CLAUDE.md 생성 중");
    const prompt = `${contextBlock(c)}

---
이 레포 루트에 둘 **CLAUDE.md** 를 작성하세요. Claude Code 가 이 프로젝트에서 작업할 때 읽는 파일입니다. 간결하게(120줄 이내), 사실만.
섹션: # 프로젝트 개요 / ## 구조(핵심 폴더·파일 역할) / ## 빌드·실행·테스트 명령 / ## 코딩 규칙(감지되면: 린터, 포맷터, 언어 버전) / ## 주의사항(환경변수, 외부 서비스, 하지 말아야 할 것).
마크다운만, 코드펜스로 전체를 감싸지 마세요.`;
    const md = stripFence(await askClaude(prompt, { apiKey: ctx.anthropicApiKey, maxTokens: 3000 }));
    const out = path.join(c.root, "CLAUDE.md");
    if (await exists(out)) { await fs.writeFile(path.join(c.root, "CLAUDE.everygithub.md"), md, "utf8"); log(ctx, "claude_md", "기존 CLAUDE.md 가 있어 CLAUDE.everygithub.md 로 저장"); }
    else { await fs.writeFile(out, md, "utf8"); log(ctx, "claude_md", `저장: ${out}`); }
    ctx.artifacts.claude_md = md;
    ctx.emit({ step: "claude_md", level: "result", payload: { chars: md.length } });
  },
};

/** MCP 서버 레포를 클로드코드에 등록. claude CLI 가 있으면 `claude mcp add`, 없으면 ~/.claude.json 직접 편집 */
export const mcpStep: Step = {
  name: "mcp",
  async run(ctx) {
    const root = analysisRoot(ctx);
    const { source } = ctx.job;
    const name = source.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const s = ctx.stack;
    let command = "", args: string[] = [];
    // 실행 명령 추론
    const pkgRaw = await fs.readFile(path.join(root, "package.json"), "utf8").catch(() => null);
    if (pkgRaw) {
      const pkg = JSON.parse(pkgRaw);
      const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin ? Object.values(pkg.bin)[0] as string : null;
      const entry = bin ?? pkg.main ?? (await exists(path.join(root, "dist", "index.js")) ? "dist/index.js" : null) ?? (await exists(path.join(root, "build", "index.js")) ? "build/index.js" : null);
      if (entry) { command = "node"; args = [path.join(root, entry)]; }
      else if (pkg.scripts?.start) { command = s?.packageManager === "pnpm" ? "pnpm" : "npm"; args = ["run", "start", "--prefix", root]; }
    } else if (await exists(path.join(root, "pyproject.toml"))) {
      command = await exists(path.join(root, "uv.lock")) ? "uv" : "python";
      args = command === "uv" ? ["--directory", root, "run", name] : ["-m", name.replace(/-/g, "_")];
    }
    if (!command) throw new Error("MCP 서버 실행 명령을 찾지 못했습니다 (bin/main/start 없음). README 의 실행 방법을 확인하세요.");
    // 빌드가 필요한 TS 레포면 dist 가 없을 수 있음 → 안내
    const needsBuild = pkgRaw && !(await exists(args[0] ?? "")) && command === "node";
    if (needsBuild) log(ctx, "mcp", `⚠ 진입점 ${args[0]} 이 아직 없습니다. 먼저 [의존성 설치] 후 빌드가 필요할 수 있습니다.`);

    const envKeys = s?.envKeys ?? [];
    if (await hasClaudeCli()) {
      const cliArgs = ["mcp", "add", "-s", "user", name, "--", command, ...args];
      log(ctx, "mcp", `claude ${cliArgs.join(" ")}`);
      const r = await execa("claude", cliArgs, { reject: false, timeout: 60_000 });
      if (r.exitCode !== 0 && !/already exists/i.test(r.stderr + r.stdout)) throw new Error("claude mcp add 실패: " + (r.stderr || r.stdout).slice(0, 400));
    } else {
      const cfgPath = path.join(os.homedir(), ".claude.json");
      let cfg: any = {};
      try { cfg = JSON.parse(await fs.readFile(cfgPath, "utf8")); } catch {}
      cfg.mcpServers = cfg.mcpServers ?? {};
      cfg.mcpServers[name] = { command, args, env: Object.fromEntries(envKeys.map((k) => [k, ""])) };
      await fs.writeFile(cfgPath, JSON.stringify(cfg, null, 2), "utf8");
      log(ctx, "mcp", `claude CLI 가 없어 ${cfgPath} 에 직접 등록`);
    }
    const report = `# MCP 등록: ${name}\n- 명령: \`${command} ${args.join(" ")}\`\n- 범위: user (모든 프로젝트)\n${envKeys.length ? `- 필요 환경변수: ${envKeys.join(", ")} → Claude Code 의 MCP 설정에서 값을 채우세요\n` : ""}${needsBuild ? "- ⚠ 빌드 필요: 의존성 설치 후 build 스크립트를 실행하세요\n" : ""}- 확인: 터미널에서 \`claude mcp list\``;
    ctx.artifacts.mcp_report = report;
    ctx.emit({ step: "mcp", level: "result", payload: { name, command, args } });
  },
};
