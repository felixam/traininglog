'use client';

import ManageGoals from '@/components/ManageGoals';
import ManageExercisesLibrary from '@/components/ManageExercisesLibrary';
import EditGoalDialog from '@/components/EditGoalDialog';
import LogDialog from '@/components/LogDialog';
import SettingsDialog from '@/components/SettingsDialog';
import RestoreConfirmDialog from '@/components/RestoreConfirmDialog';
import PageHeader from '@/components/PageHeader';
import GoalTable from '@/components/GoalTable';
import { GoalLogEntry, ExerciseWithHistory, Goal } from '@/lib/types';
import { useSettings } from '@/lib/hooks/useSettings';
import { usePlanMode } from '@/lib/hooks/usePlanMode';
import { useDateRange } from '@/lib/hooks/useDateRange';
import { useGoals } from '@/lib/hooks/useGoals';
import { useState } from 'react';

export default function Home() {
  const { settings, updateSettings } = useSettings();
  const { planMode, setPlanMode, plannedGoals, togglePlanned } = usePlanMode();
  const { dates, getDayName, getDayNumber } = useDateRange(settings.visibleDays);
  const {
    goals,
    isLoading,
    sortByUrgency,
    setSortByUrgency,
    refetch,
    lastFetchedAt,
    error,
    isStaleForVisibleDays,
    optimisticUpsertLog,
    optimisticDeleteLog,
  } = useGoals(settings.visibleDays);

  const [showManageGoals, setShowManageGoals] = useState(false);
  const [showManageExercises, setShowManageExercises] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [dialogState, setDialogState] = useState<{
    goalId: number;
    goalName: string;
    date: string;
    linkedExercises: ExerciseWithHistory[];
    lastCompletedExerciseId?: number;
    existingLog?: GoalLogEntry;
  } | null>(null);
  const [restoreConfirmData, setRestoreConfirmData] = useState<{
    file: File;
    metadata: {
      timestamp: string;
      counts: {
        goals: number;
        exercises: number;
        goal_exercises: number;
        goal_logs: number;
        exercise_logs: number;
      };
    };
  } | null>(null);

  // Toggle handler - plan mode or log dialog
  const handleToggle = (goalId: number, date: string) => {
    if (planMode) {
      // In plan mode: toggle planned state for today
      togglePlanned(goalId);
    } else {
      // In normal mode: open log dialog
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      const existingLog = goal.logs[date];
      setDialogState({
        goalId,
        goalName: goal.name,
        date,
        linkedExercises: goal.linkedExercises || [],
        lastCompletedExerciseId: goal.lastCompletedExerciseId,
        existingLog,
      });
    }
  };

  // Save log from dialog
  const handleSaveLog = async (exerciseId?: number, weight?: number, reps?: number) => {
    if (!dialogState) return;

    optimisticUpsertLog({
      goalId: dialogState.goalId,
      date: dialogState.date,
      exerciseId,
      weight,
      reps,
    });
    setDialogState(null);
  };

  // Delete log from dialog
  const handleDeleteLog = async () => {
    if (!dialogState) return;

    optimisticDeleteLog(dialogState.goalId, dialogState.date);
    setDialogState(null);
  };

  // Backup database
  const handleBackup = async () => {
    try {
      const response = await fetch('/api/backup');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trainingslog-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Failed to create backup');
    }
  };

  // Restore database - file selection
  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        // Read and validate the file
        const text = await file.text();
        const backup = JSON.parse(text);

        // Validate backup structure
        if (!backup.version || !backup.timestamp || !backup.data) {
          alert('Invalid backup file format');
          return;
        }

        const { data } = backup;
        if (!data.goals || !data.exercises || !data.goal_logs || !data.exercise_logs) {
          alert('Invalid backup file format - missing required tables');
          return;
        }

        // Show confirmation dialog with metadata
        setRestoreConfirmData({
          file,
          metadata: {
            timestamp: backup.timestamp,
            counts: {
              goals: data.goals.length,
              exercises: data.exercises.length,
              goal_exercises: data.goal_exercises?.length || 0,
              goal_logs: data.goal_logs.length,
              exercise_logs: data.exercise_logs.length,
            },
          },
        });
      } catch (error) {
        console.error('Error reading backup file:', error);
        alert('Failed to read backup file - invalid JSON');
      }
    };
    input.click();
  };

  // Restore database - confirmed
  const handleRestoreConfirmed = async () => {
    if (!restoreConfirmData) return;

    try {
      const formData = new FormData();
      formData.append('file', restoreConfirmData.file);

      const response = await fetch('/api/restore', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setRestoreConfirmData(null);
        setShowSettings(false);
        refetch();
        alert('Database restored successfully');
      } else {
        const error = await response.json();
        alert(`Failed to restore database: ${error.error}`);
      }
    } catch (error) {
      console.error('Error restoring database:', error);
      alert('Failed to restore database');
    }
  };

  const isInitialLoad = isLoading && goals.length === 0;
  const lastUpdatedLabel = lastFetchedAt ? new Date(lastFetchedAt).toLocaleString() : null;
  const showStaleNotice = (error || isStaleForVisibleDays) && goals.length > 0;

  if (isInitialLoad) {
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
      />

      {showStaleNotice && (
        <div className="mb-3 rounded-lg border border-yellow-800 bg-yellow-900/30 px-4 py-3 text-sm text-yellow-100">
          {error ? 'Showing saved data. Latest refresh failed.' : 'Showing saved data from a different day range.'}
          {lastUpdatedLabel && (
            <div className="text-xs text-yellow-200/80">Last updated: {lastUpdatedLabel}</div>
          )}
        </div>
      )}

      <GoalTable
        goals={goals}
        dates={dates}
        getDayName={getDayName}
        getDayNumber={getDayNumber}
        onToggle={handleToggle}
        plannedGoals={plannedGoals}
      />

      {/* Manage Goals Modal */}
      {showManageGoals && (
        <ManageGoals
          goals={goals}
          onClose={() => setShowManageGoals(false)}
          onRefresh={refetch}
          onEditGoal={(goal) => {
            setEditingGoal(goal);
            setShowManageGoals(false);
          }}
        />
      )}

      {/* Manage Exercises Library Modal */}
      {showManageExercises && (
        <ManageExercisesLibrary
          onClose={() => setShowManageExercises(false)}
          onRefresh={refetch}
        />
      )}

      {/* Edit Goal Dialog */}
      {editingGoal && (
        <EditGoalDialog
          goal={editingGoal}
          onClose={() => {
            setEditingGoal(null);
            setShowManageGoals(true);
          }}
          onSave={() => {
            setEditingGoal(null);
            refetch();
          }}
        />
      )}

      {/* Log Entry Dialog */}
      {dialogState && (
        <LogDialog
          goalName={dialogState.goalName}
          date={dialogState.date}
          linkedExercises={dialogState.linkedExercises}
          existingLog={dialogState.existingLog}
          lastCompletedExerciseId={dialogState.lastCompletedExerciseId}
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
          onManageGoals={() => {
            setShowSettings(false);
            setShowManageGoals(true);
          }}
          onManageExercises={() => {
            setShowSettings(false);
            setShowManageExercises(true);
          }}
          onBackup={handleBackup}
          onRestore={handleRestore}
        />
      )}

      {/* Restore Confirmation Dialog */}
      {restoreConfirmData && (
        <RestoreConfirmDialog
          backupMetadata={restoreConfirmData.metadata}
          onConfirm={handleRestoreConfirmed}
          onCancel={() => setRestoreConfirmData(null)}
        />
      )}
    </div>
  );
}
