# UI 개편 적용: 옛 화면 제거 → hub-ui.zip 풀기 → npm install → 커밋/푸시
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
Write-Host "`n== UI 개편 적용 ($root) ==`n" -ForegroundColor Yellow
if (-not (Test-Path "hub-ui.zip")) { throw "hub-ui.zip 이 없습니다" }

Write-Host "[1/3] 옛 화면 파일 제거 + 새 파일 적용" -ForegroundColor Cyan
foreach ($d in @("apps\hub\app", "apps\hub\components", "apps\hub\lib")) { if (Test-Path $d) { Remove-Item -Recurse -Force $d } }
Expand-Archive -Path "hub-ui.zip" -DestinationPath "apps" -Force

Write-Host "`n[2/3] 허브 의존성 설치 (tailwind 등)" -ForegroundColor Cyan
Set-Location "$root\apps\hub"
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install 실패" }
Set-Location $root

Write-Host "`n[3/3] 커밋 + 푸시" -ForegroundColor Cyan
git add -A
$ErrorActionPreference = "Continue"
git commit -m "UI/UX overhaul: landing, onboarding, home, library, detail, activity, settings" 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
git push origin main
if ($LASTEXITCODE -ne 0) { throw "push 실패" }
Remove-Item "hub-ui.zip" -Force
Write-Host "`n✔ 완료 — Vercel 이 1~2분 내 재배포합니다." -ForegroundColor Green
Read-Host "엔터를 누르면 닫힙니다"
