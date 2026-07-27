# Awaken

**A full-stack self-improvement platform that turns real-life goals and habits into an RPG progression system.**

[Live Demo](https://awaken-tawny.vercel.app) · [Architecture](docs/RELATIONAL_PERSISTENCE.md) · [Deployment Guide](docs/DEPLOYMENT.md)

![Next.js](https://img.shields.io/badge/Next.js-TypeScript-000000?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)
![Vitest](https://img.shields.io/badge/Tests-57%20passing-6E9F18?logo=vitest&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?logo=vercel)

Awaken reframes personal development as a game: completing meaningful tasks earns XP across five life stats, daily quests build consistency, and weekly bosses turn recurring challenges into measurable objectives. The application combines an immersive, responsive interface with secure authentication, durable cloud persistence, progress analytics, and optional AI-assisted task scoring.

## Highlights

- **Gamified progression:** Earn XP, advance through 100 levels, master six ranks, and develop Strength, Intelligence, Vitality, Wealth, and Charisma.
- **Adaptive daily quests:** Generate focused objectives from the user's goals, selected life path, and current progress.
- **Weekly boss system:** Face deterministic, stat-specific challenges that react to completed tasks and logged negative habits.
- **AI-assisted XP scoring:** Use Google Gemini to suggest a task's XP value, category, confidence, and rationale while retaining a local fallback.
- **Progress analytics:** Explore responsive XP charts, stat distributions, activity history, daily insights, and weekly reflections.
- **Personalized onboarding:** Configure goals, focus areas, themes, schedules, reminders, and a primary growth arc.
- **Installable experience:** Use Awaken as a responsive progressive web app on desktop or mobile.
- **Data ownership:** Export a human-readable, versioned backup and restore it through a validated transactional workflow.

## Engineering Highlights

- Built a full-stack application with **Next.js, React, and TypeScript**, using modular domain engines for XP, quests, bosses, ranks, analytics, onboarding, and insights.
- Designed a **PostgreSQL/Supabase persistence layer** with Row Level Security on every user-owned table and owner-scoped foreign-key relationships.
- Implemented an **append-only XP ledger** with compensating reversal events, deterministic projections, and rebuildable cached totals for auditability.
- Added **optimistic concurrency control** through versioned state revisions so stale clients cannot overwrite newer progress.
- Made write operations **idempotent and retry-safe** with unique operation identifiers and transactional snapshot/relational projection updates.
- Created a safe legacy-data migration flow with validation, explicit conflict resolution, cloud verification, and recoverable browser backups.
- Protected privileged operations with server-only credentials, authenticated account deletion, exact confirmation, and cascading cleanup.
- Added automated coverage for progression, analytics, persistence, migrations, onboarding, quests, bosses, rank mastery, tutorials, responsive charts, and daily rollover behavior.
- Deployed the production application on **Vercel** with Supabase Auth and PostgreSQL backing the live service.

## How It Works

1. Create an account and choose a growth plan, primary arc, focus stats, schedule, and visual theme.
2. Add positive tasks and negative habits, with XP previewed before each action is logged.
3. Complete daily quests to earn rewards and damage the current weekly boss.
4. Track levels, rank mastery, stat balance, trends, reflections, and generated insights.
5. Export or restore progress at any time through versioned JSON backups.

## Architecture

```text
Next.js App Router + React UI
              │
              ▼
Typed state repository and API routes
              │
     ┌────────┴────────┐
     ▼                 ▼
Domain engines     Google Gemini
(XP, quests,       (optional XP
bosses, ranks)      suggestions)
     │
     ▼
Supabase Auth + PostgreSQL
     │
     ├── Versioned compatibility snapshot
     ├── Relational domain projection
     └── Append-only XP event ledger
```

The user interface does not query Supabase directly. It communicates through a typed repository, while deterministic TypeScript modules own the application's progression rules. PostgreSQL transactions keep the versioned recovery snapshot and relational projection synchronized. See the [persistence architecture](docs/RELATIONAL_PERSISTENCE.md) for schema, RLS, migration, rollback, and discrepancy-repair details.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Next.js Route Handlers, Supabase SSR |
| Database | PostgreSQL, Supabase, Row Level Security |
| Authentication | Supabase Auth |
| AI | Google Gemini API |
| Validation | Zod |
| Testing | Vitest, React component tests |
| Deployment | Vercel |

## Local Development

### Prerequisites

- Node.js 20 or later
- A Supabase project
- A Google Gemini API key (optional)

### Setup

```bash
git clone https://github.com/Dnkndonutss/Awaken.git
cd Awaken
npm install
cp .env.example .env.local
```

Add your project credentials to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
```

The service-role and Gemini keys are server-only and must never use the `NEXT_PUBLIC_` prefix.

Apply the database migrations and start the application:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For local authentication, add `http://localhost:3000/auth/callback` to the allowed redirect URLs in Supabase.

## Quality Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The current suite contains **57 passing tests across 14 test files**, covering core domain rules, persistence and migrations, analytics, UI behavior, and edge cases such as retry deduplication and stale daily state.

## Security and Reliability

- Row Level Security requires `auth.uid()` to match the owner of every user-scoped record.
- Client access to XP events is append-only; existing awards are reversed with linked compensating entries rather than edited or deleted.
- Restore operations validate the backup format and version before replacing state in a database transaction.
- Unsupported future data versions fail closed.
- Account deletion requires a valid authenticated session and an exact confirmation phrase before server-side deletion.
- Browser storage is limited to recovery, retry, and explicit legacy-import workflows; cloud data remains authoritative.

## Project Documentation

- [Relational persistence and data integrity](docs/RELATIONAL_PERSISTENCE.md)
- [Production deployment and release workflow](docs/DEPLOYMENT.md)

## Author

Built by [Dnkndonutss](https://github.com/Dnkndonutss).
