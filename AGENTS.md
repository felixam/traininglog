This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Training log webapp for tracking goals and exercises with weight/reps tracking. Users can complete goals directly or via linked exercises. Multi-user app: each user has their own goals, exercises, and logs, with customizable goals and configurable visible days (1-30).

**Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Cloudflare D1 (SQLite, accessed via Workers binding), Zustand (client store), deployed via `@opennextjs/cloudflare`. Auth is JWT (HS256, Web Crypto) in an httpOnly cookie.

## Authentication & Multi-User

- **Users**: identified by `username` (not email) with a 4-digit numeric PIN. PINs are PBKDF2-hashed with a per-user salt (`lib/auth.ts`).
- **Login** (`/login`): pick a user from a dropdown and enter the PIN. When the DB has no users, the page switches to a "create first user" bootstrap form.
- **Bootstrapping**: the first user can be created without auth. That user auto-claims any pre-existing un-owned rows (single-user → multi-user migration). Afterwards, only a logged-in user can create more users (any user may add another). Fresh users are seeded with the 12 default goals (`lib/defaultGoals.ts`).
- **Sessions**: `signToken`/`verifyToken` in `lib/auth.ts` issue/verify the JWT; `getCurrentUser()` reads it from the `auth_token` cookie. Every data API route calls `getCurrentUser()` and returns 401 (`unauthorized()`) if absent, then scopes all queries by `user_id`.
- **Page protection**: the `/` and `/analytics` routes are server components (`app/page.tsx`, `app/analytics/page.tsx`) that call `getCurrentUser()` and `redirect('/login')` when unauthenticated, then render their client counterparts (`HomeClient.tsx`, `analytics/AnalyticsClient.tsx`). No middleware/proxy — OpenNext on Cloudflare does not support Next 16 Node-runtime proxy. Client hooks also redirect to `/login` on a 401.
- **Secret**: `JWT_SECRET` env var (set in `wrangler.jsonc` `vars` for dev; use `wrangler secret put JWT_SECRET` for prod).

## Auth API Routes (`app/api/auth/`)

- `GET /api/auth/users` — public; lists usernames for the login dropdown + `needsBootstrap` flag.
- `POST /api/auth/login` — `{ username, password }` → sets `auth_token` cookie.
- `POST /api/auth/logout` — clears the cookie.
- `GET /api/auth/me` — returns the current `{ userId, username }` (401 if not logged in).
- `POST /api/auth/register` — `{ username, password }`; first user is unauthenticated bootstrap (auto-login + claims orphan data), otherwise requires auth and does not change the caller's session.

## Development Commands

```bash
npm run dev                 # Start dev server on localhost:3000 (uses local D1 via initOpenNextCloudflareForDev)
npm run build               # Next production build (TypeScript check)
npm run build:cloudflare    # OpenNext Cloudflare build (.open-next/worker.js)
npm run preview:cloudflare  # Build + run locally under workerd
npm run deploy:cloudflare   # Deploy to Cloudflare

npm run db:create           # wrangler d1 create trainingslog (one-time)
npm run db:init:local       # Apply schema.sql to local D1
npm run db:init:remote      # Apply schema.sql to remote D1
npm run db:import:local     # Import local/trainingslog-d1-import.sql locally
npm run db:import:remote    # Import local/trainingslog-d1-import.sql to remote
```

## Rules

- when changing functionality, *never* heed to backward compability. remove/change api behavior without compromise. also do not leave any comments referring to old code.

## Environment Setup

- Requires a Cloudflare D1 database bound as `DB` in `wrangler.jsonc` (`d1_databases[]`).
- No external database URL — D1 is accessed directly via the Workers binding.
- Local dev gets the binding via `initOpenNextCloudflareForDev()` in `next.config.ts`, which wires `next dev` to the local D1 state managed by wrangler.
- Requires a `JWT_SECRET` env var for auth. Dev reads it from `wrangler.jsonc` `vars`; production should override it with `wrangler secret put JWT_SECRET`.

## Architecture

### Database Layer (`lib/db.ts`)
- Resolves the D1 binding via `getCloudflareContext().env.DB`.
- `query(sql, params)` returns `{ rows, rowCount }` and translates pg-style `$1, $2` placeholders to D1's `?`.
- `batch(statements)` runs an array of `{ sql, params }` atomically (D1 has no interactive transactions).

### Data Model (`lib/types.ts`)

