# update.zip 을 프로젝트 루트에 덮어쓰고 (필요 시) 허브 의존성 설치 후 커밋·푸시
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
Write-Host "`n== everygithub_gold update ==`n" -ForegroundColor Yellow
if (-not (Test-Path "update.zip")) { throw "update.zip 이 없습니다" }

Write-Host "[1/3] 파일 적용" -ForegroundColor Cyan
Expand-Archive -Path "update.zip" -DestinationPath "." -Force

if (Test-Path "update-hub-deps.flag") {
  Write-Host "`n[2/3] 허브 의존성 설치" -ForegroundColor Cyan
  Set-Location "$root\apps\hub"; npm install; if ($LASTEXITCODE -ne 0) { throw "npm install 실패" }; Set-Location $root
  Remove-Item "update-hub-deps.flag" -Force
} else { Write-Host "`n[2/3] 의존성 변경 없음 — 건너뜀" -ForegroundColor Cyan }

Write-Host "`n[3/3] 커밋 + 푸시" -ForegroundColor Cyan
$msg = if (Test-Path "update-message.txt") { Get-Content "update-message.txt" -Raw } else { "update" }
if (Test-Path "update-message.txt") { Remove-Item "update-message.txt" -Force }
git add -A
$ErrorActionPreference = "Continue"
git commit -m $msg.Trim() 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
git push origin main
if ($LASTEXITCODE -ne 0) { throw "push 실패" }
Remove-Item "update.zip" -Force
Write-Host "`n✔ 완료 — Vercel 이 1~2분 내 재배포합니다." -ForegroundColor Green
Read-Host "엔터를 누르면 닫힙니다"
