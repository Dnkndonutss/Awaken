begin;
create table public.awaken_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarding_status text not null default 'pending' check(onboarding_status in ('pending','complete')),
  onboarding_completed_at timestamptz, onboarding_data_version integer not null default 1,
  display_name text not null default '' check(length(display_name)<=80), primary_goal text not null default '', motivation text not null default '', target_timeframe text not null default '',
  preset_id text not null default 'balanced', main_arc_id text not null default 'creator', arc_theme_id text not null default 'minimal',
  prioritized_categories text[] not null default '{}', difficulty text not null default 'standard' check(difficulty in ('casual','standard','challenging','intense')),
  daily_reset_time time not null default '04:00', time_zone text not null default 'UTC', active_days smallint[] not null default '{1,2,3,4,5,6,0}',
  reminders_enabled boolean not null default false, reminder_times time[] not null default '{}', reminder_types text[] not null default '{}',
  preferred_tasks jsonb not null default '[]', appearance jsonb not null default '{"theme":"minimal"}', notification_permission text not null default 'default',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.awaken_user_settings enable row level security;
create policy "own onboarding settings" on public.awaken_user_settings for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

-- Accounts that already own progress are existing users and must never be gated or overwritten.
insert into public.awaken_user_settings(user_id,onboarding_status,onboarding_completed_at,display_name,main_arc_id,arc_theme_id,primary_goal)
select s.user_id,'complete',coalesce(s.created_at,now()),coalesce(s.state#>>'{profile,displayName}','Player'),coalesce(s.state#>>'{profile,mainArcId}','creator'),coalesce(s.state#>>'{profile,arcThemeId}','minimal'),'Continue existing Awaken progress'
from public.awaken_states s on conflict(user_id) do nothing;

create or replace function public.complete_awaken_onboarding(p_settings jsonb,p_state jsonb,p_operation_id uuid,p_data_version integer)
returns table(state jsonb,revision bigint,settings jsonb) language plpgsql security invoker as $$
declare uid uuid:=auth.uid(); existing public.awaken_user_settings; rev bigint;
begin
  if uid is null then raise exception 'unauthorized'; end if;
  select * into existing from public.awaken_user_settings where user_id=uid for update;
  if existing.onboarding_status='complete' then
    return query select s.state,s.revision,to_jsonb(existing)-'user_id' from public.awaken_states s where s.user_id=uid; return;
  end if;
  if exists(select 1 from public.awaken_states where user_id=uid) then raise exception 'existing progress cannot be replaced by onboarding'; end if;
  insert into public.awaken_states(user_id,state,data_version,revision) values(uid,p_state,p_data_version,1) returning awaken_states.revision into rev;
  perform public.sync_awaken_relational(uid,p_state,p_data_version,p_operation_id);
  insert into public.awaken_operations(user_id,operation_id,kind) values(uid,p_operation_id,'onboarding');
  insert into public.awaken_user_settings(user_id,onboarding_status,onboarding_completed_at,onboarding_data_version,display_name,primary_goal,motivation,target_timeframe,preset_id,main_arc_id,arc_theme_id,prioritized_categories,difficulty,daily_reset_time,time_zone,active_days,reminders_enabled,reminder_times,reminder_types,preferred_tasks,appearance,notification_permission)
  values(uid,'complete',now(),coalesce((p_settings->>'onboarding_data_version')::int,1),p_settings->>'display_name',p_settings->>'primary_goal',coalesce(p_settings->>'motivation',''),coalesce(p_settings->>'target_timeframe',''),p_settings->>'preset_id',p_settings->>'main_arc_id',p_settings->>'arc_theme_id',array(select jsonb_array_elements_text(p_settings->'prioritized_categories')),p_settings->>'difficulty',(p_settings->>'daily_reset_time')::time,p_settings->>'time_zone',array(select jsonb_array_elements_text(p_settings->'active_days'))::smallint[],coalesce((p_settings->>'reminders_enabled')::boolean,false),array(select jsonb_array_elements_text(p_settings->'reminder_times'))::time[],array(select jsonb_array_elements_text(p_settings->'reminder_types')),coalesce(p_settings->'preferred_tasks','[]'),coalesce(p_settings->'appearance','{}'),coalesce(p_settings->>'notification_permission','default'))
  on conflict(user_id) do update set onboarding_status='complete',onboarding_completed_at=now(),display_name=excluded.display_name,primary_goal=excluded.primary_goal,motivation=excluded.motivation,target_timeframe=excluded.target_timeframe,preset_id=excluded.preset_id,main_arc_id=excluded.main_arc_id,arc_theme_id=excluded.arc_theme_id,prioritized_categories=excluded.prioritized_categories,difficulty=excluded.difficulty,daily_reset_time=excluded.daily_reset_time,time_zone=excluded.time_zone,active_days=excluded.active_days,reminders_enabled=excluded.reminders_enabled,reminder_times=excluded.reminder_times,reminder_types=excluded.reminder_types,preferred_tasks=excluded.preferred_tasks,appearance=excluded.appearance,updated_at=now();
  return query select p_state,rev,to_jsonb(u)-'user_id' from public.awaken_user_settings u where u.user_id=uid;
end $$;
commit;
