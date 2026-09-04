import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import pc from "picocolors";

/**
 * 자동 업데이트: 허브의 /agent/cli.mjs.sha256 과 내 파일 해시를 비교해 다르면 내려받고 스스로 재시작.
 * 사이트가 재배포되면 에이전트는 다음 확인 때(시작 시 + 1시간마다) 알아서 최신이 된다.
 */
export async function selfUpdate(hubUrl: string, selfPath: string): Promise<boolean> {
  try {
    const remote = (await (await fetch(`${hubUrl}/agent/cli.mjs.sha256`, { cache: "no-store" })).text()).trim().slice(0, 64);
    if (!/^[0-9a-f]{64}$/.test(remote)) return false;
    const local = createHash("sha256").update(await fs.readFile(selfPath)).digest("hex");
    if (local === remote) return false;
    console.log(pc.cyan("새 버전 발견 → 업데이트 중"));
    const body = Buffer.from(await (await fetch(`${hubUrl}/agent/cli.mjs`, { cache: "no-store" })).arrayBuffer());
    if (createHash("sha256").update(body).digest("hex") !== remote) { console.log(pc.yellow("다운로드 해시 불일치 — 다음에 재시도")); return false; }
    const tmp = selfPath + ".new";
    await fs.writeFile(tmp, body);
    await fs.rename(tmp, selfPath);
    // 새 코드로 재시작 (분리된 프로세스) 후 현재 프로세스 종료
    const child = spawn(process.execPath, [selfPath, "start"], { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
    console.log(pc.green("✔ 업데이트 완료 — 재시작"));
    return true;
  } catch (err) {
    console.log(pc.dim("업데이트 확인 실패: " + (err as Error).message));
    return false;
  }
}
