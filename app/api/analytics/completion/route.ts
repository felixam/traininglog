import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format, parseISO, startOfWeek, differenceInWeeks, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import type { CompletionAnalyticsResponse, GoalCompletionStats, CompletionTrend, GoalColor, MonthlyTrainingDays } from '@/lib/types';

interface GoalRow {
  id: number;
  name: string;
  color: GoalColor;
}

interface LogRow {
  goal_id: number;
  date: string;
}

function getWeekKey(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

function calculateWeeklyStreak(dates: string[], today: Date): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  // Convert dates to week keys
  const weekKeys = [...new Set(dates.map(d => getWeekKey(parseISO(d))))].sort();
  if (weekKeys.length === 0) return { current: 0, longest: 0 };

  let longestStreak = 1;
  let tempStreak = 1;

  // Calculate longest streak of consecutive weeks
  for (let i = 1; i < weekKeys.length; i++) {
    const prevWeek = parseISO(weekKeys[i - 1]);
    const currWeek = parseISO(weekKeys[i]);
    const diff = differenceInWeeks(currWeek, prevWeek);

    if (diff === 1) {
      tempStreak++;
    } else if (diff > 1) {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate current streak (counting back from current week)
  const weekSet = new Set(weekKeys);
  let currentStreak = 0;
  let checkWeek = startOfWeek(today, { weekStartsOn: 1 });

  while (weekSet.has(format(checkWeek, 'yyyy-MM-dd'))) {
    currentStreak++;
    checkWeek = new Date(checkWeek);
    checkWeek.setDate(checkWeek.getDate() - 7);
  }

  return { current: currentStreak, longest: longestStreak };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date') || format(new Date(), 'yyyy-MM-dd');
    const goalId = searchParams.get('goal_id');

    // Get date range - if no start date, get earliest log date
    let effectiveStartDate: string = startDate || endDate;
    if (!startDate) {
      const earliestResult = await query(
        'SELECT MIN(date)::text as min_date FROM goal_logs WHERE completed = true'
      );
      effectiveStartDate = (earliestResult.rows[0]?.min_date as string) || endDate;
    }

    // Get all goals
    const goalsResult = await query('SELECT id, name, color FROM goals ORDER BY display_order');
    const goals = goalsResult.rows as GoalRow[];

    // Get all completed logs in range
    let logsQuery = `
      SELECT goal_id, date::text as date
      FROM goal_logs
      WHERE completed = true
        AND date >= $1 AND date <= $2
    `;
    const logsParams: (string | number)[] = [effectiveStartDate, endDate];

    if (goalId) {
      logsQuery += ' AND goal_id = $3';
      logsParams.push(parseInt(goalId));
    }

    logsQuery += ' ORDER BY date ASC';

    const logsResult = await query(logsQuery, logsParams);
    const logs = logsResult.rows as LogRow[];

    const today = new Date();

    // Calculate total weeks in range
    const totalWeeks = differenceInWeeks(parseISO(endDate), parseISO(effectiveStartDate)) + 1;

    // Calculate summary stats
    const activeWeeks = new Set(logs.map(l => getWeekKey(parseISO(l.date)))).size;
    const totalCompletions = logs.length;
    const completionRate = totalWeeks > 0 ? Math.round((activeWeeks / totalWeeks) * 100) : 0;
    const averagePerWeek = totalWeeks > 0 ? Math.round((totalCompletions / totalWeeks) * 100) / 100 : 0;

    // Calculate overall streaks (weekly)
    const allDates = logs.map(l => l.date);
    const { current: currentStreak, longest: longestStreak } = calculateWeeklyStreak(allDates, today);

    // Calculate per-goal stats
    const byGoal: GoalCompletionStats[] = goals.map(goal => {
      const goalLogs = logs.filter(l => l.goal_id === goal.id);
      const goalDates = goalLogs.map(l => l.date);
      const uniqueGoalDates = [...new Set(goalDates)];
      const activeGoalWeeks = new Set(goalDates.map(d => getWeekKey(parseISO(d)))).size;
      const { current, longest } = calculateWeeklyStreak(goalDates, today);

      return {
        goalId: goal.id,
        goalName: goal.name,
        goalColor: goal.color,
        totalCompletions: goalLogs.length,
        completionRate: totalWeeks > 0 ? Math.round((activeGoalWeeks / totalWeeks) * 100) : 0,
        currentStreak: current,
        longestStreak: longest,
        lastCompleted: uniqueGoalDates.length > 0 ? uniqueGoalDates[uniqueGoalDates.length - 1] : null,
      };
    });

    // Calculate weekly trends
    const allWeeksInRange = eachWeekOfInterval(
      { start: parseISO(effectiveStartDate), end: parseISO(endDate) },
      { weekStartsOn: 1 }
    );

    const logsByWeek = new Map<string, number[]>();
    logs.forEach(log => {
      const weekKey = getWeekKey(parseISO(log.date));
      const existing = logsByWeek.get(weekKey) || [];
      existing.push(log.goal_id);
      logsByWeek.set(weekKey, existing);
    });

    const trends: CompletionTrend[] = allWeeksInRange.map(weekStart => {
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const goalsCompleted = logsByWeek.get(weekKey) || [];
      return {
        date: weekKey,
        completions: goalsCompleted.length,
        goalsCompleted,
      };
    });

    // Calculate monthly training days (unique days with at least one completion)
    const allMonthsInRange = eachMonthOfInterval({
      start: parseISO(effectiveStartDate),
      end: parseISO(endDate),
    });

    const daysByMonth = new Map<string, Set<string>>();
    logs.forEach(log => {
      const monthKey = format(parseISO(log.date), 'yyyy-MM');
      const existing = daysByMonth.get(monthKey) || new Set<string>();
      existing.add(log.date);
      daysByMonth.set(monthKey, existing);
    });

    const monthlyDays: MonthlyTrainingDays[] = allMonthsInRange.map(monthStart => {
      const monthKey = format(monthStart, 'yyyy-MM');
      const days = daysByMonth.get(monthKey) || new Set();
      return {
        month: monthKey,
        trainingDays: days.size,
      };
    });

    const response: CompletionAnalyticsResponse = {
      summary: {
        totalDays: totalWeeks,
        completedDays: activeWeeks,
        totalCompletions,
        completionRate,
        currentStreak,
        longestStreak,
        averagePerDay: averagePerWeek,
      },
      byGoal,
      trends,
      monthlyDays,
      dateRange: {
        startDate: effectiveStartDate,
        endDate,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching completion analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch completion analytics' },
      { status: 500 }
    );
  }
}
