'use client';

import { useEffect, useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface UploadProgressProps {
  progress: number;
  fileName: string;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export default function UploadProgress({ progress, fileName, status, errorMessage }: UploadProgressProps) {
  const { t } = useTranslation();
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (displayProgress / 100) * circumference;

  const errorColor = '#ef4444';

  return (
    <div
      className="sc-row"
      style={{
        alignItems: 'center',
        gap: 16,
        padding: 16,
        background: 'var(--off-paper)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--hairline)',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0, width: 64, height: 64 }}>
        {status === 'uploading' && (
          <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="var(--hairline)"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="var(--brand)"
              strokeWidth="4"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 300ms cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {status === 'uploading' && (
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)' }}>
              {Math.round(displayProgress)}%
            </span>
          )}
          {status === 'success' && (
            <div
              style={{
                width: 64,
                height: 64,
                background: 'var(--brand)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check className="w-8 h-8" style={{ color: 'var(--paper)' }} />
            </div>
          )}
          {status === 'error' && (
            <div
              style={{
                width: 64,
                height: 64,
                background: errorColor,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle className="w-8 h-8" style={{ color: 'var(--paper)' }} />
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 600,
            color: 'var(--ink)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fileName}
        </p>
        <div style={{ marginTop: 4 }}>
          {status === 'uploading' && (
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0 }}>
              {t.components?.uploadProgress?.uploading || 'Uploading...'}
            </p>
          )}
          {status === 'success' && (
            <p style={{ fontSize: 14, color: 'var(--brand)', fontWeight: 600, margin: 0 }}>
              {t.components?.uploadProgress?.uploadComplete || 'Upload complete'}
            </p>
          )}
          {status === 'error' && (
            <p style={{ fontSize: 14, color: errorColor, margin: 0 }}>
              {errorMessage || 'Upload failed'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
