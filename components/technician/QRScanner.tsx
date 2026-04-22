'use client';

import { useEffect, useRef, useState } from 'react';
import { X, SwitchCamera } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onCancel: () => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onCancel, onError }: QRScannerProps) {
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
          () => {} // ignore scan failures (no QR in frame)
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

      // Toggle between cameras
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

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-surface/80 backdrop-blur-sm border-b border-border">
        <button
          onClick={onCancel}
          className="p-2 rounded-apple hover:bg-surface-elevated transition-all"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold">Scan QR Code</h2>
        <button
          onClick={handleSwitchCamera}
          className="p-2 rounded-apple hover:bg-surface-elevated transition-all"
        >
          <SwitchCamera className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4" ref={containerRef}>
        {cameraError ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto">
              <X className="w-8 h-8 text-error" />
            </div>
            <p className="text-error font-medium">Camera Error</p>
            <p className="text-sm text-text-secondary max-w-sm">{cameraError}</p>
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-surface-elevated rounded-apple font-medium hover:bg-border transition-all"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            <div
              id="qr-reader"
              className="w-full max-w-sm rounded-apple overflow-hidden"
              style={{ minHeight: 300 }}
            />
            {!scanning && (
              <div className="mt-4 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-text-secondary">Starting camera...</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer instruction */}
      {scanning && !cameraError && (
        <div className="p-4 text-center bg-surface/80 backdrop-blur-sm border-t border-border">
          <p className="text-sm text-text-secondary">
            Point camera at the QR code on the Ezer device
          </p>
        </div>
      )}
    </div>
  );
}
