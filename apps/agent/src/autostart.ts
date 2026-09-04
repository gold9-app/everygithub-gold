import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * 부팅 시 자동 시작 등록 (Windows: 시작 프로그램 폴더에 숨김 실행 .vbs).
 * mac/linux 는 이후 단계에서 launchd/systemd 로 추가.
 */
export async function registerAutostart(cliPath: string): Promise<string | null> {
  if (process.platform !== "win32") return null;
  const startup = path.join(os.homedir(), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
  await fs.mkdir(startup, { recursive: true });
  const logPath = path.join(path.dirname(cliPath), "agent.log");
  const vbs = [
    'Set sh = CreateObject("WScript.Shell")',
    `sh.Run "cmd /c ""node """"${cliPath}"""" start > """"${logPath}"""" 2>&1""", 0, False`,
    "",
  ].join("\r\n");
  const target = path.join(startup, "everygithub.vbs");
  await fs.writeFile(target, vbs, "utf8");
  return target;
}

export async function removeAutostart() {
  if (process.platform !== "win32") return;
  const target = path.join(os.homedir(), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "everygithub.vbs");
  await fs.rm(target, { force: true });
}
