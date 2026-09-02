'use client';

import { useState } from 'react';
import Dialog from './Dialog';
import { exportFilename, type LocalExportPayload } from '@/lib/localExport';

interface LocalExportDialogProps {
  payload: LocalExportPayload;
  onClose: () => void;
}

export default function LocalExportDialog({ payload, onClose }: LocalExportDialogProps) {
  const [status, setStatus] = useState<string | null>(null);

  const json = JSON.stringify(payload, null, 2);
  const filename = exportFilename(payload.exportedAt);

  const handleShare = async () => {
    const file = new File([json], filename, { type: 'application/json' });

    try {
      // iOS standalone PWAs cannot reliably trigger <a download>, but the share
      // sheet works and can save straight into Files.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        setStatus('Shared.');
        return;
      }
      setStatus('Sharing not available here — use Copy or select the text below.');
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      console.error('Share failed:', error);
      setStatus('Share failed — use Copy or select the text below.');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setStatus('Copied to clipboard.');
    } catch (error) {
      console.error('Copy failed:', error);
      setStatus('Copy failed — select the text below manually.');
    }
  };

  return (
    <Dialog onClose={onClose} maxWidth="lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Export unsaved changes</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-gray-400 mb-1">
        <span className="text-gray-200 font-semibold">{payload.pendingCount}</span> log
        {payload.pendingCount === 1 ? '' : 's'} queued on this device and not yet saved to the server.
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Signed in as{' '}
        <span className="text-gray-300">
          {(payload.auth?.body as { username?: string } | undefined)?.username ??
            `unknown (auth check: ${payload.auth?.status ?? 'failed'})`}
        </span>
      </p>

      <div className="space-y-2 mb-4">
        <button
          onClick={handleShare}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Share file
        </button>
        <button
          onClick={handleCopy}
          className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors"
        >
          Copy to clipboard
        </button>
      </div>

      {status && <p className="text-sm text-gray-300 mb-3">{status}</p>}

      <label className="block text-xs text-gray-500 mb-1">
        Fallback — select all and copy manually:
      </label>
      <textarea
        readOnly
        value={json}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full h-40 px-2 py-2 bg-gray-950 border border-gray-800 rounded text-gray-400 text-[10px] font-mono"
      />
    </Dialog>
  );
}
