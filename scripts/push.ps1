# 변경 사항 커밋 + 푸시 (Vercel 자동 재배포)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
git add .
$msg = Read-Host "커밋 메시지 (엔터 = update)"
if (-not $msg) { $msg = "update" }
$ErrorActionPreference = "Continue"
git commit -m $msg 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
git push origin main
if ($LASTEXITCODE -ne 0) { throw "push 실패" }
Write-Host "`n✔ 푸시 완료 — Vercel 이 1~2분 내 자동 재배포합니다." -ForegroundColor Green
Read-Host "엔터를 누르면 닫힙니다"
