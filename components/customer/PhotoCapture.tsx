'use client';

import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, X, RotateCw, Check } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface PhotoCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  title: string;
  description: string;
}

export default function PhotoCapture({ onCapture, onCancel, title, description }: PhotoCaptureProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'select' | 'camera' | 'captured'>('select');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  const videoConstraints = {
    facingMode: facingMode,
  };

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setMode('captured');
    }
  }, [webcamRef]);

  const handleRetake = () => {
    setCapturedImage(null);
    setMode('camera');
  };

  const handleUseCaptured = () => {
    if (!capturedImage) return;
    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (mode === 'select') {
    return (
      <div className="sc" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', minHeight: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 448 }}>
          <div className="sc-card-static">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h2 className="sc-h1" style={{ marginBottom: 8 }}>{title}</h2>
              <p className="sc-helper">{description}</p>
            </div>

            <div className="sc-stack" style={{ gap: 12 }}>
              <button
                type="button"
                onClick={() => setMode('camera')}
                className="sc-cta"
                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 24px' }}
              >
                <Camera className="w-6 h-6" />
                {t.common?.takePhoto || 'Take Photo'}
              </button>

              <label
                className="sc-cta-ghost"
                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 24px', cursor: 'pointer' }}
              >
                <Upload className="w-6 h-6" />
                {t.common?.chooseFile || 'Choose File'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>

              <button
                type="button"
                onClick={onCancel}
                style={{ width: '100%', padding: '12px 24px', color: 'var(--soft)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'camera') {
    return (
      <div className="sc" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
        <div className="sc-row-between" style={{ padding: 16, background: 'var(--paper)', borderBottom: '1px solid var(--hairline)' }}>
          <button
            type="button"
            onClick={() => setMode('select')}
            className="sc-cta-ghost"
            style={{ padding: 8, width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X className="w-6 h-6" />
          </button>
          <h3 style={{ fontWeight: 600, margin: 0 }}>{title}</h3>
          <button
            type="button"
            onClick={switchCamera}
            className="sc-cta-ghost"
            style={{ padding: 8, width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RotateCw className="w-6 h-6" />
          </button>
        </div>

        <div style={{ flex: 1, position: 'relative', background: '#000' }}>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: '90%', maxWidth: 512, aspectRatio: '4 / 3', border: '4px solid var(--brand)', opacity: 0.5, borderRadius: 'var(--radius-sm)' }} />
          </div>
        </div>

        <div style={{ padding: 24, background: 'var(--paper)', borderTop: '1px solid var(--hairline)' }}>
          <button
            type="button"
            onClick={handleCapture}
            style={{ width: 80, height: 80, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand)', borderRadius: '50%', border: 'none', cursor: 'pointer', transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div style={{ width: 64, height: 64, background: 'var(--paper)', borderRadius: '50%' }} />
          </button>
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--soft)', marginTop: 12 }}>{description}</p>
        </div>
      </div>
    );
  }

  if (mode === 'captured' && capturedImage) {
    return (
      <div className="sc" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
        <div className="sc-row-between" style={{ padding: 16, background: 'var(--paper)', borderBottom: '1px solid var(--hairline)' }}>
          <h3 style={{ fontWeight: 600, margin: 0 }}>Preview</h3>
          <button
            type="button"
            onClick={() => setMode('select')}
            className="sc-cta-ghost"
            style={{ padding: 8, width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div style={{ flex: 1, background: '#000', padding: 16 }}>
          <img
            src={capturedImage}
            alt="Captured"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        <div className="sc-stack" style={{ padding: 16, gap: 12, background: 'var(--paper)', borderTop: '1px solid var(--hairline)' }}>
          <button
            type="button"
            onClick={handleUseCaptured}
            className="sc-cta"
            style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 24px' }}
          >
            <Check className="w-5 h-5" />
            {t.common?.usePhoto || 'Use Photo'}
          </button>
          <button
            type="button"
            onClick={handleRetake}
            className="sc-cta-ghost"
            style={{ width: '100%' }}
          >
            {t.common?.retake || 'Retake'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
