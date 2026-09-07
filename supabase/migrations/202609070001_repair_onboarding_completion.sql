begin;

-- A persisted, non-starter snapshot proves that onboarding already happened.
-- Repair accounts created through older application paths that saved progress
-- without creating the separate completion row.
insert into public.awaken_user_settings(
  user_id,
  onboarding_status,
  onboarding_completed_at,
  display_name,
  main_arc_id,
  arc_theme_id,
  primary_goal,
  updated_at
)
select
  snapshot.user_id,
  'complete',
  coalesce(snapshot.created_at, now()),
  coalesce(snapshot.state #>> '{profile,displayName}', 'Player'),
  coalesce(snapshot.state #>> '{profile,mainArcId}', 'creator'),
  coalesce(snapshot.state #>> '{profile,arcThemeId}', 'minimal'),
  'Continue existing Awaken progress',
  now()
from public.awaken_states snapshot
where not (
  coalesce(snapshot.state #>> '{profile,displayName}', '') = 'Seeker'
  and jsonb_array_length(coalesce(snapshot.state -> 'activityLog', '[]'::jsonb)) = 0
)
on conflict(user_id) do update
set onboarding_status = 'complete',
    onboarding_completed_at = coalesce(
      public.awaken_user_settings.onboarding_completed_at,
      excluded.onboarding_completed_at
    ),
    updated_at = now();

commit;
