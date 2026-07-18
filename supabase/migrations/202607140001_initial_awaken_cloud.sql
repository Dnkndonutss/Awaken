begin;
create extension if not exists pgcrypto;
create table public.user_profiles (user_id uuid primary key references auth.users(id) on delete cascade, display_name text not null check(length(display_name) between 1 and 80), main_arc_id text not null, arc_theme_id text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.user_preferences (user_id uuid primary key references auth.users(id) on delete cascade, preferences jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table public.awaken_records (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check(record_type in ('stat','custom_positive_task','custom_negative_action','daily_quest','quest_completion','weekly_boss','boss_activity','daily_review','weekly_reflection','insight','main_arc','selected_goal')),
  natural_key text not null, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,record_type,natural_key)
);
create index awaken_records_owner_type_idx on public.awaken_records(user_id,record_type);

create table public.awaken_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  data_version integer not null check (data_version > 0),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.awaken_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null, kind text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);
create table public.xp_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null, source_type text not null, source_id text, stat text not null,
  xp_amount integer not null check (xp_amount between -100000 and 100000), reversal_of uuid references public.xp_events(id),
  payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  unique(user_id, operation_id)
);
create index xp_events_user_created_idx on public.xp_events(user_id, created_at desc);

alter table public.awaken_states enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.awaken_records enable row level security;
alter table public.awaken_operations enable row level security;
alter table public.xp_events enable row level security;
create policy "own state" on public.awaken_states for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own profile" on public.user_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own preferences" on public.user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own records" on public.awaken_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own operations" on public.awaken_operations for select using (auth.uid() = user_id);
create policy "own xp events" on public.xp_events for select using (auth.uid() = user_id);

create or replace function public.save_awaken_state(p_state jsonb, p_expected_revision bigint, p_operation_id uuid, p_data_version integer)
returns table(state jsonb, revision bigint, updated_at timestamptz) language plpgsql security invoker as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'unauthorized'; end if;
  if exists(select 1 from public.awaken_operations o where o.user_id=uid and o.operation_id=p_operation_id) then
    return query select s.state,s.revision,s.updated_at from public.awaken_states s where s.user_id=uid; return;
  end if;
  insert into public.awaken_states(user_id,state,data_version,revision) values(uid,p_state,p_data_version,1)
  on conflict(user_id) do update set state=excluded.state,data_version=excluded.data_version,revision=public.awaken_states.revision+1,updated_at=now()
  where public.awaken_states.revision=p_expected_revision;
  if not found then raise sqlstate '40001' using message='revision conflict'; end if;
  insert into public.awaken_operations values(uid,p_operation_id,'save',now());
  return query select s.state,s.revision,s.updated_at from public.awaken_states s where s.user_id=uid;
end $$;

create or replace function public.restore_awaken_state(p_state jsonb,p_operation_id uuid,p_data_version integer)
returns table(state jsonb, revision bigint, updated_at timestamptz) language plpgsql security invoker as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'unauthorized'; end if;
  if exists(select 1 from public.awaken_operations o where o.user_id=uid and o.operation_id=p_operation_id) then return query select s.state,s.revision,s.updated_at from public.awaken_states s where s.user_id=uid; return; end if;
  insert into public.awaken_states(user_id,state,data_version,revision) values(uid,p_state,p_data_version,1)
  on conflict(user_id) do update set state=excluded.state,data_version=excluded.data_version,revision=public.awaken_states.revision+1,updated_at=now();
  insert into public.awaken_operations values(uid,p_operation_id,'restore',now());
  return query select s.state,s.revision,s.updated_at from public.awaken_states s where s.user_id=uid;
end $$;
commit;
