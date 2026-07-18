begin;

create or replace function public.link_xp_reversal_before_commit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reversal_of is null and new.xp_amount < 0 and new.source_id like '%-undo' then
    select original.id into new.reversal_of
    from public.xp_events original
    where original.user_id = new.user_id
      and original.source_id = left(new.source_id, -5)
      and original.xp_amount > 0
    order by original.created_at desc
    limit 1;
  end if;
  return new;
end $$;

drop trigger if exists link_xp_reversal on public.xp_events;
create trigger link_xp_reversal
before insert on public.xp_events
for each row execute function public.link_xp_reversal_before_commit();

-- Backfill linkage metadata for already-imported compensating events. XP amounts
-- and historical rows remain unchanged; future clients have no update policy.
update public.xp_events reversal
set reversal_of = original.id
from public.xp_events original
where reversal.reversal_of is null
  and reversal.source_id like '%-undo'
  and reversal.xp_amount < 0
  and original.user_id = reversal.user_id
  and original.source_id = left(reversal.source_id, -5)
  and original.xp_amount > 0;

commit;
