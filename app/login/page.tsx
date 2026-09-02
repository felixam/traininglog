'use client';

import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [usernames, setUsernames] = useState<string[]>([]);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [username, setUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/users')
      .then((res) => res.json())
      .then((data) => {
        const list: string[] = data.usernames || [];
        setUsernames(list);
        setNeedsBootstrap(Boolean(data.needsBootstrap));
        if (list.length > 0) setUsername(list[0]);
      })
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoadingUsers(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(pin)) {
      setError('Password must be exactly 4 digits');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = needsBootstrap ? '/api/auth/register' : '/api/auth/login';
      const body = needsBootstrap
        ? { username: newUsername, password: pin }
        : { username, password: pin };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Login failed');
        setSubmitting(false);
        return;
      }

      // Cookie is set; do a full navigation so middleware re-evaluates.
      window.location.assign('/');
    } catch {
      setError('Login failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-1 text-center">
          Training<span className="text-blue-500">Log</span>
        </h1>
        <p className="text-sm text-gray-400 text-center mb-6">
          {needsBootstrap ? 'Create the first user' : 'Sign in'}
        </p>

        {loadingUsers ? (
          <div className="text-center text-gray-400">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {needsBootstrap ? (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  autoFocus
                  placeholder="username"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm text-gray-400 mb-1">User</label>
                <select
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  {usernames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">PIN (4 digits)</label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete={needsBootstrap ? 'new-password' : 'current-password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                placeholder="••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white tracking-[0.5em] text-center focus:outline-none focus:border-blue-500"
              />
            </div>

            {error && <div className="text-sm text-red-400">{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 font-medium transition-colors"
            >
              {submitting ? 'Please wait...' : needsBootstrap ? 'Create user' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
