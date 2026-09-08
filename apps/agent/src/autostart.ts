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
    `sh.Run "cmd /c ""title everygithub agent && node """"${cliPath}"""" start > """"${logPath}"""" 2>&1""", 0, False`,
    "",
  ].join("\r\n");
  const target = path.join(startup, "everygithub.vbs");
  await fs.writeFile(target, vbs, "utf8");
  // 감시 작업: 로그인 시 + 5분마다 실행. 이미 돌고 있으면 start 가 바로 종료하므로 중복 없음
  try {
    const { execa } = await import("execa");
    const tr = `wscript.exe "${target}"`;
    await execa("schtasks", ["/Create", "/F", "/TN", "everygithub agent", "/SC", "MINUTE", "/MO", "5", "/TR", tr, "/RL", "LIMITED"], { windowsHide: true, reject: false });
    await execa("schtasks", ["/Create", "/F", "/TN", "everygithub agent (logon)", "/SC", "ONLOGON", "/TR", tr, "/RL", "LIMITED"], { windowsHide: true, reject: false });
  } catch {}
  return target;
}

export async function removeAutostart() {
  if (process.platform !== "win32") return;
  const target = path.join(os.homedir(), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "everygithub.vbs");
  await fs.rm(target, { force: true });
  try {
    const { execa } = await import("execa");
    await execa("schtasks", ["/Delete", "/F", "/TN", "everygithub agent"], { windowsHide: true, reject: false });
    await execa("schtasks", ["/Delete", "/F", "/TN", "everygithub agent (logon)"], { windowsHide: true, reject: false });
  } catch {}
}
