begin;

-- Keep rebuildable relational caches aligned with the app's 100-level curve.
-- Existing rows are intentionally left alone; the next projection rebuild will
-- update them naturally without a one-off data migration.
create or replace function public.set_awaken_cached_level()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  derived_level integer := 0;
  next_level integer := 1;
  required_xp integer;
begin
  while next_level <= 100 loop
    required_xp := round(
      10 * power(next_level, 2) +
      0.075 * power(next_level, 3)
    );

    exit when greatest(new.cached_xp, 0) < required_xp;
    derived_level := next_level;
    next_level := next_level + 1;
  end loop;

  new.cached_level := derived_level;
  return new;
end
$$;

drop trigger if exists set_awaken_cached_level_on_write
on public.stat_progress;

create trigger set_awaken_cached_level_on_write
before insert or update of cached_xp, cached_level
on public.stat_progress
for each row
execute function public.set_awaken_cached_level();

revoke execute on function public.set_awaken_cached_level()
from public, anon, authenticated;

commit;
