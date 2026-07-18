# Relational persistence

## Architecture

The relational model is the auditable write projection. `awaken_states` remains a versioned compatibility snapshot and rollback source while the relational rollout is verified. `save_awaken_state` and `restore_awaken_state` update the snapshot and relational projection in the same PostgreSQL transaction. A failure rolls back both.

The browser calls only the typed repository in `lib/persistence/repository.ts`; UI components do not query Supabase. XP, quest, boss, rank, insight, and weekly-report engines remain deterministic TypeScript modules.

## Relationships

- `auth.users` cascades to every owner-scoped table.
- `user_profiles`, `user_preferences`, and `user_arcs` hold identity-independent player configuration.
- `stat_progress` caches rebuildable ledger totals.
- `custom_tasks` defines player-created positive and negative tasks.
- `task_completions` and `negative_action_events` record performed activity with unique operation IDs.
- `daily_quests` owns `quest_completions` through `(user_id, quest_id)`.
- `weekly_bosses` is accompanied by append-only `boss_activity`.
- `daily_reviews`, `weekly_reflections`, and `generated_insights` preserve reflection history.
- `selected_goals` owns `goal_progress` through `(user_id, goal_id)`.
- `xp_events` is the append-only progression ledger. `reversal_of` points to the compensated event.
- `awaken_data_migrations` records per-account conversion status.
- `awaken_snapshot_recovery` retains the original snapshot for migration and restore recovery.

All natural IDs from the application are preserved. Composite owner/ID primary keys prevent cross-user collisions. Time-ordered owner indexes support activity and history queries. Unique owner/operation constraints make retries idempotent.

## Row-level security

RLS is enabled on every user-owned table. Policies require `auth.uid() = user_id` for reads and writes. XP clients have only SELECT and INSERT policies: no client UPDATE or DELETE policy exists. Database foreign keys cascade only when the authenticated account itself is deleted through the verified server workflow.

## XP derivation and reversals

`xp_events` is authoritative. Current stat XP is `greatest(sum(xp_amount), 0)` grouped by owner and stat. Level is `floor(sqrt(xp / 100))`, matching `getLevelFromXp`. Overall XP is the sum of non-negative stat totals; rank uses the thresholds in `data/awaken-constants.ts`.

An undo inserts a negative compensating event. It never changes or removes the original award. The insert trigger links `reversal_of` when a source ID ends in `-undo`. Initial migration inserts explicit `snapshot_reconciliation` entries when the retained activity window cannot fully explain an older cached total. `stat_progress` is rebuilt and timestamped after each successful projection.

## Migration and rollback

Migration `202607150002` creates relational tables, installs the projector, saves a recovery snapshot, and converts each existing account. Per-account status is written as `completed` or `failed`; exceptions do not leave partial relational rows. Snapshot reads remain enabled during verification.

To roll back the application, deploy the previous build; the compatibility snapshot is still current. To roll back one account's relational projection, stop writes, inspect its `awaken_snapshot_recovery` row, run `restore_awaken_state` with a fresh operation ID, verify totals, then resume. Do not edit deployed migrations—create a forward repair migration.

## Deployment

1. Back up the hosted database and run unit/integration tests locally.
2. Run `npx supabase db push --dry-run` in development, then `npx supabase db push`.
3. Verify migration status, recovery-row count, RLS policies, and zero XP-cache discrepancies.
4. Repeat in staging and exercise task, negative action, quest undo, boss reward, review, backup restore, and concurrent-device flows.
5. Deploy the application only after staging verification; repeat read-only consistency checks in production.

## Investigating XP discrepancies

Compare `stat_progress.cached_xp` with `greatest(sum(xp_events.xp_amount),0)` per owner/stat. Inspect event `operation_id`, `event_key`, `source_type`, `source_id`, `reversal_of`, and payload. Confirm there are no duplicate operation/event-key pairs. Never update award amounts or delete events. Repair with a reviewed forward migration that appends a clearly labeled reconciliation event, then rebuilds the cache and records the investigation in migration metadata.
