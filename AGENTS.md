# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Training log webapp for tracking daily exercises across the last 7 days. Users can mark exercises as completed per day with a simple click interface. Single-user app with customizable exercise list.

**Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, PostgreSQL (remote)

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
- `Exercise`: Base exercise type with id, name, color, display_order
- `ExerciseWithLogs`: Extends Exercise with logs as `Record<string, boolean>` (date -> completed mapping)
- Colors: `'red' | 'yellow' | 'green' | 'blue'`

### API Routes (`app/api/`)
**Exercises**:
- `GET /api/exercises` - List all exercises (ordered by display_order)
- `POST /api/exercises` - Create exercise (auto-assigns next display_order)
- `PATCH /api/exercises/[id]` - Update exercise (name, color, display_order)
- `DELETE /api/exercises/[id]` - Delete exercise (cascades to logs)

**Logs**:
- `GET /api/logs` - Returns exercises with logs for last 7 days (calculated using `date-fns`)
- `POST /api/logs/toggle` - Toggle completion for exercise_id + date (creates if missing, flips if exists)

### Frontend (`app/page.tsx`, `components/`)
- **Main page**: Client component that fetches from `/api/logs`, displays 7-day grid
- **ExerciseRow**: Renders single exercise with 7 clickable checkboxes
- **ManageExercises**: Modal for adding/deleting exercises with color picker

### Database Schema (`schema.sql`)
- `exercises`: id, name, color, display_order, created_at
- `exercise_logs`: id, exercise_id (FK), date, completed, created_at, updated_at
- Constraint: `UNIQUE(exercise_id, date)`
- Indexes on date and exercise_id for performance
- ON DELETE CASCADE from exercises to logs

## Key Patterns

1. **Date handling**: Always use `date-fns` for date manipulation. Dates stored as YYYY-MM-DD strings.
2. **Last 7 days**: Calculated dynamically using `subDays(today, 6)` through `today`
3. **Toggle logic**: API checks if log exists, either creates (completed=true) or flips existing value
4. **Data fetching**: Main page calls `fetchData()` after any mutation to refresh state
5. **Color system**: Four color categories map to Tailwind classes in `ExerciseRow` component

## Database Initialization

`scripts/init-db.js` connects using DATABASE_URL and executes `schema.sql`. Seeds 12 default exercises from HabitKit reference design.

## Quality Assurance

To make sure the code you wrote is correct, run
- npm run lint
- npm run build
