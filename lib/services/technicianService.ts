// Technician Service - Handle all technician operations
import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { Order, OrderStatus } from '@/types/order';
import { v4 as uuidv4 } from 'uuid';

export interface TechnicianInfo {
  name: string;
  phone: string;
  whatsapp: string;
  photo: string;
  rating: number;
}

export interface TechnicianStats {
  totalJobs: number;
  completedJobs: number;
  inProgressJobs: number;
  upcomingJobs: number;
  totalEarnings: number;
  averageRating: number;
  completionRate: number;
}

/**
 * Get all available jobs (pending orders)
 */
export async function getAvailableJobs(): Promise<Order[]> {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Order));
}

/**
 * Accept a job (uses Firestore transaction to prevent race conditions)
 */
export async function acceptJob(
  orderId: string,
  technicianId: string,
  technicianInfo: TechnicianInfo
): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);

    if (!orderSnap.exists()) {
      throw new Error('Order not found');
    }

    const order = orderSnap.data() as Order;

    if (order.status !== 'pending') {
      throw new Error('This job has already been accepted by another technician');
    }

    transaction.update(orderRef, {
      status: 'accepted',
      technicianId,
      technicianInfo: {
        name: technicianInfo.name,
        phone: technicianInfo.phone,
        whatsapp: technicianInfo.whatsapp,
        photo: technicianInfo.photo,
        rating: technicianInfo.rating,
      },
      acceptedAt: Timestamp.now(),
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: 'accepted',
          timestamp: Timestamp.now(),
          note: `Job accepted by ${technicianInfo.name}`,
          changedBy: technicianId,
        },
      ],
    });
  });
}

/**
 * Decline a job (optional tracking)
 */
export async function declineJob(
  orderId: string,
  technicianId: string,
  reason?: string
): Promise<void> {
  try {
    // No-op for now. Could track declined jobs per technician in the future.
  } catch (error) {
    throw error;
  }
}

/**
 * Get technician's jobs
 */
export async function getTechnicianJobs(
  technicianId: string,
  statuses?: OrderStatus[]
): Promise<Order[]> {
  try {
    const ordersRef = collection(db, 'orders');
    
    let q;
    if (statuses && statuses.length > 0) {
      q = query(
        ordersRef,
        where('technicianId', '==', technicianId),
        where('status', 'in', statuses),
        orderBy('installationDate', 'asc')
      );
    } else {
      q = query(
        ordersRef,
        where('technicianId', '==', technicianId),
        orderBy('installationDate', 'asc')
      );
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Order));
  } catch (error) {
    throw error;
  }
}

/**
 * Start a job (change status to in_progress)
 */
export async function startJob(orderId: string, technicianId: string): Promise<void> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      throw new Error('Order not found');
    }
    
    const order = orderSnap.data() as Order;
    
    // Verify technician owns this job
    if (order.technicianId !== technicianId) {
      throw new Error('Unauthorized: This is not your job');
    }
    
    await updateDoc(orderRef, {
      status: 'in_progress',
      startedAt: Timestamp.now(),
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: 'in_progress',
          timestamp: Timestamp.now(),
          note: 'Installation started',
          changedBy: technicianId,
        },
      ],
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Upload installation photo
 */
export async function uploadInstallationPhoto(
  orderId: string,
  file: File,
  description?: string
): Promise<string> {
  try {
    const fileName = `${uuidv4()}_${file.name}`;
    const path = `orders/${orderId}/installation-photos/${fileName}`;
    
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    throw error;
  }
}

/**
 * Complete a job with installation photos
 */
export async function completeJob(
  orderId: string,
  technicianId: string,
  photoUrls: string[],
  notes?: string
): Promise<void> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      throw new Error('Order not found');
    }
    
    const order = orderSnap.data() as Order;
    
    // Verify technician owns this job
    if (order.technicianId !== technicianId) {
      throw new Error('Unauthorized: This is not your job');
    }
    
    // Create installation photos array
    const installationPhotos = photoUrls.map((url, index) => ({
      url,
      uploadedAt: Timestamp.now(),
      description: `Installation photo ${index + 1}`,
    }));
    
    await updateDoc(orderRef, {
      status: 'completed',
      completedAt: Timestamp.now(),
      installationPhotos,
      technicianNotes: notes || '',
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: 'completed',
          timestamp: Timestamp.now(),
          note: notes || 'Installation completed',
          changedBy: technicianId,
        },
      ],
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Get technician statistics
 */
export async function getTechnicianStats(technicianId: string): Promise<TechnicianStats> {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('technicianId', '==', technicianId)
    );
    
    const snapshot = await getDocs(q);
    const jobs = snapshot.docs.map(doc => doc.data() as Order);
    
    const completedJobs = jobs.filter(job => job.status === 'completed');
    const inProgressJobs = jobs.filter(job => job.status === 'in_progress');
    const upcomingJobs = jobs.filter(job => job.status === 'accepted');
    
    // Calculate total earnings (from completed jobs)
    const totalEarnings = completedJobs.reduce((sum, job) => {
      return sum + (job.serviceSnapshot?.price || 0);
    }, 0);
    
    // Calculate average rating
    const ratedJobs = completedJobs.filter(job => job.rating && job.rating.score > 0);
    const averageRating = ratedJobs.length > 0
      ? ratedJobs.reduce((sum, job) => sum + (job.rating?.score || 0), 0) / ratedJobs.length
      : 0;
    
    // Calculate completion rate
    const totalStartedJobs = jobs.filter(job => 
      ['completed', 'in_progress', 'accepted'].includes(job.status)
    ).length;
    const completionRate = totalStartedJobs > 0
      ? (completedJobs.length / totalStartedJobs) * 100
      : 0;
    
    return {
      totalJobs: jobs.length,
      completedJobs: completedJobs.length,
      inProgressJobs: inProgressJobs.length,
      upcomingJobs: upcomingJobs.length,
      totalEarnings,
      averageRating: Math.round(averageRating * 10) / 10,
      completionRate: Math.round(completionRate),
    };
  } catch (error) {
    return {
      totalJobs: 0,
      completedJobs: 0,
      inProgressJobs: 0,
      upcomingJobs: 0,
      totalEarnings: 0,
      averageRating: 0,
      completionRate: 0,
    };
  }
}

/**
 * Get job by ID (for technician view)
 */
export async function getTechnicianJobById(
  orderId: string,
  technicianId: string
): Promise<Order | null> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      return null;
    }
    
    const order = orderSnap.data() as Order;
    
    // Technicians can view pending jobs or their own jobs
    if (order.status === 'pending' || order.technicianId === technicianId) {
      return {
        ...order,
        id: orderSnap.id,
      } as Order;
    }
    
    return null;
  } catch (error) {
    throw error;
  }
}

