-- 0002: 사이트 내 설정 저장 + 원클릭 설치 토큰
-- 실행: Supabase SQL Editor 에 붙여넣기 → Run

-- 사용자 설정 (Claude API 키, 승인 정책, 기본 워크스페이스 등). 본인만 RLS 로 접근
alter table public.profiles add column if not exists settings jsonb not null default '{}'::jsonb;

-- 페어링 코드는 6자리 숫자 또는 설치 토큰(긴 문자열) 모두 허용 (컬럼은 text 라 스키마 변경 불필요)
-- 디바이스별 설정: 워크스페이스 경로는 사이트에서 수정 가능 (기존 컬럼 사용)
