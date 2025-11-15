'use client';

import ManageExercises from '@/components/ManageExercises';
import LogDialog from '@/components/LogDialog';
import SettingsDialog from '@/components/SettingsDialog';
import PageHeader from '@/components/PageHeader';
import ExerciseTable from '@/components/ExerciseTable';
import { LogEntry } from '@/lib/types';
import { useSettings } from '@/lib/hooks/useSettings';
import { usePlanMode } from '@/lib/hooks/usePlanMode';
import { useDateRange } from '@/lib/hooks/useDateRange';
import { useExercises } from '@/lib/hooks/useExercises';
import { useState } from 'react';

export default function Home() {
  const { settings, updateSettings } = useSettings();
  const { planMode, setPlanMode, plannedExercises, togglePlanned } = usePlanMode();
  const { dates, getDayName, getDayNumber } = useDateRange(settings.visibleDays);
  const { exercises, isLoading, sortByUrgency, setSortByUrgency, refetch } = useExercises(settings.visibleDays);

  const [showManage, setShowManage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dialogState, setDialogState] = useState<{
    exerciseId: number;
    exerciseName: string;
    date: string;
    existingLog?: LogEntry;
  } | null>(null);

  // Toggle handler - plan mode or log dialog
  const handleToggle = (exerciseId: number, date: string) => {
    if (planMode) {
      // In plan mode: toggle planned state for today
      togglePlanned(exerciseId);
    } else {
      // In normal mode: open log dialog
      const exercise = exercises.find(e => e.id === exerciseId);
      if (!exercise) return;

      const existingLog = exercise.logs[date];
      setDialogState({
        exerciseId,
        exerciseName: exercise.name,
        date,
        existingLog,
      });
    }
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
        refetch();
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
        refetch();
      }
    } catch (error) {
      console.error('Error deleting log:', error);
    }
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
      <PageHeader
        sortByUrgency={sortByUrgency}
        onSortToggle={() => setSortByUrgency(!sortByUrgency)}
        planMode={planMode}
        onPlanModeToggle={() => setPlanMode(!planMode)}
        onSettingsClick={() => setShowSettings(true)}
        onManageClick={() => setShowManage(!showManage)}
      />

      <ExerciseTable
        exercises={exercises}
        dates={dates}
        getDayName={getDayName}
        getDayNumber={getDayNumber}
        onToggle={handleToggle}
        plannedExercises={plannedExercises}
      />

      {/* Manage Exercises Modal */}
      {showManage && (
        <ManageExercises
          exercises={exercises}
          onClose={() => setShowManage(false)}
          onRefresh={refetch}
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
          onSave={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
