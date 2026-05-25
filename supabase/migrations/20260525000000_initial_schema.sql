create extension if not exists pgcrypto with schema extensions;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  revenuecat_app_user_id text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  anonymous_user_id text primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_outcome_reports (
  id uuid primary key default gen_random_uuid(),
  anonymous_user_id text not null,
  report_target text not null,
  report_reason text not null,
  current_scene text,
  turn_count integer,
  location_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.crown_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount integer not null,
  source text not null check (source in (
    'free_daily',
    'rewarded_ad',
    'subscription',
    'topup',
    'ai_turn',
    'admin_adjustment',
    'refund'
  )),
  reason text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.crown_wallets (
  user_id uuid primary key references public.users(id) on delete cascade,
  free_crowns integer not null default 0 check (free_crowns >= 0),
  rewarded_crowns integer not null default 0 check (rewarded_crowns >= 0),
  subscription_crowns integer not null default 0 check (subscription_crowns >= 0),
  topup_crowns integer not null default 0 check (topup_crowns >= 0),
  free_granted_at timestamptz,
  rewarded_ads_watched_today integer not null default 0 check (rewarded_ads_watched_today >= 0),
  rewarded_window_started_at timestamptz,
  subscription_tier text not null default 'free' check (subscription_tier in (
    'free',
    'society_patron',
    'court_favourite'
  )),
  subscription_period_start timestamptz,
  subscription_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.revenuecat_events (
  id uuid primary key default gen_random_uuid(),
  revenuecat_event_id text unique,
  app_user_id text not null,
  event_type text not null,
  product_id text,
  entitlement_id text,
  purchased_at timestamptz,
  expiration_at timestamptz,
  raw_event jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create table if not exists public.story_states (
  user_id uuid primary key references public.users(id) on delete cascade,
  story_id uuid not null default gen_random_uuid(),
  turn_count integer not null default 0 check (turn_count >= 0),
  current_location_id text not null default 'home',
  current_phase text not null default 'opening',
  memory_summary text not null default '',
  adjacent_location_history_json jsonb not null default '[]'::jsonb,
  recent_extras_json jsonb not null default '{}'::jsonb,
  major_characters_json jsonb not null default '{}'::jsonb,
  relationships_json jsonb not null default '{}'::jsonb,
  hidden_stats_json jsonb not null default '{"scandal": 0, "ambition": 0, "security": 0, "familyDuty": 0, "reputation": 0, "courtFavour": 0}'::jsonb,
  ending_risk_json jsonb not null default '{}'::jsonb,
  last_scene_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_turns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  story_id uuid,
  model text not null default 'gpt-4o-mini',
  request_json jsonb not null default '{}'::jsonb,
  response_json jsonb not null default '{}'::jsonb,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  status text not null default 'pending' check (status in ('pending', 'valid', 'invalid', 'failed')),
  crown_charged boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ai_turns_user_created_idx on public.ai_turns (user_id, created_at desc);
create index if not exists crown_ledger_user_created_idx on public.crown_ledger (user_id, created_at desc);
create index if not exists ai_outcome_reports_created_idx on public.ai_outcome_reports (created_at desc);
create index if not exists revenuecat_events_app_user_idx on public.revenuecat_events (app_user_id, processed_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_crown_wallets_updated_at on public.crown_wallets;
create trigger set_crown_wallets_updated_at
before update on public.crown_wallets
for each row execute function public.set_updated_at();

drop trigger if exists set_story_states_updated_at on public.story_states;
create trigger set_story_states_updated_at
before update on public.story_states
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.user_settings enable row level security;
alter table public.ai_outcome_reports enable row level security;
alter table public.ai_turns enable row level security;
alter table public.crown_ledger enable row level security;
alter table public.crown_wallets enable row level security;
alter table public.revenuecat_events enable row level security;
alter table public.story_states enable row level security;
