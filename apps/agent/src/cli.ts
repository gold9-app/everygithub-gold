import { Command } from "commander";
import { input, password, confirm } from "@inquirer/prompts";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pc from "picocolors";
import { parseGithubUrl, PIPELINE_STEPS, Pipeline, type Job } from "@everygithub/protocol";
import { AGENT_VERSION, CONFIG_PATH, currentOS, loadConfig, saveConfig, type AgentConfig } from "./config";
import { HubClient } from "./hub-client";
import { executeJob } from "./runner";

const program = new Command();
program.name("everygithub").description("everygithub_gold 에이전트 — 깃허브 링크를 던지면 클론·분석·등록").version(AGENT_VERSION);

/** 첫 실행 온보딩: 워크스페이스 경로(필수) → 허브 페어링(선택) → AI 키(선택) */
async function onboard(existing?: AgentConfig | null): Promise<AgentConfig> {
  console.log(pc.bold("\n everygithub_gold 초기 설정\n"));
  const workspacePath = await input({
    message: "레포를 클론해 둘 폴더 경로를 붙여넣으세요 (예: D:\\repos)",
    default: existing?.workspacePath,
    validate: (v) => (v.trim() ? true : "경로를 입력하세요"),
  });
  const ws = path.resolve(workspacePath.trim().replace(/^["']|["']$/g, ""));
  await fs.mkdir(ws, { recursive: true });

  const cfg: AgentConfig = { ...(existing ?? {}), workspacePath: ws, pollIntervalMs: 3000 };

  const usePair = await confirm({ message: "웹/텔레그램에서 원격으로 링크를 보내려면 허브와 연결합니다. 지금 연결할까요?", default: true });
  if (usePair) {
    const hubUrl = await input({ message: "허브 주소", default: existing?.hubUrl ?? "https://everygithub.vercel.app" });
    const code = await input({ message: "사이트의 [디바이스 추가] 에서 받은 6자리 코드", validate: (v) => (/^\d{6}$/.test(v.trim()) ? true : "6자리 숫자") });
    const hub = new HubClient(hubUrl);
    try {
      const res = await hub.pair({ code: code.trim(), name: os.hostname(), os: currentOS(), agentVersion: AGENT_VERSION, workspacePath: ws });
      cfg.hubUrl = hubUrl; cfg.deviceId = res.deviceId; cfg.deviceToken = res.deviceToken;
      console.log(pc.green("✔ 허브 연결 완료"));
    } catch (err) {
      console.log(pc.red("페어링 실패: ") + (err as Error).message + pc.dim("\n  나중에 `everygithub pair` 로 다시 시도할 수 있습니다."));
    }
  }

  const useAi = await confirm({ message: "(선택) Claude API 키를 연결하면 README 한국어 설명서 등 AI 기능이 켜집니다. 지금 입력할까요?", default: false });
  if (useAi) {
    cfg.anthropicApiKey = await password({ message: "ANTHROPIC_API_KEY", mask: "*" });
  }
  await saveConfig(cfg);
  console.log(pc.dim(`설정 저장: ${CONFIG_PATH}\n`));
  return cfg;
}

function localJob(url: string, pipeline: Pipeline, deviceId: string): Job {
  const source = parseGithubUrl(url);
  if (!source) throw new Error("깃허브 링크를 인식하지 못했습니다: " + url);
  return {
    id: randomUUID(), userId: "00000000-0000-0000-0000-000000000000", deviceId,
    source, pipeline, steps: PIPELINE_STEPS[pipeline],
    options: { shallow: true, lang: "ko", approve: "ask" },
    status: "queued", origin: { channel: "cli" }, createdAt: new Date().toISOString(),
  };
}

program.command("setup").description("초기 설정 다시 하기").action(async () => { await onboard(await loadConfig()); });

program.command("pair").description("허브와 페어링").action(async () => {
  const cfg = (await loadConfig()) ?? (await onboard());
  await onboard(cfg);
});

program.command("add <url>").description("링크를 바로 처리 (허브 없이 로컬 실행)")
  .option("-p, --pipeline <name>", "quick | docs | full | skill", "quick")
  .action(async (url: string, opts: { pipeline: string }) => {
    const cfg = (await loadConfig()) ?? (await onboard());
    const pipeline = Pipeline.parse(opts.pipeline);
    await executeJob(localJob(url, pipeline, cfg.deviceId ?? randomUUID()), cfg);
  });

program.command("config").description("현재 설정 보기").action(async () => {
  const cfg = await loadConfig();
  if (!cfg) return console.log("설정 없음. `everygithub` 를 실행해 초기 설정을 하세요.");
  console.log({ ...cfg, deviceToken: cfg.deviceToken ? "***" : undefined, anthropicApiKey: cfg.anthropicApiKey ? "***" : undefined });
});

program.command("start", { isDefault: true }).description("허브에서 잡을 받아 실행하는 데몬 (기본 명령)").action(async () => {
  let cfg = await loadConfig();
  if (!cfg) cfg = await onboard();
  if (!cfg.hubUrl || !cfg.deviceToken) {
    console.log(pc.yellow("허브에 연결돼 있지 않습니다. `everygithub add <url>` 로 로컬 실행하거나 `everygithub pair` 로 연결하세요."));
    return;
  }
  const hub = new HubClient(cfg.hubUrl, cfg.deviceToken);
  console.log(pc.bold(`everygithub agent v${AGENT_VERSION}`), pc.dim(`워크스페이스 ${cfg.workspacePath} · 허브 ${cfg.hubUrl}`));
  console.log(pc.dim("잡 대기 중… (Ctrl+C 로 종료)"));
  let failures = 0;
  for (;;) {
    try {
      const job = await hub.nextJob();
      failures = 0;
      if (job) { await executeJob(job, cfg, hub); continue; }
    } catch (err) {
      failures++;
      if (failures === 1 || failures % 20 === 0) console.error(pc.red("허브 연결 오류:"), (err as Error).message);
    }
    await new Promise((r) => setTimeout(r, Math.min(cfg!.pollIntervalMs * (failures + 1), 30000)));
  }
});

program.parseAsync(process.argv).catch((err) => { console.error(pc.red(err.message ?? err)); process.exit(1); });
