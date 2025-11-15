'use client';

import ManageExercises from '@/components/ManageExercises';
import ExerciseRow from '@/components/ExerciseRow';
import LogDialog from '@/components/LogDialog';
import SettingsDialog from '@/components/SettingsDialog';
import { ExerciseWithLogs, LogEntry } from '@/lib/types';
import { AppSettings, getSettings, saveSettings } from '@/lib/settings';
import { format, subDays } from 'date-fns';
import { useEffect, useState } from 'react';

export default function Home() {
  const [exercises, setExercises] = useState<ExerciseWithLogs[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showManage, setShowManage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ visibleDays: 7 });
  const [sortByUrgency, setSortByUrgency] = useState(false);
  const [dialogState, setDialogState] = useState<{
    exerciseId: number;
    exerciseName: string;
    date: string;
    existingLog?: LogEntry;
  } | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadedSettings = getSettings();
    setSettings(loadedSettings);
  }, []);

  // Generate dates based on settings
  useEffect(() => {
    const today = new Date();
    const days = Array.from({ length: settings.visibleDays }, (_, i) => {
      return format(subDays(today, settings.visibleDays - 1 - i), 'yyyy-MM-dd');
    });
    setDates(days);
  }, [settings.visibleDays]);

  // Sort exercises based on urgency mode
  const sortExercises = (exercisesList: ExerciseWithLogs[], byUrgency: boolean) => {
    if (!byUrgency) {
      // Sort by display_order (already sorted from API, but ensure it)
      return [...exercisesList].sort((a, b) => a.display_order - b.display_order);
    } else {
      // Sort by urgency (last exercise date, oldest first)
      return [...exercisesList].sort((a, b) => {
        // Find the most recent completed date for each exercise
        const getLastCompletedDate = (exercise: ExerciseWithLogs) => {
          const completedDates = Object.entries(exercise.logs)
            .filter(([, log]) => log.completed)
            .map(([date]) => date)
            .sort()
            .reverse();
          return completedDates[0] || ''; // Return empty string if never completed
        };

        const lastA = getLastCompletedDate(a);
        const lastB = getLastCompletedDate(b);

        // Exercises never completed go to the top
        if (!lastA && !lastB) return a.display_order - b.display_order;
        if (!lastA) return -1;
        if (!lastB) return 1;

        // Sort by date (oldest first)
        return lastA.localeCompare(lastB);
      });
    }
  };

  // Fetch exercises and logs
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/logs?days=${settings.visibleDays}`);
      const data = await response.json();
      const sorted = sortExercises(data.exercises || [], sortByUrgency);
      setExercises(sorted);
    } catch (error) {
      console.error('Error fetching data:', error);
      setExercises([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (settings.visibleDays > 0) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.visibleDays]);

  // Re-sort exercises when sort mode changes
  useEffect(() => {
    if (exercises.length > 0) {
      setExercises(prev => sortExercises(prev, sortByUrgency));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortByUrgency]);

  // Open log dialog
  const handleToggle = (exerciseId: number, date: string) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    const existingLog = exercise.logs[date];
    setDialogState({
      exerciseId,
      exerciseName: exercise.name,
      date,
      existingLog,
    });
  };

  // Save log from dialog
  const handleSaveLog = async (weight?: number, reps?: number) => {
    if (!dialogState) return;

    try {
      const response = await fetch('/api/logs/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_id: dialogState.exerciseId,
          date: dialogState.date,
          weight,
          reps,
        }),
      });

      if (response.ok) {
        setDialogState(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving log:', error);
    }
  };

  // Delete log from dialog
  const handleDeleteLog = async () => {
    if (!dialogState) return;

    try {
      const response = await fetch(
        `/api/logs/toggle?exercise_id=${dialogState.exerciseId}&date=${dialogState.date}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setDialogState(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting log:', error);
    }
  };

  // Save settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
  };

  // Get day name from date
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00'); // Add time to avoid timezone issues
    return format(date, 'EE'); // Short day name (Mo, Tu, etc.)
  };

  // Get day number from date
  const getDayNumber = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return format(date, 'd');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-400 hover:text-gray-300"
            title="Settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">
            Training<span className="text-blue-500">Log</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Sort by Urgency Toggle */}
          <button
            onClick={() => setSortByUrgency(!sortByUrgency)}
            className={`transition-colors ${sortByUrgency
              ? 'text-blue-500 hover:text-blue-400'
              : 'text-gray-400 hover:text-gray-300'
              }`}
            title={sortByUrgency ? 'Sorted by urgency' : 'Sort by urgency'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {/* Manage Exercises Button */}
          <button
            onClick={() => setShowManage(!showManage)}
            className="text-gray-400 hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Exercise Table */}
      {exercises.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No exercises yet.</p>
          <p className="text-gray-600 text-sm mt-2">Click the pencil button to add your first exercise.</p>
        </div>
      ) : (
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left pb-2 pr-2"></th>
              {dates.map((date) => (
                <th key={date} className="text-center pb-2 px-1">
                  <div className="text-xs text-gray-500 w-[30px] text-center">{getDayName(date)}</div>
                  <div className="text-sm font-semibold text-gray-300 w-[30px] text-center">{getDayNumber(date)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exercises.map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                dates={dates}
                onToggle={handleToggle}
              />
            ))}
          </tbody>
        </table>
      )}

      {/* Manage Exercises Modal */}
      {showManage && (
        <ManageExercises
          exercises={exercises}
          onClose={() => setShowManage(false)}
          onRefresh={fetchData}
        />
      )}

      {/* Log Entry Dialog */}
      {dialogState && (
        <LogDialog
          exerciseId={dialogState.exerciseId}
          exerciseName={dialogState.exerciseName}
          date={dialogState.date}
          existingLog={dialogState.existingLog}
          onSave={handleSaveLog}
          onDelete={dialogState.existingLog ? handleDeleteLog : undefined}
          onCancel={() => setDialogState(null)}
        />
      )}

      {/* Settings Dialog */}
      {showSettings && (
        <SettingsDialog
          currentSettings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
