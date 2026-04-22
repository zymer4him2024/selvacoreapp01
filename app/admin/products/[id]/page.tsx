'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Product, MaintenanceTemplate, MaintenanceTemplateFilter } from '@/types';
import {
  getProductById,
  updateProduct,
  addProductImages,
  removeProductImage,
  reorderProductImages
} from '@/lib/services/productService';
import ImageGalleryManager from '@/components/admin/ImageGalleryManager';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';

export default function EditProductPage() {
  const { t } = useTranslation();
  const pe = t.admin.productEdit;
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await getProductById(productId);
      if (data) {
        setProduct(data);
      } else {
        toast.error(pe.notFound);
        router.push('/admin/products');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load product';
      toast.error(message);
      router.push('/admin/products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;

    try {
      setSaving(true);
      await updateProduct(productId, product);
      toast.success('Product updated successfully!');
      router.push('/admin/products');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update product';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddImages = async (files: File[]) => {
    try {
      setUploadingImages(true);
      const uploadedUrls = await addProductImages(productId, files);
      
      // Update local state
      setProduct(prev => prev ? {
        ...prev,
        images: [...(prev.images || []), ...uploadedUrls]
      } : null);
      
      toast.success(`${files.length} image(s) uploaded successfully!`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload images';
      toast.error(message);
      throw error;
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    try {
      setDeletingImage(imageUrl);
      await removeProductImage(productId, imageUrl);
      
      // Update local state
      setProduct(prev => prev ? {
        ...prev,
        images: (prev.images || []).filter(url => url !== imageUrl)
      } : null);
      
      toast.success('Image deleted successfully!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete image';
      toast.error(message);
      throw error;
    } finally {
      setDeletingImage(null);
    }
  };

  const handleImagesReorder = async (newImageOrder: string[]) => {
    try {
      // Update local state immediately for smooth UX
      setProduct(prev => prev ? {
        ...prev,
        images: newImageOrder
      } : null);
      
      // Update in Firestore
      await reorderProductImages(productId, newImageOrder);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to reorder images';
      toast.error(message);
      // Reload product to restore correct order
      loadProduct();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{pe.loading}</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-surface-elevated rounded-apple transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{pe.title}</h1>
            <p className="text-text-secondary mt-1">{product.name.en}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/products')}
            className="px-6 py-3 bg-surface hover:bg-surface-elevated rounded-apple font-medium transition-all border border-border"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-apple transition-all hover:scale-105 shadow-apple"
          >
            <Save className="w-5 h-5" />
            {saving ? t.common.saving : pe.saveChanges}
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="apple-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">{pe.productNameEn}</h3>
              <input
                type="text"
                value={product.name.en}
                onChange={(e) => setProduct({
                  ...product,
                  name: { ...product.name, en: e.target.value }
                })}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>

            <div>
              <h3 className="font-semibold mb-2">{pe.brand}</h3>
              <input
                type="text"
                value={product.brand}
                onChange={(e) => setProduct({ ...product, brand: e.target.value })}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>

            <div>
              <h3 className="font-semibold mb-2">{pe.category}</h3>
              <input
                type="text"
                value={product.category}
                onChange={(e) => setProduct({ ...product, category: e.target.value })}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">{pe.basePrice}</h3>
              <input
                type="number"
                step="0.01"
                value={product.basePrice || 0}
                onChange={(e) => setProduct({ ...product, basePrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:outline-none transition-all"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={product.active}
                  onChange={(e) => setProduct({ ...product, active: e.target.checked })}
                  className="w-5 h-5 rounded accent-primary"
                />
                <span className="font-medium">{pe.active}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={product.featured}
                  onChange={(e) => setProduct({ ...product, featured: e.target.checked })}
                  className="w-5 h-5 rounded accent-warning"
                />
                <span className="font-medium">{pe.featured}</span>
              </label>
            </div>

            <div>
              <h3 className="font-semibold mb-2">{pe.variations}</h3>
              <p className="text-sm text-text-secondary">
                {product.variations?.length || 0} variation(s)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery Manager */}
      <div className="apple-card">
        <h2 className="text-2xl font-bold mb-6">{pe.productImages}</h2>
        <ImageGalleryManager
          images={product.images || []}
          onImagesChange={handleImagesReorder}
          onAddImages={handleAddImages}
          onDeleteImage={handleDeleteImage}
          productId={productId}
          uploadingImages={uploadingImages}
          deletingImage={deletingImage}
          maxImages={10}
        />
      </div>

      {/* Maintenance Template */}
      <MaintenanceTemplateEditor
        template={product.maintenanceTemplate}
        onChange={(template) => setProduct({ ...product, maintenanceTemplate: template })}
        labels={pe}
      />
    </div>
  );
}

function MaintenanceTemplateEditor({
  template,
  onChange,
  labels,
}: {
  template?: MaintenanceTemplate;
  onChange: (template: MaintenanceTemplate) => void;
  labels: Record<string, string>;
}) {
  const current: MaintenanceTemplate = template || { ezerIntervalDays: 180, filters: [] };

  const INTERVAL_OPTIONS = [
    { label: labels.threeMonths, days: 90 },
    { label: labels.sixMonths, days: 180 },
    { label: labels.twelveMonths, days: 365 },
  ];

  return (
    <div className="apple-card">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{labels.maintenanceTemplate}</h2>
        <p className="text-sm text-text-secondary mt-1">{labels.maintenanceTemplateDesc}</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-3">{labels.ezerInterval}</label>
          <div className="grid grid-cols-3 gap-2">
            {INTERVAL_OPTIONS.map((opt) => (
              <button key={opt.days} type="button"
                onClick={() => onChange({ ...current, ezerIntervalDays: opt.days })}
                className={`px-3 py-2 rounded-apple text-sm font-medium transition-all ${
                  current.ezerIntervalDays === opt.days
                    ? 'bg-primary text-white'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">{labels.filterSchedules}</label>
            {current.filters.length < 4 && (
              <button type="button"
                onClick={() => onChange({ ...current, filters: [...current.filters, { name: '', intervalDays: 180 }] })}
                className="flex items-center gap-1 text-sm text-primary font-medium hover:text-primary/80 transition-all">
                <Plus className="w-4 h-4" /> {labels.addFilter}
              </button>
            )}
          </div>
          {current.filters.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-4">
              No filter schedules configured. Click &quot;{labels.addFilter}&quot; to add one.
            </p>
          ) : (
            <div className="space-y-4">
              {current.filters.map((filter, index) => (
                <div key={index} className="p-4 bg-surface rounded-apple border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-secondary">{labels.filterName}</span>
                    <button type="button"
                      onClick={() => onChange({ ...current, filters: current.filters.filter((_, i) => i !== index) })}
                      className="p-1 text-text-tertiary hover:text-error transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input type="text" value={filter.name}
                    onChange={(e) => onChange({
                      ...current,
                      filters: current.filters.map((f, i) => i === index ? { ...f, name: e.target.value } : f),
                    })}
                    placeholder={labels.filterNamePlaceholder}
                    className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all text-sm" />
                  <div className="grid grid-cols-3 gap-2">
                    {INTERVAL_OPTIONS.map((opt) => (
                      <button key={opt.days} type="button"
                        onClick={() => onChange({
                          ...current,
                          filters: current.filters.map((f, i) => i === index ? { ...f, intervalDays: opt.days } : f),
                        })}
                        className={`px-3 py-2 rounded-apple text-sm font-medium transition-all ${
                          filter.intervalDays === opt.days
                            ? 'bg-primary text-white'
                            : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

