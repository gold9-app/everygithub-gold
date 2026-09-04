import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/** 로컬에는 연결 정보만 둔다. 워크스페이스·API 키·정책은 허브(사이트 설정)에서 내려받는다. */
export interface AgentConfig {
  hubUrl?: string;
  deviceId?: string;
  deviceToken?: string;
  /** 허브 없이 `add` 로 쓸 때의 로컬 워크스페이스 (없으면 ~/everygithub) */
  localWorkspace?: string;
}

export const CONFIG_DIR = path.join(os.homedir(), ".everygithub");
export const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
export const AGENT_VERSION = "0.2.0";

export async function loadConfig(): Promise<AgentConfig | null> {
  try { return JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")); } catch { return null; }
}

export async function saveConfig(cfg: AgentConfig) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

export function currentOS(): "windows" | "mac" | "linux" {
  return process.platform === "win32" ? "windows" : process.platform === "darwin" ? "mac" : "linux";
}

/** "~/x" 또는 "내 문서" 기준 경로를 절대경로로 */
export function resolveWorkspace(p?: string): string {
  if (!p) return defaultWorkspace();
  if (p.startsWith("~")) return path.join(os.homedir(), p.slice(1));
  return path.resolve(p);
}
export function defaultWorkspace(): string {
  const docs = process.platform === "win32" ? path.join(os.homedir(), "Documents") : os.homedir();
  return path.join(docs, "everygithub");
}
