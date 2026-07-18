begin;
alter table public.awaken_user_settings add column if not exists tutorial_status text check(tutorial_status in ('in_progress','completed','skipped'));
alter table public.awaken_user_settings add column if not exists tutorial_current_step integer check(tutorial_current_step is null or tutorial_current_step >= 0);
alter table public.awaken_user_settings add column if not exists tutorial_completed_at timestamptz;
alter table public.awaken_user_settings add column if not exists tutorial_version integer check(tutorial_version is null or tutorial_version > 0);
-- Existing rows remain null and therefore never auto-launch.
commit;
