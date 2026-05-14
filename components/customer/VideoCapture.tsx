'use client';

import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Video, Upload, X, RotateCw, Check, Circle, Square } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface VideoCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  title: string;
  description: string;
}

export default function VideoCapture({ onCapture, onCancel, title, description }: VideoCaptureProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'select' | 'camera' | 'preview'>('select');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const videoConstraints = {
    facingMode: facingMode,
  };

  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    setRecordedChunks([]);

    const stream = webcamRef.current?.stream;
    if (!stream) return;

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4',
    });

    const chunks: Blob[] = [];

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    recorder.addEventListener('stop', () => {
      setRecordedChunks(chunks);
      setMode('preview');
    });

    mediaRecorderRef.current = recorder;
    recorder.start();
  }, []);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleRetake = () => {
    setRecordedChunks([]);
    setMode('camera');
  };

  const handleUseVideo = () => {
    if (recordedChunks.length === 0) return;

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const file = new File([blob], `video_${Date.now()}.webm`, { type: 'video/webm' });
    onCapture(file);
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
                <Video className="w-6 h-6" />
                Take Video
              </button>

              <label
                className="sc-cta-ghost"
                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 24px', cursor: 'pointer' }}
              >
                <Upload className="w-6 h-6" />
                {t.common?.chooseFile || 'Choose File'}
                <input
                  type="file"
                  accept="video/*"
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
            disabled={isRecording}
          >
            <RotateCw className="w-6 h-6" />
          </button>
        </div>

        <div style={{ flex: 1, position: 'relative', background: '#000' }}>
          <Webcam
            ref={webcamRef}
            audio={true}
            videoConstraints={videoConstraints}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {isRecording && (
            <div className="sc-row" style={{ position: 'absolute', top: 16, left: 16, gap: 8, padding: '8px 12px', background: 'var(--warn)', borderRadius: 9999 }}>
              <Circle className="w-3 h-3" style={{ color: 'var(--paper)', fill: 'var(--paper)', animation: 'pulse 1.5s infinite' }} />
              <span style={{ color: 'var(--paper)', fontSize: 14, fontWeight: 600 }}>Recording</span>
            </div>
          )}

          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: '90%', maxWidth: 512, aspectRatio: '16 / 9', border: '4px solid var(--brand)', opacity: 0.5, borderRadius: 'var(--radius-sm)' }} />
          </div>
        </div>

        <div style={{ padding: 24, background: 'var(--paper)', borderTop: '1px solid var(--hairline)' }}>
          <button
            type="button"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            style={{
              width: 80,
              height: 80,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              background: isRecording ? 'var(--warn)' : 'var(--brand)',
              transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {isRecording ? (
              <Square className="w-8 h-8" style={{ color: 'var(--paper)', fill: 'var(--paper)' }} />
            ) : (
              <Circle className="w-12 h-12" style={{ color: 'var(--paper)', fill: 'var(--paper)' }} />
            )}
          </button>
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--soft)', marginTop: 12 }}>
            {isRecording ? 'Tap to stop recording' : description}
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'preview' && recordedChunks.length > 0) {
    const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
    const videoUrl = URL.createObjectURL(videoBlob);

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

        <div style={{ flex: 1, background: '#000', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video
            src={videoUrl}
            controls
            autoPlay
            style={{ width: '100%', height: '100%', objectFit: 'contain', maxWidth: 896 }}
          />
        </div>

        <div className="sc-stack" style={{ padding: 16, gap: 12, background: 'var(--paper)', borderTop: '1px solid var(--hairline)' }}>
          <button
            type="button"
            onClick={handleUseVideo}
            className="sc-cta"
            style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 24px' }}
          >
            <Check className="w-5 h-5" />
            Use Video
          </button>
          <button
            type="button"
            onClick={handleRetake}
            className="sc-cta-ghost"
            style={{ width: '100%' }}
          >
            Retake
          </button>
        </div>
      </div>
    );
  }

  return null;
}
