begin;

-- The state RPCs run as the authenticated caller. They must be able to append
-- their own idempotency record, while still being unable to insert for anyone else.
create policy "insert own operations"
on public.awaken_operations
for insert
with check (auth.uid() = user_id);

-- XP history is append-only to clients: owners may insert and read, but there
-- is intentionally no update or delete policy.
create policy "insert own xp events"
on public.xp_events
for insert
with check (auth.uid() = user_id);

commit;
