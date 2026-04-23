'use client';

import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export default function InstallAppBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-apple p-4 flex items-center gap-4">
      <div className="w-10 h-10 bg-primary rounded-apple flex items-center justify-center flex-shrink-0">
        <Download className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Install Selvacore</p>
        <p className="text-xs text-text-secondary">Add to home screen for quick access</p>
      </div>
      <button
        onClick={install}
        className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-apple hover:bg-primary-hover transition-all flex-shrink-0"
      >
        Install
      </button>
      <button
        onClick={dismiss}
        className="p-1.5 hover:bg-surface-elevated rounded-apple transition-all flex-shrink-0"
        aria-label="Dismiss install prompt"
      >
        <X className="w-4 h-4 text-text-secondary" />
      </button>
    </div>
  );
}
