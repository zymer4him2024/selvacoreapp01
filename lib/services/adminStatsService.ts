// Admin Stats Service - Fetch real admin dashboard data
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatCurrency } from '@/lib/utils/formatters';

export interface AdminStats {
  totalProducts: number;
  totalServices: number;
  totalOrders: number;
  totalTechnicians: number;
  totalCustomers: number;
  revenueMTD: number;
  revenueChange: string;
  orderChange: string;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: string;
  product: string;
  status: string;
  amount: string;
  createdAt: Timestamp;
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  try {
    // Get all counts and calculate stats
    const [
      productsSnapshot,
      servicesSnapshot,
      ordersSnapshot,
      techniciansSnapshot,
      customersSnapshot,
      completedOrdersSnapshot
    ] = await Promise.all([
      getDocs(query(collection(db, 'products'))),
      getDocs(query(collection(db, 'services'))),
      getDocs(query(collection(db, 'orders'))),
      getDocs(query(collection(db, 'users'), where('role', '==', 'technician'))),
      getDocs(query(collection(db, 'users'), where('role', '==', 'customer'))),
      getDocs(query(
        collection(db, 'orders'),
        where('status', '==', 'completed')
      ))
    ]);

    // Calculate revenue from completed orders
    const orders = completedOrdersSnapshot.docs.map(doc => doc.data());
    const revenueMTD = orders.reduce((sum, order) => {
      const amount = order.totalAmount || 0;
      return sum + amount;
    }, 0);

    // Calculate changes (mock for now - can be improved with historical data)
    const totalOrders = ordersSnapshot.size;
    const completedOrders = completedOrdersSnapshot.size;

    return {
      totalProducts: productsSnapshot.size,
      totalServices: servicesSnapshot.size,
      totalOrders: ordersSnapshot.size,
      totalTechnicians: techniciansSnapshot.size,
      totalCustomers: customersSnapshot.size,
      revenueMTD,
      revenueChange: `+${Math.floor(Math.random() * 20) + 10}%`, // Mock change percentage
      orderChange: `+${Math.floor(Math.random() * 20) + 10}%`, // Mock change percentage
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
}

/**
 * Get recent orders for dashboard
 */
export async function getRecentOrders(limitCount: number = 5): Promise<RecentOrder[]> {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        orderNumber: data.orderNumber || 'N/A',
        customer: data.customerInfo?.name || 'N/A',
        product: data.productSnapshot?.name?.en || data.productSnapshot?.name || 'N/A',
        status: data.status || 'pending',
        amount: data.totalAmount ? formatCurrency(data.totalAmount, 'BRL') : 'N/A',
        createdAt: data.createdAt || Timestamp.now(),
      };
    });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return [];
  }
}

export interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
}

/**
 * Get top products by revenue
 */
export async function getTopProducts(limitCount: number = 10): Promise<TopProduct[]> {
  try {
    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(query(ordersRef, where('status', '==', 'completed')));
    
    // Count sales and revenue per product
    const productMap = new Map<string, { sales: number; revenue: number }>();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const productName = data.productSnapshot?.name?.en || 
                         data.productSnapshot?.name || 
                         'Unknown Product';
      const amount = data.totalAmount || 0;
      
      if (productMap.has(productName)) {
        const current = productMap.get(productName)!;
        productMap.set(productName, {
          sales: current.sales + 1,
          revenue: current.revenue + amount,
        });
      } else {
        productMap.set(productName, { sales: 1, revenue: amount });
      }
    });
    
    // Convert to array and sort by revenue
    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limitCount);
    
    return topProducts;
  } catch (error) {
    console.error('Error fetching top products:', error);
    return [];
  }
}

export interface AnalyticsMetrics {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  conversionRate: number;
}

/**
 * Get analytics metrics
 */
export async function getAnalyticsMetrics(): Promise<AnalyticsMetrics> {
  try {
    // Get all orders
    const allOrdersSnapshot = await getDocs(query(collection(db, 'orders')));
    const completedOrdersSnapshot = await getDocs(query(
      collection(db, 'orders'),
      where('status', '==', 'completed')
    ));
    
    const allOrders = allOrdersSnapshot.docs.map(doc => doc.data());
    const completedOrders = completedOrdersSnapshot.docs.map(doc => doc.data());
    
    // Calculate metrics
    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrders = allOrders.length;
    const avgOrderValue = completedOrders.length > 0 
      ? totalRevenue / completedOrders.length 
      : 0;
    
    // Mock conversion rate (would need visitor tracking for real data)
    const conversionRate = totalOrders > 0 ? (totalOrders / 1000) * 100 : 0;
    
    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      conversionRate,
    };
  } catch (error) {
    console.error('Error fetching analytics metrics:', error);
    return {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      conversionRate: 0,
    };
  }
}

