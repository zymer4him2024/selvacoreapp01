'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package as PackageIcon, Calendar, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Order, OrderStatus, Review } from '@/types';
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
    name: { en: string };
    variation: string;
    price: number;
    image: string;
  };
}
import { collection, query, where, orderBy as firestoreOrderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getOrderStatusLabel } from '@/lib/utils/formatters';
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
        installationDate: new Date(order.installationDate),
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-warning/20 text-warning border-warning/30',
      accepted: 'bg-primary/20 text-primary border-primary/30',
      in_progress: 'bg-secondary/20 text-secondary border-secondary/30',
      completed: 'bg-success/20 text-success border-success/30',
      cancelled: 'bg-error/20 text-error border-error/30',
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status: string) => getOrderStatusLabel(status, 'customer', t);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{t.customer.ordersListScreen.loading}</p>
        </div>
      </div>
    );
  }

  const lang = userData?.preferredLanguage || 'en';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10 backdrop-blur-lg bg-surface/80">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/customer')}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">{t.orders.backToProducts}</span>
            </button>
            <h1 className="text-2xl font-bold">{t.orders.title}</h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-6 animate-fade-in">
          {orders.length === 0 ? (
            <div className="apple-card text-center py-16">
              <PackageIcon className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
              <h3 className="text-xl font-semibold mb-2">{t.orders.noOrders}</h3>
              <p className="text-text-secondary mb-6">
                {t.customer.ordersListScreen.startBrowsing}
              </p>
              <button
                onClick={() => router.push('/customer')}
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all"
              >
                {t.orders.browseProducts}
              </button>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="apple-card text-center">
                  <p className="text-text-tertiary text-sm">{t.customer.ordersListScreen.totalOrders}</p>
                  <p className="text-2xl font-bold mt-1">{orders.length}</p>
                </div>
                <div className="apple-card text-center">
                  <p className="text-text-tertiary text-sm">{t.customer.ordersListScreen.pending}</p>
                  <p className="text-2xl font-bold mt-1 text-warning">
                    {orders.filter((o) => o.status === 'pending').length}
                  </p>
                </div>
                <div className="apple-card text-center">
                  <p className="text-text-tertiary text-sm">{t.customer.ordersListScreen.active}</p>
                  <p className="text-2xl font-bold mt-1 text-primary">
                    {orders.filter((o) => ['accepted', 'in_progress'].includes(o.status)).length}
                  </p>
                </div>
                <div className="apple-card text-center">
                  <p className="text-text-tertiary text-sm">{t.customer.ordersListScreen.completed}</p>
                  <p className="text-2xl font-bold mt-1 text-success">
                    {orders.filter((o) => o.status === 'completed').length}
                  </p>
                </div>
              </div>

              {/* Orders List */}
              <div className="space-y-4">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/customer/orders/${order.id}`}
                    className="apple-card hover:scale-[1.01] transition-all block"
                  >
                    <div className="flex items-start gap-4">
                      {/* Fallback Indicator */}
                      {'isFallback' in order && order.isFallback && (
                        <div className="absolute top-3 right-3 bg-warning/20 text-warning px-2 py-1 rounded-full text-xs font-medium">
                          {t.customer.ordersListScreen.local}
                        </div>
                      )}
                      
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-surface-elevated rounded-apple overflow-hidden flex-shrink-0">
                        {order.productSnapshot?.image ? (
                          <img
                            src={order.productSnapshot.image}
                            alt={order.productSnapshot.name?.en || 'Product'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PackageIcon className="w-8 h-8 text-text-tertiary" />
                          </div>
                        )}
                      </div>

                      {/* Order Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">
                              {order.productSnapshot?.name?.en || 'Product'}
                            </h3>
                            <p className="text-sm text-text-secondary">
                              {t.orders.orderNumber} {order.orderNumber}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary mt-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{order.installationDate ? formatDate(order.installationDate, 'short') : t.customer.ordersListScreen.tbd}</span>
                            <span className="px-2 py-0.5 bg-surface-elevated rounded text-xs">
                              {order.timeSlot}
                            </span>
                          </div>
                        </div>

                        {'technicianInfo' in order && order.technicianInfo && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-text-tertiary mb-1">{t.customer.ordersListScreen.technician}</p>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary">
                                  {order.technicianInfo.name.charAt(0)}
                                </span>
                              </div>
                              <span className="text-sm font-medium">{order.technicianInfo.name}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-4">
                          <p className="text-xl font-bold text-primary">
                            {'payment' in order && order.payment
                              ? formatCurrency(order.payment.amount, order.payment.currency)
                              : 'total' in order
                                ? formatCurrency(order.total, order.currency)
                                : 'N/A'
                            }
                          </p>
                          <span className="text-sm text-text-secondary">
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
                              className="mt-4 w-full min-h-[44px] px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-colors flex items-center justify-center gap-2"
                            >
                              <Star className="w-4 h-4" aria-hidden />
                              {t.orders.reviewFlow.leaveCta}
                            </button>
                          );
                        }
                        const within = isWithinEditWindow(review);
                        return (
                          <div className="mt-4 pt-4 border-t border-border">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex items-center gap-0.5" role="img" aria-label={`${review.rating}/5`}>
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <Star
                                      key={n}
                                      className={`w-4 h-4 ${n <= review.rating ? 'text-warning fill-warning' : 'text-text-tertiary'}`}
                                      aria-hidden
                                    />
                                  ))}
                                </div>
                                {review.comment && (
                                  <p className="text-sm text-text-secondary truncate min-w-0">
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
                                  className="text-sm font-medium text-primary hover:text-primary-hover whitespace-nowrap min-h-[44px] px-2"
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
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

