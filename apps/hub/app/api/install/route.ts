import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { currentUser, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * 본인 전용 설치 파일(everygithub-setup.cmd) 다운로드.
 * 파일 안에 1회용 설치 토큰이 들어 있어 실행만 하면 자동 페어링된다 (코드 입력 없음).
 * 흐름: Node 확인(없으면 winget 설치) → 사이트에서 cli.mjs 내려받기 → connect → 자동시작 등록
 * 주의: cmd 파일은 한글이 깨지므로 ASCII 만 사용. 실패해도 창이 남고 setup.log 에 기록.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const token = "inst_" + randomBytes(16).toString("hex");
  await supabaseAdmin().from("pairing_codes").insert({
    code: token, user_id: user.id, expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
  });
  const hub = (process.env.HUB_URL ?? "").replace(/\/$/, "");

  const lines = [
    "@echo off",
    "setlocal",
    "title everygithub_gold setup",
    `set "HUB=${hub}"`,
    `set "TOKEN=${token}"`,
    'set "DIR=%LOCALAPPDATA%\\everygithub"',
    'if not exist "%DIR%" mkdir "%DIR%"',
    'set "LOG=%DIR%\\setup.log"',
    'echo ---- %DATE% %TIME% ---- >> "%LOG%"',
    "echo.",
    "echo  ==== everygithub_gold setup ====",
    "echo.",
    "where node >nul 2>nul",
    "if errorlevel 1 (",
    "  echo  Node.js not found. Installing via winget (1-2 min)...",
    '  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent >> "%LOG%" 2>&1',
    '  set "PATH=%PATH%;%ProgramFiles%\\nodejs"',
    "  where node >nul 2>nul",
    "  if errorlevel 1 (",
    "    echo  Could not install Node.js automatically.",
    "    echo  Install LTS from https://nodejs.org and run this file again.",
    "    start https://nodejs.org/",
    "    goto :fail",
    "  )",
    ")",
    "for /f \"tokens=*\" %%v in ('node -v') do echo  Node %%v",
    "echo  [1/3] Downloading agent...",
    'curl -fsSL "%HUB%/agent/cli.mjs" -o "%DIR%\\cli.mjs" >> "%LOG%" 2>&1',
    "if errorlevel 1 (",
    "  echo  Download failed. Check internet connection.",
    "  goto :fail",
    ")",
    "echo  [2/3] Connecting to site...",
    'node "%DIR%\\cli.mjs" connect "%TOKEN%" --hub "%HUB%" >> "%LOG%" 2>&1',
    "if errorlevel 1 (",
    "  echo  Connect failed. Download a fresh setup file from the site and run again.",
    "  goto :fail",
    ")",
    "echo  [3/3] Starting agent in background...",
    'start "" /min cmd /c "node "%DIR%\\cli.mjs" start > "%DIR%\\agent.log" 2>&1"',
    "echo.",
    "echo  DONE. You can close this window.",
    "echo  The site will show this PC as online in a few seconds.",
    "echo  Auto-start on boot is registered. Log: %DIR%\\agent.log",
    "echo.",
    "pause",
    "exit /b 0",
    ":fail",
    "echo.",
    "echo  FAILED. Details: %LOG%",
    "echo.",
    "pause",
    "exit /b 1",
  ];
  const cmd = lines.join("\r\n") + "\r\n";

  return new NextResponse(cmd, {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": 'attachment; filename="everygithub-setup.cmd"',
      "cache-control": "no-store",
    },
  });
}
