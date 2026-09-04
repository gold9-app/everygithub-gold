# everygithub_gold — 허브 재설치 + GitHub 푸시 (더블클릭 실행용)
# 실행: 파일 우클릭 → "PowerShell로 실행"  또는  powershell -ExecutionPolicy Bypass -File .\scripts\setup-and-push.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
Write-Host "`n== everygithub_gold 설정 ==  ($root)`n" -ForegroundColor Yellow

# 1) 허브 의존성 재설치 (Next.js 패치 반영)
Write-Host "[1/3] 허브 의존성 재설치" -ForegroundColor Cyan
Set-Location "$root\apps\hub"
$nextPkg = "node_modules\next\package.json"
if ((Test-Path $nextPkg) -and ((Get-Content $nextPkg -Raw) -match '"version":\s*"15\.5')) {
  Write-Host "  이미 최신 (Next 15.5) — 건너뜀"
} else {
  if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
  if (Test-Path package-lock.json) { Remove-Item -Force package-lock.json }
  npm install
  if ($LASTEXITCODE -ne 0) { throw "npm install 실패" }
}
Set-Location $root

# 2) git 초기화 + 커밋
Write-Host "`n[2/3] git 커밋" -ForegroundColor Cyan
# D: 드라이브가 소유자 정보를 기록하지 않는 파일시스템이라 git 안전 확인 예외 등록
git config --global --add safe.directory "$($root -replace '\\','/')"
git config --global --add safe.directory '*'
if (-not (Test-Path .git)) { git init | Out-Null; git branch -M main }
if (-not (git config user.email)) { git config user.email "gold9-app@users.noreply.github.com"; git config user.name "gold9-app" }
git add .
$ErrorActionPreference = "Continue"
git commit -m "everygithub_gold skeleton" 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
git log --oneline -1

# 3) GitHub 푸시
Write-Host "`n[3/3] GitHub 푸시" -ForegroundColor Cyan
$remote = "https://github.com/gold9-app/everygithub-gold.git"
git branch -M main
$ErrorActionPreference = "Continue"
git remote remove origin 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
git remote add origin $remote
# 원격에 README 초기 커밋이 있으므로 덮어씀 (최초 1회)
git push -u origin main --force
if ($LASTEXITCODE -ne 0) { throw "push 실패 — GitHub 로그인 창을 승인했는지 확인" }

Write-Host "`n✔ 완료: $remote" -ForegroundColor Green
Write-Host "이 주소를 Claude 에게 알려주세요.`n"
Read-Host "엔터를 누르면 닫힙니다"
