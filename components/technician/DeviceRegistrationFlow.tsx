'use client';

import { useState } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import QRScanner from './QRScanner';
import MaintenanceScheduleForm from './MaintenanceScheduleForm';
import { getDeviceByQrCode } from '@/lib/services/deviceService';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import { DeviceRegistrationInput } from '@/types/device';
import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation();
  const td = t.technician.deviceRegistration;

  const handleScan = async (data: string) => {
    try {
      // Duplicate check requires online — if offline, warn and bail
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        toast.error(td.onlineRequired);
        return;
      }
      const existing = await getDeviceByQrCode(data);
      if (existing) {
        toast.error(td.alreadyRegistered);
        return;
      }
      setScannedQrCode(data);
      setStep('schedule');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : td.verifyError;
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
      toast.success(td.registered);
      setStep('done');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : td.registerError;
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
      <div className="sc" style={{ textAlign: 'center', padding: '48px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--brand-tint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle className="w-10 h-10" style={{ color: 'var(--brand)' }} />
        </div>
        <div>
          <h2 className="sc-h1" style={{ marginBottom: 8 }}>{td.successTitle}</h2>
          <p className="sc-helper" style={{ margin: 0 }}>{td.successMessage}</p>
        </div>
        <button onClick={onComplete} className="sc-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {td.backToJobs}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return null;
}
