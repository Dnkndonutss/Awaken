begin;

alter table public.user_profiles
  add column if not exists discipline_tier_id text not null default 'untrained',
  add column if not exists discipline_xp integer not null default 0,
  add column if not exists overall_xp integer not null default 0,
  add column if not exists overall_level integer not null default 0,
  add column if not exists rank_id text not null default 'bronze';

create table public.stat_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  stat text not null check (stat in ('strength','intelligence','vitality','wealth','charisma')),
  cached_xp integer not null default 0 check (cached_xp >= 0),
  cached_level integer not null default 0 check (cached_level >= 0),
  ledger_verified_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, stat)
);
create table public.custom_tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, kind text not null check (kind in ('positive','negative')),
  title text not null check (length(title) between 1 and 240), description text,
  stat text not null check (stat in ('strength','intelligence','vitality','wealth','charisma')),
  xp_value integer not null check (xp_value between 0 and 100000), tags text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create table public.task_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, task_id text not null, operation_id uuid not null,
  completed_at timestamptz not null, metadata jsonb not null default '{}',
  primary key (user_id,id), unique(user_id,operation_id)
);
create index task_completions_owner_time_idx on public.task_completions(user_id,completed_at desc);
create table public.negative_action_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, action_id text not null, operation_id uuid not null,
  occurred_at timestamptz not null, metadata jsonb not null default '{}',
  primary key(user_id,id), unique(user_id,operation_id)
);
create index negative_actions_owner_time_idx on public.negative_action_events(user_id,occurred_at desc);
create table public.daily_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, quest_date date not null, title text not null, description text not null default '',
  linked_task_id text, target_stat text not null, xp_reward integer not null check(xp_reward >= 0),
  quest_type text not null, source_task_ids text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(user_id,id), unique(user_id,quest_date,quest_type)
);
create index daily_quests_owner_date_idx on public.daily_quests(user_id,quest_date desc);
create table public.quest_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null, completed_at timestamptz not null, operation_id uuid not null,
  reversed_at timestamptz, metadata jsonb not null default '{}',
  primary key(user_id,quest_id), unique(user_id,operation_id),
  foreign key(user_id,quest_id) references public.daily_quests(user_id,id) on delete cascade
);
create table public.weekly_bosses (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, name text not null, description text not null default '',
  week_start_date date not null, week_end_date date not null, target_stat text not null,
  max_hp integer not null check(max_hp > 0), current_hp integer not null check(current_hp >= 0),
  status text not null check(status in ('active','defeated','escaped')), rewards jsonb not null default '{}',
  rewards_claimed boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(user_id,id), unique(user_id,week_start_date)
);
create table public.boss_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, boss_id text, operation_id uuid not null, activity_type text not null,
  hp_amount integer not null default 0, occurred_at timestamptz not null, metadata jsonb not null default '{}',
  primary key(user_id,id), unique(user_id,operation_id)
);
create index boss_activity_owner_time_idx on public.boss_activity(user_id,occurred_at desc);
create table public.daily_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, review_date date not null, biggest_win text not null default '', biggest_mistake text not null default '',
  energy_level integer not null check(energy_level between 1 and 10), mood_level integer not null check(mood_level between 1 and 10),
  had_negative_action boolean not null, negative_action_reason text, tomorrow_focus text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null,
  primary key(user_id,id), unique(user_id,review_date)
);
create table public.weekly_reflections (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, week_start_date date not null, week_end_date date not null,
  biggest_win text not null default '', biggest_setback text not null default '', lesson_learned text not null default '', next_week_focus text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null,
  primary key(user_id,id), unique(user_id,week_start_date)
);
create table public.generated_insights (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, insight_date date not null, summary text not null, data jsonb not null default '{}',
  created_at timestamptz not null, primary key(user_id,id), unique(user_id,insight_date)
);
create table public.user_arcs (
  user_id uuid not null references auth.users(id) on delete cascade,
  arc_id text not null, selected boolean not null default false, progress jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(user_id,arc_id)
);
create table public.selected_goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, title text not null, status text not null default 'active', metadata jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(user_id,id)
);
create table public.goal_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id text not null, progress_value numeric not null default 0, metadata jsonb not null default '{}', updated_at timestamptz not null default now(),
  primary key(user_id,goal_id), foreign key(user_id,goal_id) references public.selected_goals(user_id,id) on delete cascade
);
create table public.awaken_data_migrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  migration_key text not null, source_version integer not null, target_version integer not null,
  status text not null check(status in ('running','completed','failed','rolled_back')),
  details jsonb not null default '{}', started_at timestamptz not null default now(), completed_at timestamptz,
  primary key(user_id,migration_key)
);
create table public.awaken_snapshot_recovery (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  migration_key text not null, state jsonb not null, data_version integer not null, revision bigint not null,
  created_at timestamptz not null default now(), unique(user_id,migration_key)
);

