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

    // Convert base64 to File
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

  // Selection Mode
  if (mode === 'select') {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-text-secondary text-sm">{description}</p>
          </div>

          <div className="space-y-3">
            {/* Take Photo Button */}
            <button
              onClick={() => setMode('camera')}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
            >
              <Camera className="w-6 h-6" />
              {t.common?.takePhoto || 'Take Photo'}
            </button>

            {/* Choose File Button */}
            <label className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-surface hover:bg-surface-elevated border-2 border-border hover:border-primary text-text-primary font-semibold rounded-apple transition-all hover:scale-[1.02] cursor-pointer">
              <Upload className="w-6 h-6" />
              {t.common?.chooseFile || 'Choose File'}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {/* Cancel Button */}
            <button
              onClick={onCancel}
              className="w-full px-6 py-3 text-text-secondary hover:text-text-primary transition-colors"
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Camera Mode
  if (mode === 'camera') {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-surface/80 backdrop-blur-sm">
          <button
            onClick={() => setMode('select')}
            className="p-2 hover:bg-surface-elevated rounded-apple transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <h3 className="font-semibold">{title}</h3>
          <button
            onClick={switchCamera}
            className="p-2 hover:bg-surface-elevated rounded-apple transition-all"
          >
            <RotateCw className="w-6 h-6" />
          </button>
        </div>

        {/* Camera View */}
        <div className="flex-1 relative bg-black">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="w-full h-full object-cover"
          />

          {/* Frame Guide Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[90%] max-w-lg aspect-[4/3] border-4 border-primary/50 rounded-apple"></div>
          </div>
        </div>

        {/* Capture Button */}
        <div className="p-6 bg-surface/80 backdrop-blur-sm">
          <button
            onClick={handleCapture}
            className="w-20 h-20 mx-auto flex items-center justify-center bg-primary hover:bg-primary-hover rounded-full transition-all hover:scale-110 shadow-apple"
          >
            <div className="w-16 h-16 bg-white rounded-full"></div>
          </button>
          <p className="text-center text-sm text-text-secondary mt-3">{description}</p>
        </div>
      </div>
    );
  }

  // Captured Mode
  if (mode === 'captured' && capturedImage) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-surface/80 backdrop-blur-sm">
          <h3 className="font-semibold">Preview</h3>
          <button
            onClick={() => setMode('select')}
            className="p-2 hover:bg-surface-elevated rounded-apple transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 bg-black p-4">
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Actions */}
        <div className="p-4 bg-surface/80 backdrop-blur-sm space-y-3">
          <button
            onClick={handleUseCaptured}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all"
          >
            <Check className="w-5 h-5" />
            {t.common?.usePhoto || 'Use Photo'}
          </button>
          <button
            onClick={handleRetake}
            className="w-full px-6 py-3 bg-surface-elevated hover:bg-surface-secondary text-text-primary font-medium rounded-apple transition-all"
          >
            {t.common?.retake || 'Retake'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

