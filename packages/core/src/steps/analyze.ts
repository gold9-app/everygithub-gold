import { promises as fs } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import type { PackageManager, StackInfo } from "@everygithub/protocol";
import type { Step } from "../context";
import { log } from "../context";

const IGNORE = ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/.next/**", "**/target/**", "**/venv/**", "**/.venv/**"];

async function readJson(p: string): Promise<any | null> {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; }
}
async function has(root: string, rel: string) {
  try { await fs.access(path.join(root, rel)); return true; } catch { return false; }
}

const LANG_BY_EXT: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript",
  py: "Python", rs: "Rust", go: "Go", java: "Java", kt: "Kotlin", rb: "Ruby", php: "PHP",
  cs: "C#", cpp: "C++", c: "C", swift: "Swift", dart: "Dart", sh: "Shell",
};

/** 정적 규칙만으로 스택을 판별한다 (AI 불필요). */
export async function detectStack(root: string): Promise<StackInfo> {
  const files = await fg(["**/*"], { cwd: root, ignore: IGNORE, onlyFiles: true, dot: false });
  const langCount = new Map<string, number>();
  for (const f of files) {
    const ext = f.split(".").pop() ?? "";
    const lang = LANG_BY_EXT[ext];
    if (lang) langCount.set(lang, (langCount.get(lang) ?? 0) + 1);
  }
  const languages = [...langCount.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l).slice(0, 4);

  const pkg = await readJson(path.join(root, "package.json"));
  let packageManager: PackageManager = "unknown";
  if (await has(root, "pnpm-lock.yaml")) packageManager = "pnpm";
  else if (await has(root, "bun.lockb") || await has(root, "bun.lock")) packageManager = "bun";
  else if (await has(root, "yarn.lock")) packageManager = "yarn";
  else if (pkg) packageManager = "npm";
  else if (await has(root, "uv.lock")) packageManager = "uv";
  else if (await has(root, "poetry.lock")) packageManager = "poetry";
  else if (await has(root, "requirements.txt") || await has(root, "pyproject.toml")) packageManager = "pip";
  else if (await has(root, "Cargo.toml")) packageManager = "cargo";
  else if (await has(root, "go.mod")) packageManager = "go";

  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  let framework: string | undefined;
  if (deps["next"]) framework = "Next";
  else if (deps["nuxt"]) framework = "Nuxt";
  else if (deps["react"]) framework = "React";
  else if (deps["vue"]) framework = "Vue";
  else if (deps["svelte"]) framework = "Svelte";
  else if (deps["express"]) framework = "Express";
  else if (deps["hono"]) framework = "Hono";
  else if (await has(root, "manage.py")) framework = "Django";
  else if (files.some((f) => /^(app|main)\.py$/.test(f))) framework = "Python app";

  let runtime: string | undefined;
  if (pkg?.engines?.node) runtime = `node ${pkg.engines.node}`;
  else if (await has(root, ".nvmrc")) runtime = `node ${(await fs.readFile(path.join(root, ".nvmrc"), "utf8")).trim()}`;
  else if (await has(root, ".python-version")) runtime = `python ${(await fs.readFile(path.join(root, ".python-version"), "utf8")).trim()}`;

  const scripts: Record<string, string> | undefined = pkg?.scripts;
  const installScripts = Object.keys(scripts ?? {}).filter((k) => /^(pre|post)?install$|^prepare$/.test(k));

  const isMcpServer = Boolean(deps["@modelcontextprotocol/sdk"]) || files.some((f) => /mcp\.json$/.test(f))
    || (await has(root, "pyproject.toml") && (await fs.readFile(path.join(root, "pyproject.toml"), "utf8")).includes("mcp"));
  const isClaudeSkill = await has(root, "SKILL.md");

  const hasTests = Boolean(scripts?.test && !/no test specified/.test(scripts.test))
    || files.some((f) => /(^|\/)(tests?|__tests__|spec)\//.test(f) || /\.(test|spec)\.[tj]sx?$/.test(f) || /^test_.*\.py$/.test(path.basename(f)));

  // env 키 추출 (정규식, 상위 300개 소스 파일만)
  const envKeys = new Set<string>();
  const srcFiles = files.filter((f) => /\.(ts|tsx|js|mjs|py|go|rs)$/.test(f)).slice(0, 300);
  for (const f of srcFiles) {
    let txt = "";
    try { txt = await fs.readFile(path.join(root, f), "utf8"); } catch { continue; }
    for (const m of txt.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) envKeys.add(m[1]);
    for (const m of txt.matchAll(/os\.(?:environ(?:\.get)?|getenv)\(?\[?["']([A-Z][A-Z0-9_]+)["']/g)) envKeys.add(m[1]);
    for (const m of txt.matchAll(/os\.Getenv\("([A-Z][A-Z0-9_]+)"\)/g)) envKeys.add(m[1]);
  }
  if (await has(root, ".env.example")) {
    const txt = await fs.readFile(path.join(root, ".env.example"), "utf8");
    for (const m of txt.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)) envKeys.add(m[1]);
  }

  return {
    languages, packageManager, framework, runtime, scripts,
    hasDocker: await has(root, "Dockerfile") || await has(root, "docker-compose.yml") || await has(root, "compose.yaml"),
    hasTests, isMcpServer, isClaudeSkill, installScripts,
    fileCount: files.length,
    envKeys: [...envKeys].sort(),
  };
}

const LICENSE_RULES: [RegExp, string][] = [
  [/MIT License/i, "MIT"],
  [/Apache License[\s,]*Version 2\.0/i, "Apache-2.0"],
  [/GNU AFFERO GENERAL PUBLIC LICENSE/i, "AGPL-3.0"],
  [/GNU GENERAL PUBLIC LICENSE[\s\S]*Version 3/i, "GPL-3.0"],
  [/GNU GENERAL PUBLIC LICENSE[\s\S]*Version 2/i, "GPL-2.0"],
  [/GNU LESSER GENERAL PUBLIC LICENSE/i, "LGPL-3.0"],
  [/BSD 3-Clause|Redistributions in binary form[\s\S]*neither the name/i, "BSD-3-Clause"],
  [/BSD 2-Clause|Redistributions in binary form/i, "BSD-2-Clause"],
  [/Mozilla Public License[\s,]*2\.0/i, "MPL-2.0"],
  [/ISC License/i, "ISC"],
  [/The Unlicense|This is free and unencumbered software/i, "Unlicense"],
  [/Creative Commons/i, "CC"],
];

export async function detectLicense(root: string): Promise<string | null> {
  const pkg = await readJson(path.join(root, "package.json"));
  if (pkg?.license && typeof pkg.license === "string" && !/^SEE LICENSE/i.test(pkg.license)) return pkg.license;
  const candidates = await fg(["LICENSE*", "LICENCE*", "COPYING*"], { cwd: root, onlyFiles: true, caseSensitiveMatch: false });
  for (const c of candidates) {
    const txt = await fs.readFile(path.join(root, c), "utf8");
    for (const [re, id] of LICENSE_RULES) if (re.test(txt)) return id;
    return "UNKNOWN";
  }
  return null;
}

/** 깊이 2 디렉토리 트리 (요약용) */
export async function buildTree(root: string, depth = 2): Promise<string> {
  const lines: string[] = [];
  async function walk(dir: string, prefix: string, level: number) {
    if (level > depth) return;
    let entries = await fs.readdir(dir, { withFileTypes: true });
    entries = entries.filter((e) => !["node_modules", ".git", "dist", ".next", "target", "__pycache__", ".venv", "venv"].includes(e.name))
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    const shown = entries.slice(0, 25);
    for (const e of shown) {
      lines.push(`${prefix}${e.isDirectory() ? "📁 " : "· "}${e.name}`);
      if (e.isDirectory()) await walk(path.join(dir, e.name), prefix + "  ", level + 1);
    }
    if (entries.length > shown.length) lines.push(`${prefix}… (+${entries.length - shown.length})`);
  }
  await walk(root, "", 1);
  return lines.join("\n");
}

export const analyzeStep: Step = {
  name: "analyze",
  async run(ctx) {
    if (!ctx.localPath) throw new Error("clone 스텝이 먼저 실행되어야 합니다");
    // 서브폴더 링크면 그 폴더를 분석 대상으로, 라이선스는 루트에서도 찾는다
    const { source } = ctx.job;
    const root = source.kind === "subdir" && source.path ? path.join(ctx.localPath, source.path) : ctx.localPath;
    log(ctx, "analyze", `스택·라이선스·트리 분석 중 (${root})`);
    ctx.stack = await detectStack(root);
    ctx.license = (await detectLicense(root)) ?? (await detectLicense(ctx.localPath));
    ctx.tree = await buildTree(root);
    ctx.artifacts.tree = ctx.tree;
    if (ctx.stack.envKeys.length) {
      ctx.artifacts.env_example = ctx.stack.envKeys.map((k) => `${k}=`).join("\n") + "\n";
    }
    ctx.emit({ step: "analyze", level: "result", payload: { stack: ctx.stack, license: ctx.license } });
  },
};
