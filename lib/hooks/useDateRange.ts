import { format, subDays } from 'date-fns';
import { useEffect, useState } from 'react';

/**
 * Parse a date string avoiding timezone issues
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

/**
 * Get day name from date string (e.g., "Mo", "Tu")
 */
export function getDayName(dateStr: string): string {
  return format(parseDate(dateStr), 'EE');
}

/**
 * Get day number from date string (e.g., "1", "15")
 */
export function getDayNumber(dateStr: string): string {
  return format(parseDate(dateStr), 'd');
}

/**
 * Hook to manage date range based on visible days setting
 */
export function useDateRange(visibleDays: number) {
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    const today = new Date();
    const days = Array.from({ length: visibleDays }, (_, i) => {
      return format(subDays(today, visibleDays - 1 - i), 'yyyy-MM-dd');
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDates(days);
  }, [visibleDays]);

  return {
    dates,
    getDayName,
    getDayNumber,
  };
}
