'use client';

import { useState } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import MaintenanceScheduleForm from './MaintenanceScheduleForm';
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

type RegistrationStep = 'schedule' | 'done';

// Devices have no unique per-unit QR sticker, so the device is identified by an
// auto-generated id scoped to its order (one device per order is enforced
// server-side). The technician picks the job and registers — no scan required.
function generateDeviceId(orderId: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `device-${orderId}-${rand}`;
}

export default function DeviceRegistrationFlow({
  orderId,
  technicianId,
  onComplete,
  onSkip,
}: DeviceRegistrationFlowProps) {
  const [step, setStep] = useState<RegistrationStep>('schedule');
  const [deviceId] = useState(() => generateDeviceId(orderId));
  const [submitting, setSubmitting] = useState(false);
  const { enqueue } = useOfflineQueue();
  const { t } = useTranslation();
  const td = t.technician.deviceRegistration;

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

  if (step === 'schedule') {
    return (
      <MaintenanceScheduleForm
        qrCodeData={deviceId}
        orderId={orderId}
        onSubmit={handleSubmit}
        onBack={onSkip}
        submitting={submitting}
        showScannedCode={false}
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
