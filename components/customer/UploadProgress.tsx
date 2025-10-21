'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';

interface UploadProgressProps {
  progress: number;
  fileName: string;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export default function UploadProgress({ progress, fileName, status, errorMessage }: UploadProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // Animate progress
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (displayProgress / 100) * circumference;

  return (
    <div className="flex items-center gap-4 p-4 bg-surface-elevated rounded-apple">
      {/* Progress Circle */}
      <div className="relative flex-shrink-0">
        {status === 'uploading' && (
          <svg className="w-16 h-16 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-border"
            />
            {/* Progress circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="text-primary transition-all duration-300"
              strokeLinecap="round"
            />
          </svg>
        )}
        
        <div className="absolute inset-0 flex items-center justify-center">
          {status === 'uploading' && (
            <span className="text-sm font-bold text-primary">{Math.round(displayProgress)}%</span>
          )}
          {status === 'success' && (
            <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center animate-scale-in">
              <Check className="w-8 h-8 text-white" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 bg-error rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-primary truncate">{fileName}</p>
        <div className="mt-1">
          {status === 'uploading' && (
            <p className="text-sm text-text-secondary">Uploading...</p>
          )}
          {status === 'success' && (
            <p className="text-sm text-success font-medium">Upload complete!</p>
          )}
          {status === 'error' && (
            <p className="text-sm text-error">{errorMessage || 'Upload failed'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

