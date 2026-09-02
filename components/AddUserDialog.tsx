'use client';

import { useState } from 'react';
import Dialog from './Dialog';

export default function AddUserDialog({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^[a-zA-Z0-9_-]{1,32}$/.test(username)) {
      setError('Username must be 1-32 characters (letters, numbers, _ or -)');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to create user');
        setSubmitting(false);
        return;
      }
      setCreated(username);
      setUsername('');
      setPin('');
      setSubmitting(false);
    } catch {
      setError('Failed to create user');
      setSubmitting(false);
    }
  };

  return (
    <Dialog onClose={onClose} maxWidth="sm">
      <h2 className="text-lg font-bold mb-4">Add user</h2>

      {created && (
        <div className="mb-4 rounded-lg border border-green-800 bg-green-900/30 px-3 py-2 text-sm text-green-100">
          Created user &quot;{created}&quot;. They can now sign in from the login screen.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            placeholder="username"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">PIN (4 digits)</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
            placeholder="••••"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white tracking-[0.5em] text-center focus:outline-none focus:border-blue-500"
          />
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-gray-300"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 font-medium transition-colors"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
