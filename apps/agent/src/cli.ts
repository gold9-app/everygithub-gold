import { Command } from "commander";
import { promises as fs } from "node:fs";
import os from "node:os";
import { randomUUID } from "node:crypto";
import pc from "picocolors";
import { parseGithubUrl, PIPELINE_STEPS, Pipeline, type Job, type AgentSettings } from "@everygithub/protocol";
import { AGENT_VERSION, CONFIG_PATH, PID_PATH, CONFIG_DIR, currentOS, loadConfig, saveConfig, resolveWorkspace, defaultWorkspace } from "./config";
import { HubClient } from "./hub-client";
import { executeJob } from "./runner";
import { registerAutostart, removeAutostart } from "./autostart";
import { selfUpdate, localSha } from "./self-update";
import { WakeListener } from "./realtime";

/** 시작·종료·치명 오류를 별도 파일에 남긴다 (stdout 로그가 다른 프로세스에 덮여도 원인 추적 가능) */
async function eventLog(line: string) {
  try {
    const { EVENTS_PATH } = await import("./config");
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.appendFile(EVENTS_PATH, `[${new Date().toISOString()}] pid=${process.pid} v${AGENT_VERSION} ${line}\n`);
  } catch {}
}
process.on("uncaughtException", (e) => { void eventLog("uncaughtException: " + (e?.stack ?? e)); setTimeout(() => process.exit(1), 200); });
process.on("unhandledRejection", (e: any) => { void eventLog("unhandledRejection: " + (e?.stack ?? e)); });
process.on("exit", (code) => { try { require("node:fs").appendFileSync(require("node:path").join(CONFIG_DIR, "agent-events.log"), `[${new Date().toISOString()}] pid=${process.pid} exit code=${code}\n`); } catch {} });

const program = new Command();
program.name("everygithub").description("everygithub_gold 에이전트").version(AGENT_VERSION);

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

/** 사이트 설치 파일이 호출: 토큰으로 조용히 페어링 + 자동시작 등록. 질문 없음 */
program.command("connect <token>").description("사이트 설치 파일이 호출하는 자동 연결")
  .requiredOption("--hub <url>", "허브 주소")
  .action(async (token: string, opts: { hub: string }) => {
    const hubUrl = opts.hub.replace(/\/$/, "");
    const hub = new HubClient(hubUrl);
    const res = await hub.pair({ code: token.trim(), name: os.hostname(), os: currentOS(), agentVersion: AGENT_VERSION });
    await saveConfig({ hubUrl, deviceId: res.deviceId, deviceToken: res.deviceToken });
    const auto = await registerAutostart(process.argv[1]);
    console.log(pc.green("✔ 사이트와 연결됨"), pc.dim(`(${CONFIG_PATH})`));
    if (auto) console.log(pc.dim(`자동 시작 등록: ${auto}`));
  });

program.command("disconnect").description("연결 해제 + 자동시작 제거").action(async () => {
  await removeAutostart();
  await fs.rm(CONFIG_PATH, { force: true });
  console.log("연결 해제됨");
});

program.command("add <url>").description("허브 없이 로컬에서 바로 처리")
  .option("-p, --pipeline <name>", "quick | docs | full | skill", "quick")
  .option("-d, --dir <path>", "클론 폴더 (기본: 내 문서\\everygithub)")
  .option("-y, --yes", "설치·테스트 실행을 확인 없이 허용")
  .action(async (url: string, opts: { pipeline: string; dir?: string; yes?: boolean }) => {
    const cfg = (await loadConfig()) ?? {};
    const workspacePath = resolveWorkspace(opts.dir ?? cfg.localWorkspace);
    await fs.mkdir(workspacePath, { recursive: true });
    await executeJob(localJob(url, Pipeline.parse(opts.pipeline), cfg.deviceId ?? randomUUID()), { workspacePath, anthropicApiKey: process.env.ANTHROPIC_API_KEY, approve: opts.yes ? "auto" : "ask" });
  });

program.command("config").description("현재 상태").action(async () => {
  const cfg = await loadConfig();
  console.log(cfg ? { ...cfg, deviceToken: cfg.deviceToken ? "***" : undefined } : "연결 안 됨 — 사이트에서 설치 파일을 받아 실행하세요.");
});

