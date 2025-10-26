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
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
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

    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: 'video/webm',
    });

    mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    });

    mediaRecorderRef.current.start();
  }, [webcamRef, setIsRecording, setRecordedChunks]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Wait a bit for the final data to be available
      setTimeout(() => {
        setMode('preview');
      }, 100);
    }
  }, [mediaRecorderRef, isRecording]);

  const handleRetake = () => {
    setRecordedChunks([]);
    setVideoUrl(null);
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
            {/* Take Video Button */}
            <button
              onClick={() => setMode('camera')}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
            >
              <Video className="w-6 h-6" />
              Take Video
            </button>

            {/* Choose File Button */}
            <label className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-surface hover:bg-surface-elevated border-2 border-border hover:border-primary text-text-primary font-semibold rounded-apple transition-all hover:scale-[1.02] cursor-pointer">
              <Upload className="w-6 h-6" />
              {t.common?.chooseFile || 'Choose File'}
              <input
                type="file"
                accept="video/*"
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
            disabled={isRecording}
          >
            <RotateCw className="w-6 h-6" />
          </button>
        </div>

        {/* Camera View */}
        <div className="flex-1 relative bg-black">
          <Webcam
            ref={webcamRef}
            audio={true}
            videoConstraints={videoConstraints}
            className="w-full h-full object-cover"
          />

          {/* Recording Indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-error rounded-full">
              <Circle className="w-3 h-3 fill-white animate-pulse" />
              <span className="text-white text-sm font-semibold">Recording</span>
            </div>
          )}

          {/* Frame Guide Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[90%] max-w-lg aspect-video border-4 border-primary/50 rounded-apple"></div>
          </div>
        </div>

        {/* Record Button */}
        <div className="p-6 bg-surface/80 backdrop-blur-sm">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`w-20 h-20 mx-auto flex items-center justify-center rounded-full transition-all hover:scale-110 shadow-apple ${
              isRecording ? 'bg-error hover:bg-error/80' : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {isRecording ? (
              <Square className="w-8 h-8 text-white fill-white" />
            ) : (
              <Circle className="w-12 h-12 text-white fill-white" />
            )}
          </button>
          <p className="text-center text-sm text-text-secondary mt-3">
            {isRecording ? 'Tap to stop recording' : description}
          </p>
        </div>
      </div>
    );
  }

  // Preview Mode
  if (mode === 'preview' && recordedChunks.length > 0) {
    const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
    const videoUrl = URL.createObjectURL(videoBlob);

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
        <div className="flex-1 bg-black p-4 flex items-center justify-center">
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain max-w-4xl"
          />
        </div>

        {/* Actions */}
        <div className="p-4 bg-surface/80 backdrop-blur-sm space-y-3">
          <button
            onClick={handleUseVideo}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all"
          >
            <Check className="w-5 h-5" />
            Use Video
          </button>
          <button
            onClick={handleRetake}
            className="w-full px-6 py-3 bg-surface-elevated hover:bg-surface-secondary text-text-primary font-medium rounded-apple transition-all"
          >
            Retake
          </button>
        </div>
      </div>
    );
  }

  return null;
}

