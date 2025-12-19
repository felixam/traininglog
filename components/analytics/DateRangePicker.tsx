import { format, subMonths, subYears } from 'date-fns';

export interface DateRange {
  startDate: string | null;
  endDate: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type QuickFilter = 'all' | '1y' | '6m' | '3m' | '1m';

const quickFilters: { id: QuickFilter; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: '1y', label: '1 year' },
  { id: '6m', label: '6 months' },
  { id: '3m', label: '3 months' },
  { id: '1m', label: '1 month' },
];

function getQuickFilterRange(filter: QuickFilter): DateRange {
  const today = new Date();
  const endDate = format(today, 'yyyy-MM-dd');

  switch (filter) {
    case 'all':
      return { startDate: null, endDate };
    case '1y':
      return { startDate: format(subYears(today, 1), 'yyyy-MM-dd'), endDate };
    case '6m':
      return { startDate: format(subMonths(today, 6), 'yyyy-MM-dd'), endDate };
    case '3m':
      return { startDate: format(subMonths(today, 3), 'yyyy-MM-dd'), endDate };
    case '1m':
      return { startDate: format(subMonths(today, 1), 'yyyy-MM-dd'), endDate };
  }
}

function getActiveFilter(range: DateRange): QuickFilter | null {
  const today = new Date();
  const endDate = format(today, 'yyyy-MM-dd');

  if (range.endDate !== endDate) return null;

  if (range.startDate === null) return 'all';

  const filters: QuickFilter[] = ['1y', '6m', '3m', '1m'];
  for (const filter of filters) {
    const filterRange = getQuickFilterRange(filter);
    if (filterRange.startDate === range.startDate) return filter;
  }

  return null;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const activeFilter = getActiveFilter(value);

  return (
    <div className="flex flex-wrap gap-2">
      {quickFilters.map(filter => (
        <button
          key={filter.id}
          onClick={() => onChange(getQuickFilterRange(filter.id))}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeFilter === filter.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
