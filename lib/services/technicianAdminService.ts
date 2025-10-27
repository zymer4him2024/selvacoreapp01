// Technician Admin Service - Admin-only functions for managing technicians
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User, TechnicianStatus } from '@/types/user';

export interface TechnicianStats {
  totalTechnicians: number;
  pendingApplications: number;
  approvedTechnicians: number;
  declinedApplications: number;
  suspendedTechnicians: number;
  activeTechnicians: number;
}

export interface TechnicianWithStats extends User {
  totalJobs?: number;
  completedJobs?: number;
  averageRating?: number;
  totalEarnings?: number;
  lastJobDate?: Date;
}

/**
 * Get all technicians with optional status filter
 */
export async function getAllTechnicians(status?: TechnicianStatus): Promise<TechnicianWithStats[]> {
  try {
    console.log('📋 ADMIN - Fetching technicians, status filter:', status || 'all');
    
    const usersRef = collection(db, 'users');
    let q;
    
    if (status) {
      q = query(
        usersRef,
        where('role', '==', 'technician'),
        where('technicianStatus', '==', status),
        orderBy('applicationDate', 'desc')
      );
    } else {
      q = query(
        usersRef,
        where('role', '==', 'technician'),
        orderBy('applicationDate', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    console.log('📋 ADMIN - Found', snapshot.size, 'technicians');
    
    const technicians: TechnicianWithStats[] = [];
    
    for (const docSnap of snapshot.docs) {
      const userData = { id: docSnap.id, ...docSnap.data() } as User;
      
      // Get technician stats from orders
      const stats = await getTechnicianJobStats(docSnap.id);
      
      technicians.push({
        ...userData,
        ...stats
      });
    }
    
    return technicians;
  } catch (error) {
    console.error('❌ ADMIN - Error fetching technicians:', error);
    throw error;
  }
}

/**
 * Get technician job statistics
 */
async function getTechnicianJobStats(technicianId: string) {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('technicianId', '==', technicianId));
    const snapshot = await getDocs(q);
    
    const jobs = snapshot.docs.map(doc => doc.data());
    const completedJobs = jobs.filter(job => job.status === 'completed');
    
    const totalEarnings = completedJobs.reduce((sum, job) => {
      return sum + (job.serviceSnapshot?.price || 0);
    }, 0);
    
    const ratedJobs = completedJobs.filter(job => job.rating && job.rating.score > 0);
    const averageRating = ratedJobs.length > 0
      ? ratedJobs.reduce((sum, job) => sum + (job.rating?.score || 0), 0) / ratedJobs.length
      : 0;
    
    // Get last job date
    const sortedJobs = jobs.sort((a, b) => {
      const aDate = a.installationDate?.toMillis ? a.installationDate.toMillis() : 0;
      const bDate = b.installationDate?.toMillis ? b.installationDate.toMillis() : 0;
      return bDate - aDate;
    });
    
    const lastJobDate = sortedJobs.length > 0 && sortedJobs[0].installationDate
      ? sortedJobs[0].installationDate.toDate()
      : undefined;
    
    return {
      totalJobs: jobs.length,
      completedJobs: completedJobs.length,
      averageRating: Math.round(averageRating * 10) / 10,
      totalEarnings,
      lastJobDate
    };
  } catch (error) {
    console.error('Error fetching technician stats:', error);
    return {
      totalJobs: 0,
      completedJobs: 0,
      averageRating: 0,
      totalEarnings: 0
    };
  }
}

/**
 * Get technician statistics summary
 */
export async function getTechnicianStatsSummary(): Promise<TechnicianStats> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'technician'));
    const snapshot = await getDocs(q);
    
    const technicians = snapshot.docs.map(doc => doc.data() as User);
    
    const stats: TechnicianStats = {
      totalTechnicians: technicians.length,
      pendingApplications: technicians.filter(t => t.technicianStatus === 'pending').length,
      approvedTechnicians: technicians.filter(t => t.technicianStatus === 'approved').length,
      declinedApplications: technicians.filter(t => t.technicianStatus === 'declined').length,
      suspendedTechnicians: technicians.filter(t => t.technicianStatus === 'suspended').length,
      activeTechnicians: technicians.filter(t => t.technicianStatus === 'approved' && t.active).length,
    };
    
    return stats;
  } catch (error) {
    console.error('Error fetching technician stats:', error);
    return {
      totalTechnicians: 0,
      pendingApplications: 0,
      approvedTechnicians: 0,
      declinedApplications: 0,
      suspendedTechnicians: 0,
      activeTechnicians: 0,
    };
  }
}

