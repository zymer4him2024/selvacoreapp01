'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Check } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function SitePhotosPage() {
  const router = useRouter();
  
  const [waterSourceFile, setWaterSourceFile] = useState<File | null>(null);
  const [productLocationFile, setProductLocationFile] = useState<File | null>(null);
  const [waterRunningFile, setWaterRunningFile] = useState<File | null>(null);
  
  const [waterSourcePreview, setWaterSourcePreview] = useState('');
  const [productLocationPreview, setProductLocationPreview] = useState('');
  const [waterRunningPreview, setWaterRunningPreview] = useState('');
  
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (
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

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === 'waterSource') {
        setWaterSourceFile(file);
        setWaterSourcePreview(preview);
      } else if (type === 'productLocation') {
        setProductLocationFile(file);
        setProductLocationPreview(preview);
      } else {
        setWaterRunningFile(file);
        setWaterRunningPreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (type: 'waterSource' | 'productLocation' | 'waterRunning') => {
    if (type === 'waterSource') {
      setWaterSourceFile(null);
      setWaterSourcePreview('');
    } else if (type === 'productLocation') {
      setProductLocationFile(null);
      setProductLocationPreview('');
    } else {
      setWaterRunningFile(null);
      setWaterRunningPreview('');
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
          {/* Progress */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div className="w-16 h-1 bg-success"></div>
            <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div className="w-16 h-1 bg-success"></div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div className="w-16 h-1 bg-border"></div>
            <div className="w-8 h-8 rounded-full bg-surface border-2 border-border flex items-center justify-center text-sm font-bold text-text-tertiary">
              4
            </div>
          </div>

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
                <div>
                  <h3 className="font-semibold mb-1">
                    1. Water Source <span className="text-error">*</span>
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Photo of your main water supply connection
                  </p>
                </div>
                {waterSourceFile && (
                  <div className="flex items-center gap-2 text-success">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">Uploaded</span>
                  </div>
                )}
              </div>

              {waterSourcePreview ? (
                <div className="relative">
                  <img
                    src={waterSourcePreview}
                    alt="Water source"
                    className="w-full h-64 object-cover rounded-apple"
                  />
                  <button
                    onClick={() => removeFile('waterSource')}
                    className="absolute top-3 right-3 p-2 bg-error rounded-full hover:bg-error/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-apple hover:border-primary transition-all cursor-pointer bg-surface-elevated hover:bg-surface-secondary">
                  <Upload className="w-12 h-12 text-text-tertiary mb-3" />
                  <span className="text-sm font-medium">Click to upload photo</span>
                  <span className="text-xs text-text-tertiary mt-1">JPG, PNG, WebP (max 10MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'waterSource')}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* 2. Product Location */}
            <div className="apple-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold mb-1">
                    2. Installation Location <span className="text-error">*</span>
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Photo of where the product will be installed
                  </p>
                </div>
                {productLocationFile && (
                  <div className="flex items-center gap-2 text-success">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">Uploaded</span>
                  </div>
                )}
              </div>

              {productLocationPreview ? (
                <div className="relative">
                  <img
                    src={productLocationPreview}
                    alt="Product location"
                    className="w-full h-64 object-cover rounded-apple"
                  />
                  <button
                    onClick={() => removeFile('productLocation')}
                    className="absolute top-3 right-3 p-2 bg-error rounded-full hover:bg-error/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-apple hover:border-primary transition-all cursor-pointer bg-surface-elevated hover:bg-surface-secondary">
                  <Upload className="w-12 h-12 text-text-tertiary mb-3" />
                  <span className="text-sm font-medium">Click to upload photo</span>
                  <span className="text-xs text-text-tertiary mt-1">JPG, PNG, WebP (max 10MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'productLocation')}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* 3. Water Running Video */}
            <div className="apple-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold mb-1">
                    3. Water Running Video <span className="text-error">*</span>
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Short video showing water flow from your tap
                  </p>
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
                    className="absolute top-3 right-3 p-2 bg-error rounded-full hover:bg-error/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
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
    </div>
  );
}

