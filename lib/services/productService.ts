// Product Service - Handle all product operations
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { Product, ProductVariation } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get all products
 */
export async function getAllProducts(): Promise<Product[]> {
  const productsRef = collection(db, 'products');
  // Remove orderBy to avoid index requirement - sort in JavaScript instead
  const snapshot = await getDocs(productsRef);
  
  const products = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Product));
  
  // Sort by createdAt in JavaScript (newest first)
  return products.sort((a, b) => {
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });
}

/**
 * Get single product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  const docRef = doc(db, 'products', id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Product;
}

/**
 * Create new product
 */
export async function createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const productsRef = collection(db, 'products');
  
  const newProduct = {
    ...productData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(productsRef, newProduct);
  return docRef.id;
}

/**
 * Update existing product
 */
export async function updateProduct(id: string, productData: Partial<Product>): Promise<void> {
  const docRef = doc(db, 'products', id);
  
  await updateDoc(docRef, {
    ...productData,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Delete product
 */
export async function deleteProduct(id: string): Promise<void> {
  const docRef = doc(db, 'products', id);
  await deleteDoc(docRef);
}

/**
 * Upload product image to Firebase Storage
 */
export async function uploadProductImage(
  productId: string,
  file: File,
  type: 'main' | 'variation' = 'main',
  variationId?: string
): Promise<string> {
  const fileName = `${uuidv4()}_${file.name}`;
  const path = variationId
    ? `products/${productId}/variations/${variationId}/${fileName}`
    : `products/${productId}/${fileName}`;
  
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
}

/**
 * Delete product image from Firebase Storage
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
}

/**
 * Get active products only
 */
export async function getActiveProducts(): Promise<Product[]> {
  const productsRef = collection(db, 'products');
  // Remove orderBy to avoid composite index requirement - sort in JavaScript instead
  const q = query(productsRef, where('active', '==', true));
  const snapshot = await getDocs(q);
  
  const products = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Product));
  
  // Sort by createdAt in JavaScript (newest first)
  return products.sort((a, b) => {
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });
}

/**
 * Search products by name
 */
export async function searchProducts(searchTerm: string): Promise<Product[]> {
  const allProducts = await getAllProducts();
  
  return allProducts.filter(product => 
    product.name.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

/**
 * Add multiple images to a product
 */
export async function addProductImages(
  productId: string,
  files: File[]
): Promise<string[]> {
  const uploadedUrls: string[] = [];
  
  for (const file of files) {
    try {
      const url = await uploadProductImage(productId, file, 'main');
      uploadedUrls.push(url);
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  }
  
  // Get current product
  const product = await getProductById(productId);
  if (!product) throw new Error('Product not found');
  
  // Update product with new images
  const updatedImages = [...(product.images || []), ...uploadedUrls];
  await updateProduct(productId, { images: updatedImages });
  
  return uploadedUrls;
}

/**
 * Remove an image from a product
 */
export async function removeProductImage(
  productId: string,
  imageUrl: string
): Promise<void> {
  // Get current product
  const product = await getProductById(productId);
  if (!product) throw new Error('Product not found');
  
  // Remove image from array
  const updatedImages = (product.images || []).filter(url => url !== imageUrl);
  
  // Update product
  await updateProduct(productId, { images: updatedImages });
  
  // Delete from storage
  await deleteProductImage(imageUrl);
}

/**
 * Reorder product images
 */
export async function reorderProductImages(
  productId: string,
  newImageOrder: string[]
): Promise<void> {
  await updateProduct(productId, { images: newImageOrder });
}

/**
 * Replace all product images
 */
export async function replaceProductImages(
  productId: string,
  newImages: string[]
): Promise<void> {
  await updateProduct(productId, { images: newImages });
}