**Goals (completion targets)**:
- `Goal`: id, name, color, display_order, created_at
- `GoalLog`: id, goal_id, date, completed, exercise_id (optional FK)
- `GoalLogEntry`: completed, exercise_id?, weight?, reps? (denormalized for display)
- `GoalWithLogs`: Extends Goal with logs (Record<string, GoalLogEntry>) and linkedExercises[]

**Exercises (specific movements with weight/reps)**:
- `Exercise`: id, name, created_at
- `ExerciseLog`: id, exercise_id, date, weight?, reps?
- `ExerciseLogEntry`: weight?, reps?

### API Routes (`app/api/`)

**Goals**:
- `GET /api/goals` - List all goals (ordered by display_order)
- `POST /api/goals` - Create goal with name, color (auto-assigns next display_order)
- `PATCH /api/goals/[id]` - Update goal (name, color, display_order)
- `DELETE /api/goals/[id]` - Delete goal (cascades to logs and links)

**Exercises**:
- `GET /api/exercises` - List all exercises (ordered by name)
- `POST /api/exercises` - Create exercise (name only)
- `PATCH /api/exercises/[id]` - Update exercise name
- `DELETE /api/exercises/[id]` - Delete exercise (cascades to logs and links)

**Goal-Exercise Linking**:
- `GET /api/goals/[id]/exercises` - Get exercises linked to a goal
- `POST /api/goals/[id]/exercises` - Link exercise to goal (body: {exercise_id})
- `DELETE /api/goals/[id]/exercises/[exerciseId]` - Unlink exercise from goal

**Logs**:
- `GET /api/logs?days=7` - Returns goals with logs for last N days (1-30, default 7)
  - Includes linked exercises per goal
  - Joins goal_logs with exercise_logs to denormalize weight/reps for display
  - Returns: `{ exercises: GoalWithLogs[], dateRange: { startDate, endDate } }`
  - Note: Response uses 'exercises' key for backward compatibility (contains goals)

- `POST /api/logs/toggle` - Create/update goal completion (dual mode)
  - Body: `{ goal_id, date, exercise_id?, weight?, reps? }`
  - If exercise_id provided: Creates/updates both goal_log AND exercise_log (transactional)
  - If no exercise_id: Creates/updates goal_log only (direct completion)
  - Always sets completed=true on goal_log

- `DELETE /api/logs/toggle` - Delete goal log (and associated exercise log)
  - Query params: `goal_id`, `date`
  - Deletes goal_log and cascades to exercise_log if exists (transactional)

**History**:
- `GET /api/logs/history?exercise_id=123` - Get exercise performance history
  - Returns: `{ maxWeight: {...}, lastLog: {...} }`
  - Used by LogDialog to show max weight achieved and last workout

### Frontend (`app/page.tsx`, `components/`)

**Main page** (`app/page.tsx`):
- Client component using hooks: `useGoals`, `usePlanMode`, `useDateRange`, `useSettings`
- Displays GoalTable with configurable visible days
- Dual mode toggle handler: plan mode OR log dialog
- Manages LogDialog state with goal info and linked exercises

**GoalRow** (`components/GoalRow.tsx`):
- Renders single goal with N clickable cells (one per visible day)
- Shows weight/reps if goal completed via exercise
- Shows checkmark if goal completed directly
- Plan mode support with colored borders

**GoalTable** (`components/GoalTable.tsx`):
- Table wrapper for goals grid
- Header shows day names and numbers
- Empty state when no goals

**LogDialog** (`components/LogDialog.tsx`):
- Opens when clicking a goal cell (non-plan mode)
- Shows exercise selection dropdown if goal has linked exercises
- Two completion modes:
  - **Direct completion**: Green "Complete" button (no exercise selected)
  - **Exercise completion**: Select exercise, enter weight/reps, blue "Save" button
- Fetches exercise history when exercise selected (max weight, last workout)
- Pre-fill buttons: "Use max", "Use last"
- Delete button for existing logs

**ManageGoals** (`components/ManageGoals.tsx`):
- Add/edit/delete/reorder goals
- Color picker for goal categories
- Edit dialog allows linking exercises to goals

**ManageExercisesLibrary** (`components/ManageExercisesLibrary.tsx`):
- Manage exercise library (add/edit/delete exercises)
- Accessed via "Manage Exercises" button in ManageGoals

**PageHeader** (`components/PageHeader.tsx`):
- Settings, sort by urgency toggle, plan mode toggle
- Manage button (opens ManageGoals dialog)

### Database Schema (`schema.sql`)

SQLite dialect. All primary keys are `INTEGER PRIMARY KEY AUTOINCREMENT`, dates/timestamps are `TEXT` (YYYY-MM-DD / ISO-ish), booleans are `INTEGER` (0/1), weights are `REAL`. Every data table carries a `user_id` FK; all queries scope by it.

