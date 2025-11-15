// Settings stored in localStorage
export interface AppSettings {
  visibleDays: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  visibleDays: 7,
};

const SETTINGS_KEY = 'trainingslog_settings';

// Get settings from localStorage
export function getSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
      };
    }
  } catch (error) {
    console.error('Error reading settings from localStorage:', error);
  }

  return DEFAULT_SETTINGS;
}

// Save settings to localStorage
export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
}
