import type { GoalColor } from './types';

// Seeded for every newly registered user so the app is usable immediately.
export const DEFAULT_GOALS: { name: string; color: GoalColor; display_order: number }[] = [
  { name: 'row', color: 'red', display_order: 1 },
  { name: 'lat', color: 'red', display_order: 2 },
  { name: 'lower', color: 'red', display_order: 3 },
  { name: 'side d', color: 'yellow', display_order: 4 },
  { name: 'rear d', color: 'yellow', display_order: 5 },
  { name: 'quads', color: 'green', display_order: 6 },
  { name: 'hamstrings', color: 'green', display_order: 7 },
  { name: 'calfs', color: 'green', display_order: 8 },
  { name: 'Adductor', color: 'green', display_order: 9 },
  { name: 'Chest', color: 'blue', display_order: 10 },
  { name: 'Arms', color: 'blue', display_order: 11 },
  { name: 'Abs', color: 'blue', display_order: 12 },
];