program.command("start", { isDefault: true }).description("허브에서 잡을 받아 실행 (백그라운드 데몬)").action(async () => {
  await eventLog(`start invoked argv=${JSON.stringify(process.argv.slice(1))} cwd=${process.cwd()} node=${process.version}`);
  const cfg = await loadConfig();
  if (!cfg?.hubUrl || !cfg.deviceToken) {
    console.log(pc.yellow("사이트와 연결돼 있지 않습니다. 사이트 대시보드에서 [PC 연결 파일 받기] 를 실행하세요."));
    console.log(pc.dim("허브 없이 쓰려면: everygithub add <github url>"));
    return;
  }
  try { process.chdir(os.homedir()); } catch {} // 설치 파일이 Downloads 에서 띄워도 홈 기준으로
  // 단일 인스턴스: 이미 살아 있는 에이전트가 있으면 조용히 종료 (감시 작업이 5분마다 호출해도 중복 없음)
  try {
    const old = Number((await fs.readFile(PID_PATH, "utf8")).trim());
    if (old && old !== process.pid) {
      let alive = false;
      try { process.kill(old, 0); alive = true; } catch {}
      if (alive) { await eventLog(`already running pid=${old} → exit`); return; }
    }
  } catch {}
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(PID_PATH, String(process.pid));
  await eventLog("pid written, checking update");
  const selfPath = process.argv[1];
  registerAutostart(selfPath).catch(() => {}); // 감시 작업(스케줄러)이 없으면 등록 — 자동 업데이트로 올라온 버전도 보호
  if (await selfUpdate(cfg.hubUrl, selfPath)) return; // 새 프로세스가 이어받음 (시작 시 1회; 이후엔 응답 헤더로 감지)

  // ── 깨우기 신호: 사이트가 잡 생성/설정 저장 시 보냄. 폴링은 신호 누락 대비 + 온라인 표시용 보험 ──
  let wantJob = false, wantSettings = false, updateTo: string | null = null;
  let wake: (() => void) | null = null;
  const sleep = (ms: number) => new Promise<void>((r) => { const t = setTimeout(() => { wake = null; r(); }, ms); wake = () => { clearTimeout(t); wake = null; r(); }; });
  const listener = new WakeListener((e) => { if (e === "job") wantJob = true; else wantSettings = true; wake?.(); }, (l) => void eventLog(l));

  const hub = new HubClient(cfg.hubUrl, cfg.deviceToken);
  const mySha = await localSha(selfPath);
  hub.onRemoteSha = (sha) => { if (sha !== mySha && !updateTo) { updateTo = sha; wake?.(); } };
  let settings: AgentSettings = { workspacePath: defaultWorkspace(), approve: "ask", pollIntervalMs: 60_000 };
  const refreshSettings = async () => {
    try {
      const s = await hub.settings();
      settings = { ...s, workspacePath: resolveWorkspace(s.workspacePath) };
      await fs.mkdir(settings.workspacePath, { recursive: true });
      // "~/..." 같은 약어 경로는 실제 경로로 바꿔 사이트에 그대로 보이게
      if (s.workspacePath !== settings.workspacePath) await hub.updateDevice({ workspacePath: settings.workspacePath }).catch(() => {});
      if (s.realtime) listener.connect(s.realtime);
    } catch (err) { console.error(pc.red("설정 불러오기 실패:"), (err as Error).message); }
  };
  await refreshSettings();
  if (!listener.available) await eventLog("WebSocket 미지원 Node → 20초 폴링으로 동작");
  await eventLog(`started workspace=${settings.workspacePath} realtime=${listener.available ? "on" : "off"}`);
  console.log(pc.bold(`everygithub agent v${AGENT_VERSION}`), pc.dim(`허브 ${cfg.hubUrl} · 폴더 ${settings.workspacePath}`));
  console.log(pc.dim(listener.available ? "잡 대기 중 (실시간)…" : "잡 대기 중 (폴링)…"));
  let failures = 0, lastActive = Date.now();
  for (;;) {
    try {
      if (updateTo) { if (await selfUpdate(cfg.hubUrl, selfPath, updateTo)) process.exit(0); updateTo = null; } // 잡 사이(유휴)에만 교체
      if (wantSettings) { wantSettings = false; await refreshSettings(); }
      wantJob = false;
      const job = await hub.nextJob();
      failures = 0;
      if (job) { await refreshSettings(); await executeJob(job, settings, hub); lastActive = Date.now(); continue; }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("→ 401")) {
        // 사이트에서 이 PC 가 해제됐거나 다른 인스턴스가 새로 연결됨 → 이 프로세스는 물러난다
        console.log(pc.yellow("이 PC 의 연결이 해제되었거나 새 연결로 대체되었습니다. 종료합니다."));
        await eventLog("401 from hub → exiting");
        process.exit(0);
      }
      failures++;
      if (failures === 1 || failures % 20 === 0) console.error(pc.red("허브 연결 오류:"), msg);
    }
    if (wantJob || wantSettings || updateTo) continue; // 기다리는 동안 신호가 왔으면 바로
    // 실시간 연결이 살아 있으면 60초 보험 폴링, 아니면 20초. 처리 직후 1분은 5초(연속 잡 대비). 오류 시 점증 대기
    const base = Date.now() - lastActive < 60_000 ? 5_000 : listener.connected ? settings.pollIntervalMs : 20_000;
    await sleep(failures ? Math.min(5_000 * (failures + 1), 60_000) : base);
  }
});

program.parseAsync(process.argv).catch((err) => { console.error(pc.red(err.message ?? err)); process.exit(1); });