/**
 * Approve technician application
 */
export async function approveTechnician(technicianId: string, adminNotes?: string): Promise<void> {
  try {
    console.log('✅ ADMIN - Approving technician:', technicianId);
    
    const userRef = doc(db, 'users', technicianId);
    await updateDoc(userRef, {
      technicianStatus: 'approved',
      approvedDate: Timestamp.now(),
      active: true,
      adminNotes: adminNotes || '',
      updatedAt: Timestamp.now(),
    });
    
    console.log('✅ ADMIN - Technician approved successfully');
  } catch (error) {
    console.error('❌ ADMIN - Error approving technician:', error);
    throw error;
  }
}

/**
 * Decline technician application
 */
export async function declineTechnician(technicianId: string, reason?: string): Promise<void> {
  try {
    console.log('❌ ADMIN - Declining technician:', technicianId);
    
    const userRef = doc(db, 'users', technicianId);
    await updateDoc(userRef, {
      technicianStatus: 'declined',
      active: false,
      adminNotes: reason || 'Application declined',
      updatedAt: Timestamp.now(),
    });
    
    console.log('❌ ADMIN - Technician declined');
  } catch (error) {
    console.error('❌ ADMIN - Error declining technician:', error);
    throw error;
  }
}

/**
 * Suspend technician
 */
export async function suspendTechnician(technicianId: string, reason: string): Promise<void> {
  try {
    console.log('⏸️ ADMIN - Suspending technician:', technicianId);
    
    const userRef = doc(db, 'users', technicianId);
    await updateDoc(userRef, {
      technicianStatus: 'suspended',
      active: false,
      adminNotes: reason,
      updatedAt: Timestamp.now(),
    });
    
    console.log('⏸️ ADMIN - Technician suspended');
  } catch (error) {
    console.error('❌ ADMIN - Error suspending technician:', error);
    throw error;
  }
}

/**
 * Reactivate technician
 */
export async function reactivateTechnician(technicianId: string): Promise<void> {
  try {
    console.log('▶️ ADMIN - Reactivating technician:', technicianId);
    
    const userRef = doc(db, 'users', technicianId);
    await updateDoc(userRef, {
      technicianStatus: 'approved',
      active: true,
      updatedAt: Timestamp.now(),
    });
    
    console.log('▶️ ADMIN - Technician reactivated');
  } catch (error) {
    console.error('❌ ADMIN - Error reactivating technician:', error);
    throw error;
  }
}

/**
 * Update technician profile (admin edit)
 */
export async function updateTechnicianProfile(
  technicianId: string,
  updates: Partial<User>
): Promise<void> {
  try {
    console.log('📝 ADMIN - Updating technician profile:', technicianId);
    
    const userRef = doc(db, 'users', technicianId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
    
    console.log('📝 ADMIN - Technician profile updated');
  } catch (error) {
    console.error('❌ ADMIN - Error updating technician profile:', error);
    throw error;
  }
}

/**
 * Get single technician by ID
 */
export async function getTechnicianById(technicianId: string): Promise<TechnicianWithStats | null> {
  try {
    const userRef = doc(db, 'users', technicianId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }
    
    const userData = { id: userSnap.id, ...userSnap.data() } as User;
    const stats = await getTechnicianJobStats(technicianId);
    
    return {
      ...userData,
      ...stats
    };
  } catch (error) {
    console.error('Error fetching technician:', error);
    throw error;
  }
}

/**
 * Search technicians by name, email, or phone
 */
export async function searchTechnicians(searchTerm: string): Promise<TechnicianWithStats[]> {
  try {
    const allTechnicians = await getAllTechnicians();
    const lowerSearch = searchTerm.toLowerCase();
    
    return allTechnicians.filter(tech => 
      tech.displayName?.toLowerCase().includes(lowerSearch) ||
      tech.email?.toLowerCase().includes(lowerSearch) ||
      tech.phone?.includes(searchTerm)
    );
  } catch (error) {
    console.error('Error searching technicians:', error);
    throw error;
  }
}

