import { useEffect, useState } from 'react';
import { AppSettings, getSettings, saveSettings } from '../settings';

/**
 * Hook to manage app settings with localStorage persistence
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>({ visibleDays: 7 });

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadedSettings = getSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadedSettings);
  }, []);

  // Update settings and save to localStorage
  const updateSettings = (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
  };

  return {
    settings,
    updateSettings,
  };
}
