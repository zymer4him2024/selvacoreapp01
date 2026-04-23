'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import { WifiOff, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function NetworkStatusBar() {
  const { isOnline } = useNetworkStatus();
  const { pendingCount, failures, retryAll, dismissFailure, friendlyLabel } = useOfflineQueue();
  const { t } = useTranslation();

  // Red banner: permanent failures
  if (failures.length > 0) {
    return (
      <div className="fixed bottom-[72px] md:bottom-0 inset-x-0 z-50 bg-[#FF3B30] text-white shadow-[0_-2px_8px_rgba(0,0,0,0.12)]">
        {failures.map((f) => (
          <div key={f.entry.id} className="flex items-center gap-2 px-4 py-2 border-b border-white/10 last:border-b-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium truncate">
              {friendlyLabel(f.entry.type)} failed: {f.error}
            </span>
            <button
              onClick={() => dismissFailure(f.entry.id)}
              className="p-1 hover:bg-white/20 rounded transition-all flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={retryAll}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-sm font-semibold transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          {t.common?.tapToRetry || 'Tap to retry'}
        </button>
      </div>
    );
  }

  // Yellow banner: offline with pending count
  if (!isOnline) {
    return (
      <div className="fixed bottom-[72px] md:bottom-0 inset-x-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF9500] text-white text-sm font-medium shadow-[0_-2px_8px_rgba(0,0,0,0.12)]">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span>
          {t.common?.offline || 'You are offline'}
          {pendingCount > 0 && ` — ${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} pending`}
        </span>
      </div>
    );
  }

  // Online with pending items (actively syncing)
  if (pendingCount > 0) {
    return (
      <div className="fixed bottom-[72px] md:bottom-0 inset-x-0 z-50 flex items-center justify-center gap-2 px-4 py-2 bg-primary/90 text-white text-sm font-medium shadow-[0_-2px_8px_rgba(0,0,0,0.12)]">
        <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
        <span>Syncing {pendingCount} {pendingCount === 1 ? 'change' : 'changes'}...</span>
      </div>
    );
  }

  return null;
}
