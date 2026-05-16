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
import { uploadAllOrCleanup } from '@/lib/utils/storageUploader';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

type GuideType = 'waterSource' | 'productLocation' | 'fullShot' | 'waterRunning';

interface PhotoSectionProps {
  title: string;
  description: string;
  guideType: GuideType;
  file: File | null;
  preview: string;
  quality: PhotoQuality | null;
  dragging: string | null;
  dragKey: GuideType;
  onCameraClick: () => void;
  onFileSelect: (file: File | null) => void;
  onRemove: () => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  uploadedLabel: string;
  takeLabel: string;
  chooseLabel: string;
  dragLabel: string;
  altText: string;
}

function PhotoSection({
  title,
  description,
  guideType,
  file,
  preview,
  quality,
  dragging,
  dragKey,
  onCameraClick,
  onFileSelect,
  onRemove,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  uploadedLabel,
  takeLabel,
  chooseLabel,
  dragLabel,
  altText,
}: PhotoSectionProps) {
  return (
    <div className="sc-card-static">
      <div className="sc-row-between" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 4 }}>
            {title} <span className="sc-required">*</span>
          </h3>
          <p className="sc-helper" style={{ marginBottom: 8 }}>{description}</p>
          <PhotoGuide type={guideType} />
        </div>
        {file && (
          <div className="sc-row" style={{ gap: 8, color: 'var(--brand)' }}>
            <Check className="w-5 h-5" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{uploadedLabel}</span>
          </div>
        )}
      </div>

      {preview ? (
        <div className="sc-stack" style={{ gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '100%', height: 320, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <img
                src={preview}
                alt={altText}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <button
              type="button"
              onClick={onRemove}
              style={{ position: 'absolute', top: 12, right: 12, padding: 8, background: 'var(--warn)', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
            >
              <X className="w-4 h-4" style={{ color: 'var(--paper)' }} />
            </button>
          </div>

          {quality && (
            <div className={`p-3 rounded ${getQualityColor(quality.score)}`} style={{ borderRadius: 'var(--radius-sm)' }}>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{getQualityLabel(quality.score)}</p>
              <p style={{ fontSize: 12, margin: 0 }}>{quality.suggestions[0]}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="sc-stack" style={{ gap: 12 }}>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCameraClick}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, border: '2px dashed var(--hairline)', borderRadius: 'var(--radius-sm)', background: 'transparent', cursor: 'pointer', color: 'var(--ink)', transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <Camera className="w-8 h-8" style={{ color: 'var(--brand)', marginBottom: 8 }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{takeLabel}</span>
            </button>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, border: '2px dashed var(--hairline)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <Upload className="w-8 h-8" style={{ color: 'var(--brand)', marginBottom: 8 }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{chooseLabel}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            style={{
              padding: 32,
              border: '2px dashed',
              borderColor: dragging === dragKey ? 'var(--brand)' : 'var(--hairline)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'center',
              transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              background: dragging === dragKey ? 'var(--brand-tint)' : 'var(--off-paper)',
              transform: dragging === dragKey ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0 }}>{dragLabel}</p>
          </div>
        </div>
      )}
    </div>
  );
}

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

      // Upload files in parallel; if any fail, already-uploaded files are deleted
      // from Storage to prevent orphans.
      const named = [
        { key: 'waterSource' as const, file: waterSourceFile },
        { key: 'productLocation' as const, file: productLocationFile },
        { key: 'fullShot' as const, file: fullShotFile },
        { key: 'waterRunning' as const, file: waterRunningFile },
      ].filter((x): x is { key: 'waterSource' | 'productLocation' | 'fullShot' | 'waterRunning'; file: File } => x.file !== null);

      const urls = await uploadAllOrCleanup(named, ({ file }) => uploadFile(file, basePath));

      const sitePhotos: Record<'waterSource' | 'productLocation' | 'fullShot' | 'waterRunning', string | null> = {
        waterSource: null,
        productLocation: null,
        fullShot: null,
        waterRunning: null,
      };
      named.forEach((nf, i) => { sitePhotos[nf.key] = urls[i]; });

      const orderData = JSON.parse(sessionStorage.getItem('orderData') || '{}');
      sessionStorage.setItem('orderData', JSON.stringify({
        ...orderData,
        sitePhotos,
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
    <div className="sc">
      <header className="sc-nav">
        <div className="sc-nav-inner">
          <button
            type="button"
            onClick={() => router.back()}
            className="sc-nav-link"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="sc-nav-text">{t.common.back}</span>
          </button>
        </div>
      </header>

      <main className="sc-main" style={{ maxWidth: 720 }}>
        <div className="sc-stack-lg">
          <OrderProgressTracker currentStep={3} />

          <div style={{ textAlign: 'center' }}>
            <h1 className="sc-h1">{t.orders.sitePhotos}</h1>
            <p className="sc-lede">{t.orders.sitePhotosDesc}</p>
          </div>

          <div className="sc-card-static" style={{ background: 'var(--brand-tint)', border: '1px solid var(--brand)' }}>
            <p className="sc-helper" style={{ margin: 0 }}>{t.orders.sitePhotosInstruction}</p>
          </div>

          <div className="sc-stack-lg">
            {/* 1. Water Source */}
            <PhotoSection
              title={t.orders.waterSource}
              description={t.orders.waterSourceDesc}
              guideType="waterSource"
              file={waterSourceFile}
              preview={waterSourcePreview}
              quality={waterSourceQuality}
              dragging={dragging}
              dragKey="waterSource"
              onCameraClick={() => setShowPhotoCapture('waterSource')}
              onFileSelect={(f) => handleFileChange(f, 'waterSource')}
              onRemove={() => removeFile('waterSource')}
              onDragEnter={(e) => handleDragEnter(e, 'waterSource')}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'waterSource')}
              uploadedLabel={t.orders.uploaded}
              takeLabel={t.common.takePhoto}
              chooseLabel={t.common.chooseFile}
              dragLabel={t.orders.dragDropPhoto}
              altText={t.orders.waterSourceAlt}
            />

            <PhotoSection
              title={t.orders.placeForEquipment}
              description={t.orders.placeForEquipmentDesc}
              guideType="productLocation"
              file={productLocationFile}
              preview={productLocationPreview}
              quality={productLocationQuality}
              dragging={dragging}
              dragKey="productLocation"
              onCameraClick={() => setShowPhotoCapture('productLocation')}
              onFileSelect={(f) => handleFileChange(f, 'productLocation')}
              onRemove={() => removeFile('productLocation')}
              onDragEnter={(e) => handleDragEnter(e, 'productLocation')}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'productLocation')}
              uploadedLabel={t.orders.uploaded}
              takeLabel={t.common.takePhoto}
              chooseLabel={t.common.chooseFile}
              dragLabel={t.orders.dragDropPhoto}
              altText={t.orders.productLocationAlt}
            />

            <PhotoSection
              title={t.orders.fullShotPhoto}
              description={t.orders.fullShotDesc}
              guideType="fullShot"
              file={fullShotFile}
              preview={fullShotPreview}
              quality={fullShotQuality}
              dragging={dragging}
              dragKey="fullShot"
              onCameraClick={() => setShowPhotoCapture('fullShot')}
              onFileSelect={(f) => handleFileChange(f, 'fullShot')}
              onRemove={() => removeFile('fullShot')}
              onDragEnter={(e) => handleDragEnter(e, 'fullShot')}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'fullShot')}
              uploadedLabel={t.orders.uploaded}
              takeLabel={t.common.takePhoto}
              chooseLabel={t.common.chooseFile}
              dragLabel={t.orders.dragDropPhoto}
              altText={t.orders.fullShotAlt}
            />

            <div className="sc-card-static">
              <div className="sc-row-between" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 600, marginBottom: 4 }}>
                    {t.orders.waterRunningVideo} <span className="sc-required">*</span>
                  </h3>
                  <p className="sc-helper" style={{ marginBottom: 8 }}>{t.orders.waterRunningDesc}</p>
                  <PhotoGuide type="waterRunning" />
                </div>
                {waterRunningFile && (
                  <div className="sc-row" style={{ gap: 8, color: 'var(--brand)' }}>
                    <Check className="w-5 h-5" />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{t.orders.uploaded}</span>
                  </div>
                )}
              </div>

              {waterRunningPreview ? (
                <div style={{ position: 'relative' }}>
                  <video
                    src={waterRunningPreview}
                    controls
                    style={{ width: '100%', height: 256, borderRadius: 'var(--radius-sm)', background: '#000' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeFile('waterRunning')}
                    style={{ position: 'absolute', top: 12, right: 12, padding: 8, background: 'var(--warn)', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
                  >
                    <X className="w-4 h-4" style={{ color: 'var(--paper)' }} />
                  </button>
                </div>
              ) : (
                <div className="sc-stack" style={{ gap: 12 }}>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPhotoCapture('waterRunning')}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, border: '2px dashed var(--hairline)', borderRadius: 'var(--radius-sm)', background: 'transparent', cursor: 'pointer', color: 'var(--ink)', transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <Camera className="w-8 h-8" style={{ color: 'var(--brand)', marginBottom: 8 }} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{t.orders.takeVideo}</span>
                    </button>
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, border: '2px dashed var(--hairline)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
                      <Upload className="w-8 h-8" style={{ color: 'var(--brand)', marginBottom: 8 }} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{t.common.chooseFile}</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'waterRunning')}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  <div
                    onDragEnter={(e) => handleDragEnter(e, 'waterRunning')}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'waterRunning')}
                    style={{
                      height: 128,
                      border: '2px dashed',
                      borderColor: dragging === 'waterRunning' ? 'var(--brand)' : 'var(--hairline)',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: dragging === 'waterRunning' ? 'var(--brand-tint)' : 'transparent',
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <Upload className="w-8 h-8 mx-auto" style={{ color: 'var(--soft)', marginBottom: 8 }} />
                      <span style={{ fontSize: 14, color: 'var(--soft)' }}>{t.orders.dragDropVideo}</span>
                      <span style={{ fontSize: 12, color: 'var(--soft)', display: 'block', marginTop: 4 }}>{t.orders.videoFormatHint}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={(!waterSourceFile && !productLocationFile && !fullShotFile && !waterRunningFile) || uploading}
            className="sc-cta"
            style={{ width: '100%', padding: '14px 24px', fontSize: 15 }}
          >
            {uploading ? t.orders.uploadingPhotos : t.orders.continueToPayment}
          </button>
        </div>
      </main>

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

