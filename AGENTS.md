This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Training log webapp for tracking goals and exercises with weight/reps tracking. Users can complete goals directly or via linked exercises. Single-user app with customizable goals, exercises, and configurable visible days (1-30).

**Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, PostgreSQL (remote), Zustand (client store)

## Development Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm start            # Run production server
npm run init-db      # Initialize remote database (creates tables, seeds data)
```

## Environment Setup

- Requires `DATABASE_URL` environment variable (PostgreSQL connection string)
- No local PostgreSQL needed - connects to remote database only

## Architecture

### Database Layer (`lib/db.ts`)
- Connection pool using `pg` library
- Reads `process.env.DATABASE_URL`
- Exports `query()` function and `pool` for all database operations

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

**ManageExercises** (`components/ManageExercises.tsx`):
- Currently manages goals (pending rename to ManageGoals)
- Add/edit/delete/reorder goals
- Color picker for goal categories
- TODO: Add UI for managing exercise library and linking

**PageHeader** (`components/PageHeader.tsx`):
- Settings, sort by urgency toggle, plan mode toggle
- Manage button (opens ManageExercises dialog)

### Database Schema (`schema.sql`)

**goals**:
- id, name, color, display_order, created_at

**exercises** (exercise library):
- id, name, created_at

**goal_exercises** (junction table):
- id, goal_id (FK), exercise_id (FK), created_at
- UNIQUE(goal_id, exercise_id)

**goal_logs**:
- id, goal_id (FK), date, completed, exercise_id (FK, nullable), created_at, updated_at
- UNIQUE(goal_id, date)
- ON DELETE CASCADE from goals

**exercise_logs** (tracks weight/reps):
- id, exercise_id (FK), date, weight, reps, created_at, updated_at
- UNIQUE(exercise_id, date)
- ON DELETE CASCADE from exercises

**Indexes**: All foreign keys and date columns are indexed for performance

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

`npm run init-db` - Executes `schema.sql`, creates all tables, seeds 12 default goals

## Quality Assurance

To make sure the code you wrote is correct, run:
- `npm run lint` - ESLint validation
- `npm run build` - TypeScript type checking and production build
