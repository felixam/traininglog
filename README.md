# Training Log

Fully vibe coded app serving my personal needs for a workout logging app.
This is just a small app for me, and set up to be mostly ai agent generated.

What are my "personal needs"?

I have my own kind of training plan. I don´t do bro split, or full body or something like that.
I train each day, until my body tells me to chill out. Then I insert a rest day.
In each workout, I do the exercises that are most 'urgent', i.e. I haven't done for the longest time.
By 'exercise', I mean 'muscle group or elemental exercise'. 'Pull Down' and 'Row' are elemental exercises for me. 'Abs' is a muscle group where I can vary the specific exercise.

## Features

- Track **goals** (muscle groups like "Chest", "Abs") across configurable days (1-30)
- Link specific **exercises** (like "Bench Press", "Pushups") to goals
- Track weight and reps for each exercise
- Color-coded goal categories (red, yellow, green, blue) for visual organization
- **Dual completion modes**:
  - Mark goal complete directly (simple checkmark)
  - Complete goal via exercise with weight/reps tracking
- Exercise history with max weight and last workout suggestions
- Order by 'least recent workout first' (urgency mode)
- Plan mode for planning future workouts
- Fully responsive design (mobile first)

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL database (remote or local) with connection URL

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Set the `DATABASE_URL` environment variable:

```bash
export DATABASE_URL=postgresql://username:password@localhost:5432/trainingslog
```

### 3. Initialize Database

```bash
npm run init-db
```

This will connect to your database using the `DATABASE_URL` environment variable and execute the schema, creating all necessary tables.

Alternatively, you can manually execute the SQL in `schema.sql` in your PostgreSQL client.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```bash
npm run build
npm start
```

## Architecture Overview

The app uses a **Goals + Exercises** architecture:

- **Goals** (e.g., "Chest", "Abs") - Target muscle groups or elemental movements
  - Can be completed directly or via linked exercises
  - Track completion history
  - Color-coded for visual organization

- **Exercises** (e.g., "Bench Press", "Pushups") - Specific movements
  - Independent exercise library
  - Can be linked to multiple goals
  - Track weight and reps history per date

- **Dual Completion Model**:
  - Click a goal cell → LogDialog opens
  - Option 1: Complete goal directly (just mark as done)
  - Option 2: Select a linked exercise, enter weight/reps, save

## Development

Built with modern web technologies:
- **Next.js 16** with App Router
- **React 19** with client-side interactivity
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling
- **PostgreSQL** for data persistence
- **date-fns** for date handling

For detailed architecture information, see [CLAUDE.md](./CLAUDE.md).
