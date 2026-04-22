import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Auto-assigns a maintenance job to an available technician.
 * Triggered when a schedule reaches escalation level 4 (14+ days overdue).
 *
 * Strategy:
 * 1. Query active technicians
 * 2. Pick the technician with the fewest active (in_progress) orders
 * 3. Create a system-generated maintenance order
 */
export async function autoAssignMaintenance(
  scheduleId: string,
  deviceId: string,
  device: FirebaseFirestore.DocumentData,
  schedule: FirebaseFirestore.DocumentData
): Promise<string | null> {
  // Check if an auto-assigned order already exists for this schedule
  const existingOrder = await db
    .collection('orders')
    .where('metadata.scheduleId', '==', scheduleId)
    .where('source', '==', 'system')
    .limit(1)
    .get();

  if (!existingOrder.empty) {
    console.log(`Auto-assigned order already exists for schedule ${scheduleId}, skipping.`);
    return null;
  }

  // Find active technicians
  const techSnap = await db
    .collection('users')
    .where('role', '==', 'technician')
    .where('active', '==', true)
    .get();

  if (techSnap.empty) {
    console.log('No active technicians available for auto-assignment.');
    return null;
  }

  // Count active orders per technician for load balancing
  const technicianLoads: { id: string; activeOrders: number; email: string; displayName: string }[] = [];

  for (const techDoc of techSnap.docs) {
    const techData = techDoc.data();
    const activeOrdersSnap = await db
      .collection('orders')
      .where('technicianId', '==', techDoc.id)
      .where('status', 'in', ['accepted', 'in_progress'])
      .get();

    technicianLoads.push({
      id: techDoc.id,
      activeOrders: activeOrdersSnap.size,
      email: techData.email || '',
      displayName: techData.displayName || 'Technician',
    });
  }

  // Sort by fewest active orders
  technicianLoads.sort((a, b) => a.activeOrders - b.activeOrders);
  const assignedTech = technicianLoads[0];

  // Create maintenance order
  const maintenanceType = schedule.type === 'ezer_maintenance'
    ? 'Ezer Maintenance'
    : `Filter Replacement (${schedule.filterName || 'filter'})`;

  const productName = device.productSnapshot?.name?.en || 'Ezer Device';

  const now = FieldValue.serverTimestamp();

  const orderRef = await db.collection('orders').add({
    orderNumber: `MNT-${Date.now().toString(36).toUpperCase()}`,
    customerId: device.customerId || '',
    customerInfo: device.customerInfo || { name: '', email: '', phone: '' },
    technicianId: assignedTech.id,
    technicianInfo: {
      name: assignedTech.displayName,
      phone: '',
      whatsapp: '',
      photo: '',
      rating: 0,
    },
    subContractorId: null,
    productId: '',
    productVariationId: '',
    productSnapshot: device.productSnapshot || { name: { en: productName }, variation: '', price: 0, image: '' },
    serviceId: '',
    serviceSnapshot: {
      name: { en: maintenanceType, pt: maintenanceType, es: maintenanceType, ko: maintenanceType },
      price: 0,
      duration: 1,
    },
    installationAddress: device.installationAddress || { street: '', city: '', state: '', postalCode: '', country: 'Brazil' },
    installationDate: now,
    timeSlot: 'flexible',
    sitePhotos: {},
    installationPhotos: [],
    status: 'accepted',
    statusHistory: [{ status: 'accepted', timestamp: now, note: 'Auto-assigned maintenance order', changedBy: 'system' }],
    payment: {
      amount: 0,
      currency: 'BRL',
      productPrice: 0,
      servicePrice: 0,
      tax: 0,
      discount: 0,
      status: 'completed',
      method: 'fake_payment',
    },
    source: 'system',
    adminNotes: `Auto-generated maintenance order: ${maintenanceType} for ${productName}. Overdue and auto-assigned.`,
    customerNotes: '',
    technicianNotes: '',
    rating: null,
    cancellation: null,
    changeHistory: [],
    createdAt: now,
    acceptedAt: now,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    metadata: {
      scheduleId,
      deviceId,
      maintenanceType: schedule.type,
      autoAssigned: true,
    },
  });

  // Update schedule to record the auto-assignment
  await db.collection('maintenanceSchedules').doc(scheduleId).update({
    autoAssignedOrderId: orderRef.id,
    autoAssignedTechnicianId: assignedTech.id,
    autoAssignedAt: FieldValue.serverTimestamp(),
  });

  // Log transaction
  await db.collection('transactions').add({
    type: 'maintenance_auto_assigned',
    metadata: {
      scheduleId,
      deviceId,
      orderId: orderRef.id,
      technicianId: assignedTech.id,
      technicianName: assignedTech.displayName,
      maintenanceType: schedule.type,
    },
    performedBy: 'system',
    performedByRole: 'system',
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log(`Auto-assigned maintenance order ${orderRef.id} to technician ${assignedTech.displayName} (${assignedTech.id}).`);
  return orderRef.id;
}
