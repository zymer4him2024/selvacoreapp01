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
import { useTranslation } from '@/hooks/useTranslation';
import UserProfileDropdown from '@/components/customer/UserProfileDropdown';
import CustomerHistory from '@/components/customer/CustomerHistory';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function CustomerHomePage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { t } = useTranslation();
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
      
      // Debug: Log the products that were set
      console.log('✅ Products set in state:', activeData.length > 0 ? activeData : activeData);
    } catch (error: any) {
      console.error('❌ Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      console.log('🔍 LOADING COMPLETE - Setting loading to false');
      setLoading(false);
    }
  };

  // Helper function to get translated text safely
  const getTranslation = (text: any, lang?: string): string => {
    if (!text) return '';
    const language = lang || userData?.preferredLanguage || 'en';
    // Try requested language, fallback to English, then any available language
    return text[language] || text.en || text.pt || text.es || text.ko || Object.values(text)[0] || '';
  };

  // TEMPORARY FIX: Show all products without filtering
  const filteredProducts = products;
  
  console.log('🔍 TEMP DEBUG - Products loaded:', products.length);
  console.log('🔍 TEMP DEBUG - Products data:', products);
  console.log('🔍 TEMP DEBUG - Will show products:', filteredProducts.length);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  if (hasProfile === false) {
    return null; // Redirecting to registration
  }

  console.log('🔍 RENDER STATE DEBUG - loading:', loading, 'hasProfile:', hasProfile, 'products.length:', products.length);
  
  if (loading) {
    console.log('🔍 SHOWING LOADING STATE');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{t.common.loading}</p>
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
            <div className="flex items-center gap-3">
              <Link
                href="/customer/orders"
                className="flex items-center gap-2 px-4 py-2 hover:bg-surface-elevated rounded-apple transition-all"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden sm:inline">{t.customer.myOrders}</span>
              </Link>
              <UserProfileDropdown />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-8 animate-fade-in">
          {/* Welcome Message */}
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {t.customer.welcome}, {userData?.displayName?.split(' ')[0]}! 👋
            </h2>
            <p className="text-text-secondary">
              {t.customer.browseProducts}
            </p>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <input
                type="text"
                placeholder={t.customer.searchPlaceholder}
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
                <option value="all">{t.customer.allCategories}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer History and Products */}
          {user && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {/* Products Grid */}
                {console.log('🔍 RENDER DEBUG - filteredProducts.length:', filteredProducts.length)}
                
                {/* SIMPLE TEST: Show products directly without any logic */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-4">🔧 DIRECT PRODUCT TEST</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product, index) => (
                      <div key={product.id || index} className="apple-card p-4 bg-surface border border-border">
                        <h3 className="font-bold text-lg mb-2">
                          Product {index + 1}: {product.name?.en || product.name || 'No Name'}
                        </h3>
                        <p className="text-sm text-text-secondary mb-2">
                          Brand: {product.brand || 'No Brand'}
                        </p>
                        <p className="text-sm text-text-secondary mb-2">
                          Category: {product.category || 'No Category'}
                        </p>
                        <p className="text-sm text-text-secondary">
                          Price: {product.basePrice || 'No Price'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {filteredProducts.length === 0 ? (
                  <div className="apple-card text-center py-16">
                    <Package className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
                    <h3 className="text-xl font-semibold mb-2">{t.customer.noProductsFound}</h3>
                    <p className="text-text-secondary">
                      {searchTerm || categoryFilter !== 'all'
                        ? t.customer.tryAdjustFilters
                        : t.customer.productsWillAppear}
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
                              alt={getTranslation(product.name)}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-16 h-16 text-text-tertiary" />
                            </div>
                          )}
                          {product.featured && (
                            <div className="absolute top-3 right-3 px-3 py-1 bg-warning text-black text-xs font-bold rounded-full">
                              ⭐ {t.customer.featured}
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                              {getTranslation(product.name)}
                            </h3>
                            <p className="text-sm text-text-secondary line-clamp-2">
                              {getTranslation(product.description)}
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
                                <p className="text-sm text-text-tertiary">{t.customer.startingFrom}</p>
                                <p className="text-2xl font-bold text-primary">
                                  {formatCurrency(product.basePrice, product.currency)}
                                </p>
                              </div>
                              {product.variations && product.variations.length > 0 && (
                                <div className="text-right">
                                  <p className="text-xs text-text-tertiary">{product.variations.length} {t.customer.options}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary rounded-apple font-medium group-hover:bg-primary group-hover:text-white transition-all">
                            {t.customer.viewDetails}
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="lg:col-span-1">
                <CustomerHistory customerId={user.uid} limit={5} />
              </div>
            </div>
          )}

          {/* Summary */}
          {filteredProducts.length > 0 && (
            <div className="text-center text-sm text-text-tertiary">
              {t.customer.showing} {filteredProducts.length} {t.customer.of} {products.length} {t.customer.products}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

