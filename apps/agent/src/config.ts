import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export interface AgentConfig {
  workspacePath: string;
  hubUrl?: string;
  deviceId?: string;
  deviceToken?: string;
  anthropicApiKey?: string; // 선택 — 있으면 AI층 기능 활성화
  pollIntervalMs: number;
}

export const CONFIG_DIR = path.join(os.homedir(), ".everygithub");
export const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
export const AGENT_VERSION = "0.1.0";

export async function loadConfig(): Promise<AgentConfig | null> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return { pollIntervalMs: 3000, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

export async function saveConfig(cfg: AgentConfig) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

export function currentOS(): "windows" | "mac" | "linux" {
  return process.platform === "win32" ? "windows" : process.platform === "darwin" ? "mac" : "linux";
}
