'use client';

import { useState, useRef } from 'react';
import { Upload, X, Star, GripVertical, Image as ImageIcon, Loader2 } from 'lucide-react';
import { optimizeImage, validateImageFile } from '@/lib/utils/imageOptimizer';
import { useTranslation } from '@/hooks/useTranslation';
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
  uploadingImages = false,
  deletingImage = null,
  maxImages = 10
}: ImageGalleryManagerProps) {
  const { t } = useTranslation();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [optimizingFiles, setOptimizingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    try {
      setOptimizingFiles(true);
      const validFiles: File[] = [];

      for (const file of files) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast.error(validation.error || 'Invalid file');
          continue;
        }

        try {
          const optimized = await optimizeImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.85
          });
          validFiles.push(optimized);
        } catch {
          toast.error(`Failed to optimize ${file.name}`);
        }
      }

      if (validFiles.length > 0) {
        await onAddImages(validFiles);
      }
    } catch {
      toast.error(t.components.gallery.failedProcess);
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
    if (index === 0) return;

    const newImages = [...images];
    const [removed] = newImages.splice(index, 1);
    newImages.unshift(removed);

    onImagesChange(newImages);
    toast.success(t.components.gallery.primaryUpdated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="sc-helper" style={{ margin: 0 }}>
            {images.length} / {maxImages} images
          </p>
          {images.length > 0 && (
            <p className="sc-helper" style={{ fontSize: 11, marginTop: 4 }}>
              Drag to reorder • First image is primary
            </p>
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImages || optimizingFiles || images.length >= maxImages}
          className="sc-cta"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {uploadingImages || optimizingFiles ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {optimizingFiles ? 'Optimizing...' : 'Uploading...'}
            </>
          ) : (
            <>
              <Upload size={16} />
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
          style={{ display: 'none' }}
        />
      </div>

      {images.length === 0 ? (
        <div style={{
          border: '2px dashed var(--hairline)',
          borderRadius: 'var(--radius-md)',
          padding: 48,
          textAlign: 'center',
        }}>
          <ImageIcon size={64} color="var(--soft)" style={{ margin: '0 auto 16px' }} />
          <p className="sc-helper" style={{ marginBottom: 8 }}>{t.components.gallery.noImagesYet}</p>
          <p className="sc-helper" style={{ fontSize: 13, margin: 0 }}>
            Click &quot;Add Images&quot; to upload product photos
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {images.map((imageUrl, index) => {
            const isDragged = draggedIndex === index;
            const isDragOver = dragOverIndex === index && draggedIndex !== index;
            return (
              <div
                key={imageUrl}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className="group sc-card-static"
                style={{
                  position: 'relative',
                  padding: 0,
                  overflow: 'hidden',
                  cursor: 'move',
                  opacity: isDragged ? 0.5 : 1,
                  transform: isDragged ? 'scale(0.95)' : 'none',
                  outline: isDragOver ? '2px solid var(--brand)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    aspectRatio: '1 / 1',
                    background: 'var(--off-paper)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                  onClick={() => setPreviewImage(imageUrl)}
                >
                  <img
                    src={imageUrl}
                    alt={`Product ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      background: 'var(--off-paper)',
                      transition: 'transform 0.3s ease',
                    }}
                  />
                </div>

                <div
                  className="group-hover-overlay"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent, rgba(0,0,0,0.6))',
                    opacity: 0,
                    transition: 'opacity 0.15s ease',
                    pointerEvents: 'none',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.pointerEvents = 'auto'; }}
                >
                  <div style={{ position: 'absolute', top: 8, left: 8, padding: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 'var(--radius-sm)', cursor: 'move', pointerEvents: 'auto' }}>
                    <GripVertical size={16} color="#fff" />
                  </div>

                  {index === 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      padding: '4px 8px',
                      background: 'var(--warn)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      pointerEvents: 'auto',
                    }}>
                      <Star size={12} fill="currentColor" />
                      Primary
                    </div>
                  )}

                  <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, pointerEvents: 'auto' }}>
                    {index !== 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimary(index);
                        }}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          background: 'var(--warn)',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 500,
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                        }}
                        title={t.components.gallery.setAsPrimary}
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
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        padding: '4px 8px',
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 500,
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: deletingImage === imageUrl ? 'not-allowed' : 'pointer',
                        opacity: deletingImage === imageUrl ? 0.5 : 1,
                      }}
                      title={t.components.gallery.deleteImage}
                    >
                      {deletingImage === imageUrl ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <X size={12} />
                      )}
                    </button>
                  </div>
                </div>

                <div style={{
                  position: 'absolute',
                  top: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                }}>
                  {index + 1}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              padding: 8,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <X size={24} />
          </button>

          <img
            src={previewImage}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              background: 'var(--off-paper)',
              borderRadius: 'var(--radius-md)',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
