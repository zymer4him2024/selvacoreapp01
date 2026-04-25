'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Upload, X, Check } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import PhotoCapture from '@/components/customer/PhotoCapture';
import VideoCapture from '@/components/customer/VideoCapture';
import PhotoGuide from '@/components/customer/PhotoGuide';
import UploadProgress from '@/components/customer/UploadProgress';
import OrderProgressTracker from '@/components/customer/OrderProgressTracker';
import { validatePhoto, getQualityColor, getQualityLabel, PhotoQuality } from '@/lib/utils/photoValidator';
import { compressImage, formatFileSize, calculateCompressionRatio } from '@/lib/utils/imageCompressor';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function SitePhotosPage() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [waterSourceFile, setWaterSourceFile] = useState<File | null>(null);
  const [productLocationFile, setProductLocationFile] = useState<File | null>(null);
  const [fullShotFile, setFullShotFile] = useState<File | null>(null);
  const [waterRunningFile, setWaterRunningFile] = useState<File | null>(null);
  
  const [waterSourcePreview, setWaterSourcePreview] = useState('');
  const [productLocationPreview, setProductLocationPreview] = useState('');
  const [fullShotPreview, setFullShotPreview] = useState('');
  const [waterRunningPreview, setWaterRunningPreview] = useState('');
  
  const [waterSourceQuality, setWaterSourceQuality] = useState<PhotoQuality | null>(null);
  const [productLocationQuality, setProductLocationQuality] = useState<PhotoQuality | null>(null);
  const [fullShotQuality, setFullShotQuality] = useState<PhotoQuality | null>(null);
  
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPhotoCapture, setShowPhotoCapture] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (
    file: File | null,
    type: 'waterSource' | 'productLocation' | 'fullShot' | 'waterRunning'
  ) => {
    if (!file) return;

    // Validate file type
    const isVideo = type === 'waterRunning';
    const allowedTypes = isVideo
      ? ['video/mp4', 'video/webm', 'video/quicktime']
      : ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      toast.error(isVideo ? t.orders.validVideoFile : t.orders.validImageFile);
      return;
    }

    // Validate file size (max 50MB for videos, 10MB for images)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(isVideo ? t.orders.videoMaxSize : t.orders.imageMaxSize);
      return;
    }

    try {
      let processedFile = file;
      
      // Compress images (not videos)
      if (!isVideo) {
        const originalSize = file.size;
        processedFile = await compressImage(file, {
          quality: 0.8,
          maxWidth: 1200,
          maxHeight: 1200,
        });
        const ratio = calculateCompressionRatio(originalSize, processedFile.size);

        // Validate photo quality
        const quality = await validatePhoto(processedFile);
        if (type === 'waterSource') {
          setWaterSourceQuality(quality);
        } else if (type === 'productLocation') {
          setProductLocationQuality(quality);
        } else if (type === 'fullShot') {
          setFullShotQuality(quality);
        }
        
        if (quality.score === 'poor') {
          toast.error(quality.suggestions[0] || t.orders.photoQualityPoor);
        } else if (quality.score === 'fair') {
          toast(quality.suggestions[0] || t.orders.photoQualityAcceptable, { icon: '⚠️' });
        }
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        if (type === 'waterSource') {
          setWaterSourceFile(processedFile);
          setWaterSourcePreview(preview);
        } else if (type === 'productLocation') {
          setProductLocationFile(processedFile);
          setProductLocationPreview(preview);
        } else if (type === 'fullShot') {
          setFullShotFile(processedFile);
          setFullShotPreview(preview);
        } else {
          setWaterRunningFile(processedFile);
          setWaterRunningPreview(preview);
        }
      };
      reader.readAsDataURL(processedFile);
    } catch (error: unknown) {
      toast.error(t.orders.processFileError);
    }
  };

  const removeFile = (type: 'waterSource' | 'productLocation' | 'fullShot' | 'waterRunning') => {
    if (type === 'waterSource') {
      setWaterSourceFile(null);
      setWaterSourcePreview('');
      setWaterSourceQuality(null);
    } else if (type === 'productLocation') {
      setProductLocationFile(null);
      setProductLocationPreview('');
      setProductLocationQuality(null);
    } else if (type === 'fullShot') {
      setFullShotFile(null);
      setFullShotPreview('');
      setFullShotQuality(null);
    } else {
      setWaterRunningFile(null);
      setWaterRunningPreview('');
    }
  };

  // Drag and Drop handlers - Updated for fullShot support
  const handleDragEnter = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(null);
  };

  const handleDrop = (e: React.DragEvent, type: 'waterSource' | 'productLocation' | 'fullShot' | 'waterRunning') => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileChange(files[0], type);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileName = `${uuidv4()}_${file.name}`;
    const storageRef = ref(storage, `${path}/${fileName}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleContinue = async () => {
    // Validation - make it more flexible since installation service is optional
    const uploadedFiles = [waterSourceFile, productLocationFile, fullShotFile, waterRunningFile].filter(Boolean);

    if (uploadedFiles.length === 0) {
      toast.error(t.orders.uploadAtLeastOne);
      return;
    }

    try {
      setUploading(true);

      // Generate temp order ID for storage path
      const tempOrderId = uuidv4();
      const basePath = `orders/${tempOrderId}/site-photos`;

      // Upload files in parallel (only upload files that exist)
      const uploadPromises = [];
      const files = [waterSourceFile, productLocationFile, fullShotFile, waterRunningFile];

      for (let i = 0; i < files.length; i++) {
        if (files[i]) {
          uploadPromises.push(uploadFile(files[i]!, basePath));
        } else {
          uploadPromises.push(Promise.resolve(null));
        }
      }
      
      const [waterSourceUrl, productLocationUrl, fullShotUrl, waterRunningUrl] = await Promise.all(uploadPromises);

      // Store URLs in sessionStorage
      const orderData = JSON.parse(sessionStorage.getItem('orderData') || '{}');
      sessionStorage.setItem('orderData', JSON.stringify({
        ...orderData,
        sitePhotos: {
          waterSource: waterSourceUrl,
          productLocation: productLocationUrl,
          fullShot: fullShotUrl,
          waterRunning: waterRunningUrl,
        },
      }));

      toast.success(t.orders.photosUploaded);
      router.push('/customer/order/payment');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.orders.uploadPhotosError;
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10 backdrop-blur-lg bg-surface/80">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t.common.back}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-8 animate-fade-in">
          {/* Progress Tracker */}
          <OrderProgressTracker currentStep={3} />

          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">{t.orders.sitePhotos}</h1>
            <p className="text-text-secondary">
              {t.orders.sitePhotosDesc}
            </p>
          </div>

          {/* Upload Instructions */}
          <div className="apple-card bg-primary/5 border-primary/20">
            <p className="text-sm text-text-secondary">
              {t.orders.sitePhotosInstruction}
            </p>
          </div>

          {/* Photo Uploads */}
          <div className="space-y-6">
            {/* 1. Water Source */}
            <div className="apple-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">
                    {t.orders.waterSource} <span className="text-error">*</span>
                  </h3>
                  <p className="text-sm text-text-secondary mb-2">
                    {t.orders.waterSourceDesc}
                  </p>
                  <PhotoGuide type="waterSource" />
                </div>
                {waterSourceFile && (
                  <div className="flex items-center gap-2 text-success">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">{t.orders.uploaded}</span>
                  </div>
                )}
              </div>

              {waterSourcePreview ? (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="w-full h-80 bg-surface-elevated rounded-apple overflow-hidden">
                      <img
                        src={waterSourcePreview}
                        alt={t.orders.waterSourceAlt}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <button
                      onClick={() => removeFile('waterSource')}
                      className="absolute top-3 right-3 p-2 bg-error rounded-full hover:bg-error/80 transition-colors shadow-apple"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  
                  {/* Quality Indicator */}
                  {waterSourceQuality && (
                    <div className={`p-3 rounded-apple ${getQualityColor(waterSourceQuality.score)}`}>
                      <p className="text-sm font-medium mb-1">{getQualityLabel(waterSourceQuality.score)}</p>
                      <p className="text-xs">{waterSourceQuality.suggestions[0]}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Camera & Upload Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowPhotoCapture('waterSource')}
                      className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border rounded-apple hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <Camera className="w-8 h-8 text-primary mb-2" />
                      <span className="text-sm font-medium">{t.common.takePhoto}</span>
                    </button>
                    <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border rounded-apple hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                      <Upload className="w-8 h-8 text-primary mb-2" />
                      <span className="text-sm font-medium">{t.common.chooseFile}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'waterSource')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {/* Drag & Drop Zone */}
                  <div
                    onDragEnter={(e) => handleDragEnter(e, 'waterSource')}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'waterSource')}
                    className={`
                      p-8 border-2 border-dashed rounded-apple text-center transition-all
                      ${dragging === 'waterSource' 
                        ? 'border-primary bg-primary/10 scale-105' 
                        : 'border-border/50 bg-surface-elevated/50'
                      }
                    `}
                  >
                    <p className="text-sm text-text-tertiary">
                      {t.orders.dragDropPhoto}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Product Location */}
            <div className="apple-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">
                    {t.orders.placeForEquipment} <span className="text-error">*</span>
                  </h3>
                  <p className="text-sm text-text-secondary mb-2">
                    {t.orders.placeForEquipmentDesc}
                  </p>
                  <PhotoGuide type="productLocation" />
                </div>
                {productLocationFile && (
                  <div className="flex items-center gap-2 text-success">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">{t.orders.uploaded}</span>
                  </div>
                )}
              </div>

              {productLocationPreview ? (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="w-full h-80 bg-surface-elevated rounded-apple overflow-hidden">
                      <img
                        src={productLocationPreview}
                        alt={t.orders.productLocationAlt}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <button
                      onClick={() => removeFile('productLocation')}
                      className="absolute top-3 right-3 p-2 bg-error rounded-full hover:bg-error/80 transition-colors shadow-apple"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  
                  {/* Quality Indicator */}
                  {productLocationQuality && (
                    <div className={`p-3 rounded-apple ${getQualityColor(productLocationQuality.score)}`}>
                      <p className="text-sm font-medium mb-1">{getQualityLabel(productLocationQuality.score)}</p>
                      <p className="text-xs">{productLocationQuality.suggestions[0]}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Camera & Upload Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowPhotoCapture('productLocation')}
                      className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border rounded-apple hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <Camera className="w-8 h-8 text-primary mb-2" />
                      <span className="text-sm font-medium">{t.common.takePhoto}</span>
                    </button>
                    <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border rounded-apple hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                      <Upload className="w-8 h-8 text-primary mb-2" />
                      <span className="text-sm font-medium">{t.common.chooseFile}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'productLocation')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {/* Drag & Drop Zone */}
                  <div
                    onDragEnter={(e) => handleDragEnter(e, 'productLocation')}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'productLocation')}
                    className={`
                      p-8 border-2 border-dashed rounded-apple text-center transition-all
                      ${dragging === 'productLocation' 
                        ? 'border-primary bg-primary/10 scale-105' 
                        : 'border-border/50 bg-surface-elevated/50'
                      }
                    `}
                  >
                    <p className="text-sm text-text-tertiary">
                      {t.orders.dragDropPhoto}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Full Shot Photo */}
            <div className="apple-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">
                    {t.orders.fullShotPhoto} <span className="text-error">*</span>
                  </h3>
                  <p className="text-sm text-text-secondary mb-2">
                    {t.orders.fullShotDesc}
                  </p>
                  <PhotoGuide type="fullShot" />
                </div>
                {fullShotFile && (
                  <div className="flex items-center gap-2 text-success">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">{t.orders.uploaded}</span>
                  </div>
                )}
              </div>

              {fullShotPreview ? (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="w-full h-80 bg-surface-elevated rounded-apple overflow-hidden">
                      <img
                        src={fullShotPreview}
                        alt={t.orders.fullShotAlt}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <button
                      onClick={() => removeFile('fullShot')}
                      className="absolute top-3 right-3 p-2 bg-error rounded-full hover:bg-error/80 transition-colors shadow-apple"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  
                  {/* Quality Indicator */}
                  {fullShotQuality && (
                    <div className={`p-3 rounded-apple ${getQualityColor(fullShotQuality.score)}`}>
                      <p className="text-sm font-medium mb-1">{getQualityLabel(fullShotQuality.score)}</p>
                      <p className="text-xs">{fullShotQuality.suggestions[0]}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Camera & Upload Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowPhotoCapture('fullShot')}
                      className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border rounded-apple hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <Camera className="w-8 h-8 text-primary mb-2" />
                      <span className="text-sm font-medium">{t.common.takePhoto}</span>
                    </button>
                    <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border rounded-apple hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                      <Upload className="w-8 h-8 text-primary mb-2" />
                      <span className="text-sm font-medium">{t.common.chooseFile}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'fullShot')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {/* Drag & Drop Zone */}
                  <div
                    onDragEnter={(e) => handleDragEnter(e, 'fullShot')}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'fullShot')}
                    className={`
                      p-8 border-2 border-dashed rounded-apple text-center transition-all
                      ${dragging === 'fullShot' 
                        ? 'border-primary bg-primary/10 scale-105' 
                        : 'border-border/50 bg-surface-elevated/50'
                      }
                    `}
                  >
                    <p className="text-sm text-text-tertiary">
                      {t.orders.dragDropPhoto}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Water Running Video */}
            <div className="apple-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">
                    {t.orders.waterRunningVideo} <span className="text-error">*</span>
                  </h3>
                  <p className="text-sm text-text-secondary mb-2">
                    {t.orders.waterRunningDesc}
                  </p>
                  <PhotoGuide type="waterRunning" />
                </div>
                {waterRunningFile && (
                  <div className="flex items-center gap-2 text-success">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">{t.orders.uploaded}</span>
                  </div>
                )}
              </div>

              {waterRunningPreview ? (
                <div className="relative">
                  <video
                    src={waterRunningPreview}
                    controls
                    className="w-full h-64 rounded-apple bg-black"
                  />
                  <button
                    onClick={() => removeFile('waterRunning')}
                    className="absolute top-3 right-3 p-2 bg-error rounded-full hover:bg-error/80 transition-colors shadow-apple"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Camera & Upload Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowPhotoCapture('waterRunning')}
                      className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border rounded-apple hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <Camera className="w-8 h-8 text-primary mb-2" />
                      <span className="text-sm font-medium">{t.orders.takeVideo}</span>
                    </button>
                    <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border rounded-apple hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                      <Upload className="w-8 h-8 text-primary mb-2" />
                      <span className="text-sm font-medium">{t.common.chooseFile}</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'waterRunning')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {/* Drag & Drop Zone */}
                  <div
                    onDragEnter={(e) => handleDragEnter(e, 'waterRunning')}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'waterRunning')}
                    className={`h-32 border-2 border-dashed rounded-apple transition-all cursor-pointer flex items-center justify-center ${
                      dragging === 'waterRunning'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                      <span className="text-sm text-text-secondary">{t.orders.dragDropVideo}</span>
                      <span className="text-xs text-text-tertiary block mt-1">{t.orders.videoFormatHint}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={(!waterSourceFile && !productLocationFile && !fullShotFile && !waterRunningFile) || uploading}
            className="w-full px-8 py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
          >
            {uploading ? t.orders.uploadingPhotos : t.orders.continueToPayment}
          </button>
        </div>
      </div>

      {/* Photo/Video Capture Modal */}
      {showPhotoCapture && showPhotoCapture === 'waterRunning' ? (
        <VideoCapture
          title={t.orders.waterRunningVideo}
          description={t.orders.waterRunningDesc}
          onCapture={(file) => {
            handleFileChange(file, 'waterRunning');
            setShowPhotoCapture(null);
          }}
          onCancel={() => setShowPhotoCapture(null)}
        />
      ) : showPhotoCapture ? (
        <PhotoCapture
          title={
            showPhotoCapture === 'waterSource'
              ? t.orders.waterSource
              : showPhotoCapture === 'productLocation'
              ? t.orders.placeForEquipment
              : t.orders.fullShotPhoto
          }
          description={
            showPhotoCapture === 'waterSource'
              ? t.orders.waterSourceDesc
              : showPhotoCapture === 'productLocation'
              ? t.orders.placeForEquipmentDesc
              : t.orders.fullShotDesc
          }
          onCapture={(file) => {
            handleFileChange(file, showPhotoCapture as 'waterSource' | 'productLocation' | 'fullShot' | 'waterRunning');
            setShowPhotoCapture(null);
          }}
          onCancel={() => setShowPhotoCapture(null)}
        />
      ) : null}
    </div>
  );
}