**users**:
- id, username (UNIQUE), password_hash, password_salt, created_at

**goals**:
- id, user_id (FK), name, color, display_order, created_at

**exercises** (exercise library):
- id, user_id (FK), name, created_at

**goal_exercises** (junction table):
- id, user_id (FK), goal_id (FK), exercise_id (FK), created_at
- UNIQUE(goal_id, exercise_id)

**goal_logs**:
- id, user_id (FK), goal_id (FK), date, completed (0/1), exercise_id (FK, nullable), created_at, updated_at
- UNIQUE(goal_id, date)
- ON DELETE CASCADE from goals

**exercise_logs** (tracks weight/reps):
- id, user_id (FK), exercise_id (FK), date, weight, reps, created_at, updated_at
- UNIQUE(exercise_id, date)
- ON DELETE CASCADE from exercises

**Indexes**: All foreign keys (including `user_id`) and date columns are indexed for performance.

For an existing single-user DB, `migrations/0001-add-auth.sql` adds the `users` table and nullable `user_id` columns; the first registered user claims those rows.

### Hooks & Utils

**useGoals** (`lib/hooks/useGoals.ts`):
- Uses Zustand store (`lib/stores/useGoalStore.ts`) with persistence
- Fetches goals with logs from `/api/logs?days=${visibleDays}` and keeps cached data for offline/failed fetches
- Handles loading, errors, sorting (order/urgency), stale visibleDays notice
- Returns: `{ goals, isLoading, sortByUrgency, setSortByUrgency, refetch, lastFetchedAt, error, isStaleForVisibleDays }`

**usePlanMode** (`lib/hooks/usePlanMode.ts`):
- Manages plan mode state with localStorage persistence
- Stores planned goals as Set<string> with keys: `"goalId-date"`
- Auto-cleans old dates (keeps only today)
- Returns: `{ planMode, setPlanMode, plannedGoals, togglePlanned }`

**useDateRange** (`lib/hooks/useDateRange.ts`):
- Generates date array based on visibleDays setting
- Provides helper functions: `getDayName`, `getDayNumber`

**useSettings** (`lib/hooks/useSettings.ts`):
- Loads/saves settings from/to localStorage
- Currently stores: `visibleDays` (1-30, default 7)

**goalUtils** (`lib/goalUtils.ts`):
- `getLastCompletedDate()` - Finds most recent completed date for a goal
- `sortByOrder()` - Sorts by display_order
- `sortByUrgency()` - Sorts by oldest last completed (never completed first)
- `sortGoals()` - Wrapper function

## Key Patterns

1. **Date handling**: Always use `date-fns` for date manipulation. Dates stored as YYYY-MM-DD strings.
2. **Visible days**: Configurable 1-30 days (default 7), calculated dynamically
3. **Dual completion**:
   - Direct: `POST /api/logs/toggle` with goal_id and date only
   - Via exercise: Include exercise_id, weight, reps in same API call
4. **Transactional logging**: When completing via exercise, both goal_log and exercise_log are created/updated in a transaction
5. **Data fetching**: Main page calls `refetch()` after any mutation to refresh state
6. **Color system**: Four goal categories map to Tailwind classes in GoalRow component
7. **Exercise history**: LogDialog fetches max/last for selected exercise to help pre-fill values

## Database Initialization

First-time setup:
1. `npm run db:create` — creates the D1 database, prints a `database_id`.
2. Paste the `database_id` into `wrangler.jsonc` (replacing `REPLACE_WITH_D1_DATABASE_ID`).
3. `npm run db:init:remote` — applies `schema.sql` (tables only; no users/goals seeded).
4. Open the app and create the first user via the `/login` bootstrap form. That user gets the 12 default goals seeded automatically.

Existing single-user DB: run `wrangler d1 execute trainingslog --remote --file=migrations/0001-add-auth.sql` instead of re-initializing, then register the first user (it claims the existing data).

The local dev DB lives under `.wrangler/state/`. Use the `*:local` script variants for it.

## Migrating from Postgres

`scripts/convert-pg-dump.mjs` converts a `pg_dump --column-inserts` export of the public schema into a D1-ready SQL file: `node scripts/convert-pg-dump.mjs <input.sql> <output.sql>`.

## Quality Assurance

To make sure the code you wrote is correct, run:
- `npm run lint` - ESLint validation
- `npm run build` - TypeScript type checking and production build
- `npm run build:cloudflare` - OpenNext bundle for Cloudflare
