'use client';

import { useMemo, useState } from 'react';
import { format, parseISO, getDay, startOfWeek, addDays, getMonth } from 'date-fns';
import type { HeatmapAnalyticsResponse } from '@/lib/types';
import StatCard from './StatCard';

interface ActivityHeatmapProps {
  data: HeatmapAnalyticsResponse;
}

const levelColors = {
  0: 'bg-gray-800',
  1: 'bg-green-900',
  2: 'bg-green-700',
  3: 'bg-green-500',
  4: 'bg-green-400',
};

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const { days, maxCount, totalDays, dateRange } = data;
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  // Create a map for quick lookup
  const dayMap = useMemo(() => {
    const map = new Map<string, typeof days[0]>();
    days.forEach(d => map.set(d.date, d));
    return map;
  }, [days]);

  // Organize days into weeks (columns)
  const { weeks, monthMarkers } = useMemo(() => {
    if (days.length === 0) return { weeks: [], monthMarkers: [] };

    const startDate = parseISO(dateRange.startDate);
    const endDate = parseISO(dateRange.endDate);

    // Start from the beginning of the week containing startDate
    const weekStart = startOfWeek(startDate, { weekStartsOn: 0 });

    const weeks: (typeof days[0] | null)[][] = [];
    const monthMarkers: { weekIndex: number; month: number }[] = [];

    let currentDate = weekStart;
    let currentWeek: (typeof days[0] | null)[] = [];
    let lastMonth = -1;

    while (currentDate <= endDate || currentWeek.length > 0) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayOfWeek = getDay(currentDate);
      const month = getMonth(currentDate);

      // Track month changes for labels
      if (month !== lastMonth && currentDate <= endDate) {
        monthMarkers.push({ weekIndex: weeks.length, month });
        lastMonth = month;
      }

      if (currentDate < startDate || currentDate > endDate) {
        currentWeek.push(null);
      } else {
        currentWeek.push(dayMap.get(dateStr) || { date: dateStr, count: 0, level: 0 });
      }

      // If we've filled a week (Saturday), push it and start a new one
      if (dayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate = addDays(currentDate, 1);

      // Safety check to prevent infinite loop
      if (weeks.length > 60) break;
    }

    // Push any remaining days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return { weeks, monthMarkers };
  }, [days, dateRange, dayMap]);

  const handleMouseEnter = (day: typeof days[0], e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredDay({
      date: day.date,
      count: day.count,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Days"
          value={totalDays}
          subtitle={`out of ${days.length} days`}
        />
        <StatCard
          title="Max in Day"
          value={maxCount}
          subtitle="completions"
        />
        <StatCard
          title="Activity Rate"
          value={`${days.length > 0 ? Math.round((totalDays / days.length) * 100) : 0}%`}
        />
      </div>

      {/* Heatmap */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Month labels */}
          <div className="flex mb-2 pl-8">
            {monthMarkers.map((marker, i) => {
              const nextMarker = monthMarkers[i + 1];
              const width = nextMarker
                ? (nextMarker.weekIndex - marker.weekIndex) * 14
                : (weeks.length - marker.weekIndex) * 14;
              return (
                <div
                  key={`${marker.weekIndex}-${marker.month}`}
                  className="text-xs text-gray-400"
                  style={{ width: `${width}px`, minWidth: `${width}px` }}
                >
                  {monthLabels[marker.month]}
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] mr-2 text-xs text-gray-400">
              {dayLabels.map((day, i) => (
                <div key={day} className="h-[12px] flex items-center">
                  {i % 2 === 1 ? day : ''}
                </div>
              ))}
            </div>

            {/* Weeks */}
            <div className="flex gap-[2px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[2px]">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`w-[12px] h-[12px] rounded-sm ${
                        day ? levelColors[day.level] : 'bg-transparent'
                      } ${day ? 'cursor-pointer' : ''}`}
                      onMouseEnter={day ? (e) => handleMouseEnter(day, e) : undefined}
                      onMouseLeave={handleMouseLeave}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-400">
            <span>Less</span>
            {([0, 1, 2, 3, 4] as const).map(level => (
              <div key={level} className={`w-[12px] h-[12px] rounded-sm ${levelColors[level]}`} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded shadow-lg pointer-events-none"
          style={{
            left: hoveredDay.x,
            top: hoveredDay.y - 30,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="font-medium">{hoveredDay.count} completion{hoveredDay.count !== 1 ? 's' : ''}</span>
          <span className="text-gray-400 ml-1">on {format(parseISO(hoveredDay.date), 'MMM d, yyyy')}</span>
        </div>
      )}
    </div>
  );
}
