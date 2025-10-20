'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Package, Search, ShoppingCart, Filter } from 'lucide-react';
import { Product } from '@/types';
import { getActiveProducts, getAllProducts } from '@/lib/services/productService';
import { formatCurrency } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function CustomerHomePage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    checkProfile();
    loadProducts();
  }, [user]);

  const checkProfile = async () => {
    if (!user) return;

    try {
      const customerDoc = await getDoc(doc(db, 'customers', user.uid));
      if (!customerDoc.exists()) {
        router.push('/customer/register');
      } else {
        setHasProfile(true);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading products...');
      
      // First try to get active products
      const activeData = await getActiveProducts();
      console.log('📦 Active products found:', activeData.length);
      console.log('📋 Active products data:', activeData);
      
      // If no active products, get all products for debugging
      if (activeData.length === 0) {
        console.log('⚠️ No active products found, checking all products...');
        const allData = await getAllProducts();
        console.log('📦 All products found:', allData.length);
        console.log('📋 All products data:', allData);
        
        // Show all products if no active ones (for debugging)
        setProducts(allData);
      } else {
        setProducts(activeData);
      }
    } catch (error: any) {
      console.error('❌ Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products.map((p) => p.category)));

  if (hasProfile === false) {
    return null; // Redirecting to registration
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10 backdrop-blur-lg bg-surface/80">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Selvacore
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Professional Installation Services
              </p>
            </div>
            <Link
              href="/customer/orders"
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-apple transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline">My Orders</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-8 animate-fade-in">
          {/* Welcome Message */}
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Welcome back, {userData?.displayName?.split(' ')[0]}! 👋
            </h2>
            <p className="text-text-secondary">
              Browse our products and schedule your installation
            </p>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none transition-all appearance-none"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="apple-card text-center py-16">
              <Package className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
              <h3 className="text-xl font-semibold mb-2">No products found</h3>
              <p className="text-text-secondary">
                {searchTerm || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Products will appear here soon'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/customer/products/${product.id}`}
                  className="apple-card group hover:scale-[1.02] transition-all cursor-pointer"
                >
                  {/* Product Image */}
                  <div className="relative h-48 bg-surface-elevated rounded-apple mb-4 overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name[userData?.preferredLanguage || 'en']}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-16 h-16 text-text-tertiary" />
                      </div>
                    )}
                    {product.featured && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-warning text-black text-xs font-bold rounded-full">
                        ⭐ Featured
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                        {product.name[userData?.preferredLanguage || 'en']}
                      </h3>
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {product.description[userData?.preferredLanguage || 'en']}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-tertiary">{product.brand}</span>
                      <span className="px-2 py-1 bg-surface-elevated rounded text-xs">
                        {product.category}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-text-tertiary">Starting from</p>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(product.basePrice, product.currency)}
                          </p>
                        </div>
                        {product.variations && product.variations.length > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-text-tertiary">{product.variations.length} options</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary rounded-apple font-medium group-hover:bg-primary group-hover:text-white transition-all">
                      View Details
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </Link>
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
      </div>
    </div>
  );
}

