'use client';

import { useState } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import QRScanner from './QRScanner';
import MaintenanceScheduleForm from './MaintenanceScheduleForm';
import { getDeviceByQrCode } from '@/lib/services/deviceService';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import { DeviceRegistrationInput } from '@/types/device';
import toast from 'react-hot-toast';

interface DeviceRegistrationFlowProps {
  orderId: string;
  technicianId: string;
  onComplete: () => void;
  onSkip: () => void;
}

type RegistrationStep = 'scan' | 'schedule' | 'done';

export default function DeviceRegistrationFlow({
  orderId,
  technicianId,
  onComplete,
  onSkip,
}: DeviceRegistrationFlowProps) {
  const [step, setStep] = useState<RegistrationStep>('scan');
  const [scannedQrCode, setScannedQrCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { enqueue } = useOfflineQueue();

  const handleScan = async (data: string) => {
    try {
      // Duplicate check requires online — if offline, warn and bail
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        toast.error('Device registration requires internet for QR verification');
        return;
      }
      const existing = await getDeviceByQrCode(data);
      if (existing) {
        toast.error('This QR code is already registered to another device');
        return;
      }
      setScannedQrCode(data);
      setStep('schedule');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to verify QR code';
      toast.error(message);
    }
  };

  const handleSubmit = async (input: DeviceRegistrationInput) => {
    try {
      setSubmitting(true);
      await enqueue('register_device', {
        orderId,
        technicianId,
        input,
      });
      // Optimistic — show success immediately
      toast.success('Device registered!');
      setStep('done');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to register device';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'scan') {
    return (
      <div>
        <QRScanner
          onScan={handleScan}
          onCancel={onSkip}
          onError={(err) => toast.error(err)}
        />
      </div>
    );
  }

  if (step === 'schedule' && scannedQrCode) {
    return (
      <MaintenanceScheduleForm
        qrCodeData={scannedQrCode}
        orderId={orderId}
        onSubmit={handleSubmit}
        onBack={() => setStep('scan')}
        submitting={submitting}
      />
    );
  }

  if (step === 'done') {
    return (
      <div className="text-center py-12 space-y-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Device Registered</h2>
          <p className="text-text-secondary">
            The Ezer device has been registered and maintenance schedule is set.
          </p>
        </div>
        <button
          onClick={onComplete}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-apple hover:bg-primary/90 transition-all"
        >
          Back to Jobs
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return null;
}
