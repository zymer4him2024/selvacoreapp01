'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, Eye, Package } from 'lucide-react';
import { Product } from '@/types';
import { getAllProducts, deleteProduct } from '@/lib/services/productService';
import { formatCurrency } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getAllProducts();
      setProducts(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteProduct(id);
      toast.success('Product deleted successfully');
      loadProducts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete product');
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
          <p className="text-text-secondary">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Products</h1>
          <p className="text-text-secondary">
            Manage your product catalog with variations
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all hover:scale-105 shadow-apple"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </Link>
      </div>

      {/* Search */}
      <div className="apple-card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search products by name, brand, or category..."
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
          <h3 className="text-xl font-semibold mb-2">No products found</h3>
          <p className="text-text-secondary mb-6">
            {searchTerm ? 'Try a different search term' : 'Get started by adding your first product'}
          </p>
          {!searchTerm && (
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all"
            >
              <Plus className="w-5 h-5" />
              Add First Product
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="apple-card group hover:scale-[1.02] transition-all"
            >
              {/* Product Image */}
              <div className="relative h-48 bg-surface-elevated rounded-apple mb-4 overflow-hidden">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name.en}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-text-tertiary" />
                  </div>
                )}
                {product.featured && (
                  <div className="absolute top-2 right-2 px-3 py-1 bg-warning text-black text-xs font-semibold rounded-full">
                    Featured
                  </div>
                )}
                {!product.active && (
                  <div className="absolute top-2 left-2 px-3 py-1 bg-error text-white text-xs font-semibold rounded-full">
                    Inactive
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
                        {product.variations.length} variation{product.variations.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-border">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface-elevated hover:bg-surface-secondary rounded-apple text-sm font-medium transition-all"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id, product.name.en)}
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

      {/* Summary */}
      {filteredProducts.length > 0 && (
        <div className="text-center text-sm text-text-tertiary">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      )}
    </div>
  );
}

