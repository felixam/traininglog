'use client';

interface BackupMetadata {
  timestamp: string;
  counts: {
    goals: number;
    exercises: number;
    goal_exercises: number;
    goal_logs: number;
    exercise_logs: number;
  };
}

interface RestoreConfirmDialogProps {
  backupMetadata: BackupMetadata;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RestoreConfirmDialog({
  backupMetadata,
  onConfirm,
  onCancel,
}: RestoreConfirmDialogProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  // Format timestamp
  const backupDate = new Date(backupMetadata.timestamp).toLocaleString();

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-gray-900 rounded-lg max-w-md w-full p-6"
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with warning icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Restore Database</h2>
            <p className="text-sm text-gray-400">This action cannot be undone</p>
          </div>
        </div>

        {/* Warning message */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-400">
            <strong className="font-semibold">Warning:</strong> This will permanently delete all current data and replace it with the backup.
          </p>
        </div>

        {/* Backup metadata */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Backup Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Backup Date:</span>
              <span className="text-gray-300">{backupDate}</span>
            </div>
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="text-gray-400 mb-1">Records to restore:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Goals:</span>
                  <span className="text-gray-400">{backupMetadata.counts.goals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Exercises:</span>
                  <span className="text-gray-400">{backupMetadata.counts.exercises}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Goal Logs:</span>
                  <span className="text-gray-400">{backupMetadata.counts.goal_logs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Exercise Logs:</span>
                  <span className="text-gray-400">{backupMetadata.counts.exercise_logs}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Restore Database
          </button>
        </div>
      </div>
    </div>
  );
}
