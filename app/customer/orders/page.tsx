'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package as PackageIcon, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Order, OrderStatus } from '@/types';

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
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { getFallbackOrders } from '@/lib/services/fallbackOrderService';
import toast from 'react-hot-toast';

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [orders, setOrders] = useState<(Order | FallbackOrderDisplay)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) {
      console.log('❌ ORDERS DEBUG - No user, cannot load orders');
      return;
    }

    console.log('🔄 ORDERS DEBUG - Starting to load orders for user:', user.uid);

    try {
      setLoading(true);
      
      // Try to load from Firestore
      let firestoreOrders: Order[] = [];
      try {
        console.log('🔥 ORDERS DEBUG - Attempting to load from Firestore...');
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
        
        console.log('✅ ORDERS DEBUG - Loaded orders from Firestore:', firestoreOrders.length);
        console.log('📋 ORDERS DEBUG - Firestore orders:', firestoreOrders);
      } catch (firestoreError: any) {
        console.error('❌ ORDERS DEBUG - Failed to load orders from Firestore:', firestoreError);
        console.warn('⚠️ ORDERS DEBUG - Firestore error details:', {
          message: firestoreError.message,
          code: firestoreError.code,
          stack: firestoreError.stack
        });
      }
      
      // Load fallback orders
      console.log('💾 ORDERS DEBUG - Loading fallback orders...');
      const fallbackOrders = getFallbackOrders(user.uid);
      console.log('✅ ORDERS DEBUG - Loaded fallback orders:', fallbackOrders.length);
      console.log('📋 ORDERS DEBUG - Fallback orders:', fallbackOrders);
      
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
      console.log('🔄 ORDERS DEBUG - Combining orders...');
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
            dateA = new Date(a.createdAt as string | number);
          } else {
            dateA = new Date(0); // Fallback to epoch
          }
          
          if (b.createdAt instanceof Date) {
            dateB = b.createdAt;
          } else if (b.createdAt && typeof b.createdAt.toDate === 'function') {
            dateB = b.createdAt.toDate();
          } else if (b.createdAt) {
            // Handle string or number timestamps
            dateB = new Date(b.createdAt as string | number);
          } else {
            dateB = new Date(0); // Fallback to epoch
          }
          
          return dateB.getTime() - dateA.getTime();
        });
      
      console.log('📋 ORDERS DEBUG - Final combined orders:', allOrders.length);
      console.log('📋 ORDERS DEBUG - All orders details:', allOrders);
      setOrders(allOrders);
      
      if (fallbackOrders.length > 0) {
        console.log('💾 ORDERS DEBUG - Showing fallback orders notification');
        toast.success(`${fallbackOrders.length} orders saved locally. Will sync when possible.`);
      }
      
      console.log('✅ ORDERS DEBUG - Orders loading completed successfully');
      
    } catch (error: any) {
      console.error('❌ ORDERS DEBUG - Failed to load orders:', error);
      console.error('❌ ORDERS DEBUG - Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error('Failed to load orders');
    } finally {
      console.log('🏁 ORDERS DEBUG - Setting loading to false');
      setLoading(false);
    }
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '⏳ Waiting for Installer',
      accepted: '✅ Accepted',
      in_progress: '🔧 In Progress',
      completed: '🎉 Completed',
      cancelled: '❌ Cancelled',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading your orders...</p>
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
              <span className="hidden sm:inline">Back to Products</span>
            </button>
            <h1 className="text-2xl font-bold">My Orders</h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-6 animate-fade-in">
          {orders.length === 0 ? (
            <div className="apple-card text-center py-16">
              <PackageIcon className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
              <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
              <p className="text-text-secondary mb-6">
                Start by browsing our products
              </p>
              <button
                onClick={() => router.push('/customer')}
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="apple-card text-center">
                  <p className="text-text-tertiary text-sm">Total Orders</p>
                  <p className="text-2xl font-bold mt-1">{orders.length}</p>
                </div>
                <div className="apple-card text-center">
                  <p className="text-text-tertiary text-sm">Pending</p>
                  <p className="text-2xl font-bold mt-1 text-warning">
                    {orders.filter((o) => o.status === 'pending').length}
                  </p>
                </div>
                <div className="apple-card text-center">
                  <p className="text-text-tertiary text-sm">Active</p>
                  <p className="text-2xl font-bold mt-1 text-primary">
                    {orders.filter((o) => ['accepted', 'in_progress'].includes(o.status)).length}
                  </p>
                </div>
                <div className="apple-card text-center">
                  <p className="text-text-tertiary text-sm">Completed</p>
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
                          Local
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
                              Order {order.orderNumber}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary mt-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{order.installationDate ? formatDate(order.installationDate, 'short') : 'TBD'}</span>
                            <span className="px-2 py-0.5 bg-surface-elevated rounded text-xs">
                              {order.timeSlot}
                            </span>
                          </div>
                        </div>

                        {'technicianInfo' in order && order.technicianInfo && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-text-tertiary mb-1">Technician</p>
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
                            View Details →
                          </span>
                        </div>
                      </div>
                    </div>
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

