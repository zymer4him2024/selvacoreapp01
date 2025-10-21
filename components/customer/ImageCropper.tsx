'use client';

import { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { RotateCw, ZoomIn, ZoomOut, Check, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ImageCropperProps {
  image: string;
  onSave: (croppedImage: File) => void;
  onCancel: () => void;
}

export default function ImageCropper({ image, onSave, onCancel }: ImageCropperProps) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState<Crop>();
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  const getCroppedImg = async (): Promise<File> => {
    const image = imgRef.current;
    if (!image || !crop) {
      throw new Error('No image or crop defined');
    }

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = crop as PixelCrop;
    canvas.width = pixelCrop.width * scaleX;
    canvas.height = pixelCrop.height * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');

    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Canvas is empty');
        const file = new File([blob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSave = async () => {
    try {
      const croppedFile = await getCroppedImg();
      onSave(croppedFile);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-surface border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{t.common?.cropImage || 'Crop Image'}</h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-surface-elevated rounded-apple transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Crop Area */}
      <div className="flex-1 overflow-auto bg-black/50 flex items-center justify-center p-4">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          aspect={4 / 3}
          className="max-w-full max-h-full"
        >
          <img
            ref={imgRef}
            src={image}
            alt="Crop"
            style={{
              transform: `rotate(${rotation}deg) scale(${zoom})`,
              maxWidth: '100%',
              maxHeight: '70vh',
            }}
            className="transition-transform"
          />
        </ReactCrop>
      </div>

      {/* Controls */}
      <div className="p-4 bg-surface border-t border-border space-y-4">
        {/* Rotation & Zoom */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleRotate}
            className="p-3 bg-surface-elevated hover:bg-surface-secondary rounded-apple transition-all"
            title="Rotate"
          >
            <RotateCw className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-2 bg-surface-elevated hover:bg-surface-secondary rounded-apple transition-all"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="p-2 bg-surface-elevated hover:bg-surface-secondary rounded-apple transition-all"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-surface-elevated hover:bg-surface-secondary text-text-primary font-semibold rounded-apple transition-all"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all hover:scale-[1.02]"
          >
            <Check className="w-5 h-5" />
            {t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}