alter table public.xp_events add column if not exists event_key text not null default 'primary';
alter table public.xp_events drop constraint if exists xp_events_user_id_operation_id_key;
alter table public.xp_events add constraint xp_events_operation_event_key unique(user_id,operation_id,event_key);
alter table public.xp_events add constraint xp_events_no_self_reversal check(reversal_of is null or reversal_of <> id);

do $$ declare table_name text; begin
  foreach table_name in array array['stat_progress','custom_tasks','task_completions','negative_action_events','daily_quests','quest_completions','weekly_bosses','boss_activity','daily_reviews','weekly_reflections','generated_insights','user_arcs','selected_goals','goal_progress','awaken_data_migrations','awaken_snapshot_recovery']
  loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)','own_'||table_name,table_name);
  end loop;
end $$;

create or replace function public.sync_awaken_relational(p_user uuid,p_state jsonb,p_data_version integer,p_operation_id uuid)
returns void language plpgsql security invoker as $$
declare item jsonb; event jsonb; entry jsonb; stat_row jsonb; boss jsonb; stat_name text; expected_xp integer; ledger_xp integer; delta integer;
begin
  if p_user is null or jsonb_typeof(p_state) <> 'object' or jsonb_typeof(p_state->'profile') <> 'object' or jsonb_typeof(p_state->'activityLog') <> 'array' then raise exception 'invalid Awaken state'; end if;

  insert into public.user_profiles(user_id,display_name,main_arc_id,arc_theme_id,discipline_tier_id,discipline_xp,overall_xp,overall_level,rank_id,created_at,updated_at)
  values(p_user,p_state#>>'{profile,displayName}',p_state#>>'{profile,mainArcId}',p_state#>>'{profile,arcThemeId}',coalesce(p_state#>>'{profile,disciplineTierId}','untrained'),coalesce((p_state#>>'{profile,disciplineXp}')::integer,0),coalesce((p_state#>>'{profile,overallXp}')::integer,0),coalesce((p_state#>>'{profile,overallLevel}')::integer,0),coalesce(p_state#>>'{profile,rankId}','bronze'),coalesce((p_state#>>'{profile,createdAt}')::timestamptz,now()),now())
  on conflict(user_id) do update set display_name=excluded.display_name,main_arc_id=excluded.main_arc_id,arc_theme_id=excluded.arc_theme_id,discipline_tier_id=excluded.discipline_tier_id,discipline_xp=excluded.discipline_xp,overall_xp=excluded.overall_xp,overall_level=excluded.overall_level,rank_id=excluded.rank_id,updated_at=now();
  insert into public.user_preferences(user_id,preferences,updated_at) values(p_user,jsonb_build_object('questRerollCount',coalesce(p_state->'questRerollCount','0'::jsonb),'awardedQuestBonusMilestones',coalesce(p_state->'awardedQuestBonusMilestones','[]'::jsonb)),now()) on conflict(user_id) do update set preferences=excluded.preferences,updated_at=now();
  insert into public.user_arcs(user_id,arc_id,selected,progress) values(p_user,p_state#>>'{profile,mainArcId}',true,jsonb_build_object('overallXp',coalesce(p_state#>'{profile,overallXp}','0'::jsonb))) on conflict(user_id,arc_id) do update set selected=true,progress=excluded.progress,updated_at=now();

  for stat_row in select value from jsonb_array_elements(coalesce(p_state#>'{profile,stats}','[]'::jsonb)) loop
    insert into public.stat_progress(user_id,stat,cached_xp,cached_level,updated_at) values(p_user,stat_row->>'stat',greatest((stat_row->>'currentXp')::integer,0),greatest((stat_row->>'level')::integer,0),now()) on conflict(user_id,stat) do update set cached_xp=excluded.cached_xp,cached_level=excluded.cached_level,updated_at=now();
  end loop;
  for item in select value from jsonb_array_elements(coalesce(p_state->'customPositiveTasks','[]'::jsonb)) loop
    insert into public.custom_tasks(user_id,id,kind,title,description,stat,xp_value,tags,updated_at) values(p_user,item->>'id','positive',item->>'title',item->>'description',item->>'stat',(item->>'baseXp')::integer,array(select jsonb_array_elements_text(coalesce(item->'tags','[]'::jsonb))),now()) on conflict(user_id,id) do update set title=excluded.title,description=excluded.description,stat=excluded.stat,xp_value=excluded.xp_value,tags=excluded.tags,updated_at=now();
  end loop;
  for item in select value from jsonb_array_elements(coalesce(p_state->'customNegativeActions','[]'::jsonb)) loop
    insert into public.custom_tasks(user_id,id,kind,title,description,stat,xp_value,tags,updated_at) values(p_user,item->>'id','negative',item->>'title',item->>'description',item->>'stat',(item->>'xpPenalty')::integer,array(select jsonb_array_elements_text(coalesce(item->'tags','[]'::jsonb))),now()) on conflict(user_id,id) do update set title=excluded.title,description=excluded.description,stat=excluded.stat,xp_value=excluded.xp_value,tags=excluded.tags,updated_at=now();
  end loop;
  for item in select value from jsonb_array_elements(coalesce(p_state->'dailyQuests','[]'::jsonb)) loop
    insert into public.daily_quests(user_id,id,quest_date,title,description,linked_task_id,target_stat,xp_reward,quest_type,source_task_ids,updated_at) values(p_user,item->>'id',(item->>'date')::date,item->>'title',coalesce(item->>'description',''),item->>'linkedTaskId',item->>'targetStat',(item->>'xpReward')::integer,item->>'questType',array(select jsonb_array_elements_text(coalesce(item->'sourceTaskIds','[]'::jsonb))),now()) on conflict(user_id,id) do update set title=excluded.title,description=excluded.description,linked_task_id=excluded.linked_task_id,target_stat=excluded.target_stat,xp_reward=excluded.xp_reward,source_task_ids=excluded.source_task_ids,updated_at=now();
    if coalesce((item->>'completed')::boolean,false) and item ? 'completedAt' then insert into public.quest_completions(user_id,quest_id,completed_at,operation_id,metadata) values(p_user,item->>'id',(item->>'completedAt')::timestamptz,md5(p_user::text||':quest:'||(item->>'id'))::uuid,item) on conflict(user_id,quest_id) do update set completed_at=excluded.completed_at,reversed_at=null,metadata=excluded.metadata; end if;
  end loop;
  for boss in select value from jsonb_array_elements(jsonb_build_array(p_state->'activeBoss') || coalesce(p_state->'bossHistory','[]'::jsonb)) where value is not null and jsonb_typeof(value)='object' loop
    insert into public.weekly_bosses(user_id,id,name,description,week_start_date,week_end_date,target_stat,max_hp,current_hp,status,rewards,rewards_claimed,updated_at) values(p_user,boss->>'id',boss->>'name',coalesce(boss->>'description',''),(boss->>'weekStartDate')::date,(boss->>'weekEndDate')::date,boss->>'targetStat',(boss->>'maxHp')::integer,(boss->>'currentHp')::integer,boss->>'status',coalesce(boss->'rewards','{}'::jsonb),coalesce((boss->>'rewardsClaimed')::boolean,false),now()) on conflict(user_id,id) do update set current_hp=excluded.current_hp,status=excluded.status,rewards=excluded.rewards,rewards_claimed=excluded.rewards_claimed,updated_at=now();
  end loop;
  for item in select value from jsonb_array_elements(coalesce(p_state->'dailyReviews','[]'::jsonb)) loop
    insert into public.daily_reviews(user_id,id,review_date,biggest_win,biggest_mistake,energy_level,mood_level,had_negative_action,negative_action_reason,tomorrow_focus,updated_at) values(p_user,item->>'id',(item->>'date')::date,coalesce(item->>'biggestWin',''),coalesce(item->>'biggestMistake',''),(item->>'energyLevel')::integer,(item->>'moodLevel')::integer,coalesce((item->>'hadNegativeAction')::boolean,false),item->>'negativeActionReason',coalesce(item->>'tomorrowFocus',''),(item->>'updatedAt')::timestamptz) on conflict(user_id,id) do update set biggest_win=excluded.biggest_win,biggest_mistake=excluded.biggest_mistake,energy_level=excluded.energy_level,mood_level=excluded.mood_level,had_negative_action=excluded.had_negative_action,negative_action_reason=excluded.negative_action_reason,tomorrow_focus=excluded.tomorrow_focus,updated_at=excluded.updated_at;
  end loop;
  for item in select value from jsonb_array_elements(coalesce(p_state->'weeklyReflections','[]'::jsonb)) loop
    insert into public.weekly_reflections(user_id,id,week_start_date,week_end_date,biggest_win,biggest_setback,lesson_learned,next_week_focus,updated_at) values(p_user,item->>'id',(item->>'weekStartDate')::date,(item->>'weekEndDate')::date,coalesce(item->>'biggestWin',''),coalesce(item->>'biggestSetback',''),coalesce(item->>'lessonLearned',''),coalesce(item->>'nextWeekFocus',''),(item->>'updatedAt')::timestamptz) on conflict(user_id,id) do update set biggest_win=excluded.biggest_win,biggest_setback=excluded.biggest_setback,lesson_learned=excluded.lesson_learned,next_week_focus=excluded.next_week_focus,updated_at=excluded.updated_at;
  end loop;
  for item in select value from jsonb_array_elements(coalesce(p_state->'dailyInsights','[]'::jsonb)) loop
    insert into public.generated_insights(user_id,id,insight_date,summary,data,created_at) values(p_user,item->>'id',(item->>'date')::date,item->>'summary',item,(item->>'createdAt')::timestamptz) on conflict(user_id,id) do update set summary=excluded.summary,data=excluded.data;
  end loop;

  for event in select value from jsonb_array_elements(coalesce(p_state->'activityLog','[]'::jsonb)) loop
    if event->>'kind'='xp' then
      entry:=event#>'{result,logEntry}';
      insert into public.xp_events(id,user_id,operation_id,event_key,source_type,source_id,stat,xp_amount,payload,created_at)
      values(md5(p_user::text||':xp:'||(entry->>'id'))::uuid,p_user,md5(p_user::text||':xp-op:'||(entry->>'id'))::uuid,entry->>'id',entry->>'sourceType',entry->>'sourceId',entry->>'stat',(entry->>'xpAmount')::integer,event,(entry->>'createdAt')::timestamptz)
      on conflict(user_id,operation_id,event_key) do nothing;
      if entry->>'sourceType'='positive_task' then insert into public.task_completions(user_id,id,task_id,operation_id,completed_at,metadata) values(p_user,entry->>'id',coalesce(entry->>'sourceId','unknown'),md5(p_user::text||':task:'||(entry->>'id'))::uuid,(entry->>'createdAt')::timestamptz,event) on conflict(user_id,id) do nothing; end if;
      if entry->>'sourceType'='negative_action' then insert into public.negative_action_events(user_id,id,action_id,operation_id,occurred_at,metadata) values(p_user,entry->>'id',coalesce(entry->>'sourceId','unknown'),md5(p_user::text||':negative:'||(entry->>'id'))::uuid,(entry->>'createdAt')::timestamptz,event) on conflict(user_id,id) do nothing; end if;
    elsif event->>'kind'='boss' then
      insert into public.boss_activity(user_id,id,boss_id,operation_id,activity_type,hp_amount,occurred_at,metadata) values(p_user,event->>'id',p_state#>>'{activeBoss,id}',md5(p_user::text||':boss:'||(event->>'id'))::uuid,event->>'combatType',(event->>'hpAmount')::integer,(event->>'createdAt')::timestamptz,event) on conflict(user_id,id) do nothing;
    end if;
  end loop;

  update public.xp_events reversal set reversal_of=original.id from public.xp_events original where reversal.user_id=p_user and reversal.reversal_of is null and reversal.source_id like '%-undo' and original.user_id=reversal.user_id and original.source_id=left(reversal.source_id,-5) and original.xp_amount>0 and reversal.xp_amount<0;
  foreach stat_name in array array['strength','intelligence','vitality','wealth','charisma'] loop
    select coalesce((s->>'currentXp')::integer,0) into expected_xp from jsonb_array_elements(coalesce(p_state#>'{profile,stats}','[]'::jsonb)) s where s->>'stat'=stat_name;
    select coalesce(sum(xp_amount),0) into ledger_xp from public.xp_events where user_id=p_user and stat=stat_name;
    delta:=coalesce(expected_xp,0)-ledger_xp;
    if delta<>0 then insert into public.xp_events(user_id,operation_id,event_key,source_type,source_id,stat,xp_amount,payload) values(p_user,p_operation_id,'reconcile:'||stat_name,'snapshot_reconciliation','snapshot-v'||p_data_version,stat_name,delta,jsonb_build_object('reason','snapshot ledger reconciliation')) on conflict(user_id,operation_id,event_key) do nothing; end if;
    select greatest(coalesce(sum(xp_amount),0),0) into ledger_xp from public.xp_events where user_id=p_user and stat=stat_name;
    insert into public.stat_progress(user_id,stat,cached_xp,cached_level,ledger_verified_at,updated_at) values(p_user,stat_name,ledger_xp,floor(sqrt(ledger_xp::numeric/100))::integer,now(),now()) on conflict(user_id,stat) do update set cached_xp=excluded.cached_xp,cached_level=excluded.cached_level,ledger_verified_at=now(),updated_at=now();
  end loop;
  insert into public.awaken_data_migrations(user_id,migration_key,source_version,target_version,status,details,completed_at) values(p_user,'relational-v1',p_data_version,4,'completed',jsonb_build_object('operationId',p_operation_id),now()) on conflict(user_id,migration_key) do update set status='completed',details=excluded.details,completed_at=now();
end $$;

create or replace function public.save_awaken_state(p_state jsonb,p_expected_revision bigint,p_operation_id uuid,p_data_version integer)
returns table(state jsonb,revision bigint,updated_at timestamptz) language plpgsql security invoker as $$
declare uid uuid:=auth.uid(); begin
  if uid is null then raise exception 'unauthorized'; end if;
  if exists(select 1 from public.awaken_operations o where o.user_id=uid and o.operation_id=p_operation_id) then return query select s.state,s.revision,s.updated_at from public.awaken_states s where s.user_id=uid; return; end if;
  insert into public.awaken_states(user_id,state,data_version,revision) values(uid,p_state,p_data_version,1) on conflict(user_id) do update set state=excluded.state,data_version=excluded.data_version,revision=public.awaken_states.revision+1,updated_at=now() where public.awaken_states.revision=p_expected_revision;
  if not found then raise sqlstate '40001' using message='revision conflict'; end if;
  perform public.sync_awaken_relational(uid,p_state,p_data_version,p_operation_id);
  insert into public.awaken_operations values(uid,p_operation_id,'save',now());
  return query select s.state,s.revision,s.updated_at from public.awaken_states s where s.user_id=uid;
end $$;

create or replace function public.restore_awaken_state(p_state jsonb,p_operation_id uuid,p_data_version integer)
returns table(state jsonb,revision bigint,updated_at timestamptz) language plpgsql security invoker as $$
declare uid uuid:=auth.uid(); current_revision bigint; begin
  if uid is null then raise exception 'unauthorized'; end if;
  if exists(select 1 from public.awaken_operations o where o.user_id=uid and o.operation_id=p_operation_id) then return query select s.state,s.revision,s.updated_at from public.awaken_states s where s.user_id=uid; return; end if;
  select revision into current_revision from public.awaken_states where user_id=uid;
  insert into public.awaken_snapshot_recovery(user_id,migration_key,state,data_version,revision) select uid,'restore-'||p_operation_id::text,state,data_version,revision from public.awaken_states where user_id=uid on conflict do nothing;
  insert into public.awaken_states(user_id,state,data_version,revision) values(uid,p_state,p_data_version,1) on conflict(user_id) do update set state=excluded.state,data_version=excluded.data_version,revision=public.awaken_states.revision+1,updated_at=now();
  perform public.sync_awaken_relational(uid,p_state,p_data_version,p_operation_id);
  insert into public.awaken_operations values(uid,p_operation_id,'restore',now());
  return query select s.state,s.revision,s.updated_at from public.awaken_states s where s.user_id=uid;
end $$;

do $$ declare row_state record; migration_id uuid; begin
  for row_state in select * from public.awaken_states loop
    migration_id:=md5(row_state.user_id::text||':relational-v1')::uuid;
    insert into public.awaken_snapshot_recovery(user_id,migration_key,state,data_version,revision) values(row_state.user_id,'relational-v1',row_state.state,row_state.data_version,row_state.revision) on conflict do nothing;
    begin
      perform public.sync_awaken_relational(row_state.user_id,row_state.state,row_state.data_version,migration_id);
    exception when others then
      insert into public.awaken_data_migrations(user_id,migration_key,source_version,target_version,status,details) values(row_state.user_id,'relational-v1',row_state.data_version,4,'failed',jsonb_build_object('error',sqlerrm)) on conflict(user_id,migration_key) do update set status='failed',details=excluded.details;
    end;
  end loop;
end $$;

commit;
