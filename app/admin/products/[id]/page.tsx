'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Product, MaintenanceTemplate } from '@/types';
import {
  getProductById,
  updateProduct,
  addProductImages,
  removeProductImage,
  reorderProductImages
} from '@/lib/services/productService';
import ImageGalleryManager from '@/components/admin/ImageGalleryManager';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureAccess } from '@/hooks/useRolePermissions';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';

export default function EditProductPage() {
  const { t } = useTranslation();
  const pe = t.admin.productEdit;
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { userData } = useAuth();
  const { canEdit, loading: accessLoading } = useFeatureAccess('featureProducts');

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);

  useEffect(() => {
    if (userData && userData.role !== 'admin' && !accessLoading && !canEdit) {
      router.replace('/admin/products');
    }
  }, [userData, router, accessLoading, canEdit]);

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const message = error instanceof Error ? error.message : pe.loadProductError;
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
      toast.success(pe.productUpdated);
      router.push('/admin/products');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : pe.updateProductError;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddImages = async (files: File[]) => {
    try {
      setUploadingImages(true);
      const uploadedUrls = await addProductImages(productId, files);

      setProduct(prev => prev ? {
        ...prev,
        images: [...(prev.images || []), ...uploadedUrls]
      } : null);

      toast.success(pe.imagesUploadedFormat.replace('{count}', String(files.length)));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : pe.uploadImagesError;
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

      setProduct(prev => prev ? {
        ...prev,
        images: (prev.images || []).filter(url => url !== imageUrl)
      } : null);

      toast.success(pe.imageDeleted);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : pe.deleteImageError;
      toast.error(message);
      throw error;
    } finally {
      setDeletingImage(null);
    }
  };

  const handleImagesReorder = async (newImageOrder: string[]) => {
    try {
      setProduct(prev => prev ? {
        ...prev,
        images: newImageOrder
      } : null);

      await reorderProductImages(productId, newImageOrder);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : pe.reorderImagesError;
      toast.error(message);
      loadProduct();
    }
  };

  if (userData && userData.role !== 'admin' && !accessLoading && !canEdit) return null;

  if (loading) {
    return (
      <div className="sc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="sc-spinner" style={{ margin: '0 auto' }} />
          <p className="sc-helper" style={{ margin: 0 }}>{pe.loading}</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: 8,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              color: 'var(--ink)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="sc-h1" style={{ margin: 0 }}>{pe.title}</h1>
            <p className="sc-helper" style={{ margin: '4px 0 0' }}>{product.name.en}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/admin/products')}
            className="sc-cta-ghost"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="sc-cta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Save className="w-5 h-5" />
            {saving ? t.common.saving : pe.saveChanges}
          </button>
        </div>
      </div>

      <div className="sc-card-static">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label className="sc-label">{pe.productNameEn}</label>
              <input
                type="text"
                value={product.name.en}
                onChange={(e) => setProduct({
                  ...product,
                  name: { ...product.name, en: e.target.value }
                })}
                className="sc-input"
              />
            </div>

            <div>
              <label className="sc-label">{pe.brand}</label>
              <input
                type="text"
                value={product.brand}
                onChange={(e) => setProduct({ ...product, brand: e.target.value })}
                className="sc-input"
              />
            </div>

            <div>
              <label className="sc-label">{pe.category}</label>
              <input
                type="text"
                value={product.category}
                onChange={(e) => setProduct({ ...product, category: e.target.value })}
                className="sc-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label className="sc-label">{pe.basePrice}</label>
              <input
                type="number"
                step="0.01"
                value={product.basePrice || 0}
                onChange={(e) => setProduct({ ...product, basePrice: parseFloat(e.target.value) || 0 })}
                className="sc-input"
              />
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={product.active}
                  onChange={(e) => setProduct({ ...product, active: e.target.checked })}
                  style={{ width: 20, height: 20, accentColor: 'var(--brand)' }}
                />
                <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{pe.active}</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={product.featured}
                  onChange={(e) => setProduct({ ...product, featured: e.target.checked })}
                  style={{ width: 20, height: 20, accentColor: 'var(--warn)' }}
                />
                <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{pe.featured}</span>
              </label>
            </div>

            <div>
              <h3 style={{ fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>{pe.variations}</h3>
              <p className="sc-helper" style={{ margin: 0 }}>
                {product.variations?.length || 0} {pe.variationsCountSuffix}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="sc-card-static">
        <h2 className="sc-h2" style={{ margin: 0, marginBottom: 24, fontSize: 24 }}>{pe.productImages}</h2>
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

  const intervalBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    fontWeight: 500,
    border: `1px solid ${active ? 'var(--brand)' : 'var(--hairline)'}`,
    background: active ? 'var(--brand)' : 'var(--off-paper)',
    color: active ? '#fff' : 'var(--soft)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  return (
    <div className="sc-card-static">
      <div style={{ marginBottom: 24 }}>
        <h2 className="sc-h2" style={{ margin: 0, fontSize: 24 }}>{labels.maintenanceTemplate}</h2>
        <p className="sc-helper" style={{ margin: '4px 0 0' }}>{labels.maintenanceTemplateDesc}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <label className="sc-label">{labels.ezerInterval}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {INTERVAL_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => onChange({ ...current, ezerIntervalDays: opt.days })}
                style={intervalBtnStyle(current.ezerIntervalDays === opt.days)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <label className="sc-label" style={{ marginBottom: 0 }}>{labels.filterSchedules}</label>
            {current.filters.length < 4 && (
              <button
                type="button"
                onClick={() => onChange({ ...current, filters: [...current.filters, { name: '', intervalDays: 180 }] })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--brand)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <Plus className="w-4 h-4" /> {labels.addFilter}
              </button>
            )}
          </div>
          {current.filters.length === 0 ? (
            <p className="sc-helper" style={{ textAlign: 'center', padding: '16px 0', margin: 0 }}>
              {labels.noFilterSchedulesFormat.replace('{action}', labels.addFilter)}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {current.filters.map((filter, index) => (
                <div
                  key={index}
                  style={{
                    padding: 16,
                    background: 'var(--off-paper)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--hairline)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--soft)' }}>{labels.filterName}</span>
                    <button
                      type="button"
                      onClick={() => onChange({ ...current, filters: current.filters.filter((_, i) => i !== index) })}
                      style={{
                        padding: 4,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--soft)',
                        display: 'inline-flex',
                        transition: 'color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--soft)'; }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={filter.name}
                    onChange={(e) => onChange({
                      ...current,
                      filters: current.filters.map((f, i) => i === index ? { ...f, name: e.target.value } : f),
                    })}
                    placeholder={labels.filterNamePlaceholder}
                    className="sc-input"
                    style={{ fontSize: 14 }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {INTERVAL_OPTIONS.map((opt) => (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => onChange({
                          ...current,
                          filters: current.filters.map((f, i) => i === index ? { ...f, intervalDays: opt.days } : f),
                        })}
                        style={intervalBtnStyle(filter.intervalDays === opt.days)}
                      >
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
