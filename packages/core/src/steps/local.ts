import { promises as fs } from "node:fs";
import path from "node:path";
import { execa } from "execa";
import type { Step } from "../context";
import { log } from "../context";

/** OS 파일 탐색기로 폴더 열기 (에이전트가 사용자 세션에서 돌아야 함) */
export const openStep: Step = {
  name: "open",
  async run(ctx) {
    const dir = ctx.localPath;
    if (!dir) throw new Error("열 폴더 경로가 없습니다");
    try { await fs.access(dir); } catch { throw new Error(`폴더가 없습니다: ${dir}`); }
    log(ctx, "open", `탐색기로 열기: ${dir}`);
    if (process.platform === "win32") await execa("explorer.exe", [dir], { reject: false, windowsHide: false });
    else if (process.platform === "darwin") await execa("open", [dir]);
    else await execa("xdg-open", [dir]);
    ctx.emit({ step: "open", level: "result", payload: { opened: dir } });
  },
};

/** 로컬 폴더 삭제 — 워크스페이스 안쪽 경로만 허용 (안전장치) */
export const removeStep: Step = {
  name: "remove",
  async run(ctx) {
    const dir = ctx.localPath;
    if (!dir) throw new Error("삭제할 경로가 없습니다");
    const ws = path.resolve(ctx.workspacePath);
    const target = path.resolve(dir);
    if (!target.startsWith(ws + path.sep) || target === ws) throw new Error(`워크스페이스 밖 경로는 삭제하지 않습니다: ${target}`);
    log(ctx, "remove", `삭제: ${target}`);
    await fs.rm(target, { recursive: true, force: true, maxRetries: 3 });
    // 비어 버린 owner 폴더 정리
    const parent = path.dirname(target);
    try { if (parent !== ws && (await fs.readdir(parent)).length === 0) await fs.rmdir(parent); } catch {}
    ctx.emit({ step: "remove", level: "result", payload: { removed: target } });
  },
};

/** PC 에서 네이티브 폴더 선택창을 띄우고 선택 경로를 artifacts.picked_path 로 돌려준다 (사이트 [폴더 선택] 버튼) */
export const pickFolderStep: Step = {
  name: "pick_folder",
  async run(ctx) {
    log(ctx, "pick_folder", "PC 에 폴더 선택창을 띄웁니다");
    let picked = "";
    if (process.platform === "win32") {
      const ps = [
        "Add-Type -AssemblyName System.Windows.Forms",
        "$d = New-Object System.Windows.Forms.FolderBrowserDialog",
        "$d.Description = 'everygithub_gold - 레포를 클론해 둘 폴더를 선택하세요'",
        "$d.ShowNewFolderButton = $true",
        `$d.SelectedPath = '${ctx.workspacePath.replace(/'/g, "''")}'`,
        "$f = New-Object System.Windows.Forms.Form; $f.TopMost = $true",
        "if ($d.ShowDialog($f) -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.SelectedPath }",
      ].join("; ");
      const r = await execa("powershell", ["-NoProfile", "-STA", "-Command", ps], { reject: false, windowsHide: true });
      picked = (r.stdout ?? "").trim();
    } else if (process.platform === "darwin") {
      const r = await execa("osascript", ["-e", 'POSIX path of (choose folder with prompt "레포를 클론해 둘 폴더")'], { reject: false });
      picked = (r.stdout ?? "").trim().replace(/\/$/, "");
    } else {
      const r = await execa("zenity", ["--file-selection", "--directory", "--title=레포를 클론해 둘 폴더"], { reject: false });
      picked = (r.stdout ?? "").trim();
    }
    if (!picked) { ctx.emit({ step: "pick_folder", level: "skipped", payload: { reason: "cancelled" } }); return; }
    ctx.artifacts.picked_path = picked;
    ctx.emit({ step: "pick_folder", level: "result", payload: { picked } });
  },
};
