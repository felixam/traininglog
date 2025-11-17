import { useState } from 'react';
import { AppSettings, getSettings, saveSettings } from '../settings';

/**
 * Hook to manage app settings with localStorage persistence
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());

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
