begin;

create or replace function public.restore_awaken_state(p_state jsonb,p_operation_id uuid,p_data_version integer)
returns table(state jsonb,revision bigint,updated_at timestamptz)
language plpgsql
security invoker
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'unauthorized'; end if;
  if exists(select 1 from public.awaken_operations o where o.user_id=uid and o.operation_id=p_operation_id) then
    return query select s.state,s.revision,s.updated_at from public.awaken_states s where s.user_id=uid;
    return;
  end if;
  insert into public.awaken_snapshot_recovery(user_id,migration_key,state,data_version,revision)
  select uid,'restore-'||p_operation_id::text,s.state,s.data_version,s.revision
  from public.awaken_states s where s.user_id=uid on conflict do nothing;
  insert into public.awaken_states(user_id,state,data_version,revision)
  values(uid,p_state,p_data_version,1)
  on conflict(user_id) do update set state=excluded.state,data_version=excluded.data_version,revision=public.awaken_states.revision+1,updated_at=now();
  perform public.sync_awaken_relational(uid,p_state,p_data_version,p_operation_id);
  insert into public.awaken_operations values(uid,p_operation_id,'restore',now());
  return query select s.state,s.revision,s.updated_at from public.awaken_states s where s.user_id=uid;
end $$;

commit;
