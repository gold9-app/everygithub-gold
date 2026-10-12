import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import pc from "picocolors";

/**
 * 자동 업데이트: 허브의 /agent/cli.mjs.sha256 과 내 파일 해시를 비교해 다르면 내려받고 스스로 재시작.
 * 시작 시 한 번 확인하고, 이후에는 허브 응답 헤더(x-agent-sha)가 바뀌면 즉시 — 주기적 확인 요청은 없다.
 */
export async function localSha(selfPath: string) {
  return createHash("sha256").update(await fs.readFile(selfPath)).digest("hex");
}

/** remoteSha 를 알고 있으면(허브 응답 헤더) sha256 파일 요청을 생략한다 */
export async function selfUpdate(hubUrl: string, selfPath: string, remoteSha?: string): Promise<boolean> {
  try {
    const remote = remoteSha ?? (await (await fetch(`${hubUrl}/agent/cli.mjs.sha256`, { cache: "no-store" })).text()).trim().slice(0, 64);
    if (!/^[0-9a-f]{64}$/.test(remote)) return false;
    const local = await localSha(selfPath);
    if (local === remote) return false;
    console.log(pc.cyan("새 버전 발견 → 업데이트 중"));
    const body = Buffer.from(await (await fetch(`${hubUrl}/agent/cli.mjs`, { cache: "no-store" })).arrayBuffer());
    if (createHash("sha256").update(body).digest("hex") !== remote) { console.log(pc.yellow("다운로드 해시 불일치 — 다음에 재시도")); return false; }
    const tmp = selfPath + ".new";
    await fs.writeFile(tmp, body);
    await fs.rename(tmp, selfPath);
    // 새 프로세스가 "이미 실행 중"으로 오인하지 않도록 pid 파일 제거
    try { const { PID_PATH } = await import("./config"); await fs.rm(PID_PATH, { force: true }); } catch {}
    // 새 코드로 재시작 (분리된 프로세스) 후 현재 프로세스 종료
    // Windows: 제목 있는 콘솔로 띄워야 함 (빈 제목 → process_title assertion 크래시)
    const child = process.platform === "win32"
      ? spawn("cmd", ["/c", "start", "everygithub agent", "/min", "cmd", "/c", `title everygithub agent && "${process.execPath}" "${selfPath}" start`], { detached: true, stdio: "ignore", windowsHide: true })
      : spawn(process.execPath, [selfPath, "start"], { detached: true, stdio: "ignore" });
    child.unref();
    console.log(pc.green("✔ 업데이트 완료 — 재시작"));
    return true;
  } catch (err) {
    console.log(pc.dim("업데이트 확인 실패: " + (err as Error).message));
    return false;
  }
}
