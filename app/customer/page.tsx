'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product } from '@/types';
import { MultiLanguageText } from '@/types/product';
import { getActiveProducts, getAllProducts } from '@/lib/services/productService';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { useTranslation } from '@/hooks/useTranslation';
import UserProfileDropdown from '@/components/customer/UserProfileDropdown';
import NotificationBell from '@/components/common/NotificationBell';
import CustomerHistory from '@/components/customer/CustomerHistory';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

export default function CustomerHomePage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormatters();
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
    } catch {
      // Profile check failed silently
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const activeData = await getActiveProducts();
      if (activeData.length === 0) {
        const allData = await getAllProducts();
        setProducts(allData);
      } else {
        setProducts(activeData);
      }
    } catch {
      toast.error(t.customer.homeScreen.loadProductsError);
    } finally {
      setLoading(false);
    }
  };

  const getTranslation = (text: MultiLanguageText | undefined | null, lang?: string): string => {
    if (!text) return '';
    const language = lang || userData?.preferredLanguage || 'en';
    return text[language] || text.en || text.pt || text.es || text.ko || Object.values(text)[0] || '';
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = !searchTerm ||
      getTranslation(p.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getTranslation(p.description).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products.map((p) => p.category)));

  if (hasProfile === false) return null;

  return (
    <div className="sc">
      <header className="sc-nav">
        <div className="sc-nav-inner">
          <Image
            src="/selvacore-logo.png"
            alt="SelvaCore"
            width={200}
            height={36}
            className="sc-logo"
            priority
          />
          <div className="sc-nav-right">
            <Link href="/customer/devices" className="sc-nav-link sc-nav-link--text-only">
              <span className="sc-nav-text">{t.customer.myDevices}</span>
            </Link>
            <Link href="/customer/orders" className="sc-nav-link sc-nav-link--text-only">
              <span className="sc-nav-text">{t.customer.myOrders}</span>
            </Link>
            <NotificationBell />
            <UserProfileDropdown />
          </div>
        </div>
      </header>

      <main className="sc-main">
        <div>
          <div className="sc-eyebrow">{t.customer.portalLabel}</div>
          <h1 className="sc-h1">
            {t.customer.welcome}, {userData?.displayName?.split(' ')[0] || ''}
          </h1>
          <p className="sc-lede">{t.customer.browseProducts}</p>
        </div>

        <div className="sc-filters">
          <input
            type="text"
            className="sc-input"
            placeholder={t.customer.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="sc-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">{t.customer.allCategories}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="sc-spinner-wrap"><div className="sc-spinner" /></div>
        ) : (
          <>
            <div className="sc-grid">
              <div>
                {filteredProducts.length === 0 ? (
                  <div className="sc-empty">
                    <div className="sc-eyebrow">{t.customer.noResultsLabel}</div>
                    <h3 className="sc-card-title">{t.customer.noProductsFound}</h3>
                    <p className="sc-lede" style={{ marginTop: 8 }}>
                      {searchTerm || categoryFilter !== 'all'
                        ? t.customer.tryAdjustFilters
                        : t.customer.productsWillAppear}
                    </p>
                  </div>
                ) : (
                  <div className="sc-products">
                    {filteredProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/customer/products/${product.id}`}
                        className="sc-card"
                      >
                        <div className="sc-card-image">
                          {product.images && product.images.length > 0 ? (
                            <img src={product.images[0]} alt={getTranslation(product.name)} />
                          ) : (
                            <div className="sc-card-image-placeholder">No Image</div>
                          )}
                          {product.featured && (
                            <div className="sc-badge">{t.customer.featured}</div>
                          )}
                        </div>

                        <h3 className="sc-card-title">{getTranslation(product.name)}</h3>
                        <p className="sc-card-desc">{getTranslation(product.description)}</p>

                        <div className="sc-meta">
                          <span>{product.brand}</span>
                          <span className="sc-chip">{product.category}</span>
                        </div>

                        <div className="sc-price-row">
                          <div>
                            <p className="sc-price-label">{t.customer.startingFrom}</p>
                            <div className="sc-price">
                              {formatCurrency(product.basePrice, product.currency)}
                            </div>
                          </div>
                          {product.variations && product.variations.length > 0 && (
                            <span className="sc-options">
                              {product.variations.length} {t.customer.options}
                            </span>
                          )}
                        </div>

                        <div className="sc-cta">{t.customer.viewDetails} →</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <aside>
                {user && <CustomerHistory customerId={user.uid} limit={5} />}
              </aside>
            </div>

            {filteredProducts.length > 0 && (
              <div className="sc-summary">
                {t.customer.showing} {filteredProducts.length} {t.customer.of} {products.length} {t.customer.products}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
