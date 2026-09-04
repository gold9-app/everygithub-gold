import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { currentUser, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * 본인 전용 설치 파일(everygithub-setup.cmd) 다운로드.
 * 파일 안에 1회용 설치 토큰이 들어 있어 실행만 하면 자동 페어링된다 (코드 입력 없음).
 * 흐름: Node 확인(없으면 winget 설치) → 사이트에서 cli.mjs 내려받기 → connect → 자동시작 등록
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const token = "inst_" + randomBytes(16).toString("hex");
  await supabaseAdmin().from("pairing_codes").insert({
    code: token, user_id: user.id, expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
  });
  const hub = (process.env.HUB_URL ?? "").replace(/\/$/, "");

  const cmd = [
    "@echo off",
    "chcp 65001 >nul",
    "setlocal",
    "title everygithub_gold setup",
    `set "HUB=${hub}"`,
    `set "TOKEN=${token}"`,
    'set "DIR=%LOCALAPPDATA%\\everygithub"',
    'if not exist "%DIR%" mkdir "%DIR%"',
    "echo.",
    "echo  ==== everygithub_gold 설치 ====",
    "echo.",
    "where node >nul 2>nul",
    "if %errorlevel% neq 0 (",
    "  echo  Node.js 가 없어 설치합니다 ^(1-2분^)...",
    "  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent",
    '  set "PATH=%PATH%;%ProgramFiles%\\nodejs"',
    "  where node >nul 2>nul || (",
    "    echo  자동 설치 실패. https://nodejs.org 에서 LTS 설치 후 이 파일을 다시 실행하세요.",
    "    start https://nodejs.org/",
    "    pause & exit /b 1",
    "  )",
    ")",
    "echo  [1/3] 에이전트 내려받는 중...",
    'curl -fsSL "%HUB%/agent/cli.mjs" -o "%DIR%\\cli.mjs" || (echo  다운로드 실패 & pause & exit /b 1)',
    "echo  [2/3] 사이트와 연결하는 중...",
    'node "%DIR%\\cli.mjs" connect "%TOKEN%" --hub "%HUB%" || (echo  연결 실패 - 사이트에서 설치 파일을 다시 받아 실행하세요. & pause & exit /b 1)',
    "echo  [3/3] 백그라운드 실행 시작",
    'start "" /min cmd /c "node "%DIR%\\cli.mjs" start > "%DIR%\\agent.log" 2>&1"',
    "echo.",
    "echo  완료! 이 창은 닫아도 됩니다. 사이트에서 디바이스가 온라인으로 표시됩니다.",
    "echo  (부팅 시 자동 시작이 등록되었습니다. 로그: %DIR%\\agent.log)",
    "timeout /t 8 >nul",
    "endlocal",
  ].join("\r\n") + "\r\n";

  return new NextResponse(cmd, {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": 'attachment; filename="everygithub-setup.cmd"',
      "cache-control": "no-store",
    },
  });
}
