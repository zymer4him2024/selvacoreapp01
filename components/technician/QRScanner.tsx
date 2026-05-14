'use client';

import { useEffect, useRef, useState } from 'react';
import { X, SwitchCamera } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface QRScannerProps {
  onScan: (data: string) => void;
  onCancel: () => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onCancel, onError }: QRScannerProps) {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted) return;

        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            scanner.stop().catch(() => {});
            scannerRef.current = null;
            onScan(decodedText);
          },
          () => {}
        );

        if (mounted) setScanning(true);
      } catch (err: unknown) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : 'Failed to start camera';
        setCameraError(message);
        onError?.(message);
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const handleSwitchCamera = async () => {
    if (!scannerRef.current) return;

    try {
      await scannerRef.current.stop();
      const { Html5Qrcode } = await import('html5-qrcode');
      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length < 2) return;

      const currentFacing = scannerRef.current._localMediaStream
        ?.getVideoTracks()[0]
        ?.getSettings()?.facingMode;
      const nextFacing = currentFacing === 'environment' ? 'user' : 'environment';

      await scannerRef.current.start(
        { facingMode: nextFacing },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          scannerRef.current?.stop().catch(() => {});
          scannerRef.current = null;
          onScan(decodedText);
        },
        () => {}
      );
    } catch {
      // Ignore camera switch errors
    }
  };

  const iconBtn: React.CSSProperties = {
    padding: 8,
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    border: 'none',
    color: 'var(--ink)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div
      className="sc"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--paper)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          background: 'var(--paper)',
          borderBottom: '1px solid var(--line)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          onClick={onCancel}
          aria-label={t.components.qrScanner.cancelScan}
          style={iconBtn}
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="sc-h2" style={{ margin: 0, fontSize: 18 }}>{t.components.qrScanner.title}</h2>
        <button
          onClick={handleSwitchCamera}
          aria-label={t.components.qrScanner.switchCamera}
          style={iconBtn}
        >
          <SwitchCamera className="w-6 h-6" />
        </button>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        {cameraError ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X className="w-8 h-8" style={{ color: '#ef4444' }} />
            </div>
            <p style={{ color: '#ef4444', fontWeight: 500, margin: 0 }}>{t.components.qrScanner.cameraError}</p>
            <p className="sc-helper" style={{ maxWidth: 360, margin: 0 }}>{cameraError}</p>
            <button onClick={onCancel} className="sc-cta-ghost">
              {t.components.qrScanner.goBack}
            </button>
          </div>
        ) : (
          <>
            <div
              id="qr-reader"
              style={{
                width: '100%',
                maxWidth: 384,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                minHeight: 300,
              }}
            />
            {!scanning && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <div
                  className="sc-spinner"
                  style={{ margin: '0 auto 8px' }}
                />
                <p className="sc-helper" style={{ margin: 0 }}>{t.components.qrScanner.startingCamera}</p>
              </div>
            )}
          </>
        )}
      </div>

      {scanning && !cameraError && (
        <div
          style={{
            padding: 16,
            textAlign: 'center',
            background: 'var(--paper)',
            borderTop: '1px solid var(--line)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <p className="sc-helper" style={{ margin: 0 }}>
            Point camera at the QR code on the Ezer device
          </p>
        </div>
      )}
    </div>
  );
}
