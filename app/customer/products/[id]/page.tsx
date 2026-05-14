'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/types';
import { getProductById } from '@/lib/services/productService';
import { formatCurrency } from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { userData } = useAuth();
  const { t } = useTranslation();
  const o = t.orders;
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load product first (required)
      const productData = await getProductById(productId);

      if (!productData) {
        toast.error(t.components.productDetail.productNotFound);
        router.push('/customer');
        return;
      }

      setProduct(productData);

      // Pre-select first variation if available
      if (productData.variations && productData.variations.length > 0) {
        setSelectedVariationId(productData.variations[0].id);
      }
    } catch (error: unknown) {
      toast.error(t.components.productDetail.failedToLoadProduct);
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
      <div className="sc">
        <div className="sc-spinner-wrap"><div className="sc-spinner" /></div>
      </div>
    );
  }

  if (!product) return null;

  const lang = userData?.preferredLanguage || 'en';
  const selectedVariation = product.variations?.find((v) => v.id === selectedVariationId);

  const totalPrice = selectedVariation?.price || product.basePrice;

  return (
    <div className="sc">
      <header className="sc-nav">
        <div className="sc-nav-inner">
          <button
            type="button"
            onClick={() => router.back()}
            className="sc-nav-link"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="sc-nav-text">{o.backToProducts}</span>
          </button>
        </div>
      </header>

      <main className="sc-main">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="sc-stack">
            <div
              style={{
                height: 384,
                background: 'var(--off-paper)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.name[lang]}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <Package className="w-24 h-24" style={{ color: 'var(--soft)' }} />
              )}
            </div>

            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.slice(0, 4).map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    style={{
                      height: 80,
                      background: 'var(--off-paper)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: selectedImage === index ? '2px solid var(--brand)' : '1px solid var(--hairline)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sc-stack-lg">
            <div>
              <div className="sc-row-between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div className="sc-eyebrow">{product.brand}</div>
                  <h1 className="sc-h1">{product.name[lang]}</h1>
                </div>
                {product.featured && (
                  <span className="sc-badge-inline">{t.customer.featured}</span>
                )}
              </div>
              <p className="sc-lede" style={{ marginTop: 12 }}>{product.description[lang]}</p>
            </div>

            <div className="sc-card-static">
              <p className="sc-price-label">{o.price}</p>
              <p className="sc-price" style={{ fontSize: 36, marginTop: 4 }}>
                {formatCurrency(selectedVariation?.price || product.basePrice, product.currency)}
              </p>
            </div>

            {product.variations && product.variations.length > 0 && (
              <div>
                <label className="sc-label">
                  {o.selectOption} <span style={{ color: 'var(--warn)' }}>*</span>
                </label>
                <div className="sc-stack">
                  {product.variations.map((variation) => {
                    const active = selectedVariationId === variation.id;
                    return (
                      <button
                        key={variation.id}
                        type="button"
                        onClick={() => setSelectedVariationId(variation.id)}
                        style={{
                          width: '100%',
                          padding: 16,
                          textAlign: 'left',
                          borderRadius: 'var(--radius-sm)',
                          border: active ? '2px solid var(--brand)' : '1px solid var(--hairline)',
                          background: active ? 'var(--brand-tint)' : 'var(--paper)',
                          color: 'var(--ink)',
                          cursor: 'pointer',
                          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        <div className="sc-row-between">
                          <div>
                            <p style={{ fontWeight: 600, margin: 0 }}>{variation.name}</p>
                            <p style={{ fontSize: 13, color: 'var(--soft)', margin: '4px 0 0' }}>SKU: {variation.sku}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: 700, fontSize: 18, margin: 0, color: active ? 'var(--brand)' : 'var(--ink)' }}>
                              {formatCurrency(variation.price, product.currency)}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--soft)', margin: '4px 0 0' }}>
                              {variation.stock > 0 ? `${variation.stock} ${o.inStock}` : o.outOfStock}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="sc-card-static">
                <h3 className="sc-h2" style={{ marginBottom: 12 }}>{o.specifications}</h3>
                <div className="sc-stack" style={{ gap: 8 }}>
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="sc-row-between" style={{ fontSize: 14 }}>
                      <span style={{ color: 'var(--soft)' }}>{key}</span>
                      <span style={{ fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="sc-card-static" style={{ marginBottom: 16 }}>
                <div className="sc-row-between">
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{o.total}</span>
                  <span className="sc-price" style={{ fontSize: 28 }}>
                    {formatCurrency(totalPrice, product.currency)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOrder}
                className="sc-cta"
                style={{ width: '100%', padding: '14px 24px', fontSize: 15 }}
              >
                {o.continueToDetails}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

