'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package as PackageIcon, Calendar, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Order, OrderStatus, Review } from '@/types';
import { MultiLanguageText } from '@/types/product';
import { getReviewForOrder } from '@/lib/services/reviewService';

// Simple display type for fallback orders
interface FallbackOrderDisplay {
  id: string;
  orderNumber: string;
  customerId: string;
  total: number;
  currency: string;
  status: OrderStatus;
  createdAt: Date;
  isFallback: boolean;
  installationDate?: Date;
  timeSlot?: string;
  productSnapshot?: {
    name: Partial<MultiLanguageText>;
    variation: string;
    price: number;
    image: string;
  };
}
import { collection, query, where, orderBy as firestoreOrderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getOrderStatusLabel, parseLocalDate } from '@/lib/utils/formatters';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { getFallbackOrders } from '@/lib/services/fallbackOrderService';
import toast from 'react-hot-toast';

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useLocaleFormatters();
  const [orders, setOrders] = useState<(Order | FallbackOrderDisplay)[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Record<string, Review>>({});

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);

      // Try to load from Firestore
      let firestoreOrders: Order[] = [];
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef,
          where('customerId', '==', user.uid),
          firestoreOrderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);

        firestoreOrders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Order));
      } catch (firestoreError: unknown) {
        // Firestore loading failed, will use fallback orders
      }

      // Load fallback orders
      const fallbackOrders = getFallbackOrders(user.uid);
      
      // Convert fallback orders to display format
      const convertedFallbackOrders: FallbackOrderDisplay[] = fallbackOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        total: order.total,
        currency: order.currency,
        status: order.status as OrderStatus,
        createdAt: order.createdAt,
        isFallback: true,
        installationDate: parseLocalDate(order.installationDate),
        timeSlot: order.timeSlot,
        // Add minimal product info for display
        productSnapshot: {
          name: { en: 'Product' },
          variation: '',
          price: order.total,
          image: ''
        }
      }));
      
      // Combine and sort orders
      const allOrders = [...firestoreOrders, ...convertedFallbackOrders]
        .sort((a, b) => {
          // Handle both Date objects and Firestore Timestamps
          let dateA: Date;
          let dateB: Date;
          
          if (a.createdAt instanceof Date) {
            dateA = a.createdAt;
          } else if (a.createdAt && typeof a.createdAt.toDate === 'function') {
            dateA = a.createdAt.toDate();
          } else if (a.createdAt) {
            // Handle string or number timestamps
            dateA = new Date(a.createdAt as unknown as string | number);
          } else {
            dateA = new Date(0); // Fallback to epoch
          }
          
          if (b.createdAt instanceof Date) {
            dateB = b.createdAt;
          } else if (b.createdAt && typeof b.createdAt.toDate === 'function') {
            dateB = b.createdAt.toDate();
          } else if (b.createdAt) {
            // Handle string or number timestamps
            dateB = new Date(b.createdAt as unknown as string | number);
          } else {
            dateB = new Date(0); // Fallback to epoch
          }
          
          return dateB.getTime() - dateA.getTime();
        });
      
      setOrders(allOrders);

      if (fallbackOrders.length > 0) {
        toast.success(`${fallbackOrders.length} ${t.customer.ordersListScreen.savedLocally}`);
      }

      // Load reviews for completed Firestore orders (O(1) doc read each — review ID = order ID)
      const completedOrderIds = firestoreOrders
        .filter((o) => o.status === 'completed')
        .map((o) => o.id);
      if (completedOrderIds.length > 0) {
        const results = await Promise.all(
          completedOrderIds.map(async (id) => [id, await getReviewForOrder(id)] as const)
        );
        const map: Record<string, Review> = {};
        for (const [id, review] of results) {
          if (review) map[id] = review;
        }
        setReviews(map);
      }
    } catch (error: unknown) {
      toast.error(t.customer.ordersListScreen.loadError);
    } finally {
      setLoading(false);
    }
  };

  const isWithinEditWindow = (review: Review) => {
    const until = review.editableUntil?.toDate?.();
    return until ? until.getTime() > Date.now() : false;
  };

  const getStatusBadge = (status: string): { color: string; bg: string } => {
    switch (status) {
      case 'pending': return { color: 'var(--warn)', bg: 'var(--warn-tint)' };
      case 'accepted': return { color: 'var(--brand)', bg: 'var(--brand-tint)' };
      case 'in_progress': return { color: 'var(--brand)', bg: 'var(--brand-tint)' };
      case 'completed': return { color: 'var(--brand)', bg: 'var(--brand-tint)' };
      case 'cancelled': return { color: 'var(--warn)', bg: 'var(--warn-tint)' };
      default: return { color: 'var(--soft)', bg: 'var(--off-paper)' };
    }
  };

  const getStatusLabel = (status: string) => getOrderStatusLabel(status, 'customer', t);

  const lang = userData?.preferredLanguage || 'en';
  const productName = (name: Partial<MultiLanguageText> | undefined | null): string => {
    if (!name) return t.customer.ordersListScreen.productFallback;
    return name[lang] || name.en || name.pt || name.es || name.ko || Object.values(name)[0] || t.customer.ordersListScreen.productFallback;
  };

  if (loading) {
    return (
      <div className="sc">
        <div className="sc-spinner-wrap"><div className="sc-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="sc">
      <header className="sc-nav">
        <div className="sc-nav-inner">
          <button
            type="button"
            onClick={() => router.push('/customer')}
            className="sc-nav-link"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="sc-nav-text">{t.orders.backToProducts}</span>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>{t.orders.title}</h1>
          <div style={{ width: 80 }} />
        </div>
      </header>

      <main className="sc-main">
        {orders.length === 0 ? (
          <div className="sc-empty">
            <PackageIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--soft)' }} />
            <h3 className="sc-h2" style={{ marginBottom: 8 }}>{t.orders.noOrders}</h3>
            <p className="sc-lede" style={{ marginBottom: 24 }}>{t.customer.ordersListScreen.startBrowsing}</p>
            <button
              type="button"
              onClick={() => router.push('/customer')}
              className="sc-cta"
              style={{ display: 'inline-block' }}
            >
              {t.orders.browseProducts}
            </button>
          </div>
        ) : (
          <div className="sc-stack-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="sc-card-static" style={{ textAlign: 'center' }}>
                <p className="sc-helper" style={{ margin: 0 }}>{t.customer.ordersListScreen.totalOrders}</p>
                <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--ink)' }}>{orders.length}</p>
              </div>
              <div className="sc-card-static" style={{ textAlign: 'center' }}>
                <p className="sc-helper" style={{ margin: 0 }}>{t.customer.ordersListScreen.pending}</p>
                <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--warn)' }}>
                  {orders.filter((o) => o.status === 'pending').length}
                </p>
              </div>
              <div className="sc-card-static" style={{ textAlign: 'center' }}>
                <p className="sc-helper" style={{ margin: 0 }}>{t.customer.ordersListScreen.active}</p>
                <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--brand)' }}>
                  {orders.filter((o) => ['accepted', 'in_progress'].includes(o.status)).length}
                </p>
              </div>
              <div className="sc-card-static" style={{ textAlign: 'center' }}>
                <p className="sc-helper" style={{ margin: 0 }}>{t.customer.ordersListScreen.completed}</p>
                <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--brand)' }}>
                  {orders.filter((o) => o.status === 'completed').length}
                </p>
              </div>
            </div>

            <div className="sc-stack">
              {orders.map((order) => {
                const badge = getStatusBadge(order.status);
                return (
                  <Link
                    key={order.id}
                    href={`/customer/orders/${order.id}`}
                    className="sc-card"
                    style={{ position: 'relative' }}
                  >
                    <div className="sc-row" style={{ alignItems: 'flex-start', gap: 16 }}>
                      {'isFallback' in order && order.isFallback && (
                        <div className="sc-badge-inline" style={{ position: 'absolute', top: 12, right: 12, color: 'var(--warn)', background: 'var(--warn-tint)' }}>
                          {t.customer.ordersListScreen.local}
                        </div>
                      )}

                      <div
                        style={{
                          width: 80,
                          height: 80,
                          background: 'var(--off-paper)',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {order.productSnapshot?.image ? (
                          <img
                            src={order.productSnapshot.image}
                            alt={productName(order.productSnapshot.name)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <PackageIcon className="w-8 h-8" style={{ color: 'var(--soft)' }} />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="sc-row-between" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <h3 className="sc-card-title">
                              {productName(order.productSnapshot?.name)}
                            </h3>
                            <p className="sc-helper" style={{ margin: 0 }}>
                              {t.orders.orderNumber} {order.orderNumber}
                            </p>
                          </div>
                          <span className="sc-badge-inline" style={{ color: badge.color, background: badge.bg }}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>

                        <div className="sc-row" style={{ gap: 8, fontSize: 13, color: 'var(--soft)', marginTop: 8, flexWrap: 'wrap' }}>
                          <Calendar className="w-4 h-4" />
                          <span>{order.installationDate ? formatDate(order.installationDate, 'short') : t.customer.ordersListScreen.tbd}</span>
                          {order.timeSlot && (
                            <span className="sc-chip">{order.timeSlot}</span>
                          )}
                        </div>

                        {'technicianInfo' in order && order.technicianInfo && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                            <p className="sc-helper" style={{ margin: '0 0 4px' }}>{t.customer.ordersListScreen.technician}</p>
                            <div className="sc-row" style={{ gap: 8 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)' }}>
                                  {order.technicianInfo.name.charAt(0)}
                                </span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{order.technicianInfo.name}</span>
                            </div>
                          </div>
                        )}

                        <div className="sc-row-between" style={{ marginTop: 16 }}>
                          <p className="sc-price" style={{ fontSize: 20, margin: 0 }}>
                            {'payment' in order && order.payment
                              ? formatCurrency(order.payment.amount, order.payment.currency)
                              : 'total' in order
                                ? formatCurrency(order.total, order.currency)
                                : 'N/A'
                            }
                          </p>
                          <span className="sc-helper" style={{ margin: 0 }}>
                            {t.customer.viewDetails} →
                          </span>
                        </div>
                      </div>
                    </div>

                    {order.status === 'completed' && !('isFallback' in order && order.isFallback) && (
                      (() => {
                        const review = reviews[order.id];
                        if (!review) {
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/customer/orders/${order.id}/review`);
                              }}
                              className="sc-cta"
                              style={{ marginTop: 16, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                              <Star className="w-4 h-4" aria-hidden />
                              {t.orders.reviewFlow.leaveCta}
                            </button>
                          );
                        }
                        const within = isWithinEditWindow(review);
                        return (
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
                            <div className="sc-row-between" style={{ gap: 12 }}>
                              <div className="sc-row" style={{ gap: 8, minWidth: 0 }}>
                                <div className="sc-row" style={{ gap: 2 }} role="img" aria-label={`${review.rating}/5`}>
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <Star
                                      key={n}
                                      className="w-4 h-4"
                                      style={{
                                        color: n <= review.rating ? 'var(--warn)' : 'var(--soft)',
                                        fill: n <= review.rating ? 'var(--warn)' : 'transparent',
                                      }}
                                      aria-hidden
                                    />
                                  ))}
                                </div>
                                {review.comment && (
                                  <p className="sc-helper" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {review.comment}
                                  </p>
                                )}
                              </div>
                              {within && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    router.push(`/customer/orders/${order.id}/review`);
                                  }}
                                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)', background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                >
                                  {t.orders.reviewFlow.edit}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

