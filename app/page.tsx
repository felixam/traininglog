'use client';

import ManageGoals from '@/components/ManageGoals';
import ManageExercisesLibrary from '@/components/ManageExercisesLibrary';
import EditGoalDialog from '@/components/EditGoalDialog';
import LogDialog from '@/components/LogDialog';
import SettingsDialog from '@/components/SettingsDialog';
import PageHeader from '@/components/PageHeader';
import GoalTable from '@/components/GoalTable';
import { GoalLogEntry, Exercise, Goal } from '@/lib/types';
import { useSettings } from '@/lib/hooks/useSettings';
import { usePlanMode } from '@/lib/hooks/usePlanMode';
import { useDateRange } from '@/lib/hooks/useDateRange';
import { useGoals } from '@/lib/hooks/useGoals';
import { useState } from 'react';

export default function Home() {
  const { settings, updateSettings } = useSettings();
  const { planMode, setPlanMode, plannedGoals, togglePlanned } = usePlanMode();
  const { dates, getDayName, getDayNumber } = useDateRange(settings.visibleDays);
  const { goals, isLoading, sortByUrgency, setSortByUrgency, refetch } = useGoals(settings.visibleDays);

  const [showManageGoals, setShowManageGoals] = useState(false);
  const [showManageExercises, setShowManageExercises] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [dialogState, setDialogState] = useState<{
    goalId: number;
    goalName: string;
    date: string;
    linkedExercises: Exercise[];
    existingLog?: GoalLogEntry;
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
        existingLog,
      });
    }
  };

  // Save log from dialog
  const handleSaveLog = async (exerciseId?: number, weight?: number, reps?: number) => {
    if (!dialogState) return;

    try {
      const response = await fetch('/api/logs/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: dialogState.goalId,
          date: dialogState.date,
          exercise_id: exerciseId,
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
        `/api/logs/toggle?goal_id=${dialogState.goalId}&date=${dialogState.date}`,
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
      />

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
          goalId={dialogState.goalId}
          goalName={dialogState.goalName}
          date={dialogState.date}
          linkedExercises={dialogState.linkedExercises}
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
          onManageGoals={() => {
            setShowSettings(false);
            setShowManageGoals(true);
          }}
          onManageExercises={() => {
            setShowSettings(false);
            setShowManageExercises(true);
          }}
        />
      )}
    </div>
  );
}
