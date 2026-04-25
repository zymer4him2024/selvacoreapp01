'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, Eye, Package, X, Clock, Tag } from 'lucide-react';
import { Product } from '@/types';
import { getProductsPaginated, deleteProduct, updateProduct } from '@/lib/services/productService';
import { SUPPORTED_LANGUAGES } from '@/lib/utils/constants';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormatters();
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

  const handleToggleActive = async (id: string, currentActive: boolean, name: string) => {
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{p.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{p.title}</h1>
          <p className="text-text-secondary">
            {p.subtitle}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all hover:scale-105 shadow-apple"
        >
          <Plus className="w-5 h-5" />
          {p.addProduct}
        </Link>
      </div>

      {/* Search */}
      <div className="apple-card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder={p.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all text-text-primary placeholder:text-text-tertiary"
          />
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="apple-card text-center py-16">
          <Package className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <h3 className="text-xl font-semibold mb-2">{p.noProducts}</h3>
          <p className="text-text-secondary mb-6">
            {searchTerm ? p.tryDifferent : p.getStarted}
          </p>
          {!searchTerm && (
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all"
            >
              <Plus className="w-5 h-5" />
              {p.addFirst}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="apple-card group hover:scale-[1.02] transition-all cursor-pointer"
              onClick={() => setSelectedProduct(product)}
            >
              {/* Product Image */}
              <div className="relative h-48 bg-surface-elevated rounded-apple mb-4 overflow-hidden">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name.en}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-text-tertiary" />
                  </div>
                )}
                {product.featured && (
                  <div className="absolute top-2 right-2 px-3 py-1 bg-warning text-black text-xs font-semibold rounded-full">
                    {p.featured}
                  </div>
                )}
                {!product.active && (
                  <div className="absolute top-2 left-2 px-3 py-1 bg-error text-white text-xs font-semibold rounded-full">
                    {p.inactive}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                    {product.name.en}
                  </h3>
                  <p className="text-sm text-text-secondary line-clamp-2">
                    {product.description.en}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">{product.brand}</span>
                  <span className="px-2 py-1 bg-surface-elevated rounded text-xs">
                    {product.category}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(product.basePrice, product.currency)}
                    </p>
                    {product.variations && product.variations.length > 0 && (
                      <p className="text-xs text-text-tertiary">
                        {product.variations.length} {p.variations}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-border">
                  <Link
                    href={`/admin/products/${product.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface-elevated hover:bg-surface-secondary rounded-apple text-sm font-medium transition-all"
                  >
                    <Edit className="w-4 h-4" />
                    {p.editButton}
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(product.id, product.active, product.name.en); }}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-apple text-sm font-medium transition-all ${
                      product.active
                        ? 'bg-warning/20 hover:bg-warning/30 text-warning'
                        : 'bg-success/20 hover:bg-success/30 text-success'
                    }`}
                    title={product.active ? p.deactivateTitle : p.activateTitle}
                  >
                    {product.active ? p.hide : p.show}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(product.id, product.name.en); }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-surface-elevated hover:bg-error/20 hover:text-error rounded-apple text-sm font-medium transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => loadProducts(false)}
            disabled={loadingMore}
            className="px-8 py-3 bg-surface-elevated hover:bg-surface-secondary text-text-primary font-medium rounded-apple transition-all disabled:opacity-50"
          >
            {loadingMore ? t.common.loading : t.common.loadMore}
          </button>
        </div>
      )}

      {/* Summary */}
      {filteredProducts.length > 0 && (
        <div className="text-center text-sm text-text-tertiary">
          {p.showing} {filteredProducts.length} {p.products}{hasMore ? ` ${p.moreAvailable}` : ''}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-surface w-full max-w-3xl max-h-[90vh] rounded-apple shadow-apple-lg overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-2xl font-bold line-clamp-1">{selectedProduct.name.en}</h2>
              <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-surface-elevated rounded-apple transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6">
              {/* Images */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {selectedProduct.images.map((img, idx) => (
                    <img key={idx} src={img} alt={`${selectedProduct.name.en} ${idx + 1}`} className="h-48 w-auto rounded-apple object-cover border border-border flex-shrink-0" />
                  ))}
                </div>
              )}

              {/* Status Badges */}
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedProduct.active ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
                  {selectedProduct.active ? p.active : p.inactive}
                </span>
                {selectedProduct.featured && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-warning/20 text-warning">{p.featured}</span>
                )}
              </div>

              {/* Name in All Languages */}
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-2">{p.modalProductName}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <div key={lang.code} className="p-3 bg-surface-elevated rounded-apple">
                      <span className="text-xs text-text-tertiary">{lang.flag} {lang.name}</span>
                      <p className="text-sm font-medium mt-1">{selectedProduct.name[lang.code] || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description in All Languages */}
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-2">{p.modalDescription}</h3>
                <div className="space-y-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <div key={lang.code} className="p-3 bg-surface-elevated rounded-apple">
                      <span className="text-xs text-text-tertiary">{lang.flag} {lang.name}</span>
                      <p className="text-sm mt-1">{selectedProduct.description[lang.code] || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-surface-elevated rounded-apple">
                  <p className="text-xs text-text-tertiary">{p.modalCategory}</p>
                  <p className="font-medium mt-1">{selectedProduct.category}</p>
                </div>
                <div className="p-3 bg-surface-elevated rounded-apple">
                  <p className="text-xs text-text-tertiary">{p.modalBrand}</p>
                  <p className="font-medium mt-1">{selectedProduct.brand}</p>
                </div>
                <div className="p-3 bg-surface-elevated rounded-apple">
                  <p className="text-xs text-text-tertiary">{p.modalBasePrice}</p>
                  <p className="font-medium mt-1 text-primary">{formatCurrency(selectedProduct.basePrice, selectedProduct.currency)}</p>
                </div>
                <div className="p-3 bg-surface-elevated rounded-apple">
                  <p className="text-xs text-text-tertiary">{p.modalCurrency}</p>
                  <p className="font-medium mt-1">{selectedProduct.currency}</p>
                </div>
                <div className="p-3 bg-surface-elevated rounded-apple">
                  <p className="text-xs text-text-tertiary flex items-center gap-1"><Clock className="w-3 h-3" /> {p.modalInstallationTime}</p>
                  <p className="font-medium mt-1">{selectedProduct.installationTime}h</p>
                </div>
              </div>

              {/* Tags */}
              {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-1"><Tag className="w-4 h-4" /> {p.modalTags}</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-surface-elevated rounded-full text-xs font-medium">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Specifications */}
              {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-2">{p.modalSpecifications}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between p-3 bg-surface-elevated rounded-apple">
                        <span className="text-sm text-text-secondary">{key}</span>
                        <span className="text-sm font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Variations */}
              {selectedProduct.variations && selectedProduct.variations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-2">{p.modalVariations} ({selectedProduct.variations.length})</h3>
                  <div className="space-y-2">
                    {selectedProduct.variations.map((v) => (
                      <div key={v.id} className="p-3 bg-surface-elevated rounded-apple flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{v.name}</p>
                          <p className="text-xs text-text-tertiary">{p.skuLabel}: {v.sku} | {p.stockLabel}: {v.stock}</p>
                        </div>
                        <p className="font-semibold text-primary">{formatCurrency(v.price, selectedProduct.currency)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Maintenance Template */}
              {selectedProduct.maintenanceTemplate && (
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-2">{p.modalMaintenanceTemplate}</h3>
                  <div className="p-3 bg-surface-elevated rounded-apple space-y-2">
                    <p className="text-sm">{p.modalEzerInterval}: <span className="font-medium">{selectedProduct.maintenanceTemplate.ezerIntervalDays} {p.daysSuffix}</span></p>
                    {selectedProduct.maintenanceTemplate.filters.length > 0 && (
                      <div>
                        <p className="text-xs text-text-tertiary mb-1">{p.modalFilters}:</p>
                        {selectedProduct.maintenanceTemplate.filters.map((f, idx) => (
                          <p key={idx} className="text-sm ml-2">{f.name}: {p.everyDaysFormat.replace('{days}', String(f.intervalDays))}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Link
                  href={`/admin/products/${selectedProduct.id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all"
                >
                  <Edit className="w-4 h-4" />
                  {p.editProductCta}
                </Link>
                <button
                  onClick={() => { handleToggleActive(selectedProduct.id, selectedProduct.active, selectedProduct.name.en); setSelectedProduct(null); }}
                  className={`px-4 py-3 rounded-apple font-semibold transition-all ${selectedProduct.active ? 'bg-warning/20 hover:bg-warning/30 text-warning' : 'bg-success/20 hover:bg-success/30 text-success'}`}
                >
                  {selectedProduct.active ? p.hide : p.show}
                </button>
                <button
                  onClick={() => { handleDelete(selectedProduct.id, selectedProduct.name.en); setSelectedProduct(null); }}
                  className="px-4 py-3 bg-error/20 hover:bg-error/30 text-error rounded-apple font-semibold transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

