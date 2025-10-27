'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/types';
import { getProductById } from '@/lib/services/productService';
import { formatCurrency } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { userData } = useAuth();
  const productId = params.id as string;

  console.log('🎬 Product detail component started');
  console.log('🎬 Product ID:', productId);
  console.log('🎬 User data:', userData);
  console.log('🎬 Params:', params);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    console.log('🚀 Product detail page useEffect triggered');
    console.log('🚀 Product ID from params:', productId);
    console.log('🚀 User data:', userData);
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      console.log('🔍 Loading product with ID:', productId);
      setLoading(true);
      
      // Load product first (required)
      console.log('📦 Getting product data...');
      const productData = await getProductById(productId);
      console.log('📦 Product data result:', productData);

      if (!productData) {
        console.log('❌ Product not found');
        toast.error('Product not found');
        router.push('/customer');
        return;
      }

      console.log('✅ Setting product data');
      setProduct(productData);

      // Pre-select first variation if available
      if (productData.variations && productData.variations.length > 0) {
        setSelectedVariationId(productData.variations[0].id);
      }
      
      console.log('✅ Product detail page loaded successfully');
    } catch (error: any) {
      console.error('❌ Product loading failed:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = () => {
    // Store selection in sessionStorage
    sessionStorage.setItem('orderData', JSON.stringify({
      productId: product!.id,
      variationId: selectedVariationId,
    }));

    router.push('/customer/order/details');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const lang = userData?.preferredLanguage || 'en';
  const selectedVariation = product.variations?.find((v) => v.id === selectedVariationId);
  
  const totalPrice = selectedVariation?.price || product.basePrice;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10 backdrop-blur-lg bg-surface/80">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Products
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Images */}
          <div className="space-y-4 animate-fade-in">
            {/* Main Image */}
            <div className="h-96 bg-surface-elevated rounded-apple overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.name[lang]}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-text-tertiary" />
                </div>
              )}
            </div>

            {/* Image Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.slice(0, 4).map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`h-20 bg-surface-elevated rounded-apple overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? 'border-primary scale-105'
                        : 'border-border hover:border-border-light'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="space-y-6 animate-slide-up">
            {/* Product Info */}
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{product.name[lang]}</h1>
                  <p className="text-text-secondary">{product.brand}</p>
                </div>
                {product.featured && (
                  <span className="px-3 py-1 bg-warning text-black text-sm font-bold rounded-full">
                    ⭐ Featured
                  </span>
                )}
              </div>
              <p className="text-text-secondary leading-relaxed">{product.description[lang]}</p>
            </div>

            {/* Price */}
            <div className="p-6 bg-surface rounded-apple">
              <p className="text-sm text-text-tertiary mb-2">Price</p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(selectedVariation?.price || product.basePrice, product.currency)}
              </p>
            </div>

            {/* Variations */}
            {product.variations && product.variations.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-3">
                  Select Option <span className="text-error">*</span>
                </label>
                <div className="space-y-2">
                  {product.variations.map((variation) => (
                    <button
                      key={variation.id}
                      type="button"
                      onClick={() => setSelectedVariationId(variation.id)}
                      className={`w-full p-4 rounded-apple text-left transition-all ${
                        selectedVariationId === variation.id
                          ? 'bg-primary text-white shadow-apple'
                          : 'bg-surface hover:bg-surface-elevated border border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{variation.name}</p>
                          <p className={`text-sm mt-1 ${
                            selectedVariationId === variation.id ? 'text-white/80' : 'text-text-secondary'
                          }`}>
                            SKU: {variation.sku}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {formatCurrency(variation.price, product.currency)}
                          </p>
                          <p className={`text-xs mt-1 ${
                            selectedVariationId === variation.id ? 'text-white/60' : 'text-text-tertiary'
                          }`}>
                            {variation.stock > 0 ? `${variation.stock} in stock` : 'Out of stock'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Specifications */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="p-6 bg-surface rounded-apple">
                <h3 className="font-semibold mb-4">Specifications</h3>
                <div className="space-y-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{key}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total and Order Button */}
            <div className="sticky bottom-0 pt-6 pb-6 bg-background/80 backdrop-blur-lg border-t border-border -mx-4 px-4 lg:mx-0 lg:px-0">
              <div className="p-6 bg-surface rounded-apple mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(totalPrice, product.currency)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleOrder}
                className="w-full px-8 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
              >
                Continue to Order Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

