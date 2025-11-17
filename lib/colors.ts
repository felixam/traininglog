import { ExerciseColor } from './types';

/**
 * Central color configuration for goals
 * Defines all color variations used throughout the app
 */
export const colorConfig: Record<
  ExerciseColor,
  {
    label: string;
    bgClass: string; // Base background class (500 level)
    active: string; // Active/completed state
    inactiveBg: string; // Inactive background
    inactiveBorder: string; // Border for inactive state
    plannedBorder: string; // Border for planned state
  }
> = {
  red: {
    label: 'Red',
    bgClass: 'bg-red-500',
    active: 'bg-red-500/70',
    inactiveBg: 'bg-red-950/50',
    inactiveBorder: '',
    plannedBorder: 'border-4 border-red-500/70',
  },
  orange: {
    label: 'Orange',
    bgClass: 'bg-orange-500',
    active: 'bg-orange-500/70',
    inactiveBg: 'bg-orange-950/50',
    inactiveBorder: '',
    plannedBorder: 'border-4 border-orange-500/70',
  },
  yellow: {
    label: 'Yellow',
    bgClass: 'bg-yellow-500',
    active: 'bg-yellow-500/80',
    inactiveBg: 'bg-yellow-950/50',
    inactiveBorder: '',
    plannedBorder: 'border-4 border-yellow-500/80',
  },
  green: {
    label: 'Green',
    bgClass: 'bg-green-500',
    active: 'bg-green-500/70',
    inactiveBg: 'bg-green-950/50',
    inactiveBorder: '',
    plannedBorder: 'border-4 border-green-500/70',
  },
  teal: {
    label: 'Teal',
    bgClass: 'bg-teal-500',
    active: 'bg-teal-500/70',
    inactiveBg: 'bg-teal-950/50',
    inactiveBorder: '',
    plannedBorder: 'border-4 border-teal-500/70',
  },
  blue: {
    label: 'Blue',
    bgClass: 'bg-blue-500',
    active: 'bg-blue-500/70',
    inactiveBg: 'bg-blue-950/50',
    inactiveBorder: '',
    plannedBorder: 'border-4 border-blue-500/70',
  },
  violet: {
    label: 'Violet',
    bgClass: 'bg-violet-500',
    active: 'bg-violet-500/70',
    inactiveBg: 'bg-violet-950/50',
    inactiveBorder: '',
    plannedBorder: 'border-4 border-violet-500/70',
  },
};

/**
 * Get all available color options for use in select/picker components
 */
export const colorOptions = Object.entries(colorConfig).map(([value, config]) => ({
  value: value as ExerciseColor,
  label: config.label,
  bgClass: config.bgClass,
}));
