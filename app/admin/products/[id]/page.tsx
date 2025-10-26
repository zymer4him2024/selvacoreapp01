'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Product } from '@/types';
import { 
  getProductById, 
  updateProduct, 
  addProductImages, 
  removeProductImage,
  reorderProductImages 
} from '@/lib/services/productService';
import ImageGalleryManager from '@/components/admin/ImageGalleryManager';
import toast from 'react-hot-toast';

export default function EditProductPage() {
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
        toast.error('Product not found');
        router.push('/admin/products');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load product');
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to update product');
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload images');
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete image');
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to reorder images');
      // Reload product to restore correct order
      loadProduct();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading product...</p>
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
            <h1 className="text-4xl font-bold tracking-tight">Edit Product</h1>
            <p className="text-text-secondary mt-1">{product.name.en}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/products')}
            className="px-6 py-3 bg-surface hover:bg-surface-elevated rounded-apple font-medium transition-all border border-border"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-apple transition-all hover:scale-105 shadow-apple"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="apple-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Product Name (English)</h3>
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
              <h3 className="font-semibold mb-2">Brand</h3>
              <input
                type="text"
                value={product.brand}
                onChange={(e) => setProduct({ ...product, brand: e.target.value })}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>

            <div>
              <h3 className="font-semibold mb-2">Category</h3>
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
              <h3 className="font-semibold mb-2">Base Price</h3>
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
                <span className="font-medium">Active</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={product.featured}
                  onChange={(e) => setProduct({ ...product, featured: e.target.checked })}
                  className="w-5 h-5 rounded accent-warning"
                />
                <span className="font-medium">Featured</span>
              </label>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Variations</h3>
              <p className="text-sm text-text-secondary">
                {product.variations?.length || 0} variation(s)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery Manager */}
      <div className="apple-card">
        <h2 className="text-2xl font-bold mb-6">Product Images</h2>
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
    </div>
  );
}

