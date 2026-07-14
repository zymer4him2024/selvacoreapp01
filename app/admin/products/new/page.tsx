'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Upload, X } from 'lucide-react';
import { ProductVariation, MultiLanguageText, MaintenanceTemplateFilter } from '@/types';
import { createProduct, updateProduct, uploadProductImage } from '@/lib/services/productService';
import { PRODUCT_CATEGORIES, SUPPORTED_LANGUAGES } from '@/lib/utils/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureAccess } from '@/hooks/useRolePermissions';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from '@/hooks/useTranslation';

export default function NewProductPage() {
  const { t } = useTranslation();
  const pn = t.admin.productNew;
  const router = useRouter();
  const { userData } = useAuth();
  const { canEdit, loading: accessLoading } = useFeatureAccess('featureProducts');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData && userData.role !== 'admin' && !accessLoading && !canEdit) {
      router.replace('/admin/products');
    }
  }, [userData, router, accessLoading, canEdit]);

  const [name, setName] = useState<MultiLanguageText>({ en: '', pt: '', es: '', ko: '' });
  const [description, setDescription] = useState<MultiLanguageText>({ en: '', pt: '', es: '', ko: '' });
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [installationTime, setInstallationTime] = useState('');
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [images, setImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);

  const [variations, setVariations] = useState<ProductVariation[]>([]);

  const [ezerIntervalDays, setEzerIntervalDays] = useState(180);
  const [templateFilters, setTemplateFilters] = useState<MaintenanceTemplateFilter[]>([
    { name: 'Sediment Filter', intervalDays: 180 },
  ]);

  const INTERVAL_OPTIONS = [
    { label: pn.threeMonths, days: 90 },
    { label: pn.sixMonths, days: 180 },
    { label: pn.twelveMonths, days: 365 },
  ];

  const [specifications, setSpecifications] = useState<Record<string, string>>({});
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');

  if (userData && userData.role !== 'admin' && !accessLoading && !canEdit) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages([...images, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreview(imagePreview.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const addSpecification = () => {
    if (specKey.trim() && specValue.trim()) {
      setSpecifications({ ...specifications, [specKey.trim()]: specValue.trim() });
      setSpecKey('');
      setSpecValue('');
    }
  };

  const removeSpecification = (key: string) => {
    const newSpecs = { ...specifications };
    delete newSpecs[key];
    setSpecifications(newSpecs);
  };

  const addVariation = () => {
    const newVariation: ProductVariation = {
      id: uuidv4(),
      name: '',
      attributes: {},
      price: 0,
      stock: 0,
      sku: '',
      images: [],
    };
    setVariations([...variations, newVariation]);
  };

  const removeVariation = (id: string) => {
    setVariations(variations.filter(v => v.id !== id));
  };

  const updateVariation = (id: string, field: keyof ProductVariation, value: ProductVariation[keyof ProductVariation]) => {
    setVariations(variations.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.en.trim()) {
      toast.error(pn.validationName);
      return;
    }

    if (!category) {
      toast.error(pn.validationCategory);
      return;
    }

    if (!basePrice || parseFloat(basePrice) <= 0) {
      toast.error(pn.validationPrice);
      return;
    }

    try {
      setLoading(true);

      const productId = await createProduct({
        name,
        description,
        category,
        brand,
        basePrice: parseFloat(basePrice) || 0,
        currency,
        variations,
        images: [],
        specifications,
        installationTime: parseInt(installationTime) || 1,
        active,
        featured,
        tags,
        maintenanceTemplate: {
          ezerIntervalDays,
          filters: templateFilters,
        },
      });

      const imageUrls: string[] = [];
      for (const file of images) {
        const url = await uploadProductImage(productId, file);
        imageUrls.push(url);
      }

      if (imageUrls.length > 0) {
        await updateProduct(productId, { images: imageUrls });
      }

      toast.success(pn.productCreated);
      router.push('/admin/products');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create product';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
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
          <h1 className="sc-h1" style={{ margin: 0 }}>{pn.title}</h1>
          <p className="sc-helper" style={{ margin: '4px 0 0' }}>{pn.subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="sc-card-static">
          <h2 className="sc-h2" style={{ margin: 0, marginBottom: 24, fontSize: 24 }}>{pn.basicInfo}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label className="sc-label">
                {pn.productName} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <div key={lang.code} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: 128, fontSize: 14, color: 'var(--soft)' }}>
                      {lang.flag} {lang.name}
                    </span>
                    <input
                      type="text"
                      value={name[lang.code] || ''}
                      onChange={(e) => setName({ ...name, [lang.code]: e.target.value })}
                      placeholder={`Product name in ${lang.name}`}
                      className="sc-input"
                      style={{ flex: 1, minWidth: 200 }}
                      required={lang.code === 'en'}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="sc-label">{pn.description}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <div key={lang.code} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: 128, fontSize: 14, color: 'var(--soft)', paddingTop: 12 }}>
                      {lang.flag} {lang.name}
                    </span>
                    <textarea
                      value={description[lang.code] || ''}
                      onChange={(e) => setDescription({ ...description, [lang.code]: e.target.value })}
                      placeholder={`Description in ${lang.name}`}
                      rows={3}
                      className="sc-textarea"
                      style={{ flex: 1, minWidth: 200, resize: 'none' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <label className="sc-label">
                  {pn.category} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="sc-select"
                  required
                >
                  <option value="">{pn.selectCategory}</option>
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="sc-label">
                  {pn.brand} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder={pn.brandPlaceholder}
                  className="sc-input"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <div>
                <label className="sc-label">
                  {pn.basePrice} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="0.00"
                  className="sc-input"
                  required
                />
              </div>

              <div>
                <label className="sc-label">{pn.currency}</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="sc-select"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="BRL">BRL (R$)</option>
                </select>
              </div>

              <div>
                <label className="sc-label">{pn.installationTime}</label>
                <input
                  type="number"
                  value={installationTime}
                  onChange={(e) => setInstallationTime(e.target.value)}
                  placeholder="1"
                  className="sc-input"
                />
              </div>
            </div>

            <div>
              <label className="sc-label">{pn.tags}</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder={pn.tagsPlaceholder}
                  className="sc-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={addTag}
                  style={{
                    padding: '12px 16px',
                    background: 'var(--off-paper)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--off-paper)'; }}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 12px',
                        background: 'var(--brand-tint)',
                        color: 'var(--brand)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 14,
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: 'inherit',
                          display: 'inline-flex',
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--brand)'; }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: 'var(--brand)' }}
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{pn.active}</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: 'var(--warn)' }}
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{pn.featured}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="sc-card-static">
          <h2 className="sc-h2" style={{ margin: 0, marginBottom: 24, fontSize: 24 }}>{pn.productImages}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: 192,
                border: '2px dashed var(--hairline)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                background: 'var(--off-paper)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand)';
                e.currentTarget.style.background = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--hairline)';
                e.currentTarget.style.background = 'var(--off-paper)';
              }}
            >
              <Upload className="w-12 h-12" style={{ color: 'var(--soft)', marginBottom: 8 }} />
              <span style={{ fontSize: 14, color: 'var(--soft)' }}>{pn.uploadImages}</span>
              <span style={{ fontSize: 12, color: 'var(--soft)', marginTop: 4 }}>{pn.imageFormats}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </label>

            {imagePreview.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
                {imagePreview.map((preview, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      style={{ width: '100%', height: 128, objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        padding: 4,
                        background: '#ef4444',
                        color: '#fff',
                        borderRadius: 'var(--radius-full)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {index === 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          left: 8,
                          padding: '4px 8px',
                          background: 'var(--brand)',
                          color: '#fff',
                          fontSize: 12,
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {pn.main}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sc-card-static">
          <h2 className="sc-h2" style={{ margin: 0, marginBottom: 24, fontSize: 24 }}>{pn.specifications}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={specKey}
                onChange={(e) => setSpecKey(e.target.value)}
                placeholder={pn.specKey}
                className="sc-input"
                style={{ flex: 1, minWidth: 160 }}
              />
              <input
                type="text"
                value={specValue}
                onChange={(e) => setSpecValue(e.target.value)}
                placeholder={pn.specValue}
                className="sc-input"
                style={{ flex: 1, minWidth: 160 }}
              />
              <button
                type="button"
                onClick={addSpecification}
                style={{
                  padding: '12px 16px',
                  background: 'var(--off-paper)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--off-paper)'; }}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {Object.keys(specifications).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(specifications).map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      background: 'var(--off-paper)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--hairline)',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{key}:</span>
                      <span style={{ color: 'var(--soft)', marginLeft: 8 }}>{value}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSpecification(key)}
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
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sc-card-static">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 className="sc-h2" style={{ margin: 0, fontSize: 24 }}>{pn.productVariations}</h2>
              <p className="sc-helper" style={{ margin: '4px 0 0' }}>{pn.whatsIncluded}</p>
            </div>
            <button
              type="button"
              onClick={addVariation}
              className="sc-cta"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}
            >
              <Plus className="w-5 h-5" />
              {pn.addVariation}
            </button>
          </div>

          {variations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--soft)' }}>
              {pn.noVariations}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {variations.map((variation, index) => (
                <div
                  key={variation.id}
                  style={{
                    padding: 16,
                    background: 'var(--off-paper)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--hairline)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontWeight: 500, color: 'var(--ink)', margin: 0 }}>Variation {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeVariation(variation.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        display: 'inline-flex',
                        padding: 4,
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                    <input
                      type="text"
                      value={variation.name}
                      onChange={(e) => updateVariation(variation.id, 'name', e.target.value)}
                      placeholder={pn.variationName}
                      className="sc-input"
                    />
                    <input
                      type="text"
                      value={variation.sku}
                      onChange={(e) => updateVariation(variation.id, 'sku', e.target.value)}
                      placeholder={pn.sku}
                      className="sc-input"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={variation.price || ''}
                      onChange={(e) => updateVariation(variation.id, 'price', parseFloat(e.target.value) || 0)}
                      placeholder={pn.price}
                      className="sc-input"
                    />
                    <input
                      type="number"
                      value={variation.stock || ''}
                      onChange={(e) => updateVariation(variation.id, 'stock', parseInt(e.target.value) || 0)}
                      placeholder={pn.stock}
                      className="sc-input"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sc-card-static">
          <div style={{ marginBottom: 24 }}>
            <h2 className="sc-h2" style={{ margin: 0, fontSize: 24 }}>{pn.maintenanceTemplate}</h2>
            <p className="sc-helper" style={{ margin: '4px 0 0' }}>{pn.maintenanceTemplateDesc}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label className="sc-label">{pn.ezerInterval}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setEzerIntervalDays(opt.days)}
                    style={intervalBtnStyle(ezerIntervalDays === opt.days)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label className="sc-label" style={{ marginBottom: 0 }}>{pn.filterSchedules}</label>
                {templateFilters.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setTemplateFilters([...templateFilters, { name: '', intervalDays: 180 }])}
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
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--brand)'; }}
                  >
                    <Plus className="w-4 h-4" /> {pn.addFilter}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {templateFilters.map((filter, index) => (
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
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--soft)' }}>{pn.filterName}</span>
                      {templateFilters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setTemplateFilters(templateFilters.filter((_, i) => i !== index))}
                          style={{
                            fontSize: 14,
                            color: '#ef4444',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'opacity 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                        >
                          {pn.removeFilter}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={filter.name}
                      onChange={(e) => setTemplateFilters(templateFilters.map((f, i) => i === index ? { ...f, name: e.target.value } : f))}
                      placeholder={pn.filterNamePlaceholder}
                      className="sc-input"
                      style={{ fontSize: 14 }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {INTERVAL_OPTIONS.map((opt) => (
                        <button
                          key={opt.days}
                          type="button"
                          onClick={() => setTemplateFilters(templateFilters.map((f, i) => i === index ? { ...f, intervalDays: opt.days } : f))}
                          style={intervalBtnStyle(filter.intervalDays === opt.days)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={loading}
            className="sc-cta"
            style={{ flex: 1, minWidth: 200 }}
          >
            {loading ? pn.creatingProduct : pn.createProduct}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="sc-cta-ghost"
          >
            {t.common.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
