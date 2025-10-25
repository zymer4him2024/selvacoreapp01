// Fallback Address Service
// Saves addresses locally when Firestore fails

import { Address } from '@/types';

const FALLBACK_ADDRESSES_KEY = 'selvacore_fallback_addresses';

/**
 * Save address to local storage as fallback
 */
export function saveFallbackAddress(address: Address): void {
  try {
    const addresses = getFallbackAddresses();
    const existingIndex = addresses.findIndex(a => a.id === address.id);
    
    if (existingIndex >= 0) {
      addresses[existingIndex] = address;
    } else {
      addresses.push(address);
    }
    
    localStorage.setItem(FALLBACK_ADDRESSES_KEY, JSON.stringify(addresses));
    console.log('✅ Address saved to fallback storage:', address.id);
  } catch (error) {
    console.error('❌ Failed to save fallback address:', error);
  }
}

/**
 * Get all fallback addresses
 */
export function getFallbackAddresses(): Address[] {
  try {
    const addressesStr = localStorage.getItem(FALLBACK_ADDRESSES_KEY);
    if (!addressesStr) return [];
    
    return JSON.parse(addressesStr);
  } catch (error) {
    console.error('❌ Failed to get fallback addresses:', error);
    return [];
  }
}

/**
 * Get a specific fallback address
 */
export function getFallbackAddress(addressId: string): Address | null {
  try {
    const addresses = getFallbackAddresses();
    return addresses.find(address => address.id === addressId) || null;
  } catch (error) {
    console.error('❌ Failed to get fallback address:', error);
    return null;
  }
}

/**
 * Delete fallback address
 */
export function deleteFallbackAddress(addressId: string): boolean {
  try {
    const addresses = getFallbackAddresses();
    const filteredAddresses = addresses.filter(a => a.id !== addressId);
    localStorage.setItem(FALLBACK_ADDRESSES_KEY, JSON.stringify(filteredAddresses));
    console.log('✅ Fallback address deleted:', addressId);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete fallback address:', error);
    return false;
  }
}

/**
 * Clear all fallback addresses (for testing)
 */
export function clearFallbackAddresses(): void {
  try {
    localStorage.removeItem(FALLBACK_ADDRESSES_KEY);
    console.log('✅ Fallback addresses cleared');
  } catch (error) {
    console.error('❌ Failed to clear fallback addresses:', error);
  }
}

/**
 * Sync fallback addresses to Firestore when possible
 */
export async function syncFallbackAddressesToFirestore(): Promise<number> {
  try {
    const addresses = getFallbackAddresses();
    let syncedCount = 0;
    
    for (const address of addresses) {
      try {
        // Try to save to Firestore
        const { doc, setDoc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/config');
        const { useAuth } = await import('@/contexts/AuthContext');
        
        // Get current user (this would need to be passed as parameter in real implementation)
        // For now, we'll assume the user is available
        const customerRef = doc(db, 'customers', 'current-user-id'); // This needs to be dynamic
        
        const customerDoc = await getDoc(customerRef);
        const existingAddresses = customerDoc.exists() ? customerDoc.data().addresses || [] : [];
        
        // Add or update address
        const updatedAddresses = existingAddresses.filter((a: Address) => a.id !== address.id);
        updatedAddresses.push(address);
        
        await setDoc(customerRef, {
          addresses: updatedAddresses
        }, { merge: true });
        
        // Remove from fallback storage after successful sync
        const remainingAddresses = addresses.filter(a => a.id !== address.id);
        localStorage.setItem(FALLBACK_ADDRESSES_KEY, JSON.stringify(remainingAddresses));
        syncedCount++;
        
        console.log('✅ Fallback address synced to Firestore:', address.id);
      } catch (error) {
        console.log('⚠️ Could not sync fallback address to Firestore:', address.id);
        // Keep in fallback storage if Firestore fails
      }
    }
    
    return syncedCount;
  } catch (error) {
    console.error('❌ Failed to sync fallback addresses:', error);
    return 0;
  }
}
