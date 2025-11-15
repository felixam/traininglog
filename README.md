# Training Log

Fully vibe coded app serving my personal needs for a workout logging app.
This is just a small app for me, and set up to be mostly ai agent generated.

What are my "personal needs"?

I have my own kind of training plan. I don´t do bro split, or full body or somethink like that.
I train each day, until my body tells me to chill out. Then in insert a rest day.
In each workout, I do the exercises that are most 'urgent', i.e. i haven't done for the longest time.
And by 'exercise', I mean 'muscle group or elemental exercise'. 'Pull Down' and 'Row' are elemental exercises for me. 'Abs' is a muscle group where I can vary the specific exercise.

## Features

- Track workouts across the last x days
- Color-coded workout categories (red, yellow, green, blue) to indicate groups like back/legs/delts, ...
- Click to toggle workout completion per day
- Fully responsive design (mobile first)
- Order by 'least recent workout first'

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

Run the database initialization script to create tables and seed data:

```bash
npm run init-db
```

This will connect to your remote database using the `DATABASE_URL` environment variable and execute the schema.

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

