'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Upload, X, Check } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import PhotoCapture from '@/components/customer/PhotoCapture';
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
  const [waterRunningFile, setWaterRunningFile] = useState<File | null>(null);
  
  const [waterSourcePreview, setWaterSourcePreview] = useState('');
  const [productLocationPreview, setProductLocationPreview] = useState('');
  const [waterRunningPreview, setWaterRunningPreview] = useState('');
  
  const [waterSourceQuality, setWaterSourceQuality] = useState<PhotoQuality | null>(null);
  const [productLocationQuality, setProductLocationQuality] = useState<PhotoQuality | null>(null);
  
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPhotoCapture, setShowPhotoCapture] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (
    file: File | null,
    type: 'waterSource' | 'productLocation' | 'waterRunning'
  ) => {
    if (!file) return;

    // Validate file type
    const isVideo = type === 'waterRunning';
    const allowedTypes = isVideo
      ? ['video/mp4', 'video/webm', 'video/quicktime']
      : ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      toast.error(`Please upload a valid ${isVideo ? 'video' : 'image'} file`);
      return;
    }

    // Validate file size (max 50MB for videos, 10MB for images)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File size must be less than ${isVideo ? '50MB' : '10MB'}`);
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
        console.log(`Compressed ${formatFileSize(originalSize)} → ${formatFileSize(processedFile.size)} (${ratio}% reduction)`);
        
        // Validate photo quality
        const quality = await validatePhoto(processedFile);
        if (type === 'waterSource') {
          setWaterSourceQuality(quality);
        } else if (type === 'productLocation') {
          setProductLocationQuality(quality);
        }
        
        if (quality.score === 'poor') {
          toast.error(quality.suggestions[0] || 'Photo quality is poor. Please retake.');
        } else if (quality.score === 'fair') {
          toast(quality.suggestions[0] || 'Photo quality is acceptable', { icon: '⚠️' });
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
        } else {
          setWaterRunningFile(processedFile);
          setWaterRunningPreview(preview);
        }
      };
      reader.readAsDataURL(processedFile);
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file');
    }
  };

  const removeFile = (type: 'waterSource' | 'productLocation' | 'waterRunning') => {
    if (type === 'waterSource') {
      setWaterSourceFile(null);
      setWaterSourcePreview('');
      setWaterSourceQuality(null);
    } else if (type === 'productLocation') {
      setProductLocationFile(null);
      setProductLocationPreview('');
      setProductLocationQuality(null);
    } else {
      setWaterRunningFile(null);
      setWaterRunningPreview('');
    }
  };

  // Drag and Drop handlers
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

  const handleDrop = (e: React.DragEvent, type: 'waterSource' | 'productLocation' | 'waterRunning') => {
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
    // Validation
    if (!waterSourceFile || !productLocationFile || !waterRunningFile) {
      toast.error('Please upload all required photos and video');
      return;
    }

    try {
      setUploading(true);

      // Generate temp order ID for storage path
      const tempOrderId = uuidv4();
      const basePath = `orders/${tempOrderId}/site-photos`;

      // Upload files in parallel
      const [waterSourceUrl, productLocationUrl, waterRunningUrl] = await Promise.all([
        uploadFile(waterSourceFile, basePath),
        uploadFile(productLocationFile, basePath),
        uploadFile(waterRunningFile, basePath),
      ]);

      // Store URLs in sessionStorage
      const orderData = JSON.parse(sessionStorage.getItem('orderData') || '{}');
      sessionStorage.setItem('orderData', JSON.stringify({
        ...orderData,
        sitePhotos: {
          waterSource: waterSourceUrl,
          productLocation: productLocationUrl,
          waterRunning: waterRunningUrl,
        },
      }));

      toast.success('Photos uploaded successfully!');
      router.push('/customer/order/payment');
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      toast.error(error.message || 'Failed to upload photos');
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
            Back
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-8 animate-fade-in">
          {/* Progress Tracker */}
          <OrderProgressTracker currentStep={3} />

          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Site Photos</h1>
            <p className="text-text-secondary">
              Help us prepare for your installation
            </p>
          </div>

          {/* Upload Instructions */}
          <div className="apple-card bg-primary/5 border-primary/20">
            <p className="text-sm text-text-secondary">
              📸 Please upload photos of your installation site. This helps our installers prepare the necessary tools and materials.
            </p>
          </div>

          {/* Photo Uploads */}
          <div className="space-y-6">
            {/* 1. Water Source */}
            <div className="apple-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">
                    1. Water Source <span className="text-error">*</span>
                  </h3>
                  <p className="text-sm text-text-secondary mb-2">
                    Photo of your main water supply connection
                  </p>
                  <PhotoGuide type="waterSource" />
                </div>
                {waterSourceFile && (
                  <div className="flex items-center gap-2 text-success">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">Uploaded</span>
                  </div>
                )}
              </div>

              {waterSourcePreview ? (
                <div className="space-y-3">
                  <div className="relative">
                    <img
                      src={waterSourcePreview}
                      alt="Water source"
                      className="w-full h-64 object-cover rounded-apple"
                    />
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
                      Or drag and drop your photo here
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
                    2. Installation Location <span className="text-error">*</span>
                  </h3>
                  <p className="text-sm text-text-secondary mb-2">
                    Photo of where the product will be installed
                  </p>
                  <PhotoGuide type="productLocation" />
                </div>
                {productLocationFile && (
                  <div className="flex items-center gap-2 text-success">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">Uploaded</span>
                  </div>
                )}
              </div>

              {productLocationPreview ? (
                <div className="space-y-3">
                  <div className="relative">
                    <img
                      src={productLocationPreview}
                      alt="Product location"
                      className="w-full h-64 object-cover rounded-apple"
                    />
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
                      Or drag and drop your photo here
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Water Running Video */}
            <div className="apple-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">
                    3. Water Running Video <span className="text-error">*</span>
                  </h3>
                  <p className="text-sm text-text-secondary mb-2">
                    Short video showing water flow from your tap
                  </p>
                  <PhotoGuide type="waterRunning" />
                </div>
                {waterRunningFile && (
                  <div className="flex items-center gap-2 text-success">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">Uploaded</span>
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
                <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-apple hover:border-primary transition-all cursor-pointer bg-surface-elevated hover:bg-surface-secondary">
                  <Upload className="w-12 h-12 text-text-tertiary mb-3" />
                  <span className="text-sm font-medium">Click to upload video</span>
                  <span className="text-xs text-text-tertiary mt-1">MP4, WebM (max 50MB)</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'waterRunning')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!waterSourceFile || !productLocationFile || !waterRunningFile || uploading}
            className="w-full px-8 py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
          >
            {uploading ? 'Uploading...' : 'Continue to Payment'}
          </button>
        </div>
      </div>

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <PhotoCapture
          title={
            showPhotoCapture === 'waterSource'
              ? '1. Water Source'
              : showPhotoCapture === 'productLocation'
              ? '2. Installation Location'
              : '3. Water Running'
          }
          description={
            showPhotoCapture === 'waterSource'
              ? 'Photo of your main water supply connection'
              : showPhotoCapture === 'productLocation'
              ? 'Photo of where the product will be installed'
              : 'Video showing water flow from your tap'
          }
          onCapture={(file) => {
            handleFileChange(file, showPhotoCapture as any);
            setShowPhotoCapture(null);
          }}
          onCancel={() => setShowPhotoCapture(null)}
        />
      )}
    </div>
  );
}

