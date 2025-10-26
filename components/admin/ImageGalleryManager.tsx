'use client';

import { useState, useRef } from 'react';
import { Upload, X, Star, GripVertical, Image as ImageIcon, Loader2 } from 'lucide-react';
import { optimizeImage, validateImageFile, formatFileSize } from '@/lib/utils/imageOptimizer';
import toast from 'react-hot-toast';

interface ImageGalleryManagerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  onAddImages: (files: File[]) => Promise<void>;
  onDeleteImage: (imageUrl: string) => Promise<void>;
  productId: string;
  uploadingImages?: boolean;
  deletingImage?: string | null;
  maxImages?: number;
}

export default function ImageGalleryManager({
  images,
  onImagesChange,
  onAddImages,
  onDeleteImage,
  productId,
  uploadingImages = false,
  deletingImage = null,
  maxImages = 10
}: ImageGalleryManagerProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [optimizingFiles, setOptimizingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check max images limit
    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Validate and optimize files
    try {
      setOptimizingFiles(true);
      const validFiles: File[] = [];

      for (const file of files) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast.error(validation.error || 'Invalid file');
          continue;
        }

        // Optimize image
        try {
          const optimized = await optimizeImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.85
          });
          validFiles.push(optimized);
        } catch (error) {
          console.error('Failed to optimize image:', error);
          toast.error(`Failed to optimize ${file.name}`);
        }
      }

      if (validFiles.length > 0) {
        await onAddImages(validFiles);
      }
    } catch (error) {
      toast.error('Failed to process images');
    } finally {
      setOptimizingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex === null || dragOverIndex === null) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    if (draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder images
    const newImages = [...images];
    const [removed] = newImages.splice(draggedIndex, 1);
    newImages.splice(dragOverIndex, 0, removed);

    onImagesChange(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDelete = async (imageUrl: string, index: number) => {
    if (!confirm(`Delete image ${index + 1}? This cannot be undone.`)) return;
    await onDeleteImage(imageUrl);
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return; // Already primary
    
    const newImages = [...images];
    const [removed] = newImages.splice(index, 1);
    newImages.unshift(removed);
    
    onImagesChange(newImages);
    toast.success('Primary image updated');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">
            {images.length} / {maxImages} images
          </p>
          {images.length > 0 && (
            <p className="text-xs text-text-tertiary mt-1">
              Drag to reorder • First image is primary
            </p>
          )}
        </div>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImages || optimizingFiles || images.length >= maxImages}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-apple transition-all"
        >
          {uploadingImages || optimizingFiles ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {optimizingFiles ? 'Optimizing...' : 'Uploading...'}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Add Images
            </>
          )}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Image Grid */}
      {images.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-apple p-12 text-center">
          <ImageIcon className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
          <p className="text-text-secondary mb-2">No images yet</p>
          <p className="text-sm text-text-tertiary">
            Click "Add Images" to upload product photos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <div
              key={imageUrl}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative group apple-card p-0 overflow-hidden cursor-move transition-all ${
                draggedIndex === index ? 'opacity-50 scale-95' : ''
              } ${
                dragOverIndex === index && draggedIndex !== index
                  ? 'ring-2 ring-primary'
                  : ''
              }`}
            >
              {/* Image */}
              <div 
                className="aspect-square bg-surface-elevated overflow-hidden"
                onClick={() => setPreviewImage(imageUrl)}
              >
                <img
                  src={imageUrl}
                  alt={`Product ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>

              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Drag Handle */}
                <div className="absolute top-2 left-2 p-1 bg-black/50 rounded cursor-move">
                  <GripVertical className="w-4 h-4 text-white" />
                </div>

                {/* Primary Badge */}
                {index === 0 && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-warning text-black text-xs font-semibold rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Primary
                  </div>
                )}

                {/* Action Buttons */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                  {index !== 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimary(index);
                      }}
                      className="flex-1 px-2 py-1 bg-warning hover:bg-warning/80 text-black text-xs font-medium rounded transition-all"
                      title="Set as primary image"
                    >
                      Set Primary
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(imageUrl, index);
                    }}
                    disabled={deletingImage === imageUrl}
                    className="flex items-center justify-center gap-1 px-2 py-1 bg-error hover:bg-error/80 disabled:opacity-50 text-white text-xs font-medium rounded transition-all"
                    title="Delete image"
                  >
                    {deletingImage === imageUrl ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Position Indicator */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/70 text-white text-xs font-semibold rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

