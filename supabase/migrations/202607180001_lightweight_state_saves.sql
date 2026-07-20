begin;

-- Ordinary app saves only need to update the owner-scoped snapshot. Rebuilding
-- every relational projection here made each click rewrite the full user model,
-- rescan the XP ledger, and contend with other open tabs.
create or replace function public.save_awaken_state(
  p_state jsonb,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_data_version integer
)
returns table(state jsonb, revision bigint, updated_at timestamptz)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'unauthorized';
  end if;

  if jsonb_typeof(p_state) <> 'object' then
    raise exception 'invalid Awaken state';
  end if;

  if exists(
    select 1
    from public.awaken_operations operation
    where operation.user_id = uid
      and operation.operation_id = p_operation_id
  ) then
    return query
      select snapshot.state, snapshot.revision, snapshot.updated_at
      from public.awaken_states snapshot
      where snapshot.user_id = uid;
    return;
  end if;

  insert into public.awaken_states(user_id, state, data_version, revision)
  values(uid, p_state, p_data_version, 1)
  on conflict(user_id) do update
    set state = excluded.state,
        data_version = excluded.data_version,
        revision = public.awaken_states.revision + 1,
        updated_at = now()
    where public.awaken_states.revision = p_expected_revision;

  if not found then
    raise sqlstate '40001' using message = 'revision conflict';
  end if;

  insert into public.awaken_operations(user_id, operation_id, kind, created_at)
  values(uid, p_operation_id, 'save', now());

  return query
    select snapshot.state, snapshot.revision, snapshot.updated_at
    from public.awaken_states snapshot
    where snapshot.user_id = uid;
end
$$;

revoke execute on function public.save_awaken_state(jsonb, bigint, uuid, integer)
from public, anon;
grant execute on function public.save_awaken_state(jsonb, bigint, uuid, integer)
to authenticated, service_role;

commit;
