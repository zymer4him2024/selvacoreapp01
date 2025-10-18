'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Upload, X } from 'lucide-react';
import { Product, ProductVariation, MultiLanguageText } from '@/types';
import { createProduct, uploadProductImage } from '@/lib/services/productService';
import { PRODUCT_CATEGORIES, SUPPORTED_LANGUAGES } from '@/lib/utils/constants';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState<MultiLanguageText>({ en: '', es: '', fr: '', pt: '', ar: '' });
  const [description, setDescription] = useState<MultiLanguageText>({ en: '', es: '', fr: '', pt: '', ar: '' });
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [installationTime, setInstallationTime] = useState('');
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // Images
  const [images, setImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  
  // Variations
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [showVariationForm, setShowVariationForm] = useState(false);

  // Specifications
  const [specifications, setSpecifications] = useState<Record<string, string>>({});
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages([...images, ...files]);
    
    // Create previews
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
    setShowVariationForm(true);
  };

  const removeVariation = (id: string) => {
    setVariations(variations.filter(v => v.id !== id));
  };

  const updateVariation = (id: string, field: keyof ProductVariation, value: any) => {
    setVariations(variations.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name.en.trim()) {
      toast.error('Please enter product name in English');
      return;
    }
    
    if (!category) {
      toast.error('Please select a category');
      return;
    }
    
    if (!basePrice || parseFloat(basePrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      setLoading(true);

      // Create product first to get ID
      const productId = await createProduct({
        name,
        description,
        category,
        brand,
        basePrice: parseFloat(basePrice),
        currency,
        variations,
        images: [],
        specifications,
        installationTime: parseInt(installationTime) || 1,
        active,
        featured,
        tags,
      });

      // Upload images
      const imageUrls: string[] = [];
      for (const file of images) {
        const url = await uploadProductImage(productId, file);
        imageUrls.push(url);
      }

      // Update product with image URLs
      if (imageUrls.length > 0) {
        await createProduct({
          ...{
            name,
            description,
            category,
            brand,
            basePrice: parseFloat(basePrice),
            currency,
            variations,
            images: imageUrls,
            specifications,
            installationTime: parseInt(installationTime) || 1,
            active,
            featured,
            tags,
          }
        });
      }

      toast.success('Product created successfully!');
      router.push('/admin/products');
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-surface-elevated rounded-apple transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Add New Product</h1>
          <p className="text-text-secondary mt-1">
            Create a new product with variations and multi-language support
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="apple-card">
          <h2 className="text-2xl font-semibold mb-6">Basic Information</h2>
          
          <div className="space-y-6">
            {/* Product Name (Multi-language) */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Product Name <span className="text-error">*</span>
              </label>
              <div className="space-y-3">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <div key={lang.code} className="flex gap-3">
                    <span className="flex items-center gap-2 w-32 text-sm text-text-secondary">
                      {lang.flag} {lang.name}
                    </span>
                    <input
                      type="text"
                      value={name[lang.code] || ''}
                      onChange={(e) => setName({ ...name, [lang.code]: e.target.value })}
                      placeholder={`Product name in ${lang.name}`}
                      className="flex-1 px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
                      required={lang.code === 'en'}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Product Description (Multi-language) */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Description
              </label>
              <div className="space-y-3">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <div key={lang.code} className="flex gap-3">
                    <span className="flex items-center gap-2 w-32 text-sm text-text-secondary">
                      {lang.flag} {lang.name}
                    </span>
                    <textarea
                      value={description[lang.code] || ''}
                      onChange={(e) => setDescription({ ...description, [lang.code]: e.target.value })}
                      placeholder={`Description in ${lang.name}`}
                      rows={3}
                      className="flex-1 px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Category and Brand */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category <span className="text-error">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
                  required
                >
                  <option value="">Select category</option>
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Brand <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g., AquaPure"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
                  required
                />
              </div>
            </div>

            {/* Price and Installation Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Base Price <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="BRL">BRL (R$)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Installation Time (hours)
                </label>
                <input
                  type="number"
                  value={installationTime}
                  onChange={(e) => setInstallationTime(e.target.value)}
                  placeholder="1"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag and press Enter"
                  className="flex-1 px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-3 bg-surface-elevated hover:bg-surface-secondary rounded-apple transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-error transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Status Toggles */}
            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-5 h-5 rounded accent-primary"
                />
                <span className="text-sm font-medium">Active</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-5 h-5 rounded accent-warning"
                />
                <span className="text-sm font-medium">Featured</span>
              </label>
            </div>
          </div>
        </div>

        {/* Product Images */}
        <div className="apple-card">
          <h2 className="text-2xl font-semibold mb-6">Product Images</h2>
          
          <div className="space-y-4">
            <div>
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-apple hover:border-primary transition-all cursor-pointer bg-surface-elevated hover:bg-surface-secondary">
                <Upload className="w-12 h-12 text-text-tertiary mb-2" />
                <span className="text-sm text-text-secondary">Click to upload images</span>
                <span className="text-xs text-text-tertiary mt-1">PNG, JPG, WebP (max 10MB)</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>

            {imagePreview.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {imagePreview.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-apple"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1 bg-error rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {index === 0 && (
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-white text-xs rounded">
                        Main
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Specifications */}
        <div className="apple-card">
          <h2 className="text-2xl font-semibold mb-6">Specifications</h2>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={specKey}
                onChange={(e) => setSpecKey(e.target.value)}
                placeholder="Key (e.g., Dimensions)"
                className="flex-1 px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
              />
              <input
                type="text"
                value={specValue}
                onChange={(e) => setSpecValue(e.target.value)}
                placeholder="Value (e.g., 12 x 8 x 24 inches)"
                className="flex-1 px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
              />
              <button
                type="button"
                onClick={addSpecification}
                className="px-4 py-3 bg-surface-elevated hover:bg-surface-secondary rounded-apple transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {Object.keys(specifications).length > 0 && (
              <div className="space-y-2">
                {Object.entries(specifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 bg-surface rounded-apple"
                  >
                    <div>
                      <span className="font-medium">{key}:</span>
                      <span className="text-text-secondary ml-2">{value}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSpecification(key)}
                      className="p-1 hover:text-error transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Variations */}
        <div className="apple-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Product Variations</h2>
              <p className="text-sm text-text-secondary mt-1">
                Add different sizes, models, or configurations
              </p>
            </div>
            <button
              type="button"
              onClick={addVariation}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-apple transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Variation
            </button>
          </div>

          {variations.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              No variations yet. Click "Add Variation" to create one.
            </div>
          ) : (
            <div className="space-y-4">
              {variations.map((variation, index) => (
                <div
                  key={variation.id}
                  className="p-4 bg-surface rounded-apple border border-border"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-medium">Variation {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeVariation(variation.id)}
                      className="text-error hover:text-error/80 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={variation.name}
                      onChange={(e) => updateVariation(variation.id, 'name', e.target.value)}
                      placeholder="Variation name (e.g., Small - 5 Stage)"
                      className="px-4 py-2 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                    />
                    <input
                      type="text"
                      value={variation.sku}
                      onChange={(e) => updateVariation(variation.id, 'sku', e.target.value)}
                      placeholder="SKU"
                      className="px-4 py-2 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={variation.price || ''}
                      onChange={(e) => updateVariation(variation.id, 'price', parseFloat(e.target.value))}
                      placeholder="Price"
                      className="px-4 py-2 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                    />
                    <input
                      type="number"
                      value={variation.stock || ''}
                      onChange={(e) => updateVariation(variation.id, 'stock', parseInt(e.target.value))}
                      placeholder="Stock quantity"
                      className="px-4 py-2 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-8 py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
          >
            {loading ? 'Creating Product...' : 'Create Product'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-4 bg-surface hover:bg-surface-elevated text-white font-semibold rounded-apple transition-all border border-border"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

