/**
 * Seed script: Creates a test order in 'in_progress' status for testing
 * the QR code scan -> device registration flow.
 *
 * Usage:
 *   npx tsx scripts/seed-test-order.ts --list-technicians
 *   npx tsx scripts/seed-test-order.ts --technician-uid <UID>
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize with default credentials (uses GOOGLE_APPLICATION_CREDENTIALS or gcloud auth)
const app = initializeApp({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'selvacoreapp01',
});
const db = getFirestore(app);

async function listTechnicians() {
  const snapshot = await db
    .collection('users')
    .where('role', '==', 'technician')
    .get();

  if (snapshot.empty) {
    console.log('No technician users found in Firestore.');
    return;
  }

  console.log('\n--- Technician Users ---\n');
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    console.log(`  UID:    ${doc.id}`);
    console.log(`  Name:   ${data.displayName || '(no name)'}`);
    console.log(`  Email:  ${data.email}`);
    console.log(`  Status: ${data.technicianStatus || 'unknown'}`);
    console.log('');
  });
}

async function createTestOrder(technicianUid: string) {
  // Verify technician exists
  const techDoc = await db.collection('users').doc(technicianUid).get();
  if (!techDoc.exists) {
    console.error(`User with UID "${technicianUid}" not found.`);
    process.exit(1);
  }
  const techData = techDoc.data()!;
  if (techData.role !== 'technician') {
    console.error(`User "${technicianUid}" has role "${techData.role}", not "technician".`);
    process.exit(1);
  }

  console.log(`\nCreating test order for technician: ${techData.displayName} (${technicianUid})`);

  // Find or create a test customer
  let customerId = 'test-customer-seed';
  const customerDoc = await db.collection('users').doc(customerId).get();
  if (!customerDoc.exists) {
    await db.collection('users').doc(customerId).set({
      id: customerId,
      role: 'customer',
      email: 'test-customer@selvacore.test',
      displayName: 'Test Customer',
      phone: '+5511900000000',
      preferredLanguage: 'en',
      active: true,
      emailVerified: false,
      roleSelected: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log('  Created test customer: test-customer@selvacore.test');
  }

  const now = Timestamp.now();
  const orderNumber = `ORD-TEST-${Date.now().toString().slice(-6)}`;

  const orderData = {
    orderNumber,
    customerId,
    technicianId: technicianUid,
    subContractorId: techData.subContractorId || null,

    productId: 'test-product',
    productVariationId: 'test-variation',
    productSnapshot: {
      name: { en: 'Ezer Water Filter Pro', es: 'Ezer Filtro Pro', pt: 'Ezer Filtro Pro', ko: 'Ezer 정수기 프로' },
      variation: 'Standard',
      price: 299.99,
      image: '',
    },
    serviceId: 'test-service',
    serviceSnapshot: {
      name: { en: 'Standard Installation', es: 'Instalacion Estandar', pt: 'Instalacao Padrao', ko: '표준 설치' },
      price: 50.0,
      duration: 2,
    },

    installationAddress: {
      street: '123 Test Street',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '01000-000',
      country: 'Brazil',
      landmark: 'Near the park',
    },
    installationDate: Timestamp.fromDate(new Date()),
    timeSlot: '9-12' as const,

    sitePhotos: {},
    installationPhotos: [],

    status: 'in_progress',
    statusHistory: [
      { status: 'pending', timestamp: now, note: 'Test order created', changedBy: 'seed-script' },
      { status: 'accepted', timestamp: now, note: 'Auto-accepted for testing', changedBy: technicianUid },
      { status: 'in_progress', timestamp: now, note: 'Auto-started for testing', changedBy: technicianUid },
    ],

    payment: {
      amount: 349.99,
      currency: 'BRL',
      productPrice: 299.99,
      servicePrice: 50.0,
      tax: 0,
      discount: 0,
      status: 'completed',
      method: 'fake_payment',
      paidAt: now,
    },

    createdAt: now,
    acceptedAt: now,
    startedAt: now,
    completedAt: null,
    cancelledAt: null,

    customerInfo: {
      name: 'Test Customer',
      email: 'test-customer@selvacore.test',
      phone: '+5511900000000',
    },
    technicianInfo: {
      name: techData.displayName || 'Test Technician',
      phone: techData.phone || '',
      whatsapp: techData.whatsapp || techData.phone || '',
      photo: techData.photoURL || '',
      rating: 5.0,
    },

    customerNotes: 'This is a test order for QR scan flow testing.',
    technicianNotes: '',
    rating: null,
    cancellation: null,
    changeHistory: [],
  };

  const orderRef = await db.collection('orders').add(orderData);

  console.log('\n  Test order created successfully!');
  console.log(`  Order ID:     ${orderRef.id}`);
  console.log(`  Order Number: ${orderNumber}`);
  console.log(`  Status:       in_progress`);
  console.log(`  Technician:   ${techData.displayName}`);
  console.log('');
  console.log('  Next steps:');
  console.log('  1. Start the dev server:  npm run dev');
  console.log('  2. Log in as your technician account');
  console.log(`  3. Go to: /technician/jobs/${orderRef.id}`);
  console.log('  4. Upload a photo and click "Complete Job"');
  console.log('  5. The QR scan flow will appear');
  console.log('  6. Scan any QR code (or use a test QR image)');
  console.log('  7. Configure maintenance schedule and register');
  console.log('');
  console.log('  After registration, check Firestore:');
  console.log('    - devices collection: new doc with status "active"');
  console.log('    - maintenanceSchedules collection: new schedule docs');
  console.log('    - transactions collection: "device_registered" entry');
}

// Parse CLI args
const args = process.argv.slice(2);

if (args.includes('--list-technicians')) {
  listTechnicians()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
} else if (args.includes('--technician-uid')) {
  const uidIndex = args.indexOf('--technician-uid') + 1;
  const uid = args[uidIndex];
  if (!uid) {
    console.error('Please provide a UID: --technician-uid <UID>');
    process.exit(1);
  }
  createTestOrder(uid)
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
} else {
  console.log('Usage:');
  console.log('  npx tsx scripts/seed-test-order.ts --list-technicians');
  console.log('  npx tsx scripts/seed-test-order.ts --technician-uid <UID>');
  process.exit(0);
}
