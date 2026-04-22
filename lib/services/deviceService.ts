import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Device, DeviceStatus, DeviceRegistrationInput, ManualDeviceInput, DeviceUpdateInput, MaintenanceScheduleInput } from '@/types/device';
import { Order } from '@/types/order';
import { logTransaction } from './transactionService';

export interface PaginatedDeviceResult {
  devices: Device[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export async function registerDevice(
  orderId: string,
  technicianId: string,
  input: DeviceRegistrationInput
): Promise<string> {
  const orderDoc = await getDoc(doc(db, 'orders', orderId));
  if (!orderDoc.exists()) throw new Error('Order not found');

  const order = { id: orderDoc.id, ...orderDoc.data() } as Order;

  // Check for duplicate QR code
  const existing = await getDeviceByQrCode(input.qrCodeData);
  if (existing) throw new Error('This QR code is already registered to another device');

  // Check if device already registered for this order
  const existingForOrder = await getDeviceByOrderId(orderId);
  if (existingForOrder) throw new Error('A device is already registered for this order');

  const batch = writeBatch(db);

  // Find the earliest filter due date for denormalization
  const ezerSchedule = input.schedules.find((s) => s.type === 'ezer_maintenance');
  const filterSchedules = input.schedules.filter((s) => s.type === 'filter_replacement');
  const earliestFilterDue = filterSchedules.length > 0
    ? filterSchedules.reduce((earliest, s) =>
        s.firstDueDate < earliest ? s.firstDueDate : earliest, filterSchedules[0].firstDueDate)
    : ezerSchedule?.firstDueDate || new Date();

  // Create device document
  const deviceRef = doc(collection(db, 'devices'));
  const deviceData = {
    qrCodeData: input.qrCodeData,
    orderId,
    customerId: order.customerId,
    technicianId,
    productSnapshot: order.productSnapshot,
    installationAddress: order.installationAddress,
    customerInfo: order.customerInfo,
    registeredAt: Timestamp.now(),
    status: 'active' as const,
    lastEzerMaintenanceAt: null,
    lastFilterReplacementAt: null,
    nextEzerMaintenanceDue: ezerSchedule
      ? Timestamp.fromDate(ezerSchedule.firstDueDate)
      : Timestamp.now(),
    nextFilterReplacementDue: Timestamp.fromDate(earliestFilterDue),
  };
  batch.set(deviceRef, deviceData);

  // Create maintenance schedule documents
  for (const schedule of input.schedules) {
    const scheduleRef = doc(collection(db, 'maintenanceSchedules'));
    batch.set(scheduleRef, {
      deviceId: deviceRef.id,
      orderId,
      type: schedule.type,
      filterName: schedule.filterName || null,
      intervalDays: schedule.intervalDays,
      nextDueDate: Timestamp.fromDate(schedule.firstDueDate),
      lastCompletedAt: null,
      completionHistory: [],
      createdAt: Timestamp.now(),
      createdBy: technicianId,
    });
  }

  await batch.commit();

  // Log transaction
  await logTransaction({
    type: 'device_registered',
    orderId,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    technicianId,
    metadata: {
      deviceId: deviceRef.id,
      qrCodeData: input.qrCodeData,
      schedulesCount: input.schedules.length,
    },
    performedBy: technicianId,
    performedByRole: 'technician',
  });

  return deviceRef.id;
}

export async function getDeviceByQrCode(qrCode: string): Promise<Device | null> {
  const q = query(collection(db, 'devices'), where('qrCodeData', '==', qrCode));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Device;
}

export async function getDeviceByOrderId(orderId: string): Promise<Device | null> {
  const q = query(collection(db, 'devices'), where('orderId', '==', orderId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Device;
}

export async function getDeviceById(deviceId: string): Promise<Device | null> {
  const docSnap = await getDoc(doc(db, 'devices', deviceId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Device;
}

export async function getDevicesByCustomerId(customerId: string): Promise<Device[]> {
  const q = query(collection(db, 'devices'), where('customerId', '==', customerId), orderBy('registeredAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Device));
}

export async function getDevicesByTechnicianId(technicianId: string): Promise<Device[]> {
  const q = query(
    collection(db, 'devices'),
    where('technicianId', '==', technicianId),
    orderBy('registeredAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Device));
}

export async function getAllDevices(): Promise<Device[]> {
  const q = query(collection(db, 'devices'), orderBy('registeredAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Device));
}

export async function getDevicesPaginated(
  pageSize = 20,
  lastDoc?: QueryDocumentSnapshot,
  statusFilter?: string
): Promise<PaginatedDeviceResult> {
  const devicesRef = collection(db, 'devices');
  const hasStatus = statusFilter && statusFilter !== 'all';

  let q;
  if (hasStatus && lastDoc) {
    q = query(devicesRef, where('status', '==', statusFilter), orderBy('registeredAt', 'desc'), startAfter(lastDoc), limit(pageSize + 1));
  } else if (hasStatus) {
    q = query(devicesRef, where('status', '==', statusFilter), orderBy('registeredAt', 'desc'), limit(pageSize + 1));
  } else if (lastDoc) {
    q = query(devicesRef, orderBy('registeredAt', 'desc'), startAfter(lastDoc), limit(pageSize + 1));
  } else {
    q = query(devicesRef, orderBy('registeredAt', 'desc'), limit(pageSize + 1));
  }

  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const devices = docs.slice(0, pageSize).map((d) => ({ id: d.id, ...d.data() } as Device));
  const newLastDoc = docs.length > 0 ? docs[Math.min(docs.length - 1, pageSize - 1)] : null;

  return { devices, lastDoc: newLastDoc, hasMore };
}

export async function createDeviceManual(
  performedBy: string,
  input: ManualDeviceInput
): Promise<string> {
  const existing = await getDeviceByQrCode(input.qrCodeData);
  if (existing) throw new Error('This QR code is already registered to another device');

  const batch = writeBatch(db);

  const ezerSchedule = input.schedules.find((s) => s.type === 'ezer_maintenance');
  const filterSchedules = input.schedules.filter((s) => s.type === 'filter_replacement');
  const earliestFilterDue = filterSchedules.length > 0
    ? filterSchedules.reduce((earliest, s) =>
        s.firstDueDate < earliest ? s.firstDueDate : earliest, filterSchedules[0].firstDueDate)
    : ezerSchedule?.firstDueDate || new Date();

  const deviceRef = doc(collection(db, 'devices'));
  const deviceData = {
    qrCodeData: input.qrCodeData,
    orderId: '',
    customerId: '',
    technicianId: performedBy,
    productSnapshot: {
      name: { en: input.productName, es: '', pt: '', ko: '' },
      variation: input.productVariation || '',
      image: '',
    },
    installationAddress: input.installationAddress,
    customerInfo: input.customerInfo,
    registeredAt: Timestamp.now(),
    status: 'active' as const,
    lastEzerMaintenanceAt: null,
    lastFilterReplacementAt: null,
    nextEzerMaintenanceDue: ezerSchedule
      ? Timestamp.fromDate(ezerSchedule.firstDueDate)
      : Timestamp.now(),
    nextFilterReplacementDue: Timestamp.fromDate(earliestFilterDue),
  };
  batch.set(deviceRef, deviceData);

  for (const schedule of input.schedules) {
    const scheduleRef = doc(collection(db, 'maintenanceSchedules'));
    batch.set(scheduleRef, {
      deviceId: deviceRef.id,
      orderId: '',
      type: schedule.type,
      filterName: schedule.filterName || null,
      intervalDays: schedule.intervalDays,
      nextDueDate: Timestamp.fromDate(schedule.firstDueDate),
      lastCompletedAt: null,
      completionHistory: [],
      createdAt: Timestamp.now(),
      createdBy: performedBy,
    });
  }

  await batch.commit();

  await logTransaction({
    type: 'device_registered',
    metadata: {
      deviceId: deviceRef.id,
      qrCodeData: input.qrCodeData,
      schedulesCount: input.schedules.length,
      manual: true,
    },
    performedBy,
    performedByRole: 'admin',
  });

  return deviceRef.id;
}

export async function updateDevice(
  deviceId: string,
  updates: DeviceUpdateInput,
  performedBy: string
): Promise<void> {
  const deviceRef = doc(db, 'devices', deviceId);
  const deviceSnap = await getDoc(deviceRef);
  if (!deviceSnap.exists()) throw new Error('Device not found');

  if (updates.qrCodeData) {
    const existing = await getDeviceByQrCode(updates.qrCodeData);
    if (existing && existing.id !== deviceId) {
      throw new Error('This QR code is already registered to another device');
    }
  }

  const updateData: Record<string, unknown> = {};
  if (updates.customerInfo) updateData.customerInfo = updates.customerInfo;
  if (updates.installationAddress) updateData.installationAddress = updates.installationAddress;
  if (updates.qrCodeData) updateData.qrCodeData = updates.qrCodeData;
  if (updates.status) updateData.status = updates.status;
  if (updates.productName !== undefined) {
    const current = deviceSnap.data() as Device;
    updateData.productSnapshot = {
      ...current.productSnapshot,
      name: { ...current.productSnapshot.name, en: updates.productName },
      variation: updates.productVariation ?? current.productSnapshot.variation,
    };
  }

  await updateDoc(deviceRef, updateData);

  await logTransaction({
    type: 'device_status_changed',
    metadata: { deviceId, updatedFields: Object.keys(updateData) },
    performedBy,
    performedByRole: 'admin',
  });
}

export async function updateDeviceStatus(
  deviceId: string,
  status: DeviceStatus,
  performedBy: string
): Promise<void> {
  const deviceRef = doc(db, 'devices', deviceId);
  const deviceSnap = await getDoc(deviceRef);
  if (!deviceSnap.exists()) throw new Error('Device not found');

  await updateDoc(deviceRef, { status });

  await logTransaction({
    type: 'device_status_changed',
    metadata: {
      deviceId,
      newStatus: status,
      previousStatus: (deviceSnap.data() as Device).status,
    },
    performedBy,
    performedByRole: 'admin',
  });
}
