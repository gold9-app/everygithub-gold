-- 0003: 잡 결과 요약 (실패 사유, 건너뛴 스텝) — 화면에 바로 표시하기 위함
alter table public.jobs add column if not exists error text;
alter table public.jobs add column if not exists skipped jsonb not null default '[]'::jsonb;
