-- everygithub_gold — 초기 스키마
-- 실행: Supabase Dashboard > SQL Editor 에 붙여넣기, 또는 `supabase db push`

create extension if not exists "pgcrypto";

-- 사용자 프로필 (auth.users 와 1:1)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_login text,
  telegram_chat_id text unique,
  created_at timestamptz default now()
);

-- 가입 시 프로필 자동 생성
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, github_login)
  values (new.id, new.raw_user_meta_data->>'user_name');
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

-- 페어링 코드 (6자리, 10분 유효, 1회용)
create table public.pairing_codes (
  code text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- 디바이스(에이전트 설치된 PC)
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  os text not null check (os in ('windows','mac','linux')),
  agent_version text not null,
  workspace_path text not null,
  token_hash text not null,        -- 에이전트 토큰 sha256
  last_seen timestamptz,
  created_at timestamptz default now()
);
create index on public.devices(user_id);

-- 클론된 레포
create table public.repos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  url text not null,
  owner text not null,
  name text not null,
  ref text,
  local_path text not null,
  stack jsonb,
  license text,
  stars int,
  tags text[] default '{}',
  cloned_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (device_id, local_path)
);
create index on public.repos(user_id);

-- 잡 큐. 에이전트는 자기 device_id 의 insert/update 를 Realtime 으로 구독
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  repo_id uuid references public.repos(id) on delete set null,
  source jsonb not null,
  pipeline text not null,
  steps text[] not null,
  options jsonb not null default '{}',
  status text not null default 'queued'
    check (status in ('queued','running','waiting_approval','done','failed','cancelled')),
  origin jsonb not null,
  created_at timestamptz default now(),
  finished_at timestamptz
);
create index on public.jobs(device_id, status);
create index on public.jobs(user_id, created_at desc);

-- 잡 로그/결과 이벤트
create table public.job_events (
  id bigserial primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  step text not null,
  level text not null,
  payload jsonb not null default '{}',
  ts timestamptz default now()
);
create index on public.job_events(job_id, id);

-- 산출물 (설명서, 트리, SKILL.md 등) — 개인 사이트 아카이브의 본체
create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  repo_id uuid not null references public.repos(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  kind text not null,
  content text not null,
  share_token text unique,
  created_at timestamptz default now()
);
create index on public.artifacts(repo_id, kind);

-- 텔레그램 연결 코드 (사이트에서 발급 → 봇에 입력)
create table public.channel_link_codes (
  code text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- Realtime 발행
alter publication supabase_realtime add table public.jobs;
alter publication supabase_realtime add table public.job_events;

-- RLS: 사용자는 자기 행만. 에이전트는 service role 을 쓰는 허브 API 를 통해서만 쓰기.
alter table public.profiles enable row level security;
alter table public.pairing_codes enable row level security;
alter table public.devices enable row level security;
alter table public.repos enable row level security;
alter table public.jobs enable row level security;
alter table public.job_events enable row level security;
alter table public.artifacts enable row level security;
alter table public.channel_link_codes enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id);
create policy "own pairing" on public.pairing_codes for all using (auth.uid() = user_id);
create policy "own devices" on public.devices for all using (auth.uid() = user_id);
create policy "own repos" on public.repos for all using (auth.uid() = user_id);
create policy "own jobs" on public.jobs for all using (auth.uid() = user_id);
create policy "own job_events" on public.job_events for select
  using (exists (select 1 from public.jobs j where j.id = job_id and j.user_id = auth.uid()));
create policy "own artifacts" on public.artifacts for all using (auth.uid() = user_id);
create policy "shared artifacts" on public.artifacts for select using (share_token is not null);
create policy "own link codes" on public.channel_link_codes for all using (auth.uid() = user_id);
