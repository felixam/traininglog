import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format, subYears, eachDayOfInterval, parseISO } from 'date-fns';
import type { HeatmapAnalyticsResponse, HeatmapDay } from '@/lib/types';

interface LogRow {
  date: string;
  count: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endDate = searchParams.get('end_date') || format(new Date(), 'yyyy-MM-dd');
    const startDate = searchParams.get('start_date') || format(subYears(parseISO(endDate), 1), 'yyyy-MM-dd');
    const goalId = searchParams.get('goal_id');

    // Get completion counts by date
    let logsQuery = `
      SELECT date::text as date, COUNT(*) as count
      FROM goal_logs
      WHERE completed = true
        AND date >= $1 AND date <= $2
    `;
    const logsParams: (string | number)[] = [startDate, endDate];

    if (goalId) {
      logsQuery += ' AND goal_id = $3';
      logsParams.push(parseInt(goalId));
    }

    logsQuery += ' GROUP BY date ORDER BY date ASC';

    const logsResult = await query(logsQuery, logsParams);
    const logs = logsResult.rows as LogRow[];

    // Create a map of date -> count
    const countByDate = new Map<string, number>();
    let maxCount = 0;

    logs.forEach(log => {
      const count = parseInt(log.count);
      countByDate.set(log.date, count);
      maxCount = Math.max(maxCount, count);
    });

    // Generate all days in range with their levels
    const allDays = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    });

    const days: HeatmapDay[] = allDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const count = countByDate.get(dateStr) || 0;

      // Calculate level (0-4) based on count relative to max
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count > 0 && maxCount > 0) {
        const ratio = count / maxCount;
        if (ratio <= 0.25) level = 1;
        else if (ratio <= 0.5) level = 2;
        else if (ratio <= 0.75) level = 3;
        else level = 4;
      }

      return {
        date: dateStr,
        count,
        level,
      };
    });

    const response: HeatmapAnalyticsResponse = {
      days,
      dateRange: {
        startDate,
        endDate,
      },
      maxCount,
      totalDays: countByDate.size,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching heatmap analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch heatmap analytics' },
      { status: 500 }
    );
  }
}
