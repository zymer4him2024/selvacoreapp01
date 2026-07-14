'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, Package, X, Clock, Tag } from 'lucide-react';
import { Product } from '@/types';
import { getProductsPaginated, deleteProduct, updateProduct } from '@/lib/services/productService';
import { SUPPORTED_LANGUAGES } from '@/lib/utils/constants';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureAccess } from '@/hooks/useRolePermissions';

const PAGE_SIZE = 20;

const detailTileStyle: React.CSSProperties = {
  padding: 12,
  background: 'var(--off-paper)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--hairline)',
};

export default function ProductsPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormatters();
  const { userData } = useAuth();
  const isSubAdmin = userData?.role === 'sub-admin';
  const { canEdit } = useFeatureAccess('featureProducts');
  const canManage = !isSubAdmin || canEdit;
  const p = t.admin.products;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProducts = async (reset: boolean = true) => {
    try {
      if (reset) {
        setLoading(true);
        lastDocRef.current = null;
      } else {
        setLoadingMore(true);
      }
      const result = await getProductsPaginated(PAGE_SIZE, reset ? null : lastDocRef.current);
      lastDocRef.current = result.lastDoc;
      setHasMore(result.hasMore);
      setProducts((prev) => (reset ? result.items : [...prev, ...result.items]));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : p.loadProductsError;
      toast.error(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(p.confirmDeleteFormat.replace('{name}', name))) return;

    try {
      await deleteProduct(id);
      toast.success(p.productDeleted);
      loadProducts();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : p.deleteProductError;
      toast.error(message);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateProduct(id, { active: !currentActive });
      toast.success(!currentActive ? p.productActivated : p.productDeactivated);
      loadProducts();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : p.updateProductError;
      toast.error(message);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="sc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="sc-spinner" style={{ margin: '0 auto' }} />
          <p className="sc-helper" style={{ margin: 0 }}>{p.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="sc-h1" style={{ margin: 0, marginBottom: 8 }}>{p.title}</h1>
          <p className="sc-helper" style={{ margin: 0 }}>{canManage ? p.subtitle : p.subtitleSubAdmin}</p>
        </div>
        {canManage && (
          <Link
            href="/admin/products/new"
            className="sc-cta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <Plus className="w-5 h-5" />
            {p.addProduct}
          </Link>
        )}
      </div>

      <div className="sc-card-static">
        <div style={{ position: 'relative' }}>
          <Search
            className="w-5 h-5"
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--soft)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder={p.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sc-input"
            style={{ paddingLeft: 44, width: '100%' }}
          />
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="sc-card-static" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <Package className="w-16 h-16" style={{ margin: '0 auto 16px', color: 'var(--soft)' }} />
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>{p.noProducts}</h3>
          <p className="sc-helper" style={{ marginBottom: 24 }}>
            {searchTerm ? p.tryDifferent : (canManage ? p.getStarted : '')}
          </p>
          {!searchTerm && canManage && (
            <Link
              href="/admin/products/new"
              className="sc-cta"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            >
              <Plus className="w-5 h-5" />
              {p.addFirst}
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="sc-card"
              onClick={() => setSelectedProduct(product)}
              style={{ cursor: 'pointer' }}
            >
              <div
                style={{
                  position: 'relative',
                  height: 192,
                  background: 'var(--off-paper)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                  overflow: 'hidden',
                }}
              >
                {product.images && product.images.length > 0 ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={product.images[0]}
                    alt={product.name.en}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package className="w-16 h-16" style={{ color: 'var(--soft)' }} />
                  </div>
                )}
                {product.featured && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      padding: '4px 12px',
                      background: 'var(--warn)',
                      color: '#000',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {p.featured}
                  </div>
                )}
                {!product.active && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      padding: '4px 12px',
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {p.inactive}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <h3
                    style={{
                      fontWeight: 600,
                      fontSize: 18,
                      marginBottom: 4,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {product.name.en}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      color: 'var(--soft)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {product.description.en}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--soft)' }}>{product.brand}</span>
                  <span
                    style={{
                      padding: '4px 8px',
                      background: 'var(--off-paper)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                      color: 'var(--ink)',
                    }}
                  >
                    {product.category}
                  </span>
                </div>

                <div>
                  <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand)', margin: 0 }}>
                    {formatCurrency(product.basePrice, product.currency)}
                  </p>
                  {product.variations && product.variations.length > 0 && (
                    <p style={{ fontSize: 12, color: 'var(--soft)', margin: '4px 0 0' }}>
                      {product.variations.length} {p.variations}
                    </p>
                  )}
                </div>

                {canManage && (
                  <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                    <Link
                      href={`/admin/products/${product.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        background: 'var(--off-paper)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'var(--ink)',
                        textDecoration: 'none',
                        border: '1px solid var(--hairline)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--off-paper)'; }}
                    >
                      <Edit className="w-4 h-4" />
                      {p.editButton}
                    </Link>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(product.id, product.active); }}
                      title={product.active ? p.deactivateTitle : p.activateTitle}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        border: 'none',
                        background: product.active ? 'var(--warn-tint)' : 'var(--brand-tint)',
                        color: product.active ? 'var(--warn)' : 'var(--brand)',
                        transition: 'opacity 0.15s ease',
                      }}
                    >
                      {product.active ? p.hide : p.show}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(product.id, product.name.en); }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 12px',
                        background: 'var(--off-paper)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--hairline)',
                        color: 'var(--soft)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--off-paper)';
                        e.currentTarget.style.color = 'var(--soft)';
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => loadProducts(false)}
            disabled={loadingMore}
            className="sc-cta-ghost"
            style={{ opacity: loadingMore ? 0.5 : 1 }}
          >
            {loadingMore ? t.common.loading : t.common.loadMore}
          </button>
        </div>
      )}

      {filteredProducts.length > 0 && (
        <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--soft)' }}>
          {p.showing} {filteredProducts.length} {p.products}{hasMore ? ` ${p.moreAvailable}` : ''}
        </div>
      )}

      {selectedProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="sc"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--paper)',
              width: '100%',
              maxWidth: 768,
              maxHeight: '90vh',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--hairline)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 24,
                borderBottom: '1px solid var(--hairline)',
                flexShrink: 0,
              }}
            >
              <h2 className="sc-h2" style={{ margin: 0, fontSize: 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedProduct.name.en}
              </h2>
              <button
                onClick={() => setSelectedProduct(null)}
                style={{
                  padding: 8,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                  {selectedProduct.images.map((img, idx) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={idx}
                      src={img}
                      alt={`${selectedProduct.name.en} ${idx + 1}`}
                      style={{
                        height: 192,
                        width: 'auto',
                        borderRadius: 'var(--radius-md)',
                        objectFit: 'cover',
                        border: '1px solid var(--hairline)',
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 12,
                    fontWeight: 600,
                    background: selectedProduct.active ? 'var(--brand-tint)' : 'rgba(239,68,68,0.15)',
                    color: selectedProduct.active ? 'var(--brand)' : '#ef4444',
                  }}
                >
                  {selectedProduct.active ? p.active : p.inactive}
                </span>
                {selectedProduct.featured && (
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 12,
                      fontWeight: 600,
                      background: 'var(--warn-tint)',
                      color: 'var(--warn)',
                    }}
                  >
                    {p.featured}
                  </span>
                )}
              </div>

              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--soft)', marginBottom: 8 }}>{p.modalProductName}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <div key={lang.code} style={detailTileStyle}>
                      <span style={{ fontSize: 12, color: 'var(--soft)' }}>{lang.flag} {lang.name}</span>
                      <p style={{ fontSize: 14, fontWeight: 500, marginTop: 4, color: 'var(--ink)' }}>{selectedProduct.name[lang.code] || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--soft)', marginBottom: 8 }}>{p.modalDescription}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <div key={lang.code} style={detailTileStyle}>
                      <span style={{ fontSize: 12, color: 'var(--soft)' }}>{lang.flag} {lang.name}</span>
                      <p style={{ fontSize: 14, marginTop: 4, color: 'var(--ink)' }}>{selectedProduct.description[lang.code] || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                <div style={detailTileStyle}>
                  <p style={{ fontSize: 12, color: 'var(--soft)', margin: 0 }}>{p.modalCategory}</p>
                  <p style={{ fontWeight: 500, margin: '4px 0 0', color: 'var(--ink)' }}>{selectedProduct.category}</p>
                </div>
                <div style={detailTileStyle}>
                  <p style={{ fontSize: 12, color: 'var(--soft)', margin: 0 }}>{p.modalBrand}</p>
                  <p style={{ fontWeight: 500, margin: '4px 0 0', color: 'var(--ink)' }}>{selectedProduct.brand}</p>
                </div>
                <div style={detailTileStyle}>
                  <p style={{ fontSize: 12, color: 'var(--soft)', margin: 0 }}>{p.modalBasePrice}</p>
                  <p style={{ fontWeight: 500, margin: '4px 0 0', color: 'var(--brand)' }}>
                    {formatCurrency(selectedProduct.basePrice, selectedProduct.currency)}
                  </p>
                </div>
                <div style={detailTileStyle}>
                  <p style={{ fontSize: 12, color: 'var(--soft)', margin: 0 }}>{p.modalCurrency}</p>
                  <p style={{ fontWeight: 500, margin: '4px 0 0', color: 'var(--ink)' }}>{selectedProduct.currency}</p>
                </div>
                <div style={detailTileStyle}>
                  <p style={{ fontSize: 12, color: 'var(--soft)', display: 'inline-flex', alignItems: 'center', gap: 4, margin: 0 }}>
                    <Clock className="w-3 h-3" /> {p.modalInstallationTime}
                  </p>
                  <p style={{ fontWeight: 500, margin: '4px 0 0', color: 'var(--ink)' }}>{selectedProduct.installationTime}h</p>
                </div>
              </div>

              {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--soft)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Tag className="w-4 h-4" /> {p.modalTags}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedProduct.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: '4px 12px',
                          background: 'var(--off-paper)',
                          border: '1px solid var(--hairline)',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'var(--ink)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--soft)', marginBottom: 8 }}>{p.modalSpecifications}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                    {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                      <div key={key} style={{ ...detailTileStyle, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 14, color: 'var(--soft)' }}>{key}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct.variations && selectedProduct.variations.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--soft)', marginBottom: 8 }}>
                    {p.modalVariations} ({selectedProduct.variations.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedProduct.variations.map((v) => (
                      <div
                        key={v.id}
                        style={{ ...detailTileStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <div>
                          <p style={{ fontWeight: 500, fontSize: 14, margin: 0, color: 'var(--ink)' }}>{v.name}</p>
                          <p style={{ fontSize: 12, color: 'var(--soft)', margin: '4px 0 0' }}>
                            {p.skuLabel}: {v.sku} | {p.stockLabel}: {v.stock}
                          </p>
                        </div>
                        <p style={{ fontWeight: 600, color: 'var(--brand)', margin: 0 }}>
                          {formatCurrency(v.price, selectedProduct.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct.maintenanceTemplate && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--soft)', marginBottom: 8 }}>{p.modalMaintenanceTemplate}</h3>
                  <div style={{ ...detailTileStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontSize: 14, margin: 0, color: 'var(--ink)' }}>
                      {p.modalEzerInterval}:{' '}
                      <span style={{ fontWeight: 500 }}>
                        {selectedProduct.maintenanceTemplate.ezerIntervalDays} {p.daysSuffix}
                      </span>
                    </p>
                    {selectedProduct.maintenanceTemplate.filters.length > 0 && (
                      <div>
                        <p style={{ fontSize: 12, color: 'var(--soft)', margin: '0 0 4px' }}>{p.modalFilters}:</p>
                        {selectedProduct.maintenanceTemplate.filters.map((f, idx) => (
                          <p key={idx} style={{ fontSize: 14, marginLeft: 8, margin: 0, color: 'var(--ink)' }}>
                            {f.name}: {p.everyDaysFormat.replace('{days}', String(f.intervalDays))}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {canManage && (
                <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
                  <Link
                    href={`/admin/products/${selectedProduct.id}`}
                    className="sc-cta"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}
                  >
                    <Edit className="w-4 h-4" />
                    {p.editProductCta}
                  </Link>
                  <button
                    onClick={() => {
                      handleToggleActive(selectedProduct.id, selectedProduct.active);
                      setSelectedProduct(null);
                    }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      background: selectedProduct.active ? 'var(--warn-tint)' : 'var(--brand-tint)',
                      color: selectedProduct.active ? 'var(--warn)' : 'var(--brand)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {selectedProduct.active ? p.hide : p.show}
                  </button>
                  <button
                    onClick={() => {
                      handleDelete(selectedProduct.id, selectedProduct.name.en);
                      setSelectedProduct(null);
                    }}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(239,68,68,0.15)',
                      color: '#ef4444',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
