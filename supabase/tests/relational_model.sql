begin;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','awaken-test-a@example.invalid','', '{}'::jsonb,'{}'::jsonb,now(),now()),
('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','awaken-test-b@example.invalid','', '{}'::jsonb,'{}'::jsonb,now(),now());

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',true);
insert into public.stat_progress(user_id,stat,cached_xp,cached_level)
values('00000000-0000-0000-0000-0000000000a1','strength',100,1);
insert into public.user_preferences(user_id,preferences)
values('00000000-0000-0000-0000-0000000000a1','{"tutorial":{"status":"in_progress","currentStep":2,"completedAt":null,"version":1}}');

do $$ begin
  begin
    insert into public.stat_progress(user_id,stat,cached_xp,cached_level)
    values('00000000-0000-0000-0000-0000000000b2','strength',100,1);
    raise exception 'RLS allowed a cross-user insert';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b2',true);
do $$ begin
  if exists(select 1 from public.stat_progress where user_id='00000000-0000-0000-0000-0000000000a1') then
    raise exception 'RLS exposed another user''s stat progression';
  end if;
  if exists(select 1 from public.user_preferences where user_id='00000000-0000-0000-0000-0000000000a1' and preferences ? 'tutorial') then
    raise exception 'RLS exposed another user''s tutorial progress';
  end if;
end $$;
reset role;

insert into public.xp_events(id,user_id,operation_id,event_key,source_type,source_id,stat,xp_amount)
values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','20000000-0000-0000-0000-000000000001','award','manual_adjustment','quest-test','strength',100);
insert into public.xp_events(id,user_id,operation_id,event_key,source_type,source_id,stat,xp_amount)
values('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','20000000-0000-0000-0000-000000000002','undo','manual_adjustment','quest-test-undo','strength',-100);
do $$ begin
  if (select reversal_of from public.xp_events where id='10000000-0000-0000-0000-000000000002') <> '10000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'reversal event was not linked';
  end if;
  begin
    insert into public.xp_events(user_id,operation_id,event_key,source_type,stat,xp_amount)
    values('00000000-0000-0000-0000-0000000000a1','20000000-0000-0000-0000-000000000001','award','manual_adjustment','strength',100);
    raise exception 'duplicate XP operation was accepted';
  exception when unique_violation then null;
  end;
end $$;

do $$ begin
  begin
    perform public.sync_awaken_relational('00000000-0000-0000-0000-0000000000b2','{}'::jsonb,4,'30000000-0000-0000-0000-000000000001');
    raise exception 'invalid state migration unexpectedly succeeded';
  exception when others then
    if sqlerrm='invalid state migration unexpectedly succeeded' then raise; end if;
  end;
  if exists(select 1 from public.user_profiles where user_id='00000000-0000-0000-0000-0000000000b2') then
    raise exception 'failed migration left partial profile data';
  end if;
end $$;

delete from auth.users where id='00000000-0000-0000-0000-0000000000a1';
do $$ begin
  if exists(select 1 from public.stat_progress where user_id='00000000-0000-0000-0000-0000000000a1') then
    raise exception 'account deletion did not cascade';
  end if;
end $$;

rollback;
